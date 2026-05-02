import {
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { COINS_PER_MINUTE } from './constants/wallet.constants';

type ActiveCallSession = {
  callerId: string;
  partnerId: string;
  callerName: string;
  partnerName: string;
  startedAt: number;
  settledMinutes: number;
  chargedCoinsTotal: number;
  earnedCoinsTotal: number;
  isSettling: boolean;
  lowCoinsWarningAt: number | null;
};

type CallSource = 'friend' | 'room';

const LOW_COINS_GRACE_MS = 10000;

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private socketToUser = new Map<string, string>();
  private userToSocket = new Map<string, string>();
  private activeCallSessions = new Map<string, ActiveCallSession>();
  private callBillingTicker: NodeJS.Timeout;

  constructor(private readonly usersService: UsersService, private readonly configService: ConfigService) {}

  onModuleInit() {
    this.callBillingTicker = setInterval(() => {
      void this.settleLiveCallMinutes();
    }, 5000);
  }

  onModuleDestroy() {
    clearInterval(this.callBillingTicker);
  }

  async handleConnection(client: Socket) {
    const token = ((client.handshake.auth as any)?.token || (client.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '')) as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }

    const secret = this.configService.get<string>('JWT_SECRET') || 'supersecretkey';
    try {
      const payload = verify(token, secret) as { sub: string };
      const userId = payload.sub;
      this.socketToUser.set(client.id, userId);
      this.userToSocket.set(userId, client.id);
      await this.usersService.setOnlineStatus(userId, true);
      this.broadcastLiveUsers();
    } catch (_) {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) {
      return;
    }

    await this.finalizeCallForUser(userId);
    this.socketToUser.delete(client.id);
    this.userToSocket.delete(userId);
    await this.usersService.setOnlineStatus(userId, false);
    this.broadcastLiveUsers();
  }

  private buildCallKey(callerId: string, partnerId: string): string {
    return `${callerId}:${partnerId}`;
  }

  private findActiveCallByUser(userId: string): { key: string; session: ActiveCallSession } | null {
    for (const [key, session] of this.activeCallSessions.entries()) {
      if (session.callerId === userId || session.partnerId === userId) {
        return { key, session };
      }
    }
    return null;
  }

  private async finalizeCallByKey(key: string, options?: { settlePartialMinute?: boolean }) {
    const session = this.activeCallSessions.get(key);
    if (!session) {
      return;
    }

    const settlePartialMinute = options?.settlePartialMinute ?? true;
    const endedAtMs = Date.now();
    const elapsedMs = endedAtMs - session.startedAt;
    const elapsedMinutes = Math.max(1, Math.ceil(elapsedMs / 60000));
    const baseMinutes = settlePartialMinute
      ? elapsedMinutes
      : Math.max(0, Math.floor(elapsedMs / 60000));
    const remainingMinutes = Math.max(0, baseMinutes - session.settledMinutes);
    if (remainingMinutes > 0) {
      await this.settleCallMinutesByKey(key, remainingMinutes);
    }

    await this.usersService.recordFriendCircleCallHistory({
      callerId: session.callerId,
      partnerId: session.partnerId,
      callerName: session.callerName,
      partnerName: session.partnerName,
      startedAt: new Date(session.startedAt),
      endedAt: new Date(endedAtMs),
      durationMinutes: elapsedMinutes,
      chargedCoins: session.chargedCoinsTotal,
      creditedCoins: session.earnedCoinsTotal,
    });

    this.activeCallSessions.delete(key);
  }

  private async settleLiveCallMinutes() {
    const now = Date.now();
    for (const [key, session] of this.activeCallSessions.entries()) {
      if (session.isSettling) {
        continue;
      }

      if (session.lowCoinsWarningAt != null && now - session.lowCoinsWarningAt >= LOW_COINS_GRACE_MS) {
        const callerSocketId = this.getSocketIdForUser(session.callerId);
        const partnerSocketId = this.getSocketIdForUser(session.partnerId);
        if (callerSocketId) {
          this.server.to(callerSocketId).emit('callEnded');
        }
        if (partnerSocketId) {
          this.server.to(partnerSocketId).emit('callEnded');
        }
        await this.finalizeCallByKey(key, { settlePartialMinute: false });
        continue;
      }

      const elapsedMs = now - session.startedAt;
      const fullyCompletedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
      const minutesToSettle = fullyCompletedMinutes - session.settledMinutes;
      if (minutesToSettle <= 0) {
        continue;
      }

      await this.settleCallMinutesByKey(key, minutesToSettle);
    }
  }

  private async settleCallMinutesByKey(key: string, minutesToSettle: number) {
    const session = this.activeCallSessions.get(key);
    if (!session || minutesToSettle <= 0 || session.isSettling) {
      return;
    }

    session.isSettling = true;
    try {
      const coinsToTransfer = minutesToSettle * COINS_PER_MINUTE;
      const settlement = await this.usersService.settleFriendCircleCallCoins(
        session.callerId,
        session.partnerId,
        coinsToTransfer,
      );

      session.settledMinutes += minutesToSettle;
      session.chargedCoinsTotal += settlement.debitedCoins;
      session.earnedCoinsTotal += settlement.debitedCoins;

      const callerSocketId = this.getSocketIdForUser(session.callerId);
      if (callerSocketId) {
        this.server.to(callerSocketId).emit('callCoinsSettled', {
          minutes: session.settledMinutes,
          rate: COINS_PER_MINUTE,
          chargedCoins: session.chargedCoinsTotal,
          chargedCoinsDelta: settlement.debitedCoins,
          walletBalance: settlement.callerWalletBalance,
        });
      }

      const partnerSocketId = this.getSocketIdForUser(session.partnerId);
      if (partnerSocketId) {
        this.server.to(partnerSocketId).emit('callEarningsCredited', {
          minutes: session.settledMinutes,
          rate: COINS_PER_MINUTE,
          creditedCoins: session.earnedCoinsTotal,
          creditedCoinsDelta: settlement.debitedCoins,
          walletBalance: settlement.partnerWalletBalance,
          totalEarnings: settlement.partnerTotalEarnings,
        });
      }

      if (settlement.callerWalletBalance <= 0) {
        if (session.lowCoinsWarningAt == null) {
          session.lowCoinsWarningAt = Date.now();
          if (callerSocketId) {
            this.server.to(callerSocketId).emit('lowCoinsWarning', {
              message: 'Coins are insufficient to continue the call. Please add coins.',
              graceSeconds: Math.floor(LOW_COINS_GRACE_MS / 1000),
            });
          }
          if (partnerSocketId) {
            this.server.to(partnerSocketId).emit('lowCoinsWarning', {
              message: 'The user you are talking to has insufficient balance. Call will end soon.',
              graceSeconds: Math.floor(LOW_COINS_GRACE_MS / 1000),
            });
          }
        }
      }
    } finally {
      const latestSession = this.activeCallSessions.get(key);
      if (latestSession) {
        latestSession.isSettling = false;
      }
    }
  }

  private async finalizeCallForUser(userId: string) {
    const active = this.findActiveCallByUser(userId);
    if (!active) {
      return;
    }
    await this.finalizeCallByKey(active.key);
  }

  private getSocketIdForUser(userId: string): string | undefined {
    return this.userToSocket.get(userId);
  }

  @SubscribeMessage('getLiveUsers')
  async handleGetLiveUsers(client: Socket) {
    const users = await this.usersService.findLiveFemaleUsers();
    client.emit('liveUsers', users.map(user => ({
      id: (user as any)._id ?? (user as any).id,
      name: user.name,
      phone: user.phone,
      gender: user.gender,
      role: user.role,
      isOnline: user.isOnline,
    })));
  }

  @SubscribeMessage('callPartner')
  async handleCallPartner(client: Socket, payload: { targetId: string; source?: CallSource }) {
    const callerId = this.socketToUser.get(client.id);
    if (!callerId) {
      return;
    }

    const source: CallSource = payload?.source === 'room' ? 'room' : 'friend';

    const targetSocketId = this.getSocketIdForUser(payload.targetId);
    if (!targetSocketId) {
      client.emit('callFailed', { reason: 'Partner is currently offline' });
      return;
    }

    const caller = await this.usersService.findById(callerId);
    if (!caller) {
      client.emit('callFailed', { reason: 'Caller profile not found' });
      return;
    }

    if (source === 'friend') {
      const callerWallet = caller.walletBalance ?? 0;
      if (callerWallet <= 0) {
        client.emit('callFailed', {
          reason: 'Insufficient coins. Please deposit before starting a call.',
        });
        return;
      }
    }

    this.server.to(targetSocketId).emit('incomingCall', {
      callerId,
      callerName: caller.name,
      callerPhone: caller.phone,
      source,
    });
  }

  @SubscribeMessage('acceptCall')
  async handleAcceptCall(client: Socket, payload: { callerId: string; source?: CallSource }) {
    const partnerId = this.socketToUser.get(client.id);
    if (!partnerId) {
      return;
    }

    const source: CallSource = payload?.source === 'room' ? 'room' : 'friend';

    const callerSocketId = this.getSocketIdForUser(payload.callerId);
    if (!callerSocketId) {
      client.emit('callFailed', { reason: 'Caller is no longer online' });
      return;
    }

    const partner = await this.usersService.findById(partnerId);
    if (!partner) {
      client.emit('callFailed', { reason: 'Partner profile not found' });
      return;
    }

    const caller = await this.usersService.findById(payload.callerId);
    if (!caller) {
      client.emit('callFailed', { reason: 'Caller profile not found' });
      return;
    }

    if (source === 'friend') {
      const callerWallet = caller.walletBalance ?? 0;
      if (callerWallet <= 0) {
        const callerSocketIdForError = this.getSocketIdForUser(payload.callerId);
        if (callerSocketIdForError) {
          this.server.to(callerSocketIdForError).emit('callFailed', {
            reason: 'Insufficient coins. Please deposit before starting a call.',
          });
        }
        client.emit('callFailed', {
          reason: 'Caller has insufficient coins to start this call.',
        });
        return;
      }

      const sessionKey = this.buildCallKey(payload.callerId, partnerId);
      if (!this.activeCallSessions.has(sessionKey)) {
        this.activeCallSessions.set(sessionKey, {
          callerId: payload.callerId,
          partnerId,
          callerName: caller.name,
          partnerName: partner.name,
          startedAt: Date.now(),
          settledMinutes: 0,
          chargedCoinsTotal: 0,
          earnedCoinsTotal: 0,
          isSettling: false,
          lowCoinsWarningAt: null,
        });
      }
    }

    this.server.to(callerSocketId).emit('callAccepted', {
      partnerId,
      partnerName: partner.name,
      partnerPhone: partner.phone,
    });
    client.emit('callStarted', {
      callerId: payload.callerId,
      callerName: partner.name,
    });
  }

  @SubscribeMessage('rejectCall')
  async handleRejectCall(client: Socket, payload: { callerId: string }) {
    const partnerId = this.socketToUser.get(client.id);
    if (!partnerId) {
      return;
    }

    const callerSocketId = this.getSocketIdForUser(payload.callerId);
    if (!callerSocketId) {
      client.emit('callFailed', { reason: 'Caller is no longer online' });
      return;
    }

    this.server.to(callerSocketId).emit('callFailed', {
      reason: 'Partner declined the call',
    });
  }

  @SubscribeMessage('endCall')
  async handleEndCall(client: Socket, payload: { targetId: string }) {
    const fromUserId = this.socketToUser.get(client.id);
    if (fromUserId && payload?.targetId) {
      const directKey = this.buildCallKey(fromUserId, payload.targetId);
      const reverseKey = this.buildCallKey(payload.targetId, fromUserId);
      if (this.activeCallSessions.has(directKey)) {
        await this.finalizeCallByKey(directKey);
      } else if (this.activeCallSessions.has(reverseKey)) {
        await this.finalizeCallByKey(reverseKey);
      } else {
        await this.finalizeCallForUser(fromUserId);
      }
    }

    const targetSocketId = this.getSocketIdForUser(payload.targetId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('callEnded');
    }
  }

  @SubscribeMessage('webrtcOffer')
  async handleWebrtcOffer(client: Socket, payload: { targetId: string; offer: any }) {
    const targetSocketId = this.getSocketIdForUser(payload.targetId);
    if (!targetSocketId) {
      client.emit('callFailed', { reason: 'Target partner is not available for call setup' });
      return;
    }
    this.server.to(targetSocketId).emit('offer', {
      from: this.socketToUser.get(client.id),
      offer: payload.offer,
    });
  }

  @SubscribeMessage('webrtcAnswer')
  async handleWebrtcAnswer(client: Socket, payload: { targetId: string; answer: any }) {
    const targetSocketId = this.getSocketIdForUser(payload.targetId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('answer', {
        from: this.socketToUser.get(client.id),
        answer: payload.answer,
      });
    }
  }

  @SubscribeMessage('webrtcCandidate')
  async handleWebrtcCandidate(client: Socket, payload: { targetId: string; candidate: any }) {
    const targetSocketId = this.getSocketIdForUser(payload.targetId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('candidate', {
        from: this.socketToUser.get(client.id),
        candidate: payload.candidate,
      });
    }
  }

  @SubscribeMessage('audioChunk')
  async handleAudioChunk(client: Socket, payload: { to: string; data: any }) {
    const targetSocketId = this.getSocketIdForUser(payload.to);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('audioChunk', {
        from: this.socketToUser.get(client.id),
        data: payload.data,
      });
    }
  }

  @SubscribeMessage('sendDirectChatMessage')
  async handleSendDirectChatMessage(
    client: Socket,
    payload: { targetId: string; message: string },
  ) {
    const fromUserId = this.socketToUser.get(client.id);
    if (!fromUserId) {
      return;
    }

    const rawMessage = payload?.message?.toString() ?? '';
    const message = rawMessage.trim();
    if (!payload?.targetId || !message) {
      return;
    }

    const targetSocketId = this.getSocketIdForUser(payload.targetId);
    if (!targetSocketId) {
      client.emit('callFailed', { reason: 'Partner is offline for live chat' });
      return;
    }

    const sender = await this.usersService.findById(fromUserId);
    const fromName = sender?.name ?? 'User';
    const sentAt = new Date().toISOString();

    this.server.to(targetSocketId).emit('incomingDirectChatMessage', {
      fromId: fromUserId,
      fromName,
      message,
      sentAt,
    });

    client.emit('directChatMessageAck', {
      toId: payload.targetId,
      message,
      sentAt,
    });
  }

  private async broadcastLiveUsers() {
    const users = await this.usersService.findLiveFemaleUsers();
    this.server.emit('liveUsers', users.map(user => ({
      id: (user as any)._id ?? (user as any).id,
      name: user.name,
      phone: user.phone,
      gender: user.gender,
      role: user.role,
      isOnline: user.isOnline,
    })));
  }
}

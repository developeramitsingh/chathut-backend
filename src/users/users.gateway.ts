import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private socketToUser = new Map<string, string>();
  private userToSocket = new Map<string, string>();

  constructor(private readonly usersService: UsersService, private readonly configService: ConfigService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth['token'] as string | undefined;
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
    this.socketToUser.delete(client.id);
    this.userToSocket.delete(userId);
    await this.usersService.setOnlineStatus(userId, false);
    this.broadcastLiveUsers();
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
  async handleCallPartner(client: Socket, payload: { targetId: string }) {
    const callerId = this.socketToUser.get(client.id);
    if (!callerId) {
      return;
    }

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

    this.server.to(targetSocketId).emit('incomingCall', {
      callerId,
      callerName: caller.name,
      callerPhone: caller.phone,
    });
  }

  @SubscribeMessage('acceptCall')
  async handleAcceptCall(client: Socket, payload: { callerId: string }) {
    const partnerId = this.socketToUser.get(client.id);
    if (!partnerId) {
      return;
    }

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

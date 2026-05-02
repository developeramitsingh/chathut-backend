"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = require("jsonwebtoken");
const config_1 = require("@nestjs/config");
const users_service_1 = require("./users.service");
const wallet_constants_1 = require("./constants/wallet.constants");
const LOW_COINS_GRACE_MS = 10000;
let UsersGateway = class UsersGateway {
    constructor(usersService, configService) {
        this.usersService = usersService;
        this.configService = configService;
        this.socketToUser = new Map();
        this.userToSocket = new Map();
        this.activeCallSessions = new Map();
    }
    onModuleInit() {
        this.callBillingTicker = setInterval(() => {
            void this.settleLiveCallMinutes();
        }, 5000);
    }
    onModuleDestroy() {
        clearInterval(this.callBillingTicker);
    }
    async handleConnection(client) {
        const token = (client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', ''));
        if (!token) {
            client.disconnect(true);
            return;
        }
        const secret = this.configService.get('JWT_SECRET') || 'supersecretkey';
        try {
            const payload = (0, jsonwebtoken_1.verify)(token, secret);
            const userId = payload.sub;
            this.socketToUser.set(client.id, userId);
            this.userToSocket.set(userId, client.id);
            await this.usersService.setOnlineStatus(userId, true);
            this.broadcastLiveUsers();
        }
        catch (_) {
            client.disconnect(true);
        }
    }
    async handleDisconnect(client) {
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
    buildCallKey(callerId, partnerId) {
        return `${callerId}:${partnerId}`;
    }
    findActiveCallByUser(userId) {
        for (const [key, session] of this.activeCallSessions.entries()) {
            if (session.callerId === userId || session.partnerId === userId) {
                return { key, session };
            }
        }
        return null;
    }
    async finalizeCallByKey(key, options) {
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
    async settleLiveCallMinutes() {
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
    async settleCallMinutesByKey(key, minutesToSettle) {
        const session = this.activeCallSessions.get(key);
        if (!session || minutesToSettle <= 0 || session.isSettling) {
            return;
        }
        session.isSettling = true;
        try {
            const coinsToTransfer = minutesToSettle * wallet_constants_1.COINS_PER_MINUTE;
            const settlement = await this.usersService.settleFriendCircleCallCoins(session.callerId, session.partnerId, coinsToTransfer);
            session.settledMinutes += minutesToSettle;
            session.chargedCoinsTotal += settlement.debitedCoins;
            session.earnedCoinsTotal += settlement.debitedCoins;
            const callerSocketId = this.getSocketIdForUser(session.callerId);
            if (callerSocketId) {
                this.server.to(callerSocketId).emit('callCoinsSettled', {
                    minutes: session.settledMinutes,
                    rate: wallet_constants_1.COINS_PER_MINUTE,
                    chargedCoins: session.chargedCoinsTotal,
                    chargedCoinsDelta: settlement.debitedCoins,
                    walletBalance: settlement.callerWalletBalance,
                });
            }
            const partnerSocketId = this.getSocketIdForUser(session.partnerId);
            if (partnerSocketId) {
                this.server.to(partnerSocketId).emit('callEarningsCredited', {
                    minutes: session.settledMinutes,
                    rate: wallet_constants_1.COINS_PER_MINUTE,
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
        }
        finally {
            const latestSession = this.activeCallSessions.get(key);
            if (latestSession) {
                latestSession.isSettling = false;
            }
        }
    }
    async finalizeCallForUser(userId) {
        const active = this.findActiveCallByUser(userId);
        if (!active) {
            return;
        }
        await this.finalizeCallByKey(active.key);
    }
    getSocketIdForUser(userId) {
        return this.userToSocket.get(userId);
    }
    async handleGetLiveUsers(client) {
        const users = await this.usersService.findLiveFemaleUsers();
        client.emit('liveUsers', users.map(user => ({
            id: user._id ?? user.id,
            name: user.name,
            phone: user.phone,
            gender: user.gender,
            role: user.role,
            isOnline: user.isOnline,
        })));
    }
    async handleCallPartner(client, payload) {
        const callerId = this.socketToUser.get(client.id);
        if (!callerId) {
            return;
        }
        const source = payload?.source === 'room' ? 'room' : 'friend';
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
    async handleAcceptCall(client, payload) {
        const partnerId = this.socketToUser.get(client.id);
        if (!partnerId) {
            return;
        }
        const source = payload?.source === 'room' ? 'room' : 'friend';
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
    async handleRejectCall(client, payload) {
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
    async handleEndCall(client, payload) {
        const fromUserId = this.socketToUser.get(client.id);
        if (fromUserId && payload?.targetId) {
            const directKey = this.buildCallKey(fromUserId, payload.targetId);
            const reverseKey = this.buildCallKey(payload.targetId, fromUserId);
            if (this.activeCallSessions.has(directKey)) {
                await this.finalizeCallByKey(directKey);
            }
            else if (this.activeCallSessions.has(reverseKey)) {
                await this.finalizeCallByKey(reverseKey);
            }
            else {
                await this.finalizeCallForUser(fromUserId);
            }
        }
        const targetSocketId = this.getSocketIdForUser(payload.targetId);
        if (targetSocketId) {
            this.server.to(targetSocketId).emit('callEnded');
        }
    }
    async handleWebrtcOffer(client, payload) {
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
    async handleWebrtcAnswer(client, payload) {
        const targetSocketId = this.getSocketIdForUser(payload.targetId);
        if (targetSocketId) {
            this.server.to(targetSocketId).emit('answer', {
                from: this.socketToUser.get(client.id),
                answer: payload.answer,
            });
        }
    }
    async handleWebrtcCandidate(client, payload) {
        const targetSocketId = this.getSocketIdForUser(payload.targetId);
        if (targetSocketId) {
            this.server.to(targetSocketId).emit('candidate', {
                from: this.socketToUser.get(client.id),
                candidate: payload.candidate,
            });
        }
    }
    async handleAudioChunk(client, payload) {
        const targetSocketId = this.getSocketIdForUser(payload.to);
        if (targetSocketId) {
            this.server.to(targetSocketId).emit('audioChunk', {
                from: this.socketToUser.get(client.id),
                data: payload.data,
            });
        }
    }
    async handleSendDirectChatMessage(client, payload) {
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
    async broadcastLiveUsers() {
        const users = await this.usersService.findLiveFemaleUsers();
        this.server.emit('liveUsers', users.map(user => ({
            id: user._id ?? user.id,
            name: user.name,
            phone: user.phone,
            gender: user.gender,
            role: user.role,
            isOnline: user.isOnline,
        })));
    }
};
exports.UsersGateway = UsersGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], UsersGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('getLiveUsers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], UsersGateway.prototype, "handleGetLiveUsers", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('callPartner'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], UsersGateway.prototype, "handleCallPartner", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('acceptCall'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], UsersGateway.prototype, "handleAcceptCall", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('rejectCall'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], UsersGateway.prototype, "handleRejectCall", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('endCall'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], UsersGateway.prototype, "handleEndCall", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('webrtcOffer'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], UsersGateway.prototype, "handleWebrtcOffer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('webrtcAnswer'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], UsersGateway.prototype, "handleWebrtcAnswer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('webrtcCandidate'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], UsersGateway.prototype, "handleWebrtcCandidate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('audioChunk'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], UsersGateway.prototype, "handleAudioChunk", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendDirectChatMessage'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], UsersGateway.prototype, "handleSendDirectChatMessage", null);
exports.UsersGateway = UsersGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    }),
    __metadata("design:paramtypes", [users_service_1.UsersService, config_1.ConfigService])
], UsersGateway);
//# sourceMappingURL=users.gateway.js.map
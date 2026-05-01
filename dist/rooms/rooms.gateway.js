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
exports.RoomsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
let RoomsGateway = class RoomsGateway {
    constructor(jwtService) {
        this.jwtService = jwtService;
        this.userSocketMap = new Map();
        this.socketUserMap = new Map();
    }
    handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token)
                return;
            const payload = this.jwtService.verify(token);
            const userId = payload.sub?.toString();
            if (userId) {
                this.userSocketMap.set(userId, client.id);
                this.socketUserMap.set(client.id, userId);
            }
        }
        catch {
        }
    }
    handleDisconnect(client) {
        const userId = this.socketUserMap.get(client.id);
        if (userId) {
            this.userSocketMap.delete(userId);
            this.socketUserMap.delete(client.id);
        }
    }
    handleSubscribeRoom(client, payload) {
        if (payload?.roomId) {
            client.join(payload.roomId);
        }
    }
    handleUnsubscribeRoom(client, payload) {
        if (payload?.roomId) {
            client.leave(payload.roomId);
        }
    }
    broadcastRoomUpdate(room) {
        let roomId = room._id?.toString() || room.id?.toString();
        if (!roomId)
            return;
        this.server.to(roomId).emit('roomUpdated', room);
    }
};
exports.RoomsGateway = RoomsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RoomsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribeRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RoomsGateway.prototype, "handleSubscribeRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribeRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RoomsGateway.prototype, "handleUnsubscribeRoom", null);
exports.RoomsGateway = RoomsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], RoomsGateway);
//# sourceMappingURL=rooms.gateway.js.map
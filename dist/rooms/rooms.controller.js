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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsController = void 0;
const common_1 = require("@nestjs/common");
const rooms_service_1 = require("./rooms.service");
const create_room_dto_1 = require("./dto/create-room.dto");
const join_room_dto_1 = require("./dto/join-room.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const users_service_1 = require("../users/users.service");
const rooms_gateway_1 = require("./rooms.gateway");
const remove_participant_dto_1 = require("./dto/remove-participant.dto");
let RoomsController = class RoomsController {
    constructor(roomsService, usersService, roomsGateway) {
        this.roomsService = roomsService;
        this.usersService = usersService;
        this.roomsGateway = roomsGateway;
    }
    async findAll() {
        return this.roomsService.findAll();
    }
    async findOne(id) {
        return this.roomsService.findById(id);
    }
    async create(createRoomDto, req) {
        const user = await this.usersService.findById(req.user.sub);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const room = await this.roomsService.create(createRoomDto.name, user);
        this.roomsGateway.broadcastRoomUpdate(room);
        return room;
    }
    async join(id, joinRoomDto, req) {
        const user = await this.usersService.findById(req.user.sub);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const room = await this.roomsService.join(id, user, joinRoomDto.role);
        this.roomsGateway.broadcastRoomUpdate(room);
        return room;
    }
    async requestJoin(id, joinRoomDto, req) {
        const user = await this.usersService.findById(req.user.sub);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const room = await this.roomsService.requestJoin(id, user, joinRoomDto.role);
        this.roomsGateway.broadcastRoomUpdate(room);
        return room;
    }
    async approveJoinRequest(id, userId, req) {
        const room = await this.roomsService.approveJoinRequest(id, req.user.sub, userId);
        this.roomsGateway.broadcastRoomUpdate(room);
        return room;
    }
    async rejectJoinRequest(id, userId, req) {
        const room = await this.roomsService.rejectJoinRequest(id, req.user.sub, userId);
        this.roomsGateway.broadcastRoomUpdate(room);
        return room;
    }
    async removeParticipant(id, dto, req) {
        const room = await this.roomsService.removeParticipantByHost(id, req.user.sub, dto.userId);
        this.roomsGateway.broadcastRoomUpdate(room);
        return room;
    }
    async leave(id, req) {
        const user = await this.usersService.findById(req.user.sub);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const room = await this.roomsService.leave(id, user);
        this.roomsGateway.broadcastRoomUpdate(room);
        return room;
    }
    async deleteRoom(id, req) {
        await this.roomsService.deleteRoomByHost(id, req.user.sub);
        return { success: true };
    }
};
exports.RoomsController = RoomsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "findOne", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_room_dto_1.CreateRoomDto, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/join'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, join_room_dto_1.JoinRoomDto, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "join", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/request-join'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, join_room_dto_1.JoinRoomDto, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "requestJoin", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/requests/:userId/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "approveJoinRequest", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/requests/:userId/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "rejectJoinRequest", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/remove-participant'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, remove_participant_dto_1.RemoveParticipantDto, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "removeParticipant", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/leave'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "leave", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "deleteRoom", null);
exports.RoomsController = RoomsController = __decorate([
    (0, common_1.Controller)('rooms'),
    __metadata("design:paramtypes", [rooms_service_1.RoomsService,
        users_service_1.UsersService,
        rooms_gateway_1.RoomsGateway])
], RoomsController);
//# sourceMappingURL=rooms.controller.js.map
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
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const room_schema_1 = require("./room.schema");
let RoomsService = class RoomsService {
    constructor(roomModel) {
        this.roomModel = roomModel;
    }
    async findAll() {
        return this.roomModel.find().lean();
    }
    async findById(id) {
        return this.roomModel.findById(id).lean();
    }
    async create(name, user) {
        const created = new this.roomModel({
            name,
            hostId: user._id.toString(),
            hostName: user.name,
            hostGender: user.gender || 'unknown',
            femaleSpeaker: null,
            otherSpeaker: null,
            listeners: 0,
            queue: [],
            joinRequests: [],
            participants: [],
            isLive: true,
        });
        return created.save();
    }
    async join(roomId, user, role) {
        const room = await this.roomModel.findById(roomId);
        if (!room) {
            throw new common_1.BadRequestException('Room not found');
        }
        const userId = user._id.toString();
        if (room.hostId !== userId) {
            throw new common_1.ForbiddenException('Host approval is required before joining this room');
        }
        if (room.hostId === userId) {
            throw new common_1.ConflictException('Host is already in the room');
        }
        this.validateJoinRoleForUser(role, user);
        this.applyRoleToRoom(room, userId, user.name, role);
        this.syncListenerCount(room);
        return room.save();
    }
    async requestJoin(roomId, user, role) {
        const room = await this.roomModel.findById(roomId);
        if (!room) {
            throw new common_1.BadRequestException('Room not found');
        }
        const userId = user._id.toString();
        if (room.hostId === userId) {
            throw new common_1.ConflictException('Host is already in the room');
        }
        this.validateJoinRoleForUser(role, user);
        if (this.isActiveInRoom(room, userId)) {
            throw new common_1.ConflictException('You already have a role or position in this room');
        }
        if (room.joinRequests.some((entry) => entry.userId === userId)) {
            throw new common_1.ConflictException('You already have a pending join request');
        }
        room.joinRequests.push({ userId, userName: user.name, role });
        return room.save();
    }
    async approveJoinRequest(roomId, hostId, targetUserId) {
        const room = await this.roomModel.findById(roomId);
        if (!room) {
            throw new common_1.BadRequestException('Room not found');
        }
        this.ensureHost(room, hostId);
        const reqIndex = room.joinRequests.findIndex((entry) => entry.userId === targetUserId);
        if (reqIndex === -1) {
            throw new common_1.BadRequestException('Join request not found');
        }
        const request = room.joinRequests[reqIndex];
        room.joinRequests.splice(reqIndex, 1);
        this.applyRoleToRoom(room, request.userId, request.userName, request.role);
        this.syncListenerCount(room);
        return room.save();
    }
    async rejectJoinRequest(roomId, hostId, targetUserId) {
        const room = await this.roomModel.findById(roomId);
        if (!room) {
            throw new common_1.BadRequestException('Room not found');
        }
        this.ensureHost(room, hostId);
        const reqIndex = room.joinRequests.findIndex((entry) => entry.userId === targetUserId);
        if (reqIndex === -1) {
            throw new common_1.BadRequestException('Join request not found');
        }
        room.joinRequests.splice(reqIndex, 1);
        return room.save();
    }
    async removeParticipantByHost(roomId, hostId, targetUserId) {
        const room = await this.roomModel.findById(roomId);
        if (!room) {
            throw new common_1.BadRequestException('Room not found');
        }
        this.ensureHost(room, hostId);
        if (targetUserId === room.hostId) {
            throw new common_1.BadRequestException('Host cannot remove themselves');
        }
        const changed = this.removeUserFromRoom(room, targetUserId);
        if (!changed) {
            throw new common_1.ConflictException('User is not part of this room');
        }
        this.syncListenerCount(room);
        return room.save();
    }
    async deleteRoomByHost(roomId, hostId) {
        const room = await this.roomModel.findById(roomId);
        if (!room) {
            throw new common_1.BadRequestException('Room not found');
        }
        this.ensureHost(room, hostId);
        await room.deleteOne();
    }
    async leave(roomId, user) {
        const room = await this.roomModel.findById(roomId);
        if (!room) {
            throw new common_1.BadRequestException('Room not found');
        }
        const userId = user._id.toString();
        const changed = this.removeUserFromRoom(room, userId);
        if (!changed) {
            throw new common_1.ConflictException('You are not part of this room');
        }
        this.syncListenerCount(room);
        return room.save();
    }
    ensureHost(room, hostId) {
        if (room.hostId !== hostId) {
            throw new common_1.ForbiddenException('Only host can perform this action');
        }
    }
    validateJoinRoleForUser(role, user) {
        if (role === 'femaleSpeaker') {
            if (user.role !== 'partner' || user.gender !== 'female') {
                throw new common_1.BadRequestException('Only partner female users can join as the female speaker');
            }
            return;
        }
        if (role === 'coSpeaker' || role === 'normalSpeaker') {
            if (user.role !== 'user') {
                throw new common_1.BadRequestException('Only normal users can join as the guest speaker');
            }
            return;
        }
    }
    isActiveInRoom(room, userId) {
        return (room.femaleSpeakerId === userId ||
            room.otherSpeakerId === userId ||
            room.queue.some((entry) => entry.userId === userId) ||
            room.participants.some((entry) => entry.userId === userId));
    }
    upsertParticipant(room, userId, userName, role) {
        const index = room.participants.findIndex((entry) => entry.userId === userId);
        if (index >= 0) {
            room.participants[index] = { userId, userName, role };
            return;
        }
        room.participants.push({ userId, userName, role });
    }
    applyRoleToRoom(room, userId, userName, role) {
        if (this.isActiveInRoom(room, userId)) {
            throw new common_1.ConflictException('User already has a role or position in this room');
        }
        if (role === 'femaleSpeaker') {
            if (room.femaleSpeakerId) {
                throw new common_1.ConflictException('Female speaker slot is already taken');
            }
            room.femaleSpeaker = userName;
            room.femaleSpeakerId = userId;
            this.upsertParticipant(room, userId, userName, 'femaleSpeaker');
            return;
        }
        if (role === 'coSpeaker' || role === 'normalSpeaker') {
            if (room.otherSpeakerId) {
                room.queue.push({ userId, userName });
                this.upsertParticipant(room, userId, userName, 'queue');
            }
            else {
                room.otherSpeaker = userName;
                room.otherSpeakerId = userId;
                this.upsertParticipant(room, userId, userName, 'coSpeaker');
            }
            return;
        }
        this.upsertParticipant(room, userId, userName, 'listener');
    }
    removeUserFromRoom(room, userId) {
        let changed = false;
        const requestIndex = room.joinRequests.findIndex((entry) => entry.userId === userId);
        if (requestIndex !== -1) {
            room.joinRequests.splice(requestIndex, 1);
            changed = true;
        }
        if (room.femaleSpeakerId === userId) {
            room.femaleSpeaker = null;
            room.femaleSpeakerId = null;
            changed = true;
        }
        if (room.otherSpeakerId === userId) {
            if (room.queue.length > 0) {
                const next = room.queue.shift();
                room.otherSpeaker = next.userName;
                room.otherSpeakerId = next.userId;
                this.upsertParticipant(room, next.userId, next.userName, 'coSpeaker');
            }
            else {
                room.otherSpeaker = null;
                room.otherSpeakerId = null;
            }
            changed = true;
        }
        const queueIndex = room.queue.findIndex((entry) => entry.userId === userId);
        if (queueIndex !== -1) {
            room.queue.splice(queueIndex, 1);
            changed = true;
        }
        const participantIndex = room.participants.findIndex((entry) => entry.userId === userId);
        if (participantIndex !== -1) {
            room.participants.splice(participantIndex, 1);
            changed = true;
        }
        return changed;
    }
    syncListenerCount(room) {
        room.listeners = room.participants.filter((entry) => entry.role === 'listener').length;
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(room_schema_1.Room.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map
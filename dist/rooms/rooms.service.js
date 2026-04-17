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
        if (room.hostId === userId) {
            throw new common_1.ConflictException('Host is already in the room');
        }
        if (room.femaleSpeakerId === userId ||
            room.otherSpeakerId === userId ||
            room.queue.some(entry => entry.userId === userId)) {
            throw new common_1.ConflictException('You already have a role or position in this room');
        }
        if (role === 'femaleSpeaker') {
            if (user.role !== 'partner' || user.gender !== 'female') {
                throw new common_1.BadRequestException('Only partner female users can join as the female speaker');
            }
            if (room.femaleSpeakerId) {
                throw new common_1.ConflictException('Female speaker slot is already taken');
            }
            room.femaleSpeaker = user.name;
            room.femaleSpeakerId = userId;
        }
        else if (role === 'coSpeaker' || role === 'normalSpeaker') {
            if (user.role !== 'user') {
                throw new common_1.BadRequestException('Only normal users can join as the guest speaker');
            }
            if (room.otherSpeakerId) {
                room.queue.push({ userId, userName: user.name });
            }
            else {
                room.otherSpeaker = user.name;
                room.otherSpeakerId = userId;
            }
        }
        else {
            room.listeners += 1;
        }
        return room.save();
    }
    async leave(roomId, user) {
        const room = await this.roomModel.findById(roomId);
        if (!room) {
            throw new common_1.BadRequestException('Room not found');
        }
        const userId = user._id.toString();
        let changed = false;
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
            }
            else {
                room.otherSpeaker = null;
                room.otherSpeakerId = null;
            }
            changed = true;
        }
        const queueIndex = room.queue.findIndex(entry => entry.userId === userId);
        if (queueIndex !== -1) {
            room.queue.splice(queueIndex, 1);
            changed = true;
        }
        if (!changed) {
            if (room.listeners > 0) {
                room.listeners = Math.max(0, room.listeners - 1);
                changed = true;
            }
        }
        if (!changed) {
            throw new common_1.ConflictException('You are not part of this room');
        }
        return room.save();
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(room_schema_1.Room.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map
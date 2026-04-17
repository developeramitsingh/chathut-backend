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
    async onModuleInit() {
        const count = await this.roomModel.countDocuments().exec();
        if (count === 0) {
            await this.roomModel.insertMany([
                {
                    name: 'Morning Vibes',
                    hostId: 'default-host-1',
                    hostName: 'Sia',
                    hostGender: 'female',
                    femaleSpeaker: 'Ari',
                    otherSpeaker: 'Jay',
                    listeners: 980,
                    isLive: true,
                },
                {
                    name: 'Chill Beats',
                    hostId: 'default-host-2',
                    hostName: 'Rohan',
                    hostGender: 'male',
                    femaleSpeaker: 'Nina',
                    otherSpeaker: null,
                    listeners: 1430,
                    isLive: true,
                },
                {
                    name: 'Trending Talk',
                    hostId: 'default-host-3',
                    hostName: 'Mira',
                    hostGender: 'female',
                    femaleSpeaker: null,
                    otherSpeaker: 'Sam',
                    listeners: 628,
                    isLive: true,
                },
            ]);
        }
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
            hostGender: user.gender,
            femaleSpeaker: null,
            otherSpeaker: null,
            listeners: 0,
            isLive: true,
        });
        return created.save();
    }
    async join(roomId, user, role) {
        const room = await this.roomModel.findById(roomId);
        if (!room) {
            throw new common_1.BadRequestException('Room not found');
        }
        if (room.hostId === user._id.toString()) {
            throw new common_1.ConflictException('Host is already in the room');
        }
        if (room.femaleSpeaker === user.name || room.otherSpeaker === user.name) {
            throw new common_1.ConflictException('You already have a role in this room');
        }
        if (role === 'femaleSpeaker') {
            if (user.gender !== 'female') {
                throw new common_1.BadRequestException('Only female users can join as the female speaker');
            }
            if (room.femaleSpeaker) {
                throw new common_1.ConflictException('Female speaker slot is already taken');
            }
            room.femaleSpeaker = user.name;
        }
        else if (role === 'coSpeaker') {
            if (room.otherSpeaker) {
                throw new common_1.ConflictException('Co-speaker slot is already taken');
            }
            room.otherSpeaker = user.name;
        }
        else {
            room.listeners += 1;
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
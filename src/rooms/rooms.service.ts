import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from './room.schema';
import { UserDocument } from '../users/user.schema';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>) {}

  async findAll(): Promise<Room[]> {
    return this.roomModel.find().lean();
  }

  async findById(id: string): Promise<Room | null> {
    return this.roomModel.findById(id).lean();
  }

  async create(name: string, user: UserDocument): Promise<Room> {
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

  async join(roomId: string, user: UserDocument, role: 'listener' | 'femaleSpeaker' | 'coSpeaker' | 'normalSpeaker'): Promise<Room> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    const userId = user._id.toString();
    if (room.hostId === userId) {
      throw new ConflictException('Host is already in the room');
    }

    if (
      room.femaleSpeakerId === userId ||
      room.otherSpeakerId === userId ||
      room.queue.some(entry => entry.userId === userId)
    ) {
      throw new ConflictException('You already have a role or position in this room');
    }

    if (role === 'femaleSpeaker') {
      if (user.role !== 'partner' || user.gender !== 'female') {
        throw new BadRequestException('Only partner female users can join as the female speaker');
      }
      if (room.femaleSpeakerId) {
        throw new ConflictException('Female speaker slot is already taken');
      }
      room.femaleSpeaker = user.name;
      room.femaleSpeakerId = userId;
    } else if (role === 'coSpeaker' || role === 'normalSpeaker') {
      if (user.role !== 'user') {
        throw new BadRequestException('Only normal users can join as the guest speaker');
      }
      if (room.otherSpeakerId) {
        room.queue.push({ userId, userName: user.name });
      } else {
        room.otherSpeaker = user.name;
        room.otherSpeakerId = userId;
      }
    } else {
      room.listeners += 1;
    }

    return room.save();
  }

  async leave(roomId: string, user: UserDocument): Promise<Room> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
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
      } else {
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
      throw new ConflictException('You are not part of this room');
    }

    return room.save();
  }
}

import { Injectable, BadRequestException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from './room.schema';
import { UserDocument } from '../users/user.schema';

@Injectable()
export class RoomsService implements OnModuleInit {
  constructor(@InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>) {}

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
      hostGender: user.gender,
      femaleSpeaker: null,
      otherSpeaker: null,
      listeners: 0,
      isLive: true,
    });
    return created.save();
  }

  async join(roomId: string, user: UserDocument, role: 'listener' | 'femaleSpeaker' | 'coSpeaker'): Promise<Room> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    if (room.hostId === user._id.toString()) {
      throw new ConflictException('Host is already in the room');
    }

    if (room.femaleSpeaker === user.name || room.otherSpeaker === user.name) {
      throw new ConflictException('You already have a role in this room');
    }

    if (role === 'femaleSpeaker') {
      if (user.gender !== 'female') {
        throw new BadRequestException('Only female users can join as the female speaker');
      }
      if (room.femaleSpeaker) {
        throw new ConflictException('Female speaker slot is already taken');
      }
      room.femaleSpeaker = user.name;
    } else if (role === 'coSpeaker') {
      if (room.otherSpeaker) {
        throw new ConflictException('Co-speaker slot is already taken');
      }
      room.otherSpeaker = user.name;
    } else {
      room.listeners += 1;
    }

    return room.save();
  }
}

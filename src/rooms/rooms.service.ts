import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from './room.schema';
import { UserDocument } from '../users/user.schema';

type JoinRole = 'listener' | 'femaleSpeaker' | 'coSpeaker' | 'normalSpeaker';
type ActiveRole = 'listener' | 'femaleSpeaker' | 'coSpeaker' | 'queue';

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
      joinRequests: [],
      participants: [],
      isLive: true,
    });
    return created.save();
  }

  async join(roomId: string, user: UserDocument, role: JoinRole): Promise<Room> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    const userId = user._id.toString();
    if (room.hostId !== userId) {
      throw new ForbiddenException('Host approval is required before joining this room');
    }
    if (room.hostId === userId) {
      throw new ConflictException('Host is already in the room');
    }

    this.validateJoinRoleForUser(role, user);
    this.applyRoleToRoom(room, userId, user.name, role);
    this.syncListenerCount(room);
    return room.save();
  }

  async requestJoin(roomId: string, user: UserDocument, role: JoinRole): Promise<Room> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    const userId = user._id.toString();
    if (room.hostId === userId) {
      throw new ConflictException('Host is already in the room');
    }

    this.validateJoinRoleForUser(role, user);

    if (this.isActiveInRoom(room, userId)) {
      throw new ConflictException('You already have a role or position in this room');
    }

    if (room.joinRequests.some((entry) => entry.userId === userId)) {
      throw new ConflictException('You already have a pending join request');
    }

    room.joinRequests.push({ userId, userName: user.name, role });
    return room.save();
  }

  async approveJoinRequest(roomId: string, hostId: string, targetUserId: string): Promise<Room> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    this.ensureHost(room, hostId);

    const reqIndex = room.joinRequests.findIndex((entry) => entry.userId === targetUserId);
    if (reqIndex === -1) {
      throw new BadRequestException('Join request not found');
    }

    const request = room.joinRequests[reqIndex];
    room.joinRequests.splice(reqIndex, 1);
    this.applyRoleToRoom(room, request.userId, request.userName, request.role);
    this.syncListenerCount(room);
    return room.save();
  }

  async rejectJoinRequest(roomId: string, hostId: string, targetUserId: string): Promise<Room> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    this.ensureHost(room, hostId);

    const reqIndex = room.joinRequests.findIndex((entry) => entry.userId === targetUserId);
    if (reqIndex === -1) {
      throw new BadRequestException('Join request not found');
    }

    room.joinRequests.splice(reqIndex, 1);
    return room.save();
  }

  async removeParticipantByHost(roomId: string, hostId: string, targetUserId: string): Promise<Room> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    this.ensureHost(room, hostId);

    if (targetUserId === room.hostId) {
      throw new BadRequestException('Host cannot remove themselves');
    }

    const changed = this.removeUserFromRoom(room, targetUserId);
    if (!changed) {
      throw new ConflictException('User is not part of this room');
    }

    this.syncListenerCount(room);
    return room.save();
  }

  async deleteRoomByHost(roomId: string, hostId: string): Promise<void> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    this.ensureHost(room, hostId);
    await room.deleteOne();
  }

  async leave(roomId: string, user: UserDocument): Promise<Room> {
    const room = await this.roomModel.findById(roomId);
    if (!room) {
      throw new BadRequestException('Room not found');
    }

    const userId = user._id.toString();
    const changed = this.removeUserFromRoom(room, userId);
    if (!changed) {
      throw new ConflictException('You are not part of this room');
    }

    this.syncListenerCount(room);
    return room.save();
  }

  private ensureHost(room: RoomDocument, hostId: string) {
    if (room.hostId !== hostId) {
      throw new ForbiddenException('Only host can perform this action');
    }
  }

  private validateJoinRoleForUser(role: JoinRole, user: UserDocument) {
    if (role === 'femaleSpeaker') {
      if (user.role !== 'partner' || user.gender !== 'female') {
        throw new BadRequestException('Only partner female users can join as the female speaker');
      }
      return;
    }

    if (role === 'coSpeaker' || role === 'normalSpeaker') {
      if (user.role !== 'user') {
        throw new BadRequestException('Only normal users can join as the guest speaker');
      }
      return;
    }
  }

  private isActiveInRoom(room: RoomDocument, userId: string): boolean {
    return (
      room.femaleSpeakerId === userId ||
      room.otherSpeakerId === userId ||
      room.queue.some((entry) => entry.userId === userId) ||
      room.participants.some((entry) => entry.userId === userId)
    );
  }

  private upsertParticipant(room: RoomDocument, userId: string, userName: string, role: ActiveRole) {
    const index = room.participants.findIndex((entry) => entry.userId === userId);
    if (index >= 0) {
      room.participants[index] = { userId, userName, role };
      return;
    }
    room.participants.push({ userId, userName, role });
  }

  private applyRoleToRoom(room: RoomDocument, userId: string, userName: string, role: JoinRole) {
    if (this.isActiveInRoom(room, userId)) {
      throw new ConflictException('User already has a role or position in this room');
    }

    if (role === 'femaleSpeaker') {
      if (room.femaleSpeakerId) {
        throw new ConflictException('Female speaker slot is already taken');
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
      } else {
        room.otherSpeaker = userName;
        room.otherSpeakerId = userId;
        this.upsertParticipant(room, userId, userName, 'coSpeaker');
      }
      return;
    }

    this.upsertParticipant(room, userId, userName, 'listener');
  }

  private removeUserFromRoom(room: RoomDocument, userId: string): boolean {
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
      } else {
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

  private syncListenerCount(room: RoomDocument) {
    room.listeners = room.participants.filter((entry) => entry.role === 'listener').length;
  }
}

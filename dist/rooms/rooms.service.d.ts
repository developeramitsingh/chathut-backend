import { Model } from 'mongoose';
import { Room, RoomDocument } from './room.schema';
import { UserDocument } from '../users/user.schema';
type JoinRole = 'listener' | 'femaleSpeaker' | 'coSpeaker' | 'normalSpeaker';
export declare class RoomsService {
    private readonly roomModel;
    constructor(roomModel: Model<RoomDocument>);
    findAll(): Promise<Room[]>;
    findById(id: string): Promise<Room | null>;
    create(name: string, user: UserDocument): Promise<Room>;
    join(roomId: string, user: UserDocument, role: JoinRole): Promise<Room>;
    requestJoin(roomId: string, user: UserDocument, role: JoinRole): Promise<Room>;
    approveJoinRequest(roomId: string, hostId: string, targetUserId: string): Promise<Room>;
    rejectJoinRequest(roomId: string, hostId: string, targetUserId: string): Promise<Room>;
    removeParticipantByHost(roomId: string, hostId: string, targetUserId: string): Promise<Room>;
    deleteRoomByHost(roomId: string, hostId: string): Promise<void>;
    leave(roomId: string, user: UserDocument): Promise<Room>;
    private ensureHost;
    private validateJoinRoleForUser;
    private isActiveInRoom;
    private upsertParticipant;
    private applyRoleToRoom;
    private removeUserFromRoom;
    private syncListenerCount;
}
export {};

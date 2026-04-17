import { Model } from 'mongoose';
import { Room, RoomDocument } from './room.schema';
import { UserDocument } from '../users/user.schema';
export declare class RoomsService {
    private readonly roomModel;
    constructor(roomModel: Model<RoomDocument>);
    findAll(): Promise<Room[]>;
    findById(id: string): Promise<Room | null>;
    create(name: string, user: UserDocument): Promise<Room>;
    join(roomId: string, user: UserDocument, role: 'listener' | 'femaleSpeaker' | 'coSpeaker' | 'normalSpeaker'): Promise<Room>;
    leave(roomId: string, user: UserDocument): Promise<Room>;
}

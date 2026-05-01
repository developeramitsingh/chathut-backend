import { Document } from 'mongoose';
export type RoomDocument = Room & Document;
export declare class Room {
    name: string;
    hostId: string;
    hostName: string;
    hostGender: string;
    femaleSpeaker?: string;
    femaleSpeakerId?: string;
    otherSpeaker?: string;
    otherSpeakerId?: string;
    listeners: number;
    queue: Array<{
        userId: string;
        userName: string;
    }>;
    joinRequests: Array<{
        userId: string;
        userName: string;
        role: 'listener' | 'femaleSpeaker' | 'coSpeaker' | 'normalSpeaker';
    }>;
    participants: Array<{
        userId: string;
        userName: string;
        role: 'listener' | 'femaleSpeaker' | 'coSpeaker' | 'queue';
    }>;
    isLive: boolean;
}
export declare const RoomSchema: import("mongoose").Schema<Room, import("mongoose").Model<Room, any, any, any, Document<unknown, any, Room> & Room & {
    _id: import("mongoose").Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Room, Document<unknown, {}, import("mongoose").FlatRecord<Room>> & import("mongoose").FlatRecord<Room> & {
    _id: import("mongoose").Types.ObjectId;
}>;

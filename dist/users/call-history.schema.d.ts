import { HydratedDocument } from 'mongoose';
export type CallHistoryDocument = HydratedDocument<CallHistory>;
export declare class CallHistory {
    callerId: string;
    partnerId: string;
    callerName: string;
    partnerName: string;
    startedAt: Date;
    endedAt: Date;
    durationMinutes: number;
    chargedCoins: number;
    creditedCoins: number;
}
export declare const CallHistorySchema: import("mongoose").Schema<CallHistory, import("mongoose").Model<CallHistory, any, any, any, import("mongoose").Document<unknown, any, CallHistory> & CallHistory & {
    _id: import("mongoose").Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CallHistory, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<CallHistory>> & import("mongoose").FlatRecord<CallHistory> & {
    _id: import("mongoose").Types.ObjectId;
}>;

import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { CallHistoryDocument } from './call-history.schema';
import { User, UserDocument } from './user.schema';
export declare class UsersService implements OnModuleInit {
    private userModel;
    private callHistoryModel;
    constructor(userModel: Model<UserDocument>, callHistoryModel: Model<CallHistoryDocument>);
    onModuleInit(): Promise<void>;
    create(user: Partial<User>): Promise<UserDocument>;
    findByPhone(phone: string): Promise<UserDocument | null>;
    findById(id: string): Promise<UserDocument | null>;
    setOnlineStatus(id: string, isOnline: boolean): Promise<UserDocument | null>;
    findLiveFemaleUsers(): Promise<User[]>;
    getWalletBalance(userId: string): Promise<number>;
    getWalletSummary(userId: string): Promise<{
        walletBalance: number;
        totalEarnings: number;
    }>;
    depositCoins(userId: string, coins: number): Promise<number>;
    debitCoins(userId: string, coins: number): Promise<number>;
    settleFriendCircleCallCoins(callerId: string, partnerId: string, coins: number): Promise<{
        debitedCoins: number;
        callerWalletBalance: number;
        partnerWalletBalance: number;
        partnerTotalEarnings: number;
    }>;
    recordFriendCircleCallHistory(input: {
        callerId: string;
        partnerId: string;
        callerName: string;
        partnerName: string;
        startedAt: Date;
        endedAt: Date;
        durationMinutes: number;
        chargedCoins: number;
        creditedCoins: number;
    }): Promise<void>;
    getCallHistoryForUser(userId: string): Promise<Array<{
        id: string;
        direction: 'outgoing' | 'incoming';
        counterpartyName: string;
        startedAt: Date;
        endedAt: Date;
        durationMinutes: number;
        chargedCoins: number;
        earnedCoins: number;
    }>>;
}

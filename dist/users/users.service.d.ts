import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
export declare class UsersService implements OnModuleInit {
    private userModel;
    constructor(userModel: Model<UserDocument>);
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
}

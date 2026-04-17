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
}

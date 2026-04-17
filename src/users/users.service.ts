import { Injectable, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async onModuleInit() {
    await this.userModel.updateMany({ isOnline: true }, { isOnline: false }).exec();
  }

  async create(user: Partial<User>): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ phone: user.phone }).exec();
    if (existing) {
      throw new ConflictException('User already exists');
    }
    const created = new this.userModel(user);
    return created.save();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async setOnlineStatus(id: string, isOnline: boolean): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, { isOnline }, { new: true }).exec();
  }

  async findLiveFemaleUsers(): Promise<User[]> {
    return this.userModel.find({ gender: 'female', role: 'partner', isOnline: true }).lean().exec();
  }
}

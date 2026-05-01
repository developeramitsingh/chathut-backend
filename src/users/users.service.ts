import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CallHistory, CallHistoryDocument } from './call-history.schema';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(CallHistory.name) private callHistoryModel: Model<CallHistoryDocument>,
  ) {}

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

  async getWalletBalance(userId: string): Promise<number> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.walletBalance ?? 0;
  }

  async getWalletSummary(userId: string): Promise<{ walletBalance: number; totalEarnings: number }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      walletBalance: user.walletBalance ?? 0,
      totalEarnings: user.totalEarnings ?? 0,
    };
  }

  async depositCoins(userId: string, coins: number): Promise<number> {
    if (!Number.isInteger(coins) || coins <= 0) {
      throw new BadRequestException('Deposit coins must be a positive integer');
    }

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { $inc: { walletBalance: coins } }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated.walletBalance ?? 0;
  }

  async debitCoins(userId: string, coins: number): Promise<number> {
    if (!Number.isInteger(coins) || coins <= 0) {
      throw new BadRequestException('Debit coins must be a positive integer');
    }

    const existingUser = await this.findById(userId);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const currentBalance = existingUser.walletBalance ?? 0;
    if (currentBalance < coins) {
      throw new BadRequestException('Insufficient coins. Please deposit coins.');
    }

    const updated = await this.userModel
      .findOneAndUpdate(
        { _id: userId, walletBalance: { $gte: coins } },
        { $inc: { walletBalance: -coins } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new BadRequestException('Insufficient coins. Please deposit coins.');
    }

    return updated.walletBalance ?? 0;
  }

  async settleFriendCircleCallCoins(
    callerId: string,
    partnerId: string,
    coins: number,
  ): Promise<{
    debitedCoins: number;
    callerWalletBalance: number;
    partnerWalletBalance: number;
    partnerTotalEarnings: number;
  }> {
    if (!Number.isInteger(coins) || coins <= 0) {
      throw new BadRequestException('Settled coins must be a positive integer');
    }

    const caller = await this.findById(callerId);
    if (!caller) {
      throw new NotFoundException('Caller not found');
    }

    const partner = await this.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const callerCurrent = caller.walletBalance ?? 0;
    const debitedCoins = Math.min(callerCurrent, coins);

    let callerWalletBalance = callerCurrent;
    if (debitedCoins > 0) {
      const updatedCaller = await this.userModel
        .findByIdAndUpdate(callerId, { $inc: { walletBalance: -debitedCoins } }, { new: true })
        .exec();

      callerWalletBalance = updatedCaller?.walletBalance ?? Math.max(0, callerCurrent - debitedCoins);
    }

    const updatedPartner = await this.userModel
      .findByIdAndUpdate(
        partnerId,
        { $inc: { walletBalance: debitedCoins, totalEarnings: debitedCoins } },
        { new: true },
      )
      .exec();

    return {
      debitedCoins,
      callerWalletBalance,
      partnerWalletBalance: updatedPartner?.walletBalance ?? (partner.walletBalance ?? 0),
      partnerTotalEarnings: updatedPartner?.totalEarnings ?? (partner.totalEarnings ?? 0),
    };
  }

  async recordFriendCircleCallHistory(input: {
    callerId: string;
    partnerId: string;
    callerName: string;
    partnerName: string;
    startedAt: Date;
    endedAt: Date;
    durationMinutes: number;
    chargedCoins: number;
    creditedCoins: number;
  }): Promise<void> {
    await this.callHistoryModel.create({
      callerId: input.callerId,
      partnerId: input.partnerId,
      callerName: input.callerName,
      partnerName: input.partnerName,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationMinutes: Math.max(1, input.durationMinutes),
      chargedCoins: Math.max(0, input.chargedCoins),
      creditedCoins: Math.max(0, input.creditedCoins),
    });
  }

  async getCallHistoryForUser(userId: string): Promise<
    Array<{
      id: string;
      direction: 'outgoing' | 'incoming';
      counterpartyName: string;
      startedAt: Date;
      endedAt: Date;
      durationMinutes: number;
      chargedCoins: number;
      earnedCoins: number;
    }>
  > {
    const rows = await this.callHistoryModel
      .find({ $or: [{ callerId: userId }, { partnerId: userId }] })
      .sort({ endedAt: -1 })
      .limit(100)
      .lean()
      .exec();

    return rows.map((row: any) => {
      const isCaller = row.callerId === userId;
      return {
        id: row._id?.toString() ?? '',
        direction: isCaller ? 'outgoing' : 'incoming',
        counterpartyName: isCaller ? row.partnerName : row.callerName,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        durationMinutes: row.durationMinutes ?? 0,
        chargedCoins: isCaller ? row.chargedCoins ?? 0 : 0,
        earnedCoins: isCaller ? 0 : row.creditedCoins ?? 0,
      };
    });
  }
}

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const call_history_schema_1 = require("./call-history.schema");
const user_schema_1 = require("./user.schema");
let UsersService = class UsersService {
    constructor(userModel, callHistoryModel) {
        this.userModel = userModel;
        this.callHistoryModel = callHistoryModel;
    }
    async onModuleInit() {
        await this.userModel.updateMany({ isOnline: true }, { isOnline: false }).exec();
    }
    async create(user) {
        const existing = await this.userModel.findOne({ phone: user.phone }).exec();
        if (existing) {
            throw new common_1.ConflictException('User already exists');
        }
        const created = new this.userModel(user);
        return created.save();
    }
    async findByPhone(phone) {
        return this.userModel.findOne({ phone }).exec();
    }
    async findById(id) {
        return this.userModel.findById(id).exec();
    }
    async setOnlineStatus(id, isOnline) {
        return this.userModel.findByIdAndUpdate(id, { isOnline }, { new: true }).exec();
    }
    async findLiveFemaleUsers() {
        return this.userModel.find({ gender: 'female', role: 'partner', isOnline: true }).lean().exec();
    }
    async getWalletBalance(userId) {
        const user = await this.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user.walletBalance ?? 0;
    }
    async getWalletSummary(userId) {
        const user = await this.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return {
            walletBalance: user.walletBalance ?? 0,
            totalEarnings: user.totalEarnings ?? 0,
        };
    }
    async depositCoins(userId, coins) {
        if (!Number.isInteger(coins) || coins <= 0) {
            throw new common_1.BadRequestException('Deposit coins must be a positive integer');
        }
        const updated = await this.userModel
            .findByIdAndUpdate(userId, { $inc: { walletBalance: coins } }, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.NotFoundException('User not found');
        }
        return updated.walletBalance ?? 0;
    }
    async debitCoins(userId, coins) {
        if (!Number.isInteger(coins) || coins <= 0) {
            throw new common_1.BadRequestException('Debit coins must be a positive integer');
        }
        const existingUser = await this.findById(userId);
        if (!existingUser) {
            throw new common_1.NotFoundException('User not found');
        }
        const currentBalance = existingUser.walletBalance ?? 0;
        if (currentBalance < coins) {
            throw new common_1.BadRequestException('Insufficient coins. Please deposit coins.');
        }
        const updated = await this.userModel
            .findOneAndUpdate({ _id: userId, walletBalance: { $gte: coins } }, { $inc: { walletBalance: -coins } }, { new: true })
            .exec();
        if (!updated) {
            throw new common_1.BadRequestException('Insufficient coins. Please deposit coins.');
        }
        return updated.walletBalance ?? 0;
    }
    async settleFriendCircleCallCoins(callerId, partnerId, coins) {
        if (!Number.isInteger(coins) || coins <= 0) {
            throw new common_1.BadRequestException('Settled coins must be a positive integer');
        }
        const caller = await this.findById(callerId);
        if (!caller) {
            throw new common_1.NotFoundException('Caller not found');
        }
        const partner = await this.findById(partnerId);
        if (!partner) {
            throw new common_1.NotFoundException('Partner not found');
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
            .findByIdAndUpdate(partnerId, { $inc: { walletBalance: debitedCoins, totalEarnings: debitedCoins } }, { new: true })
            .exec();
        return {
            debitedCoins,
            callerWalletBalance,
            partnerWalletBalance: updatedPartner?.walletBalance ?? (partner.walletBalance ?? 0),
            partnerTotalEarnings: updatedPartner?.totalEarnings ?? (partner.totalEarnings ?? 0),
        };
    }
    async recordFriendCircleCallHistory(input) {
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
    async getCallHistoryForUser(userId) {
        const rows = await this.callHistoryModel
            .find({ $or: [{ callerId: userId }, { partnerId: userId }] })
            .sort({ endedAt: -1 })
            .limit(100)
            .lean()
            .exec();
        return rows.map((row) => {
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(call_history_schema_1.CallHistory.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map
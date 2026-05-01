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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const jsonwebtoken_1 = require("jsonwebtoken");
const config_1 = require("@nestjs/config");
const users_service_1 = require("./users.service");
const deposit_coins_dto_1 = require("./dto/deposit-coins.dto");
const wallet_constants_1 = require("./constants/wallet.constants");
let UsersController = class UsersController {
    constructor(usersService, configService) {
        this.usersService = usersService;
        this.configService = configService;
    }
    getUserIdFromRequest(req) {
        const authHeader = req.headers?.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing Authorization header');
        }
        const token = authHeader.slice('Bearer '.length);
        const secret = this.configService.get('JWT_SECRET') || 'supersecretkey';
        try {
            const payload = (0, jsonwebtoken_1.verify)(token, secret);
            return payload.sub;
        }
        catch (_) {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
    async getLiveFemaleUsers() {
        const users = await this.usersService.findLiveFemaleUsers();
        return users.map(user => ({
            id: user._id ?? user.id,
            name: user.name,
            phone: user.phone,
            gender: user.gender,
            isOnline: user.isOnline,
        }));
    }
    async getWallet(req) {
        const userId = this.getUserIdFromRequest(req);
        return this.usersService.getWalletSummary(userId);
    }
    async depositWallet(req, dto) {
        const userId = this.getUserIdFromRequest(req);
        const walletBalance = await this.usersService.depositCoins(userId, dto.coins);
        const summary = await this.usersService.getWalletSummary(userId);
        return { walletBalance, totalEarnings: summary.totalEarnings };
    }
    async debitFriendCircleMinute(req) {
        const userId = this.getUserIdFromRequest(req);
        const walletBalance = await this.usersService.debitCoins(userId, wallet_constants_1.COINS_PER_DEBIT);
        return {
            debitedCoins: wallet_constants_1.COINS_PER_DEBIT,
            walletBalance,
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('live'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getLiveFemaleUsers", null);
__decorate([
    (0, common_1.Get)('wallet'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getWallet", null);
__decorate([
    (0, common_1.Post)('wallet/deposit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, deposit_coins_dto_1.DepositCoinsDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "depositWallet", null);
__decorate([
    (0, common_1.Post)('wallet/debit-friend-circle-minute'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "debitFriendCircleMinute", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        config_1.ConfigService])
], UsersController);
//# sourceMappingURL=users.controller.js.map
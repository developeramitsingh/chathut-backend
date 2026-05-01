import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { DepositCoinsDto } from './dto/deposit-coins.dto';
import { COINS_PER_DEBIT } from './constants/wallet.constants';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  private getUserIdFromRequest(req: any): string {
    const authHeader = req.headers?.authorization as string | undefined;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const token = authHeader.slice('Bearer '.length);
    const secret = this.configService.get<string>('JWT_SECRET') || 'supersecretkey';

    try {
      const payload = verify(token, secret) as { sub: string };
      return payload.sub;
    } catch (_) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('live')
  async getLiveFemaleUsers() {
    const users = await this.usersService.findLiveFemaleUsers();
    return users.map(user => ({
      id: (user as any)._id ?? (user as any).id,
      name: user.name,
      phone: user.phone,
      gender: user.gender,
      isOnline: user.isOnline,
    }));
  }

  @Get('wallet')
  async getWallet(@Req() req: any) {
    const userId = this.getUserIdFromRequest(req);
    return this.usersService.getWalletSummary(userId);
  }

  @Get('call-history')
  async getCallHistory(@Req() req: any) {
    const userId = this.getUserIdFromRequest(req);
    return this.usersService.getCallHistoryForUser(userId);
  }

  @Post('wallet/deposit')
  async depositWallet(@Req() req: any, @Body() dto: DepositCoinsDto) {
    const userId = this.getUserIdFromRequest(req);
    const walletBalance = await this.usersService.depositCoins(userId, dto.coins);
    const summary = await this.usersService.getWalletSummary(userId);
    return { walletBalance, totalEarnings: summary.totalEarnings };
  }

  @Post('wallet/debit-friend-circle-minute')
  async debitFriendCircleMinute(@Req() req: any) {
    const userId = this.getUserIdFromRequest(req);
    const walletBalance = await this.usersService.debitCoins(userId, COINS_PER_DEBIT);
    return {
      debitedCoins: COINS_PER_DEBIT,
      walletBalance,
    };
  }
}

import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { DepositCoinsDto } from './dto/deposit-coins.dto';
export declare class UsersController {
    private readonly usersService;
    private readonly configService;
    constructor(usersService: UsersService, configService: ConfigService);
    private getUserIdFromRequest;
    getLiveFemaleUsers(): Promise<{
        id: any;
        name: string;
        phone: string;
        gender: string;
        isOnline: boolean;
    }[]>;
    getWallet(req: any): Promise<{
        walletBalance: number;
        totalEarnings: number;
    }>;
    depositWallet(req: any, dto: DepositCoinsDto): Promise<{
        walletBalance: number;
        totalEarnings: number;
    }>;
    debitFriendCircleMinute(req: any): Promise<{
        debitedCoins: number;
        walletBalance: number;
    }>;
}

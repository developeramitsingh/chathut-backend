import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/signup.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    signup(signUpDto: SignUpDto): Promise<{
        message: string;
        user: {
            id: any;
            name: string;
            phone: string;
            email: string;
            role: string;
        };
    }>;
    requestOtp(phone: string): Promise<{
        message: string;
        otp: string;
    }>;
    validateOtp(phone: string, otp: string): Promise<import("../users/user.schema").UserDocument>;
    login(phone: string, otp: string): Promise<{
        accessToken: string;
        user: {
            id: any;
            name: string;
            phone: string;
            email: string;
            gender: string;
            role: string;
            isOnline: boolean;
        };
    }>;
}

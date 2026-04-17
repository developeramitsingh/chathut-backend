import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { SignUpDto } from './dto/signup.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    requestOtp(requestOtpDto: RequestOtpDto): Promise<{
        message: string;
        otp: string;
    }>;
    login(loginDto: LoginDto): Promise<{
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

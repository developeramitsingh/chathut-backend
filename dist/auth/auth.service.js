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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
    }
    async signup(signUpDto) {
        if (signUpDto.role === 'partner' && signUpDto.gender !== 'female') {
            throw new common_1.BadRequestException('Only female users may register as partners.');
        }
        const user = await this.usersService.create({
            name: signUpDto.name,
            phone: signUpDto.phone,
            email: signUpDto.email,
            gender: signUpDto.gender,
            role: signUpDto.role ?? 'user',
        });
        return {
            message: 'User registered successfully',
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
            },
        };
    }
    async requestOtp(phone) {
        const user = await this.usersService.findByPhone(phone);
        if (!user) {
            throw new common_1.NotFoundException('Phone number not registered. Please sign up first.');
        }
        return {
            message: 'OTP generated for demo purposes',
            otp: '1234',
        };
    }
    async validateOtp(phone, otp) {
        if (otp !== '1234') {
            throw new common_1.UnauthorizedException('Invalid OTP');
        }
        const user = await this.usersService.findByPhone(phone);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async login(phone, otp) {
        const user = await this.validateOtp(phone, otp);
        const payload = { sub: user._id.toString(), phone: user.phone };
        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                gender: user.gender,
                role: user.role,
                isOnline: user.isOnline,
            },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
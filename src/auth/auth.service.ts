import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService, private readonly jwtService: JwtService) {}

  async signup(signUpDto: SignUpDto) {
    if (signUpDto.role === 'partner' && signUpDto.gender !== 'female') {
      throw new BadRequestException('Only female users may register as partners.');
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

  async requestOtp(phone: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new NotFoundException('Phone number not registered. Please sign up first.');
    }
    return {
      message: 'OTP generated for demo purposes',
      otp: '1234',
    };
  }

  async validateOtp(phone: string, otp: string) {
    if (otp !== '1234') {
      throw new UnauthorizedException('Invalid OTP');
    }
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async login(phone: string, otp: string) {
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
}

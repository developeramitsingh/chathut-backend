import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}

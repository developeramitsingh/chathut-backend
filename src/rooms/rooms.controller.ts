import { Body, Controller, Get, Param, Post, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { RoomsGateway } from './rooms.gateway';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly usersService: UsersService,
    private readonly roomsGateway: RoomsGateway,
  ) {}

  @Get()
  async findAll() {
    return this.roomsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.roomsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createRoomDto: CreateRoomDto, @Req() req: any) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const room = await this.roomsService.create(createRoomDto.name, user);
    this.roomsGateway.broadcastRoomUpdate(room);
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async join(@Param('id') id: string, @Body() joinRoomDto: JoinRoomDto, @Req() req: any) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const room = await this.roomsService.join(id, user, joinRoomDto.role);
    this.roomsGateway.broadcastRoomUpdate(room);
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/leave')
  async leave(@Param('id') id: string, @Req() req: any) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const room = await this.roomsService.leave(id, user);
    this.roomsGateway.broadcastRoomUpdate(room);
    return room;
  }
}

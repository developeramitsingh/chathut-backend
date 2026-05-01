import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { RoomsGateway } from './rooms.gateway';
import { RemoveParticipantDto } from './dto/remove-participant.dto';

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
  @Post(':id/request-join')
  async requestJoin(@Param('id') id: string, @Body() joinRoomDto: JoinRoomDto, @Req() req: any) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const room = await this.roomsService.requestJoin(id, user, joinRoomDto.role);
    this.roomsGateway.broadcastRoomUpdate(room);
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/requests/:userId/approve')
  async approveJoinRequest(@Param('id') id: string, @Param('userId') userId: string, @Req() req: any) {
    const room = await this.roomsService.approveJoinRequest(id, req.user.sub, userId);
    this.roomsGateway.broadcastRoomUpdate(room);
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/requests/:userId/reject')
  async rejectJoinRequest(@Param('id') id: string, @Param('userId') userId: string, @Req() req: any) {
    const room = await this.roomsService.rejectJoinRequest(id, req.user.sub, userId);
    this.roomsGateway.broadcastRoomUpdate(room);
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/remove-participant')
  async removeParticipant(@Param('id') id: string, @Body() dto: RemoveParticipantDto, @Req() req: any) {
    const room = await this.roomsService.removeParticipantByHost(id, req.user.sub, dto.userId);
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

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteRoom(@Param('id') id: string, @Req() req: any) {
    await this.roomsService.deleteRoomByHost(id, req.user.sub);
    return { success: true };
  }
}

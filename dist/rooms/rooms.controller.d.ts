import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { UsersService } from '../users/users.service';
import { RoomsGateway } from './rooms.gateway';
export declare class RoomsController {
    private readonly roomsService;
    private readonly usersService;
    private readonly roomsGateway;
    constructor(roomsService: RoomsService, usersService: UsersService, roomsGateway: RoomsGateway);
    findAll(): Promise<import("./room.schema").Room[]>;
    findOne(id: string): Promise<import("./room.schema").Room>;
    create(createRoomDto: CreateRoomDto, req: any): Promise<import("./room.schema").Room>;
    join(id: string, joinRoomDto: JoinRoomDto, req: any): Promise<import("./room.schema").Room>;
    leave(id: string, req: any): Promise<import("./room.schema").Room>;
}

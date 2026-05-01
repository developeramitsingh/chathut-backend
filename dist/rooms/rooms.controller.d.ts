import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { UsersService } from '../users/users.service';
import { RoomsGateway } from './rooms.gateway';
import { RemoveParticipantDto } from './dto/remove-participant.dto';
export declare class RoomsController {
    private readonly roomsService;
    private readonly usersService;
    private readonly roomsGateway;
    constructor(roomsService: RoomsService, usersService: UsersService, roomsGateway: RoomsGateway);
    findAll(): Promise<import("./room.schema").Room[]>;
    findOne(id: string): Promise<import("./room.schema").Room>;
    create(createRoomDto: CreateRoomDto, req: any): Promise<import("./room.schema").Room>;
    join(id: string, joinRoomDto: JoinRoomDto, req: any): Promise<import("./room.schema").Room>;
    requestJoin(id: string, joinRoomDto: JoinRoomDto, req: any): Promise<import("./room.schema").Room>;
    approveJoinRequest(id: string, userId: string, req: any): Promise<import("./room.schema").Room>;
    rejectJoinRequest(id: string, userId: string, req: any): Promise<import("./room.schema").Room>;
    removeParticipant(id: string, dto: RemoveParticipantDto, req: any): Promise<import("./room.schema").Room>;
    leave(id: string, req: any): Promise<import("./room.schema").Room>;
    deleteRoom(id: string, req: any): Promise<{
        success: boolean;
    }>;
}

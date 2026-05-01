import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Room } from './room.schema';
export declare class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    server: Server;
    private readonly userSocketMap;
    private readonly socketUserMap;
    constructor(jwtService: JwtService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSubscribeRoom(client: Socket, payload: {
        roomId: string;
    }): void;
    handleUnsubscribeRoom(client: Socket, payload: {
        roomId: string;
    }): void;
    broadcastRoomUpdate(room: Room): void;
}

import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
export declare class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly usersService;
    private readonly configService;
    server: Server;
    private socketToUser;
    private userToSocket;
    constructor(usersService: UsersService, configService: ConfigService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    private getSocketIdForUser;
    handleGetLiveUsers(client: Socket): Promise<void>;
    handleCallPartner(client: Socket, payload: {
        targetId: string;
    }): Promise<void>;
    handleAcceptCall(client: Socket, payload: {
        callerId: string;
    }): Promise<void>;
    handleRejectCall(client: Socket, payload: {
        callerId: string;
    }): Promise<void>;
    handleEndCall(client: Socket, payload: {
        targetId: string;
    }): Promise<void>;
    handleWebrtcOffer(client: Socket, payload: {
        targetId: string;
        offer: any;
    }): Promise<void>;
    handleWebrtcAnswer(client: Socket, payload: {
        targetId: string;
        answer: any;
    }): Promise<void>;
    handleWebrtcCandidate(client: Socket, payload: {
        targetId: string;
        candidate: any;
    }): Promise<void>;
    handleAudioChunk(client: Socket, payload: {
        to: string;
        data: any;
    }): Promise<void>;
    private broadcastLiveUsers;
}

import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
type CallSource = 'friend' | 'room';
export declare class UsersGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
    private readonly usersService;
    private readonly configService;
    server: Server;
    private socketToUser;
    private userToSocket;
    private activeCallSessions;
    private callBillingTicker;
    constructor(usersService: UsersService, configService: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    private buildCallKey;
    private findActiveCallByUser;
    private finalizeCallByKey;
    private settleLiveCallMinutes;
    private settleCallMinutesByKey;
    private finalizeCallForUser;
    private getSocketIdForUser;
    handleGetLiveUsers(client: Socket): Promise<void>;
    handleCallPartner(client: Socket, payload: {
        targetId: string;
        source?: CallSource;
    }): Promise<void>;
    handleAcceptCall(client: Socket, payload: {
        callerId: string;
        source?: CallSource;
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
    handleSendDirectChatMessage(client: Socket, payload: {
        targetId: string;
        message: string;
    }): Promise<void>;
    private broadcastLiveUsers;
}
export {};

import { Server, Socket } from 'socket.io';
import { Room } from './room.schema';
export declare class RoomsGateway {
    server: Server;
    handleSubscribeRoom(client: Socket, payload: {
        roomId: string;
    }): void;
    handleUnsubscribeRoom(client: Socket, payload: {
        roomId: string;
    }): void;
    broadcastRoomUpdate(room: Room): void;
}

import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Room } from './room.schema';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly userSocketMap = new Map<string, string>();
  private readonly socketUserMap = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as any)?.token ||
        (client.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');
      if (!token) return;
      const payload: any = this.jwtService.verify(token);
      const userId: string = payload.sub?.toString();
      if (userId) {
        this.userSocketMap.set(userId, client.id);
        this.socketUserMap.set(client.id, userId);
      }
    } catch {
      // Invalid token – don't reject outright
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUserMap.get(client.id);
    if (userId) {
      this.userSocketMap.delete(userId);
      this.socketUserMap.delete(client.id);
    }
  }

  @SubscribeMessage('subscribeRoom')
  handleSubscribeRoom(client: Socket, payload: { roomId: string }) {
    if (payload?.roomId) {
      client.join(payload.roomId);
    }
  }

  @SubscribeMessage('unsubscribeRoom')
  handleUnsubscribeRoom(client: Socket, payload: { roomId: string }) {
    if (payload?.roomId) {
      client.leave(payload.roomId);
    }
  }

  broadcastRoomUpdate(room: Room) {
    let roomId = (room as any)._id?.toString() || (room as any).id?.toString();
    if (!roomId) return;
    this.server.to(roomId).emit('roomUpdated', room);
  }
}

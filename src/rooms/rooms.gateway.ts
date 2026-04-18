import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Room } from './room.schema';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class RoomsGateway {
  @WebSocketServer()
  server: Server;

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
    const roomId = (room as any)._id?.toString() ?? (room as any).id?.toString();
    if (!roomId) {
      return;
    }
    this.server.to(roomId).emit('roomUpdated', room);
  }
}

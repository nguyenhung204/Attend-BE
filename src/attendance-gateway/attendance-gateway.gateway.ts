import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(4000,
  {
    transports: ['websocket'], 
    cors: { origin: '*', methods: ['GET', 'POST'] } 
})
export class AttendanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.emit('connectionStatus', { status: 'connected' });
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
  

  @SubscribeMessage('message')
  handleMessage(@MessageBody() message: string): void {
    console.log(message);
  }

  markAttendance(mssvArray: string[]): void {
    this.server.emit('attendanceMarked', { mssvArray });
  }
}
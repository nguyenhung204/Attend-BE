import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AttendanceGatewayService } from './attendance-gateway.service';

@Injectable()
@WebSocketGateway(4500,
  {
    transports: ['websocket'], 
    cors: { origin: '*', methods: ['GET', 'POST'] } 
})
export class AttendanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
   private attendanceGatewayService: AttendanceGatewayService,
  ) {}

  afterInit() {
    // Gửi yêu cầu đồng bộ dữ liệu từ client khi server khởi động lại
    setTimeout(() => {
      this.server.emit('requestAttendanceData');
    }, 10000); // 10 giây

    // Gửi yêu cầu đồng bộ dữ liệu từ client mỗi 10 giây
    setInterval(() => {
      this.server.emit('requestAttendanceData');
    }, 100000);
  }


  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    client.emit('connectionStatus', { status: 'connected' });
  }
  @SubscribeMessage('attendanceData')
  async handleAttendanceData(@MessageBody() data: any): Promise<void> {
    console.log('Received attendance data from client:', data);
    await this.attendanceGatewayService.syncAttendanceData(data);
  }
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
  markAttendance(mssvArray: string[]): void {
    this.server.emit('attendanceMarked', { mssvArray });
  }

}
import { Module } from '@nestjs/common';
import { AttendanceGateway } from './attendance-gateway.gateway';


@Module({
  providers: [AttendanceGateway],
  exports: [AttendanceGateway],
})
export class WebSocketModule {}
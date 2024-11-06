import { forwardRef, Module } from '@nestjs/common';
import { AttendanceGateway } from './attendance-gateway.gateway';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { AttendanceGatewayService } from './attendance-gateway.service';

@Module({
  imports: [ forwardRef(() => GoogleSheetsModule)],
  providers: [AttendanceGateway, AttendanceGatewayService],
  exports: [AttendanceGateway, AttendanceGatewayService],
})
export class WebSocketModule {}
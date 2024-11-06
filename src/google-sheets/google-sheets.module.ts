import { Module} from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';
import { WebSocketModule } from '../attendance-gateway/attendance-gateway.module';

@Module({
  imports: [ WebSocketModule],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
import { Module } from "@nestjs/common";
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';
import { ConfigModule } from "@nestjs/config";
import { GoogleSheetsController } from "./google-sheets/google-sheets.controller";
import { GoogleSheetsService } from "./google-sheets/google-sheets.service";
import { WebSocketModule } from "./attendance-gateway/attendance-gateway.module";


@Module({
  imports: [GoogleSheetsModule,
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    WebSocketModule
  ],
  controllers: [GoogleSheetsController],
  providers: [GoogleSheetsService],
})
export class AppModule {}

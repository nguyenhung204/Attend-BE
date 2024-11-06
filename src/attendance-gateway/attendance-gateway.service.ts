import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { GoogleSheetsService } from 'src/google-sheets/google-sheets.service';

@Injectable()
export class AttendanceGatewayService {
    constructor(
        @Inject(forwardRef(() => GoogleSheetsService))
        private readonly googleSheetsService: GoogleSheetsService
      ) {}
      async syncAttendanceData(data: any): Promise<void> {
        await this.googleSheetsService.syncAttendance(data);
        console.log('Received attendance data from client:', data);
      }
}

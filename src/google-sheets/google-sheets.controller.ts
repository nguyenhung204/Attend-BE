import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('google-sheets')
export class GoogleSheetsController {
  constructor(private readonly googleSheetsService: GoogleSheetsService) { }

  @Get('mssv')
  async getSheetData(): Promise<any[]> {
    try {
      return await this.googleSheetsService.getSheetData();
    } catch (error) {
      console.error('Error getting sheet data:', error);
      throw new Error('Failed to get sheet data');
    }
  }

  @Post('check-mssv')
  async checkMSSV(@Body() body: { MSSV: string | string[] }, @Res() res: Response): Promise<void> {
    if (!body || !body.MSSV) {
      res.status(400).send({ message: 'MSSV is required' });
      return;
    }

    const mssvArray = Array.isArray(body.MSSV) ? body.MSSV : [body.MSSV];
    console.log(`MSSV: ${mssvArray}`);

    try {
      const results = await this.googleSheetsService.checkMSSVExists(mssvArray);
      const response = await Promise.all(results.map(async (exists, index) => {
        return {
          MSSV: mssvArray[index],
          status: exists ? 'OK' : 'NOT FOUND',
        };
      }));

      await this.googleSheetsService.markAttendance(mssvArray);

      res.status(200).send(response);
    } catch (error) {
      console.error('Error checking MSSV:', error);
      res.status(500).send({ message: 'Failed to check MSSV' });
    }
  }

  @Get('download-list')
  async downloadAttendance(@Res() res: Response): Promise<void> {
    const filePath = path.join(__dirname, 'attendance.csv');
    try {
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance.csv');
        res.download(filePath, 'attendance.csv', (err) => {
          if (err) {
            console.error('Error downloading file:', err);
            res.status(500).send({ message: 'Error downloading file' });
          }
        });
      } else {
        res.status(404).send({ message: 'File not found' });
      }
    } catch (error) {
      console.error('Error downloading attendance:', error);
      res.status(500).send({ message: 'Failed to download attendance' });
    }
  }
}
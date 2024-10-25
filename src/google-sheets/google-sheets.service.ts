import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { AttendanceGateway } from 'src/attendance-gateway/attendance-gateway.gateway';
import { Server } from 'socket.io';
import * as path from 'path';
import * as fs from 'fs';
@Injectable()
export class GoogleSheetsService {
  [x: string]: any;
  private doc: GoogleSpreadsheet;
  private cache: { mssvSet: Set<string>; rows: any[] } | null = null;
  private io: Server;
  private serviceAccountAuth = new JWT({
    email: this.configService.get<string>('CLIENT_EMAIL'),
    key: this.configService.get<string>('PRIVATE_KEY').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  constructor(
    private configService: ConfigService,
    private attendanceGateway: AttendanceGateway

  ) {
    this.doc = new GoogleSpreadsheet(this.configService.get<string>('SHEET_ID'), this.serviceAccountAuth);
  }

  setSocketServer(io: Server) {
    this.io = io;
  }
  private async initialize() {
    try {
      await this.doc.loadInfo();
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
      throw new Error('Failed to initialize Google Sheets');
    }
  }

  private async loadData() {
    if (this.cache) {
      return this.cache;
    }
    try {
      await this.initialize();
      const sheet = this.doc.sheetsByIndex[0];
      const rows = await sheet.getRows();
      const mssvSet = new Set(rows.map(row => row.get('MSSV').trim()));
      const rowData = rows.map(row => ({
        MSSV: row.get('MSSV').trim(),
        Name: row.get('HỌ') + " " + row.get('TÊN'),
      }));
      this.cache = { mssvSet, rows: rowData };
      return this.cache;
    } catch (error) {
      console.error('Error loading data from Google Sheets:', error);
      throw new Error('Failed to load data from Google Sheets');
    }
  }

  async getSheetData(): Promise<any[]> {
    try {
      const data = await this.loadData();
      return data.rows;
    } catch (error) {
      console.error('Error getting sheet data:', error);
      throw new Error('Failed to get sheet data');
    }
  }

  async checkMSSVExists(mssvList: string[]): Promise<boolean[]> {
    try {
      const data = await this.loadData();
      return mssvList.map(mssv => data.mssvSet.has(mssv.trim()));
    } catch (error) {
      console.error('Error checking MSSV exists:', error);
      throw new Error('Failed to check MSSV exists');
    }
  }

  async markAttendance(mssvArray: string[]): Promise<void> {
    try {
      const data = await this.loadData();
      const existingMSSV = mssvArray.filter(mssv => data.mssvSet.has(mssv.trim()));

      if (existingMSSV.length > 0) {
        this.attendanceGateway.markAttendance(existingMSSV);
        this.saveToCSV(existingMSSV);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw new Error('Failed to mark attendance');
    }
  }



  private saveToCSV(mssvArray: string[]): void {
    try {
      const filePath = path.join(__dirname, 'attendance.csv');
      const header = 'MSSV,Name,Điểm Danh\n';
      const records = mssvArray.map(mssv => {
        const row = this.cache.rows.find(row => row.MSSV === mssv);
        return `${row.MSSV},${row.Name},X`;
      }).join('\n');

      const csvContent = '\uFEFF' + header + records;

      fs.writeFile(filePath, csvContent, 'utf8', (err) => {
        if (err) {
          console.error('Error writing CSV file', err);
        } else {
          console.log('CSV file was written successfully');
        }
      });
    } catch (error) {
      console.error('Error in saveToCSV:', error);
      throw new Error('Failed to save to CSV');
    }
  }
}


import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { AttendanceGateway } from 'src/attendance-gateway/attendance-gateway.gateway';
import { Server } from 'socket.io';
import * as path from 'path';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';
@Injectable(
  
)
export class GoogleSheetsService {
  private doc: GoogleSpreadsheet;
  private cache: { mssvSet: Set<string>; rows: any[]; timestamp: number } | null = null;
  private io: Server;
  private cacheTTL = 5000;
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
    this.getAttendanceListFromCSV();
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
    if (this.cache && (Date.now() - this.cache.timestamp < this.cacheTTL)) {
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
      this.cache = { mssvSet, rows: rowData, timestamp: Date.now() };
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

  async getAttendanceListFromCSV(): Promise<any[]> {
    const filePath = path.join(__dirname,'attendance.csv');
    if (!fs.existsSync(filePath)) {
      console.warn('CSV file not found');
      this.saveToCSV([]);
    }
    const rows: any[] = [];
    try {
      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser({
            mapHeaders: ({ header }) => header.trim(),
            mapValues: ({ value }) => value.trim(),
          }))
          .on('data', (row) => {
            if (row.MSSV && row.Name) {
              rows.push({ MSSV: row.MSSV.trim(), Name: row.Name.trim() });
            } else {
              console.warn('Malformed row:', row);
            }
          })
          .on('end', () => {
            resolve(rows);
          })
          .on('error', (error) => {
            console.error('Error reading CSV file:', error);
            reject(error);
          });
      });
    } catch (error) {
      console.error('Error processing CSV file:', error);
      throw new Error('Failed to process CSV file');
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

  async syncAttendance(markedStudents: any[]): Promise<void> {
    try {
      const data = await this.loadData();
      markedStudents.forEach(student => {
        if (!data.mssvSet.has(student.MSSV)) {
          data.mssvSet.add(student.MSSV);
          data.rows.push({ MSSV: student.MSSV, Name: student.Name });
        }
      });
      this.cache = { ...data, timestamp: Date.now() };
      this.saveToCSV(markedStudents.map(student => student.MSSV));
    } catch (error) {
      console.error('Error syncing attendance:', error);
      throw new Error('Failed to sync attendance');
    }
  }

  private saveToCSV(mssvArray: string[]): void {
    const filePath = path.join(__dirname,'attendance.csv');
    const header = 'MSSV,Name,Điểm Danh\n';

    try {
      // Kiểm tra sự tồn tại của tệp CSV, nếu không tồn tại thì tạo mới
      if (!fs.existsSync(filePath)) {
        console.warn('CSV file not found, creating new file');
        fs.writeFileSync(filePath, '\uFEFF' + header, 'utf8');
      }

      // Đọc nội dung hiện tại của tệp CSV
      const existingData = fs.readFileSync(filePath, 'utf8');
      const existingRows = existingData.split('\n').slice(1); // Bỏ qua dòng tiêu đề

      // Tạo một Set để lưu trữ các MSSV đã tồn tại
      const existingMSSVSet = new Set(existingRows.map(row => row.split(',')[0].trim()));

      // Lọc các MSSV mới chưa tồn tại trong tệp CSV
      const newRecords = mssvArray.filter(mssv => !existingMSSVSet.has(mssv)).map(mssv => {
        const row = this.cache.rows.find(row => row.MSSV === mssv);
        return `${row.MSSV},${row.Name},X`;
      }).join('\n');

      if (newRecords) {
        fs.appendFile(filePath, newRecords + '\n', 'utf8', (err) => {
          if (err) {
            console.error('Error writing CSV file', err);
          } else {
            console.log('CSV file was written successfully');
          }
        });
      } else {
        console.log('No new records to write to CSV file');
      }
    } catch (error) {
      console.error('Error in saveToCSV:', error);
      throw new Error('Failed to save to CSV');
    }
  }
}


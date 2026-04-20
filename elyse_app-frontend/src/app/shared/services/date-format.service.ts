/*
 * Copyright 2025 Silkwood Software Pty. Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import { Injectable } from '@angular/core';
import { parseISO } from 'date-fns';
import { TSqlDateHelperService } from './tsql-date-helper.service';

@Injectable({
  providedIn: 'root'
})
export class DateFormatService {
  static convertToDisplayFormat(dateString: string, style: number): string {
    if (!dateString) return '';
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      return TSqlDateHelperService.convertDateToTSqlFormat(date, style);
    } catch (error) {
      console.error('❌ DATE FORMAT ERROR:', error);
      return dateString;
    }
  }

  static convertToApiFormat(dateString: string, style: number): string {
    if (!dateString) return '';
    try {
      const parsedDate = TSqlDateHelperService.parseTSqlFormatToDate(dateString, style);
      if (!parsedDate || isNaN(parsedDate.getTime())) return dateString;
      
      return new Date(Date.UTC(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        parsedDate.getHours(),
        parsedDate.getMinutes(),
        parsedDate.getSeconds(),
        parsedDate.getMilliseconds()
      )).toISOString();
    } catch (error) {
      console.error('Error parsing date:', error);
      return dateString;
    }
  }

  static convertFromApiToDate(apiDateString: string, style: number = 0): Date | null {
    if (!apiDateString) return null;
    try {
      // If the string looks like an ISO date, use parseISO
      if (apiDateString.includes('T') || apiDateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return parseISO(apiDateString);
      }
      
      // Try multiple SQL Server datetime format patterns
      const sqlServerFormats = [
        // Pattern 1: "25 Sep 2025 00:00:00.0000000" (day first, no AM/PM)
        {
          regex: /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?$/,
          dayIndex: 1, monthIndex: 2, yearIndex: 3
        },
        // Pattern 2: "Sep 25 2025 00:00:00.0000000" (month first, no AM/PM)
        {
          regex: /^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?$/,
          monthIndex: 1, dayIndex: 2, yearIndex: 3
        },
        // Pattern 3: "25 Sep 2025 12:00:00.0000000AM" (day first, with AM/PM)
        {
          regex: /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?(AM|PM)$/,
          dayIndex: 1, monthIndex: 2, yearIndex: 3
        },
        // Pattern 4: "Sep 25 2025 12:00:00.0000000AM" (month first, with AM/PM)
        {
          regex: /^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\s+\d{1,2}:\d{2}:\d{2}(\.\d+)?(AM|PM)$/,
          monthIndex: 1, dayIndex: 2, yearIndex: 3
        }
      ];

      // Map month names to numbers
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };

      for (const format of sqlServerFormats) {
        const match = apiDateString.match(format.regex);
        if (match) {
          const dayStr = match[format.dayIndex];
          const monthStr = match[format.monthIndex];
          const yearStr = match[format.yearIndex];
          
          const monthNum = monthMap[monthStr];
          if (monthNum === undefined) {
            continue; // Try next pattern
          }
          
          const year = parseInt(yearStr, 10);
          const day = parseInt(dayStr, 10);
          
          // Create date object (month is 0-based in JavaScript Date)
          const parsedDate = new Date(year, monthNum, day);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
        }
      }
      
      // Otherwise, use T-SQL helper to parse the date (for already formatted T-SQL dates)
      return TSqlDateHelperService.parseTSqlFormatToDate(apiDateString, style);
    } catch (error) {
      console.error('Error converting API date to Date object:', error);
      return null;
    }
  }

  static convertDateToApi(date: Date): string {
    if (!date) return '';
    try {
      // For date-only fields, preserve local date without timezone conversion
      // Format as YYYY-MM-DD without time component to avoid timezone shifts
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const result = `${year}-${month}-${day}`;
      console.log(`DateFormatService.convertDateToApi: Input Date object: ${date.toString()}, Output: ${result}`);
      return result;
    } catch (error) {
      console.error('Error converting Date to API format:', error);
      return '';
    }
  }

  static getFormatPattern(style: number): string {
    if (TSqlDateHelperService.isStyleSupported(style)) {
      return TSqlDateHelperService.getFormatDescription(style);
    }
    return `Unsupported style: ${style}`;
  }
}
    

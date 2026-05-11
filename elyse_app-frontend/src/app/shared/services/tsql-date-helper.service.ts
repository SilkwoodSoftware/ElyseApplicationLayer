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

@Injectable({
  providedIn: 'root'
})
export class TSqlDateHelperService {

  /**
   * T-SQL CONVERT date format mappings
   * These exactly match SQL Server CONVERT function output
   */
  private static readonly TSQL_FORMATS = {
    0: { pattern: 'dd-MM-yyyy', description: 'Default' },
    23: { pattern: 'yyyy-MM-dd', description: 'ISO' },
    100: { pattern: 'mon dd yyyy hh:miAM', description: 'Default + century' },
    101: { pattern: 'MM/dd/yyyy', description: 'USA' },
    102: { pattern: 'yyyy.MM.dd', description: 'ANSI' },
    103: { pattern: 'dd/MM/yyyy', description: 'British/French' },
    104: { pattern: 'dd.MM.yyyy', description: 'German' },
    105: { pattern: 'dd-MM-yyyy', description: 'Italian' },
    106: { pattern: 'dd mon yy', description: 'Default + century' },
    107: { pattern: 'Mon dd, yyyy', description: 'Default + century' },
    108: { pattern: 'hh:mi:ss', description: 'Time only' },
    109: { pattern: 'mon dd yyyy', description: 'Default + milliseconds' },
    110: { pattern: 'MM-dd-yyyy', description: 'USA' },
    111: { pattern: 'yyyy/MM/dd', description: 'Japan' },
    112: { pattern: 'yyyyMMdd', description: 'ISO' },
    113: { pattern: 'dd mon yyyy hh:mi:ss:mmm', description: 'Europe default + milliseconds' },
    114: { pattern: 'hh:mi:ss:mmm', description: 'Time + milliseconds' },
    120: { pattern: 'yyyy-MM-dd hh:mi:ss', description: 'ODBC canonical' },
    121: { pattern: 'yyyy-MM-dd hh:mi:ss.mmm', description: 'ODBC canonical with milliseconds' },
    126: { pattern: 'yyyy-MM-ddThh:mi:ss.mmm', description: 'ISO8601' }
  };

  /**
   * Convert a Date object to T-SQL CONVERT format string
   */
  static convertDateToTSqlFormat(date: Date, style: number): string {
    if (!date || isNaN(date.getTime())) return '';

    const pad = (n: number, len: number = 2): string => n.toString().padStart(len, '0');
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour24 = date.getHours();
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const minute = date.getMinutes();
    const second = date.getSeconds();
    const millisecond = date.getMilliseconds();
    const ampm = hour24 < 12 ? 'AM' : 'PM';

    // Month names arrays - using title case as preferred
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    switch (style) {
      case 0:
        // Default: "Mon dd yyyy" format without time
        return `${monthNames[month-1]} ${day} ${year}`;
      
      case 23:
        // ISO: "yyyy-mm-dd"
        return `${year}-${pad(month)}-${pad(day)}`;
      
      case 100:
        // "Mon dd yyyy hh:miAM" - title case month, no leading zero on day, no space before AM/PM
        return `${monthNames[month-1]} ${day} ${year} ${pad(hour12)}:${pad(minute)}${ampm}`;
      
      case 101:
        // USA: "mm/dd/yyyy"
        return `${pad(month)}/${pad(day)}/${year}`;
      
      case 102:
        // ANSI: "yyyy.mm.dd"
        return `${year}.${pad(month)}.${pad(day)}`;
      
      case 103:
        // British/French: "dd/mm/yyyy"
        return `${pad(day)}/${pad(month)}/${year}`;
      
      case 104:
        // German: "dd.mm.yyyy"
        return `${pad(day)}.${pad(month)}.${year}`;
      
      case 105:
        // Italian: "dd-mm-yyyy"
        return `${pad(day)}-${pad(month)}-${year}`;
      
      case 106:
        // "dd Mon yy" - title case month, no leading zero on day, 2-digit year
        return `${day} ${monthNames[month-1]} ${year.toString().slice(2)}`;
      
      case 107:
        // "Mon dd, yyyy" - title case month, no leading zero on day, with comma
        return `${monthNames[month-1]} ${day}, ${year}`;
      
      case 108:
        // Time only: "hh:mi:ss"
        return `${pad(hour24)}:${pad(minute)}:${pad(second)}`;
      
      case 109:
        // "Mon dd yyyy" - title case month, no leading zero on day
        return `${monthNames[month-1]} ${day} ${year}`;
      
      case 110:
        // USA: "mm-dd-yyyy"
        return `${pad(month)}-${pad(day)}-${year}`;
      
      case 111:
        // Japan: "yyyy/mm/dd"
        return `${year}/${pad(month)}/${pad(day)}`;
      
      case 112:
        // ISO: "yyyymmdd"
        return `${year}${pad(month)}${pad(day)}`;
      
      case 113:
        // "dd Mon yyyy hh:mi:ss:mmm" - title case month, no leading zero on day, 24-hour time with milliseconds
        return `${day} ${monthNames[month-1]} ${year} ${pad(hour24)}:${pad(minute)}:${pad(second)}:${pad(millisecond, 3)}`;
      
      case 114:
        // Time with milliseconds: "hh:mi:ss:mmm"
        return `${pad(hour24)}:${pad(minute)}:${pad(second)}:${pad(millisecond, 3)}`;
      
      case 120:
        // ODBC canonical: "yyyy-mm-dd hh:mi:ss"
        return `${year}-${pad(month)}-${pad(day)} ${pad(hour24)}:${pad(minute)}:${pad(second)}`;
      
      case 121:
        // ODBC canonical with milliseconds: "yyyy-mm-dd hh:mi:ss.mmm"
        return `${year}-${pad(month)}-${pad(day)} ${pad(hour24)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}`;
      
      case 126:
        // ISO8601: "yyyy-mm-ddThh:mi:ss.mmm"
        return `${year}-${pad(month)}-${pad(day)}T${pad(hour24)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}`;
      
      default:
        // Default fallback
        return `${monthNames[month-1]} ${day} ${year}`;
    }
  }

  /**
   * Parse a T-SQL format string to Date object
   */
  static parseTSqlFormatToDate(dateString: string, style: number): Date | null {
    if (!dateString) return null;

    try {
      const currentYear = new Date().getFullYear();
      let year: number, month: number, day: number;
      let hour: number = 0, minute: number = 0, second: number = 0, millisecond: number = 0;

      // Create month name lookup
      const monthLookup: { [key: string]: number } = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
      };

      switch (style) {
        case 0:
        case 105: {
          // "dd-MM-yyyy"
          const match = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
          if (!match) return null;
          [, day, month, year] = match.map(Number);
          break;
        }

        case 23: {
          // "yyyy-MM-dd"
          const match = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          if (!match) return null;
          [, year, month, day] = match.map(Number);
          break;
        }

        case 100: {
          // "mon dd yyyy hh:miAM"
          const match = dateString.match(/^([a-z]{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})(AM|PM)$/i);
          if (!match) return null;
          const [, monthName, dayStr, yearStr, hourStr, minuteStr, ampm] = match;
          month = monthLookup[monthName.toLowerCase()];
          day = parseInt(dayStr);
          year = parseInt(yearStr);
          hour = parseInt(hourStr);
          minute = parseInt(minuteStr);
          if (ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
          if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
          break;
        }

        case 101: {
          // "MM/dd/yyyy"
          const match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (!match) return null;
          [, month, day, year] = match.map(Number);
          break;
        }

        case 102: {
          // "yyyy.MM.dd"
          const match = dateString.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
          if (!match) return null;
          [, year, month, day] = match.map(Number);
          break;
        }

        case 103: {
          // "dd/MM/yyyy"
          const match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (!match) return null;
          [, day, month, year] = match.map(Number);
          break;
        }

        case 104: {
          // "dd.MM.yyyy"
          const match = dateString.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
          if (!match) return null;
          [, day, month, year] = match.map(Number);
          break;
        }

        case 106: {
          // "dd mon yy"
          const match = dateString.match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{2})$/i);
          if (!match) return null;
          const [, dayStr, monthName, yearStr] = match;
          day = parseInt(dayStr);
          month = monthLookup[monthName.toLowerCase()];
          year = parseInt(yearStr);
          // Handle 2-digit year
          year = year < 50 ? 2000 + year : 1900 + year;
          break;
        }

        case 107: {
          // "Mon dd, yyyy"
          const match = dateString.match(/^([a-z]{3})\s+(\d{1,2}),\s+(\d{4})$/i);
          if (!match) return null;
          const [, monthName, dayStr, yearStr] = match;
          month = monthLookup[monthName.toLowerCase()];
          day = parseInt(dayStr);
          year = parseInt(yearStr);
          break;
        }

        case 109: {
          // "mon dd yyyy"
          const match = dateString.match(/^([a-z]{3})\s+(\d{1,2})\s+(\d{4})$/i);
          if (!match) return null;
          const [, monthName, dayStr, yearStr] = match;
          month = monthLookup[monthName.toLowerCase()];
          day = parseInt(dayStr);
          year = parseInt(yearStr);
          break;
        }

        case 110: {
          // "MM-dd-yyyy"
          const match = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
          if (!match) return null;
          [, month, day, year] = match.map(Number);
          break;
        }

        case 111: {
          // "yyyy/MM/dd"
          const match = dateString.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
          if (!match) return null;
          [, year, month, day] = match.map(Number);
          break;
        }

        case 112: {
          // "yyyyMMdd"
          const match = dateString.match(/^(\d{4})(\d{2})(\d{2})$/);
          if (!match) return null;
          [, year, month, day] = match.map(Number);
          break;
        }

        case 113: {
          // "dd mon yyyy hh:mi:ss:mmm"
          const match = dateString.match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2}):(\d{3})$/i);
          if (!match) return null;
          const [, dayStr, monthName, yearStr, hourStr, minuteStr, secondStr, msStr] = match;
          day = parseInt(dayStr);
          month = monthLookup[monthName.toLowerCase()];
          year = parseInt(yearStr);
          hour = parseInt(hourStr);
          minute = parseInt(minuteStr);
          second = parseInt(secondStr);
          millisecond = parseInt(msStr);
          break;
        }

        case 120: {
          // "yyyy-MM-dd hh:mi:ss"
          const match = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
          if (!match) return null;
          [, year, month, day, hour, minute, second] = match.map(Number);
          break;
        }

        case 121: {
          // "yyyy-MM-dd hh:mi:ss.mmm"
          const match = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})\.(\d{3})$/);
          if (!match) return null;
          const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr, msStr] = match;
          year = parseInt(yearStr);
          month = parseInt(monthStr);
          day = parseInt(dayStr);
          hour = parseInt(hourStr);
          minute = parseInt(minuteStr);
          second = parseInt(secondStr);
          millisecond = parseInt(msStr);
          break;
        }

        case 126: {
          // "yyyy-MM-ddThh:mi:ss.mmm"
          const match = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2}):(\d{2})\.(\d{3})$/);
          if (!match) return null;
          const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr, msStr] = match;
          year = parseInt(yearStr);
          month = parseInt(monthStr);
          day = parseInt(dayStr);
          hour = parseInt(hourStr);
          minute = parseInt(minuteStr);
          second = parseInt(secondStr);
          millisecond = parseInt(msStr);
          break;
        }

        default:
          return null;
      }

      if (!month || month < 1 || month > 12) return null;
      if (!day || day < 1 || day > 31) return null;
      if (!year || year < 1900 || year > 2100) return null;

      return new Date(year, month - 1, day, hour, minute, second, millisecond);

    } catch (error) {
      console.error('Error parsing T-SQL date format:', error);
      return null;
    }
  }

  /**
   * Get format description for display
   */
  static getFormatDescription(style: number): string {
    const format = this.TSQL_FORMATS[style as keyof typeof this.TSQL_FORMATS];
    return format ? format.pattern : `Style ${style}`;
  }

  /**
   * Check if a format style is supported
   */
  static isStyleSupported(style: number): boolean {
    return style in this.TSQL_FORMATS;
  }

  /**
   * Get all supported format styles
   */
  static getSupportedStyles(): number[] {
    return Object.keys(this.TSQL_FORMATS).map(Number);
  }
}

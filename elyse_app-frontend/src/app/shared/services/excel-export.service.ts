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
import * as XLSX from 'xlsx-js-style';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  constructor() {}

  /**
   * Export table data to Excel using File System Access API
   */
  async exportTableToExcel(): Promise<void> {
    try {
      // Extract data from visible table
      const tableData = this.extractTableData();
      
      if (!tableData.success || !tableData.headers || !tableData.data) {
        alert(tableData.error || 'Failed to extract table data');
        return;
      }

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([
        tableData.headers,
        ...tableData.data
      ]);

      // Auto-size columns
      const colWidths = tableData.headers.map(() => ({ width: 15 }));
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

      // Generate Excel file as array buffer
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array' 
      });

      // Save using File System Access API (same pattern as file-download.service.ts)
      await this.saveExcelFile(excelBuffer, tableData.fileName || 'table_export.xlsx');

    } catch (error: any) {
      console.error('Excel export error:', error);
      alert(`Excel export failed: ${error.message}`);
    }
  }

  /**
   * Extract table data from the currently visible table
   */
  private extractTableData(): { 
    success: boolean; 
    headers?: string[]; 
    data?: string[][]; 
    fileName?: string;
    error?: string; 
  } {
    try {
      // Find the first visible table
      const table = document.querySelector('table');
      if (!table) {
        return { success: false, error: 'No table found on current page' };
      }

      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');
      
      if (!thead || !tbody) {
        return { success: false, error: 'Table structure incomplete (missing thead or tbody)' };
      }

      // Extract headers
      const headerRow = thead.querySelector('tr');
      if (!headerRow) {
        return { success: false, error: 'No header row found' };
      }

      const headers = Array.from(headerRow.querySelectorAll('th')).map(th => {
        // Look for the column title span first, fallback to full text content
        const columnTitle = th.querySelector('.column-title');
        return columnTitle ? 
          columnTitle.textContent?.trim() || '' : 
          th.textContent?.trim() || '';
      }).filter(header => header !== '');

      if (headers.length === 0) {
        return { success: false, error: 'No valid column headers found' };
      }

      // Extract data rows
      const dataRows = tbody.querySelectorAll('tr');
      if (dataRows.length === 0) {
        return { success: false, error: 'No data rows found in table' };
      }

      const data = Array.from(dataRows).map(row => {
        const cells = row.querySelectorAll('td');
        return headers.map((header, index) => {
          const cell = cells[index];
          if (!cell) return '';

          // Handle different cell content types
          const link = cell.querySelector('a');
          if (link) {
            return link.textContent?.trim() || '';
          } else {
            return cell.textContent?.trim() || '';
          }
        });
      });

      // Generate filename
      const fileName = this.generateFileName();

      return {
        success: true,
        headers,
        data,
        fileName
      };

    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to extract table data' 
      };
    }
  }

  /**
   * Generate filename for export
   */
  private generateFileName(): string {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z/, '')
      .replace('T', '_');
    
    // Try to get table heading from page
    const tableHeading = document.querySelector('.table-heading');
    let tableName = 'Table_Export';
    
    if (tableHeading && tableHeading.textContent) {
      tableName = tableHeading.textContent.trim()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_');
    } else {
      // Fallback to route-based name
      const path = window.location.pathname;
      const segments = path.split('/').filter(segment => segment && !segment.includes('?'));
      const lastSegment = segments[segments.length - 1];
      
      if (lastSegment) {
        tableName = lastSegment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('_');
      }
    }
    
    return `${tableName}_${timestamp}.xlsx`;
  }

  /**
   * Save Excel file using File System Access API
   */
  private async saveExcelFile(excelBuffer: ArrayBuffer, fileName: string): Promise<void> {
    try {
      // Check if File System Access API is supported (same check as file-download.service.ts)
      if (!('showSaveFilePicker' in window)) {
        // Fallback to traditional download
        this.downloadExcelFile(excelBuffer, fileName);
        return;
      }

      // Show save file picker
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Excel Files',
          accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
        }]
      });

      // Create writable stream and write file content
      const writable = await fileHandle.createWritable();
      await writable.write(excelBuffer);
      await writable.close();

      console.log('Excel file saved successfully');

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Save operation cancelled by user');
      } else {
        console.error('Error saving Excel file:', error);
        // Fallback to traditional download
        this.downloadExcelFile(excelBuffer, fileName);
      }
    }
  }

  /**
   * Fallback download method for browsers without File System Access API
   */
  private downloadExcelFile(excelBuffer: ArrayBuffer, fileName: string): void {
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  }

  /**
   * Check if there's a table available for export
   */
  isTableAvailable(): boolean {
    const table = document.querySelector('table');
    if (!table) return false;

    const tbody = table.querySelector('tbody');
    if (!tbody) return false;

    const dataRows = tbody.querySelectorAll('tr');
    return dataRows.length > 0;
  }
}

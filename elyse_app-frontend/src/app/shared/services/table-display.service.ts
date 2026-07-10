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
import { MessageLabelService } from './message-label.service';

@Injectable({
  providedIn: 'root'
})
export class TableDisplayService {
  constructor(
    private messageLabelService: MessageLabelService
  ) {}

  /**
   * Filter columns based on hidden columns configuration
   * @param columns Array of column objects or column names
   * @param hiddenColumns Array of column names to hide
   * @returns Filtered array of columns
   */
  getVisibleColumns(columns: any[], hiddenColumns: string[] = []): any[] {
    if (!columns || columns.length === 0) return [];
    if (!hiddenColumns || hiddenColumns.length === 0) return columns;

    // Check if columns is an array of objects with a 'key' property
    if (typeof columns[0] === 'object' && columns[0].key) {
      // Filter column objects by key
      return columns.filter(col => !hiddenColumns.includes(col.key));
    } else {
      // Filter simple string array
      return columns.filter(col => !hiddenColumns.includes(col));
    }
  }

  /**
   * Get tooltip for a column
   * @param column The column name or object
   * @param tooltips The tooltips object
   * @param columnMapping The column mapping object
   * @returns The tooltip text
   */
  getTooltip(column: any, tooltips: {[key: string]: string}, columnMapping: {[key: string]: string}): string {
    const columnKey = typeof column === 'object' ? column.key : column;
    const fullKey = columnMapping[columnKey];
    return fullKey ? (tooltips[fullKey] || '') : '';
  }

  /**
   * Format display value
   * @param value The value to format
   * @returns Formatted value as string
   */
  formatDisplayValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return '';
    return value.toString();
  }

  /**
   * Get translated label for a column
   * @param column The column name
   * @returns The translated label for the column
   */
  getColumnLabel(column: string): string {
    return this.messageLabelService.getLabel(column);
  }

  /**
   * Check if a column is the File ID column
   * @param columnKey The column key
   * @returns True if the column is the File ID column
   */
  isFileIdColumn(columnKey: string): boolean {
    return columnKey === 'File ID';
  }

  /**
   * Check if a column is the Document ID column
   * @param columnKey The column key
   * @returns True if the column is the Document ID column
   */
  isDocumentIdColumn(columnKey: string): boolean {
    return columnKey === 'Document ID';
  }

  /**
   * Extract message items from the response
   * @param response The API response
   * @param outputParameters Optional list of output parameters to include
   * @returns Array of message items
   */
  formatOutputMessage(response: any, outputParameters?: string[]): { label: string, value: string }[] {
    const messageItems: { label: string, value: string }[] = [];
    
    if (outputParameters && outputParameters.length > 0) {
      // Process each output parameter defined in the parameters list
      outputParameters.forEach(param => {
        if (response[param] !== undefined) {
          messageItems.push({
            label: this.messageLabelService.getLabel(param),
            value: response[param].toString()
          });
        }
      });
    } else {
      // If no output parameters specified, include common ones
      const commonParams = [
        'transactionMessage',
        'transactionStatus',
        'numberOfRecords',
        'numberOfDocs',
        'numberOfFiles',
        'numRows',
        'numRecords',
        'numDocs'
      ];
      
      commonParams.forEach(param => {
        if (response[param] !== undefined) {
          messageItems.push({
            label: this.messageLabelService.getLabel(param),
            value: response[param].toString()
          });
        }
      });
    }
    
    return messageItems;
  }

  /**
   * Process data to extract columns, tooltips, and column mapping
   * @param data The data array
   * @param hiddenColumns Array of column names to hide
   * @returns Object with columns, tooltips, and columnMapping
   */
  processTableData(data: any[], hiddenColumns: string[] = []): {
    columns: Array<{key: string, header: string, sortable: boolean, resizable: boolean}>,
    tooltips: {[key: string]: string},
    columnMapping: {[key: string]: string}
  } {
    const result = {
      columns: [] as Array<{key: string, header: string, sortable: boolean, resizable: boolean}>,
      tooltips: {},
      columnMapping: {}
    };
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return result;
    }
    
    // Extract columns from the first row
    const firstRow = data[0];
    result.columns = Object.keys(firstRow)
      .filter(key => !hiddenColumns.includes(key))
      .map(key => {
        // Extract just the column name without tooltip
        // Some column names might contain both name and tooltip separated by ::
        const headerParts = key.split('::');
        const header = headerParts[0].trim();
        
        return {
          key,
          header: header, // Use just the column name as the header
          sortable: true,
          resizable: true
        };
      });
    
    return result;
  }
}

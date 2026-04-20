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
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TableType {
  name: string;
  endpoint: string;
  idType: 'bigint' | 'string';
  dataField: string;
  parameters?: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class GenericTableService<T extends { [key: string]: any }> {
  private readonly apiUrl = environment.dotNetBaseUrl;

  constructor(public http: HttpClient) {}

  getTableData(tableType: TableType, params?: any): Observable<any> {
    const url = `${this.apiUrl}/${tableType.endpoint}`;
    const encodedParams = params ? Object.keys(params).reduce((acc, key) => {
      acc[key] = encodeURIComponent(params[key]);
      return acc;
    }, {} as any) : undefined;
    return this.http.get<any>(url, { params: encodedParams }).pipe(
      map((response) => {
        const transformedData = this.transformData(response, tableType.dataField);    
        // Map the raw response data to the desired format .
        // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
        return {
          data: transformedData.tableData,
          numberOfRows: response.numberOfRows,
          transactionMessage: response.transactionMessage,
          transactionStatus: response.transactionStatus,
          numberOfFiles: response.numberOfFiles,
          tooltips: transformedData.tooltips,
          columnMapping: transformedData.columnMapping
        };
      })
    );
  }
 
  public transformData(rawData: any, dataField: string): {
    tableData: any[],
    tooltips: {[key: string]: string},
    columnMapping: {[key: string]: string}
  } {
    if (!rawData || !rawData[dataField]) {
      console.error('Invalid or missing data structure:', rawData);
      return { tableData: [], tooltips: {}, columnMapping: {} };
    }

    // Check if the data is already an array
    const dataArray = Array.isArray(rawData[dataField]) ? rawData[dataField] : [rawData[dataField]];
    
    if (dataArray.length === 0) {
      return { tableData: [], tooltips: {}, columnMapping: {} };
    }

    // Log the raw data structure for debugging
    console.log('Raw data structure:', JSON.stringify(dataArray[0], null, 2));
    
    const tableData = dataArray.map((row: any) => {
      const flatRow: {[key: string]: any} = {};
      
      // Check if row is already a flat object (not nested)
      const isFlat = Object.values(row).every(value =>
        value === null || value === undefined || typeof value !== 'object' || Array.isArray(value));
      
      if (isFlat) {
        // If row is already flat, just copy the values
        Object.entries(row).forEach(([key, value]: [string, any]) => {
          // Extract just the column name without tooltip
          const keyParts = key.split('::');
          const columnName = keyParts[0].trim();
          flatRow[columnName] = (value === null || value === undefined) ? '' : value;
        });
      } else {
        // Handle nested structure
        Object.entries(row).forEach(([key, value]: [string, any]) => {
          if (value === null || value === undefined) {
            flatRow[key] = '';
          }
          else if (typeof value === 'object' && 'Column Name' in value && 'Value' in value) {
            const columnValue = value['Value'];
            // Extract just the column name without tooltip
            const columnNameParts = value['Column Name'].split('::');
            const columnName = columnNameParts[0].trim();
            flatRow[columnName] = columnValue === null ? '' : columnValue;
          }
          else if (typeof value === 'object') {
            flatRow[key] = '';
          }
          else {
            flatRow[key] = value;
          }
        });
      }
      
      return flatRow;
    });
    
    // Log the transformed data for debugging
    console.log('Transformed data:', tableData);

    const tooltips: {[key: string]: string} = rawData.tooltips || {};
    const columnMapping: {[key: string]: string} = {};

    if (rawData[dataField] && rawData[dataField].length > 0) {
      Object.keys(rawData[dataField][0]).forEach(key => {
        if (rawData[dataField][0][key] && typeof rawData[dataField][0][key] === 'object' && 'Column Name' in rawData[dataField][0][key]) {
          const fullColumnName = rawData[dataField][0][key]['Column Name'];
          // Extract just the column name without tooltip
          const columnNameParts = fullColumnName.split('::');
          const columnName = columnNameParts[0].trim();
          
          // Store the mapping from column name to key
          columnMapping[columnName] = key;
          
          // If there's a tooltip part, store it in tooltips
          if (columnNameParts.length > 1) {
            const tooltipText = columnNameParts[1].trim();
            tooltips[columnName] = tooltipText;
          }
        }
      });
    }

    return { tableData, tooltips, columnMapping };
  }

  createRecord(tableType: TableType, data: T): Observable<T> {
    const url = `${this.apiUrl}/${tableType.endpoint}`;
    return this.http.post<T>(url, data);
  }

  updateRecord(tableType: TableType, id: string, data: T): Observable<T> {
    const url = `${this.apiUrl}/${tableType.endpoint}?id=${id}`;
    return this.http.put<T>(url, data);
  }

  deleteRecord(tableType: TableType, id: string): Observable<any> {
    const url = `${this.apiUrl}/${tableType.endpoint}?id=${id}`;
    return this.http.delete(url);
  }

  sortTableData(data: T[], sortColumn: keyof T, sortOrder: 'asc' | 'desc'): T[] {
    return data.sort((a, b) => {
      const valueA = a[sortColumn] ?? '';
      const valueB = b[sortColumn] ?? '';
      if (valueA < valueB) {
        return sortOrder === 'asc' ? -1 : 1;
      } else if (valueA > valueB) {
        return sortOrder === 'asc' ? 1 : -1;
      } else {
        return 0;
      }
    });
  }
  
  resizeColumn(tableName: string, columnIndex: number, newWidth: number): void {
    // Implement column resizing logic
    console.log(`Resizing column ${columnIndex} of table ${tableName} to ${newWidth}px`);
  }

  applyFilter(tableName: string, filterCriteria: any): Observable<any> {
    // Implement filtering logic
    console.log(`Applying filter to table ${tableName}:`, filterCriteria);
    return this.http.post(`${this.apiUrl}/${tableName}/filter`, filterCriteria);
  }
  
  multiSelectRows(tableName: string, selectedIds: string[]): void {
    console.log(`Multi-selecting rows for table ${tableName}:`, selectedIds);
  }

  refreshTable(tableType: TableType): Observable<any> {
    return this.getTableData(tableType);
  }
}

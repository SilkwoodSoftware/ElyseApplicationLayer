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

import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GenericTableService, TableType } from '../../services/generic-table.service';
import { MessageLabelService } from '../../services/message-label.service';
import { RouteConfigParserService } from '../../services/route-config-parser.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface TableDialogData {
  title: string;
  data: any[];
  tableConfig: any;
  idAlias?: string;
  nameAlias?: string;
  fullResponse?: any; // Full API response for message labels
}

@Component({
  selector: 'app-table-dialog',
  templateUrl: './table-dialog.component.html',
  styleUrls: ['../../stylesheets/dialogs.scss', '../../stylesheets/tables.scss', '../../stylesheets/messages.scss']
})
export class TableDialogComponent {
  @ViewChild('dialogContainer') dialogContainer!: ElementRef;
  
  title: string;
  data: any[] = []; // Initialize with empty array
  tableConfig: any;
  idAlias?: string;
  nameAlias?: string;
  selectedRow: any = null;
  Object = Object; // Expose Object to the template
  columns: string[] = [];
  tooltips: {[key: string]: string} = {};
  columnMapping: {[key: string]: string} = {};
  messageItems: { label: string, value: string }[] = [];
  
  private isDragging = false;
  private mouseOffset = { x: 0, y: 0 };

  constructor(
    public dialogRef: MatDialogRef<TableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: TableDialogData,
    private genericTableService: GenericTableService<any>,
    private messageLabelService: MessageLabelService,
    private routeConfigParserService: RouteConfigParserService,
    private http: HttpClient
  ) {
    this.title = dialogData.title;
    this.tableConfig = dialogData.tableConfig;
    this.idAlias = dialogData.idAlias;
    this.nameAlias = dialogData.nameAlias;
    
    // Process the data to ensure it's in a usable format
    this.processData(dialogData.data, dialogData.fullResponse);
  }
  
  /**
   * Process the data to ensure it's in a usable format
   * @param rawData The raw data from the API
   * @param fullResponse The full API response for message labels
   */
  private processData(rawData: any[], fullResponse?: any): void {
    console.log('Processing table data:', rawData);
    
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      console.warn('No data or empty array provided to TableDialogComponent');
      this.data = [];
      this.columns = [];
      return;
    }
    
    // Create a response object that matches what GenericTableService expects
    const responseObj = {
      data: rawData,
      tableData: rawData,
      numberOfRecords: rawData.length
    };
    
    // Use the transformData method from GenericTableService
    // We'll use 'tableData' as the dataField since that's what we put in the response object
    const transformedData = this.genericTableService.transformData(responseObj, 'tableData');
    
    this.data = transformedData.tableData;
    this.tooltips = transformedData.tooltips;
    this.columnMapping = transformedData.columnMapping;
    
    // Extract column names from the first row and filter out hidden columns
    if (this.data.length > 0) {
      this.columns = Object.keys(this.data[0]);
      
      // Log the actual column names in the data for debugging
      console.log('Actual column names in data:', this.columns);
      
      // Log the tableConfig structure to debug
      console.log('TableDialogComponent tableConfig:', this.tableConfig);
      
      // Use the hiddenColumns from tableConfig if available
      const hiddenColumns = this.tableConfig?.hiddenColumns || [];
      console.log('Using hiddenColumns from tableConfig:', hiddenColumns);
      
      // Filter out the hidden columns
      this.columns = this.columns.filter(column => !hiddenColumns.includes(column));
      console.log('Columns after filtering:', this.columns);
    }
    
    // Extract any message items from the full response if available, otherwise use the response object
    if (fullResponse) {
      console.log('Using full response for message items:', fullResponse);
      this.extractMessageItems(fullResponse);
    } else {
      console.log('No full response available, using response object for message items');
      this.extractMessageItems(responseObj);
    }
    
    if (this.data.length === 0) {
      console.warn('No data available for table display');
    } else {
      console.log('Processed data:', this.data);
      console.log('Columns:', this.columns);
      console.log('Tooltips:', this.tooltips);
      console.log('Column mapping:', this.columnMapping);
    }
  }
  
  /**
   * Extract message items from the response
   * @param response The API response
   */
  private extractMessageItems(response: any): void {
    // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
    const relevantKeys = [
      'transactionMessage',
      'transactionStatus',
      'numberOfRecords',
      'numberOfDocs',
      'numberOfFiles'
    ];
    
    this.messageItems = relevantKeys
      .filter(key => response[key] !== undefined)
      .map(key => ({
        label: this.messageLabelService.getLabel(key),
        value: response[key]?.toString() || ''
      }));
  }
  
  /**
   * Get the columns for the table
   * @returns Array of column names
   */
  getColumns(): string[] {
    return this.columns;
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
   * Get tooltip for a column
   * @param column The column name
   * @returns The tooltip text
   */
  getTooltip(column: string): string {
    const fullKey = this.columnMapping[column];
    return fullKey ? (this.tooltips[fullKey] || '') : '';
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
   * Handle column resize
   * @param event Mouse event
   * @param columnIndex Index of the column being resized
   */
  onColumnResize(event: MouseEvent, columnIndex: number): void {
    event.preventDefault();
    if (this.dialogContainer && this.dialogContainer.nativeElement) {
      const headerRow = this.dialogContainer.nativeElement.querySelector('tr');
      if (headerRow) {
        const th = headerRow.children[columnIndex] as HTMLElement;
        const startX = event.pageX;
        const startWidth = th.offsetWidth;
        
        const onMouseMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.pageX - startX;
          const newWidth = Math.max(50, startWidth + deltaX);
          th.style.width = `${newWidth}px`;
        };
        
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }
    }
  }
  
  /**
   * Handle row selection
   * @param row The selected row
   */
  onRowSelect(row: any): void {
    console.log('TableDialog onRowSelect - Row selected:', row);
    console.log('TableDialog onRowSelect - Row keys:', Object.keys(row));
    this.selectedRow = row;
    console.log('TableDialog onRowSelect - selectedRow set to:', this.selectedRow);
  }
  
  /**
   * Handle confirm button click
   */
  onConfirm(): void {
    if (this.selectedRow) {
      // Extract ID and name values based on aliases
      let idValue = null;
      let nameValue = null;
      
      console.log('TableDialog onConfirm - idAlias:', this.idAlias, 'nameAlias:', this.nameAlias);
      console.log('TableDialog onConfirm - selectedRow keys:', Object.keys(this.selectedRow));
      console.log('TableDialog onConfirm - selectedRow:', this.selectedRow);
      
      if (this.idAlias && this.selectedRow[this.idAlias] !== undefined) {
        idValue = this.selectedRow[this.idAlias];
        console.log('TableDialog onConfirm - Found idValue:', idValue);
      } else {
        console.warn('TableDialog onConfirm - idAlias not found in selectedRow. idAlias:', this.idAlias);
      }
      
      if (this.nameAlias && this.selectedRow[this.nameAlias] !== undefined) {
        nameValue = this.selectedRow[this.nameAlias];
        console.log('TableDialog onConfirm - Found nameValue:', nameValue);
      } else {
        console.warn('TableDialog onConfirm - nameAlias not found in selectedRow. nameAlias:', this.nameAlias);
      }
      
      console.log('TableDialog onConfirm - Closing with id:', idValue, 'name:', nameValue);
      
      this.dialogRef.close({
        id: idValue,
        name: nameValue,
        row: this.selectedRow
      });
    } else {
      console.error('No row selected');
    }
  }
  
  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.dialogRef.close(null);
  }
  
  /**
   * Handle mouse down event for dragging the dialog
   * @param event The mouse event
   */
  onMouseDown(event: MouseEvent): void {
    if (event.target === this.dialogContainer.nativeElement ||
        event.target === this.dialogContainer.nativeElement.querySelector('h2')) {
      this.isDragging = true;
      const dialogElement = this.dialogContainer.nativeElement;
      const dialogRect = dialogElement.getBoundingClientRect();
      
    
      dialogElement.style.transform = 'none';
      
      // Set initial position to maintain the dialog's current visual position
      dialogElement.style.top = `${dialogRect.top}px`;
      dialogElement.style.left = `${dialogRect.left}px`;
      
      this.mouseOffset = {
        x: event.clientX - dialogRect.left,
        y: event.clientY - dialogRect.top
      };
    }
  }

  /**
   * Handle mouse move event for dragging the dialog
   * @param event The mouse event
   */
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      const dialogElement = this.dialogContainer.nativeElement;
      dialogElement.style.left = `${event.clientX - this.mouseOffset.x}px`;
      dialogElement.style.top = `${event.clientY - this.mouseOffset.y}px`;
      event.preventDefault(); // Prevent text selection during drag
    }
  }

  /**
   * Handle mouse up event for dragging the dialog
   */
  onMouseUp(): void {
    this.isDragging = false;
    // No need to restore the transform - we want the dialog to stay where the user dragged it
  }
}

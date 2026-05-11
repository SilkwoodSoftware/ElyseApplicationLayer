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
import { BehaviorSubject, Subject } from 'rxjs';

interface TableState {
  [key: string]: {
    data: any[];
    selectedRows: any[];
    selectedIds: string[];
    columnWidths: number[];
    sortState: { column: string, direction: 'asc' | 'desc' };    
  };
}

@Injectable({
  providedIn: 'root'
})
export class TableStateService {
  private tableState: TableState = {};
  private tableStateSource = new BehaviorSubject<TableState>(this.tableState);
  tableState$ = this.tableStateSource.asObservable();

  private recordDeletedSource = new Subject<string>();
  recordDeleted$ = this.recordDeletedSource.asObservable();

  private recordAddedSource = new Subject<string>();
  recordAdded$ = this.recordAddedSource.asObservable();

  private recordUpdatedSource = new Subject<string>();
  recordUpdated$ = this.recordUpdatedSource.asObservable();
  
  private currentTableComponentSource = new BehaviorSubject<any>(null);
  currentTableComponent$ = this.currentTableComponentSource.asObservable();

  setTableData(tableName: string, data: any[]): void {
    if (!this.tableState[tableName]) {
      this.tableState[tableName] = {
        data: [],
        selectedRows: [],
        selectedIds: [],
        columnWidths: [],
        sortState: { column: '', direction: 'asc' }
      };
    }
    this.tableState[tableName].data = data;
    this.tableStateSource.next(this.tableState);
  }
  getTableData(tableName: string): any[] {
    return this.tableState[tableName]?.data || [];
  }
  selectRow(tableName: string, row: any): void {
    const tableState = this.tableState[tableName];
    tableState.selectedRows = [row];
    tableState.selectedIds = [this.getRowId(row)];
    this.tableStateSource.next(this.tableState);
  }

  multiSelectRow(tableName: string, row: any, isCtrlKey: boolean, isShiftKey: boolean): void {
    const tableState = this.tableState[tableName];
    const rowId = this.getRowId(row);
    const index = tableState.data.findIndex(dataRow => this.getRowId(dataRow) === rowId);
    if (isShiftKey && tableState.selectedRows.length > 0) {
      const lastSelectedIndex = tableState.data.findIndex(dataRow => this.getRowId(dataRow) === this.getRowId(tableState.selectedRows[tableState.selectedRows.length - 1]));
      const startIndex = Math.min(lastSelectedIndex, index);
      const endIndex = Math.max(lastSelectedIndex, index);
      tableState.selectedRows = tableState.data.slice(startIndex, endIndex + 1);
      tableState.selectedIds = tableState.selectedRows.map(selectedRow => this.getRowId(selectedRow));
    } else if (isCtrlKey) {
      const selectedIndex = tableState.selectedRows.findIndex(selectedRow => this.getRowId(selectedRow) === rowId);
      if (selectedIndex > -1) {
        tableState.selectedRows.splice(selectedIndex, 1);
        tableState.selectedIds.splice(selectedIndex, 1);
    } else {
      tableState.selectedRows.push(row);
      tableState.selectedIds.push(rowId);
    }
  } else {
    tableState.selectedRows = [row];
    tableState.selectedIds = [rowId];
  }
     
    this.tableStateSource.next(this.tableState);
  }

  private getRowId(row: any): string {
    if (row['Attribute ID'] !== undefined) {
      return row['Attribute ID'].toString();
    } else if (row['Document ID'] && row['File ID']) {
      return `${row['Document ID']}_${row['File ID']}`;
    } else if (row['Document ID']) {
      return row['Document ID'].toString();
    } else if (row['File ID']) {
      return row['File ID'].toString();
    } else if (row['Doc ID']) {
      return row['Doc ID'].toString();
    } else if (row['Object ID']) {
      return row['Object ID'].toString();
    } else {
      console.error('Row has no identifiable key:', row);
      return JSON.stringify(row);
    }
  }

  getSelectedIds(tableName: string): string[] {
    return this.tableState[tableName]?.selectedIds || [];
  }

  getSelectedRows(tableName: string): any[] {
    return this.tableState[tableName]?.selectedRows || [];
  }
  
  setSelectedRows(tableName: string, rows: any[]): void {
    if (this.tableState[tableName]) {
      this.tableState[tableName].selectedRows = rows;
      this.tableState[tableName].selectedIds = rows.map(row => this.getRowId(row));
      this.tableStateSource.next(this.tableState);
    }
  }

  clearSelectedRows(tableName: string): void {
  if (this.tableState[tableName]) {
    this.tableState[tableName].selectedRows = [];
    this.tableState[tableName].selectedIds = [];
    this.tableStateSource.next(this.tableState);
  }
}

  notifyRecordDeleted(tableName: string): void {
    this.recordDeletedSource.next(tableName);
  }

  notifyRecordAdded(tableName: string): void {
    this.recordAddedSource.next(tableName);
  }

  notifyRecordUpdated(tableName: string): void {
    this.recordUpdatedSource.next(tableName);
  }
  
  setColumnWidths(tableName: string, columnWidths: number[]): void {
    if (this.tableState[tableName]) {
      this.tableState[tableName].columnWidths = columnWidths;
      this.tableStateSource.next(this.tableState);
    }
  }

  getColumnWidths(tableName: string): number[] {
    return this.tableState[tableName]?.columnWidths || [];
  }

  setSortState(tableName: string, column: string, direction: 'asc' | 'desc'): void {
    if (this.tableState[tableName]) {
      this.tableState[tableName].sortState = { column, direction };
      this.tableStateSource.next(this.tableState);
    }
  }

  getSortState(tableName: string): { column: string, direction: 'asc' | 'desc' } {
    return this.tableState[tableName]?.sortState || { column: '', direction: 'asc' };
  }
  
  persistTableState(tableName: string): void {
    const state = this.tableState[tableName];
    if (state) {
      try {
        localStorage.setItem(`tableState_${tableName}`, JSON.stringify(state));
      } catch (error) {
        console.error(`Error persisting table state for ${tableName}:`, error);
        // Handle quota exceeded error
        if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          console.warn(`localStorage quota exceeded for table ${tableName}, state will not persist`);
        }
      }
    }
  }

  restoreTableState(tableName: string): void {
    try {
      const savedState = localStorage.getItem(`tableState_${tableName}`);
      if (savedState) {
        this.tableState[tableName] = JSON.parse(savedState);
        this.tableStateSource.next(this.tableState);
      }
    } catch (error) {
      console.error(`Error restoring table state for ${tableName}:`, error);
      // Clear corrupted state
      try {
        localStorage.removeItem(`tableState_${tableName}`);
        console.log(`Removed corrupted table state for ${tableName}`);
      } catch (removeError) {
        console.error(`Failed to remove corrupted table state for ${tableName}:`, removeError);
      }
    }
  }
  
  setCurrentTableComponent(component: any) {
    this.currentTableComponentSource.next(component);
  }

  refreshCurrentTable() {
    this.currentTableComponentSource.value?.refreshTableData();
  }
}

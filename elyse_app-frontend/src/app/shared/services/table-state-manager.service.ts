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
import { TableStateService } from './table-state.service';

@Injectable({
  providedIn: 'root'
})
export class TableStateManagerService {
  private initializedTables: Set<string> = new Set();

  constructor(private tableStateService: TableStateService) {}

  /**
   * Initializes a table by restoring its state from localStorage
   * and ensuring the state is properly applied.
   * 
   * @param tableName The name of the table to initialize
   */
  initializeTable(tableName: string): void {
    if (this.initializedTables.has(tableName)) {
      return; // Table already initialized
    }

    // Restore table state from localStorage
    this.restoreTableState(tableName);
    
    // Mark table as initialized
    this.initializedTables.add(tableName);
  }

  /**
   * Restores table state from localStorage and ensures it's properly applied
   * 
   * @param tableName The name of the table to restore state for
   */
  restoreTableState(tableName: string): void {
    const savedState = localStorage.getItem(`tableState_${tableName}`);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        
        // Ensure we have valid column widths
        if (parsedState.columnWidths && Array.isArray(parsedState.columnWidths) && parsedState.columnWidths.length > 0) {
          // Update the table state with the restored state
          if (!this.tableStateService['tableState'][tableName]) {
            this.tableStateService['tableState'][tableName] = {
              data: [],
              selectedRows: [],
              selectedIds: [],
              columnWidths: [],
              sortState: { column: '', direction: 'asc' }
            };
          }
          
          // Set the column widths
          this.tableStateService['tableState'][tableName].columnWidths = parsedState.columnWidths;
          
          // Restore sort state if available
          if (parsedState.sortState) {
            this.tableStateService['tableState'][tableName].sortState = parsedState.sortState;
          }
          
          // Notify subscribers of the state change
          this.tableStateService['tableStateSource'].next(this.tableStateService['tableState']);
          
          console.log(`Restored state for table ${tableName}:`, {
            columnWidths: parsedState.columnWidths,
            sortState: parsedState.sortState
          });
        }
      } catch (error) {
        console.error(`Error restoring table state for ${tableName}:`, error);
        
        // If there was an error, remove the corrupted state from localStorage
        localStorage.removeItem(`tableState_${tableName}`);
      }
    }
  }

  /**
   * Persists table state to localStorage
   * 
   * @param tableName The name of the table to persist state for
   */
  persistTableState(tableName: string): void {
    this.tableStateService.persistTableState(tableName);
  }
}

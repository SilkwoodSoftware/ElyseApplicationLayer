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
export class TableStateInitializerService {
  private static readonly STORAGE_PREFIX = 'tableState_';
  private initializedTables = new Set<string>();

  constructor(private tableStateService: TableStateService) {
    // Initialize the service
    this.initializeFromLocalStorage();
  }

  /**
   * Initializes table states from localStorage when the application starts
   */
  private initializeFromLocalStorage(): void {
    // Get all keys from localStorage that start with the table state prefix
    const tableStateKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(TableStateInitializerService.STORAGE_PREFIX));

    // For each table state key, restore the table state
    tableStateKeys.forEach(key => {
      const tableName = key.replace(TableStateInitializerService.STORAGE_PREFIX, '');
      this.restoreTableState(tableName);
    });

    // Monkey patch the TableStateService to automatically persist state when column widths change
    this.monkeyPatchTableStateService();
  }

  /**
   * Monkey patches the TableStateService to automatically persist state when column widths change
   */
  private monkeyPatchTableStateService(): void {
    // Store the original setColumnWidths method
    const originalSetColumnWidths = this.tableStateService.setColumnWidths;

    // Replace it with our own implementation that automatically persists state
    this.tableStateService.setColumnWidths = (tableName: string, columnWidths: number[]): void => {
      // Call the original method
      originalSetColumnWidths.call(this.tableStateService, tableName, columnWidths);

      // Automatically persist the table state
      this.persistTableState(tableName);
    };
  }

  /**
   * Restores table state from localStorage
   * 
   * @param tableName The name of the table to restore state for
   */
  restoreTableState(tableName: string): void {
    if (this.initializedTables.has(tableName)) {
      return; // Table already initialized
    }

    try {
      const savedState = localStorage.getItem(`${TableStateInitializerService.STORAGE_PREFIX}${tableName}`);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Only restore column widths and sort state
        if (parsedState.columnWidths && Array.isArray(parsedState.columnWidths)) {
          this.tableStateService.setColumnWidths(tableName, parsedState.columnWidths);
        }
        
        if (parsedState.sortState) {
          this.tableStateService.setSortState(tableName, parsedState.sortState.column, parsedState.sortState.direction);
        }
        
        // Mark table as initialized
        this.initializedTables.add(tableName);
        
        console.log(`Restored state for table ${tableName}`);
      }
    } catch (error) {
      console.error(`Error restoring table state for ${tableName}:`, error);
      // Remove corrupted state
      localStorage.removeItem(`${TableStateInitializerService.STORAGE_PREFIX}${tableName}`);
    }
  }

  /**
   * Persists table state to localStorage
   * 
   * @param tableName The name of the table to persist state for
   */
  persistTableState(tableName: string): void {
    try {
      // Get the current table state
      const columnWidths = this.tableStateService.getColumnWidths(tableName);
      const sortState = this.tableStateService.getSortState(tableName);
      
      // Only persist if we have column widths
      if (columnWidths && columnWidths.length > 0) {
        // Create a state object with only the necessary data
        const state = {
          columnWidths,
          sortState
        };
        
        // Persist to localStorage
        localStorage.setItem(`${TableStateInitializerService.STORAGE_PREFIX}${tableName}`, JSON.stringify(state));
        
        // Mark table as initialized
        this.initializedTables.add(tableName);
        
        console.log(`Persisted state for table ${tableName}`);
      }
    } catch (error) {
      console.error(`Error persisting table state for ${tableName}:`, error);
    }
  }
}

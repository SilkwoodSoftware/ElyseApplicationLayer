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

/**
 * Service that handles column width persistence for all tables.
 * This is a simple implementation that directly saves and restores column widths.
 */
@Injectable({
  providedIn: 'root'
})
export class ColumnWidthPersistenceService {
  private initialized = false;
  private mutationObserver: MutationObserver | null = null;
  private readonly DEBUG = false; // Set to true for detailed logging

  constructor(private tableStateService: TableStateService) {
    this.log('ColumnWidthPersistenceService constructor called');
    this.initialize();
  }

  /**
   * Initialize the service
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.log('Initializing ColumnWidthPersistenceService');
    
    // Add CSS to fix table layout issues
    this.addTableStyles();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up MutationObserver to detect when tables are added to the DOM
    this.setupMutationObserver();
    
    this.initialized = true;
    this.log('ColumnWidthPersistenceService initialized');
  }

  /**
   * Log a message if DEBUG is true
   */
  private log(message: string, ...args: any[]): void {
    if (this.DEBUG) {
      console.log(`[ColumnWidthPersistence] ${message}`, ...args);
    }
  }

  /**
   * Add CSS to fix table layout issues
   */
  private addTableStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* Fix for table layout issues */
      .table-container table {
        table-layout: fixed !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      
      /* Ensure columns don't expand automatically */
      .table-container th {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        position: relative;
        box-sizing: border-box !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 10 !important;
      }

      /* Add a class for tables being resized */
      .table-container table.resizing {
        user-select: none;
      }
      
      /* Force columns to maintain their width */
      .table-container th[data-locked-width] {
        width: attr(data-locked-width px) !important;
        min-width: attr(data-locked-width px) !important;
        max-width: attr(data-locked-width px) !important;
      }
      
      /* Custom resize handles */
      .custom-resize-handle {
        position: absolute;
        top: 0;
        right: 0;
        width: 5px;
        height: 100%;
        background-color: transparent;
        cursor: col-resize;
        z-index: 10;
      }
      
      .custom-resize-handle:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }
    `;
    document.head.appendChild(style);
    this.log('Added table styles');
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for DOMContentLoaded event
    window.addEventListener('DOMContentLoaded', () => {
      this.log('DOMContentLoaded event fired');
      this.applyAllSavedColumnWidths();
      this.addCustomResizeHandles();
    });

    // Also listen for load event as a fallback
    window.addEventListener('load', () => {
      this.log('Page loaded, applying saved column widths');
      this.applyAllSavedColumnWidths();
      this.addCustomResizeHandles();
    });

    // Set up custom resize handling
    this.setupCustomResizeHandling();

    // Set up a periodic check for tables that might be loaded dynamically
    // Use a shorter interval for faster response
    setInterval(() => {
      this.applyAllSavedColumnWidths();
      this.addCustomResizeHandles();
    }, 500);
  }

  /**
   * Add custom resize handles to all table headers
   */
  private addCustomResizeHandles(): void {
    const headerCells = document.querySelectorAll('.table-container th');
    
    headerCells.forEach((cell) => {
      // Skip if this cell already has a custom resize handle
      if (cell.querySelector('.custom-resize-handle')) {
        return;
      }
      
      // Create a custom resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'custom-resize-handle';
      
      // Add the resize handle to the cell
      cell.appendChild(resizeHandle);
      
      // Make sure the cell has position relative for proper handle positioning
      (cell as HTMLElement).style.position = 'relative';
    });
  }

  /**
   * Set up custom resize handling
   */
  private setupCustomResizeHandling(): void {
    let isResizing = false;
    let currentTable: HTMLElement | null = null;
    let currentCell: HTMLElement | null = null;
    let startX = 0;
    let startWidth = 0;
    let tableWidth = 0;
    let columnWidths: number[] = [];
    
    // Handle resize start
    document.addEventListener('mousedown', (event) => {
      const target = event.target as HTMLElement;
      
      // Check if we're clicking on a custom resize handle
      if (target.classList.contains('custom-resize-handle')) {
        isResizing = true;
        currentCell = target.parentElement as HTMLElement;
        currentTable = currentCell.closest('table') as HTMLElement;
        
        if (currentTable && currentCell) {
          // Mark the table as being resized
          currentTable.classList.add('resizing');
          
          // Store the starting position and width
          startX = event.pageX;
          startWidth = currentCell.offsetWidth;
          tableWidth = currentTable.offsetWidth;
          
          // Store all column widths
          const headerCells = currentTable.querySelectorAll('th');
          columnWidths = Array.from(headerCells).map(cell => (cell as HTMLElement).offsetWidth);
          
          // Lock all other column widths to prevent redistribution
          headerCells.forEach((cell, index) => {
            if (cell !== currentCell) {
              const cellElement = cell as HTMLElement;
              cellElement.setAttribute('data-locked-width', columnWidths[index].toString());
            }
          });
          
          // Prevent text selection during resize
          event.preventDefault();
        }
      }
    });
    
    // Handle resize movement
    document.addEventListener('mousemove', (event) => {
      if (!isResizing || !currentCell || !currentTable) {
        return;
      }
      
      // Calculate the new width
      const diffX = event.pageX - startX;
      let newWidth = Math.max(30, startWidth + diffX); // Minimum width of 30px
      
      // Apply the new width to the current cell
      currentCell.style.width = `${newWidth}px`;
      currentCell.style.minWidth = `${newWidth}px`;
      currentCell.style.maxWidth = `${newWidth}px`;
      
      // Prevent the event from bubbling to avoid interference
      event.stopPropagation();
    });
    
    // Handle resize end
    document.addEventListener('mouseup', () => {
      if (isResizing && currentTable) {
        // Remove the resizing class
        currentTable.classList.remove('resizing');
        
        // Unlock all column widths
        const headerCells = currentTable.querySelectorAll('th');
        headerCells.forEach((cell) => {
          cell.removeAttribute('data-locked-width');
        });
        
        // Save the new column widths
        const tableContainer = currentTable.closest('.table-container');
        if (tableContainer) {
          setTimeout(() => {
            this.saveColumnWidths(tableContainer as HTMLElement);
          }, 10);
        }
        
        // Reset state
        isResizing = false;
        currentCell = null;
        currentTable = null;
      }
    });
  }

  /**
   * Set up MutationObserver to detect when tables are added to the DOM
   */
  private setupMutationObserver(): void {
    // Create a MutationObserver to detect when tables are added to the DOM
    this.mutationObserver = new MutationObserver((mutations) => {
      // Keep track of tables that need widths applied
      const tablesToProcess: HTMLElement[] = [];
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any of the added nodes are tables or contain tables
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              
              // If it's a table container, add it to the list
              if (element.classList?.contains('table-container')) {
                tablesToProcess.push(element);
              }
              
              // If it contains table containers, add them to the list
              const containers = element.querySelectorAll?.('.table-container');
              if (containers && containers.length > 0) {
                containers.forEach(container => {
                  tablesToProcess.push(container as HTMLElement);
                });
              }
            }
          });
        }
      });
      
      // Process only the tables that were added, not all tables
      if (tablesToProcess.length > 0) {
        this.log(`Tables added to DOM, processing ${tablesToProcess.length} tables`);
        
        // Process tables immediately without waiting
        tablesToProcess.forEach(container => {
          this.applyColumnWidths(container);
        });
      }
    });
    
    // Start observing the document body for changes
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.log('MutationObserver set up');
  }

  /**
   * Apply saved column widths to all tables
   */
  private applyAllSavedColumnWidths(): void {
    const tableContainers = document.querySelectorAll('.table-container');
    this.log(`Found ${tableContainers.length} tables`);
    
    // Process tables sequentially to avoid race conditions
    tableContainers.forEach((container) => {
      this.applyColumnWidths(container as HTMLElement);
    });
  }

  /**
   * Save column widths for a table
   */
  private saveColumnWidths(container: HTMLElement): void {
    const table = container.querySelector('table');
    if (!table) {
      return;
    }

    const headerCells = table.querySelectorAll('th');
    if (!headerCells || headerCells.length === 0) {
      return;
    }

    // Get table name using a more robust method
    const tableName = this.getTableName(container);

    // Get current column widths - use getBoundingClientRect for more accurate measurements
    const columnWidths = Array.from(headerCells).map(cell => {
      const rect = (cell as HTMLElement).getBoundingClientRect();
      return Math.round(rect.width);
    });

    this.log(`Saving column widths for ${tableName}:`, columnWidths);

    // Save directly to localStorage using multiple key formats for compatibility
    try {
      // Format 1: Our new format
      localStorage.setItem(`table_column_widths_${tableName}`, JSON.stringify(columnWidths));
      
      // Format 2: Original TableStateService format
      const tableState = {
        data: [],
        selectedRows: [],
        selectedIds: [],
        columnWidths: columnWidths,
        sortState: { column: '', direction: 'asc' }
      };
      localStorage.setItem(`tableState_${tableName}`, JSON.stringify(tableState));
      
      // Format 3: Direct backup format
      localStorage.setItem(`column_widths_${tableName}`, JSON.stringify(columnWidths));
      
      // Clear any in-memory cache to ensure fresh data is used next time
      const cachedWidthsKey = `cached_widths_${tableName}`;
      if ((window as any)[cachedWidthsKey]) {
        delete (window as any)[cachedWidthsKey];
      }
      
      this.log(`Saved column widths to localStorage for ${tableName}`);
    } catch (error) {
      console.error(`Error saving column widths:`, error);
    }
  }

  /**
   * Apply saved column widths to a table
   */
  private applyColumnWidths(container: HTMLElement): void {
    const table = container.querySelector('table');
    if (!table) {
      return;
    }

    const headerCells = table.querySelectorAll('th');
    if (!headerCells || headerCells.length === 0) {
      return;
    }

    // Get table name using a more robust method
    const tableName = this.getTableName(container);

    // Skip if this is a resize operation in progress
    if (table.classList.contains('resizing')) {
      this.log('Table is being resized, skipping width application');
      return;
    }

    try {
      // Try format 1: Our new format (fastest check first)
      let columnWidths: number[] | null = null;
      const savedWidthsJson1 = localStorage.getItem(`table_column_widths_${tableName}`);
      if (savedWidthsJson1) {
        columnWidths = JSON.parse(savedWidthsJson1);
      }
      
      // Try format 2: Original TableStateService format
      if (!columnWidths || columnWidths.length === 0) {
        const savedState = localStorage.getItem(`tableState_${tableName}`);
        if (savedState) {
          const state = JSON.parse(savedState);
          if (state && state.columnWidths && state.columnWidths.length > 0) {
            columnWidths = state.columnWidths;
          }
        }
      }
      
      // Try format 3: Direct backup format
      if (!columnWidths || columnWidths.length === 0) {
        const savedWidthsJson3 = localStorage.getItem(`column_widths_${tableName}`);
        if (savedWidthsJson3) {
          columnWidths = JSON.parse(savedWidthsJson3);
        }
      }
      
      if (!columnWidths || columnWidths.length === 0) {
        return;
      }

      // Only apply if we have the right number of columns
      if (headerCells.length !== columnWidths.length) {
        return;
      }

      // Apply the widths directly to the header cells
      columnWidths.forEach((width: number, index: number) => {
        if (index < headerCells.length) {
          const headerCell = headerCells[index] as HTMLElement;
          
          // Apply width using all three properties to ensure it's respected
          headerCell.style.width = `${width}px`;
          headerCell.style.minWidth = `${width}px`;
          headerCell.style.maxWidth = `${width}px`;
          
          // Ensure sticky positioning is maintained
          headerCell.style.position = 'sticky';
          headerCell.style.top = '0';
          headerCell.style.zIndex = '10';
          
          // Store the width as a data attribute for reference
          headerCell.setAttribute('data-width', width.toString());
        }
      });
      
      // Set the table width to 100% to ensure it fills its container
      const tableElement = table as HTMLElement;
      tableElement.style.width = '100%';
      
      // Add custom resize handles if they don't exist
      this.addCustomResizeHandles();
    } catch (error) {
      console.error(`Error applying column widths:`, error);
    }
  }

  /**
   * Get a unique name for a table
   */
  private getTableName(container: HTMLElement): string {
    // First, check if the table has a data-table-name attribute
    const tableName = container.getAttribute('data-table-name');
    if (tableName) {
      return tableName;
    }
    
    // Next, check if the table's parent component has a recognizable name
    let element = container;
    let index = 0;
    
    while (element && element !== document.body) {
      if (element.tagName && element.tagName.toLowerCase().startsWith('app-')) {
        const name = element.tagName.toLowerCase().replace('app-', '');
        
        // Store the name as an attribute for future reference
        container.setAttribute('data-table-name', name);
        
        return name;
      }
      element = element.parentElement as HTMLElement;
    }

    // If we couldn't find a name, use the URL path
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(part => part);
    if (pathParts.length > 0) {
      const name = pathParts.join('-');
      
      // Store the name as an attribute for future reference
      container.setAttribute('data-table-name', name);
      
      return name;
    }

    // Count how many tables we've seen to generate a unique index
    const tables = document.querySelectorAll('.table-container');
    for (let i = 0; i < tables.length; i++) {
      if (tables[i] === container) {
        index = i;
        break;
      }
    }

    // Fallback to a generic name
    const genericName = `table-${index}`;
    
    // Store the name as an attribute for future reference
    container.setAttribute('data-table-name', genericName);
    
    return genericName;
  }
}

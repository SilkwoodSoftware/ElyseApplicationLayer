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

import { Directive, HostListener } from '@angular/core';
import { ContextMenuService } from '../services/context-menu.service';
import { TableSelectionExtensionService } from '../services/table-selection-extension.service';
import { TableStateService } from '../services/table-state.service';

/**
 * Global directive to capture right-click events and show context menu
 * This directive should be applied to the app-root element
 */
@Directive({
  selector: '[appGlobalContextMenu]'
})
export class GlobalContextMenuDirective {
  constructor(
    private contextMenuService: ContextMenuService,
    private tableSelectionExtensionService: TableSelectionExtensionService,
    private tableStateService: TableStateService
  ) {
    console.log('GlobalContextMenuDirective initialized');
  }

  /**
   * Capture right-click events
   */
  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): boolean {
    console.log('Context menu event captured');
    
    // Check if we're right-clicking on a table row
    const target = event.target as HTMLElement;
    console.log('Target element:', target);
    
    const tableRow = this.findParentTableRow(target);
    console.log('Table row found:', tableRow);
    
    if (tableRow) {
      console.log('DIRECTIVE: Table row detected, showing context menu');
      
      // Get the current table name
      const tableName = this.contextMenuService.getCurrentTableName();
      console.log('DIRECTIVE: Current table name:', tableName);
      
      // Get the selected rows from the TableSelectionExtensionService
      const selectedRows = this.tableSelectionExtensionService.getRows(tableName);
      console.log('DIRECTIVE: Selected rows from TableSelectionExtensionService:', selectedRows);
      console.log('DIRECTIVE: Number of selected rows from TableSelectionExtensionService:', selectedRows ? selectedRows.length : 0);
      
      // Get the selected rows from the TableStateService
      const stateSelectedRows = this.tableStateService.getSelectedRows(tableName);
      console.log('DIRECTIVE: Selected rows from TableStateService:', stateSelectedRows);
      console.log('DIRECTIVE: Number of selected rows from TableStateService:', stateSelectedRows ? stateSelectedRows.length : 0);
      
      // Update the selected row count in the context menu service
      this.contextMenuService.updateSelectedRowCount(selectedRows ? selectedRows.length : 0);
      
      // Prevent default browser context menu
      event.preventDefault();
      event.stopPropagation();

      // Show context menu at cursor position
      this.contextMenuService.showContextMenu(
        event.pageX,
        event.pageY
      );

      return false;
    }
    
    console.log('No table row detected, allowing default context menu');
    // If not clicking on a table row, allow the default context menu
    return true;
  }

  /**
   * Find the parent table row element
   */
  private findParentTableRow(element: HTMLElement | null): HTMLElement | null {
    if (!element) return null;
    
    // Check if the element is a table row
    if (element.tagName === 'TR') {
      return element;
    }
    
    // Check for elements with row-related classes or attributes
    // This makes the detection more flexible for different table implementations
    if (
      element.classList.contains('row') ||
      element.classList.contains('table-row') ||
      element.getAttribute('role') === 'row' ||
      element.hasAttribute('data-row-id')
    ) {
      return element;
    }
    
    // Check parent elements
    return this.findParentTableRow(element.parentElement);
  }
}

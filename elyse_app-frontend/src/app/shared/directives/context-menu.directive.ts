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

import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { ContextMenuService } from '../services/context-menu.service';

/**
 * Directive to show context menu on right-click
 * 
 * Usage:
 * <div [appContextMenu]="'table-name'" [rowCount]="selectedRows.length">
 *   Content with context menu
 * </div>
 */
@Directive({
  selector: '[appContextMenu]'
})
export class ContextMenuDirective {
  @Input('appContextMenu') tableName: string = '';
  @Input() rowCount: number = 0;

  constructor(
    private elementRef: ElementRef,
    private contextMenuService: ContextMenuService
  ) { }

  /**
   * Capture right-click events
   */
  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): boolean {
    // Prevent default browser context menu
    event.preventDefault();
    event.stopPropagation();

    // Update context menu service with current table and row count
    this.contextMenuService.setTableContext(this.tableName, this.rowCount);

    // Show context menu at cursor position
    this.contextMenuService.showContextMenu(
      event.pageX,
      event.pageY
    );

    return false;
  }
}

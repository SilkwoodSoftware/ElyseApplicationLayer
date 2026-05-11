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


import { Component, Inject, ElementRef, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-transaction-results',
  templateUrl: './transaction-results.component.html',
  styleUrls: ['../../stylesheets/dialogs.scss', '../../stylesheets/tables.scss']
})
export class TransactionResultsComponent {
  @ViewChild('dialogContainer') dialogContainer!: ElementRef;

  private isDragging = false;
  private isResizing = false;
  private isResizingColumn = false;
  private resizeDirection = '';
  private resizeColumnIndex = -1;
  private mouseOffset = { x: 0, y: 0 };
  private initialSize = { width: 0, height: 0 };
  private initialColumnWidth = 0;

  constructor(
    public dialogRef: MatDialogRef<TransactionResultsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      title: string;
      idColumnName?: string;
      showFileName?: boolean;
      showDocumentId?: boolean;
      documentId?: string;
      results: {
        id: string | number;
        displayName?: string;
        fileName?: string;
        transactionMessage?: string;
        transactionStatus?: string;
        applicationError?: string;
        error?: string;
      }[];
      messageItems?: { label: string, value: string }[];
    }
  ) {}

  closeDialog(): void {
    this.dialogRef.close();
  }

  onMouseDown(event: MouseEvent) {
    // Check if the click is on a resize handle
    const target = event.target as HTMLElement;
    if (target.classList.contains('resize-handle') ||
        target.classList.contains('resize-handle-right') ||
        target.classList.contains('resize-handle-bottom') ||
        target.classList.contains('resize-handle-corner')) {
      // Don't start dragging if clicking on a resize handle
      return;
    }
    
    // Only start dragging if we're not resizing
    if (!this.isResizing && !this.isResizingColumn) {
      this.isDragging = true;
      const dialogRect = this.dialogContainer.nativeElement.getBoundingClientRect();
      this.mouseOffset = {
        x: event.clientX - dialogRect.left,
        y: event.clientY - dialogRect.top
      };
    }
  }

  onMouseMove(event: MouseEvent) {
    // Handle dragging
    if (this.isDragging) {
      const dialogElement = this.dialogContainer.nativeElement;
      dialogElement.style.left = `${event.clientX - this.mouseOffset.x}px`;
      dialogElement.style.top = `${event.clientY - this.mouseOffset.y}px`;
      event.preventDefault(); // Prevent text selection during drag
    }
    // Handle dialog resizing
    else if (this.isResizing) {
      this.resizeDialog(event);
    }
    // Handle column resizing
    else if (this.isResizingColumn) {
      this.resizeColumn(event);
    }
  }

  onMouseUp() {
    // Reset all interaction states
    this.isDragging = false;
    this.isResizing = false;
    this.isResizingColumn = false;
    
    // Remove resizing class from table if it was being resized
    if (this.isResizingColumn) {
      const table = this.dialogContainer.nativeElement.querySelector('table');
      if (table) {
        table.classList.remove('resizing');
      }
    }
  }

  onResizeDialog(event: MouseEvent, direction: string) {
    // Prevent the event from bubbling up to the dialog's mousedown handler
    event.preventDefault();
    event.stopPropagation();
    
    // Set resizing state
    this.isResizing = true;
    this.isDragging = false; // Ensure we're not dragging
    this.resizeDirection = direction;
    
    const dialogElement = this.dialogContainer.nativeElement;
    const rect = dialogElement.getBoundingClientRect();
    
    // Store initial size
    this.initialSize = {
      width: rect.width,
      height: rect.height
    };
    
    // Store initial mouse position
    this.mouseOffset = {
      x: event.clientX,
      y: event.clientY
    };
    
    // Add global event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    
    // Add a class to indicate resizing
    dialogElement.classList.add('resizing');
    
    console.log(`Starting resize in direction: ${direction}`);
  }
  
  // Bound event handlers to ensure 'this' context is preserved
  private handleMouseMove = (event: MouseEvent) => {
    this.onMouseMove(event);
  }
  
  private handleMouseUp = (event: MouseEvent) => {
    this.onMouseUp();
    
    // Remove global event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    
    // Remove resizing class
    const dialogElement = this.dialogContainer.nativeElement;
    dialogElement.classList.remove('resizing');
  }

  resizeDialog(event: MouseEvent) {
    if (!this.isResizing) return;
    
    const dialogElement = this.dialogContainer.nativeElement;
    const deltaX = event.clientX - this.mouseOffset.x;
    const deltaY = event.clientY - this.mouseOffset.y;
    
    if (this.resizeDirection === 'right' || this.resizeDirection === 'corner') {
      const newWidth = this.initialSize.width + deltaX;
      if (newWidth >= 300) { // Minimum width
        dialogElement.style.width = `${newWidth}px`;
        console.log(`Resizing width to: ${newWidth}px`);
      }
    }
    
    if (this.resizeDirection === 'bottom' || this.resizeDirection === 'corner') {
      const newHeight = this.initialSize.height + deltaY;
      if (newHeight >= 200) { // Minimum height
        dialogElement.style.height = `${newHeight}px`;
        console.log(`Resizing height to: ${newHeight}px`);
      }
    }
    
    // Prevent default to avoid text selection during resize
    event.preventDefault();
  }

  onResizeColumn(event: MouseEvent, columnIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizingColumn = true;
    this.resizeColumnIndex = columnIndex;
    
    const table = this.dialogContainer.nativeElement.querySelector('table');
    const headers = table.querySelectorAll('th');
    const header = headers[columnIndex];
    
    this.initialColumnWidth = header.offsetWidth;
    
    this.mouseOffset = {
      x: event.clientX,
      y: event.clientY
    };
    
    // Add global event listeners
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Add resizing class to table
    table.classList.add('resizing');
  }

  resizeColumn(event: MouseEvent) {
    const deltaX = event.clientX - this.mouseOffset.x;
    const table = this.dialogContainer.nativeElement.querySelector('table');
    const headers = table.querySelectorAll('th');
    const header = headers[this.resizeColumnIndex];
    
    const newWidth = this.initialColumnWidth + deltaX;
    if (newWidth >= 50) { // Minimum column width
      header.style.width = `${newWidth}px`;
    }
  }
}
    

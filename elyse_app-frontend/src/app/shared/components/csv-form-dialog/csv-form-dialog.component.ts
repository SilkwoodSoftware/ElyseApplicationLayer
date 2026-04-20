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

export interface CsvFormDialogData {
  formId: string;
  params?: Record<string, any>;
  title?: string;
  width?: string;
  isPopupForm?: boolean; // Flag to indicate if this is a popup form
  isInChain?: boolean; // Flag to indicate if this form is part of a chain
}

@Component({
  selector: 'app-csv-form-dialog',
  templateUrl: './csv-form-dialog.component.html',
  styleUrls: ['../../stylesheets/dialogs.scss']
})
export class CsvFormDialogComponent {
  @ViewChild('dialogContainer') dialogContainer!: ElementRef;
  
  formId: string;
  params: Record<string, any>;
  dialogTitle: string;
  dialogWidth: string;
  isPopupForm: boolean;
  isInChain: boolean;
  
  private isDragging = false;
  private mouseOffset = { x: 0, y: 0 };

  constructor(
    public dialogRef: MatDialogRef<CsvFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CsvFormDialogData
  ) {
    this.formId = data.formId;
    this.params = data.params || {};
    this.dialogTitle = data.title || 'Form';
    this.dialogWidth = data.width || '25%';
    this.isPopupForm = data.isPopupForm || false;
    this.isInChain = data.isInChain || false;
  }
  
  /**
   * Handle form submission
   * @param result The result from the form submission
   */
  onFormSubmitted(result: any): void {
    this.dialogRef.close(result);
  }

  /**
   * Handle form cancellation
   */
  onFormCancelled(): void {
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
      const dialogRect = this.dialogContainer.nativeElement.getBoundingClientRect();
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
  }
}

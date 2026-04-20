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

import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FieldConfig } from '../../interfaces/field-config.interface';

@Component({
  selector: 'app-form-confirmation-dialog',
  templateUrl: './form-confirmation-dialog.component.html',
  styleUrls: ['./form-confirmation-dialog.component.scss']
})
export class FormConfirmationDialogComponent {

  getDisplayValue(field: FieldConfig): string {
    return field.displayValue || field.value;
  }

  getFormattedFieldName(field: FieldConfig): string {
    // Format as "field type | field name" for the confirmation dialog only
    return `${field.fieldType} | ${field.displayName}`;
  }

  getOldValue(field: FieldConfig, action?: string): string {
    if (field.isMultiSelect) {
      // For multi-select fields, format the original selected items
      const items = field.originalSelectedItems || [];
      if (items.length === 0) {
        return '(none)';
      }
      return items.map(item => item.name).join(', ');
    }
    return field.originalValue || '';
  }

  getNewValue(field: FieldConfig, action?: string): string {
    if (field.isMultiSelect) {
      // For multi-select fields, format the current selected items
      const items = field.selectedItems || [];
      if (items.length === 0) {
        return '(none)';
      }
      return items.map(item => item.name).join(', ');
    }
    
    // Handle delete actions precisely
    if (action === 'delete') {
      return '(deleted)';
    }
    
    return field.displayValue || field.value || '';
  }
  constructor(
    public dialogRef: MatDialogRef<FormConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      changes: { field: FieldConfig, action: string, displayAction: string }[]
    }
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

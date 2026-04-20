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
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { CsvFormDialogComponent, CsvFormDialogData } from '../components/csv-form-dialog/csv-form-dialog.component';
import { CsvFormService } from './csv-form.service';
import { ContextAwareRoutingService } from './context-aware-routing.service';

/**
 * Service for opening CSV forms in dialogs
 */
@Injectable({
  providedIn: 'root'
})
export class CsvFormDialogService {
  constructor(
    private dialog: MatDialog,
    private csvFormService: CsvFormService,
    private router: Router,
    private contextRouting: ContextAwareRoutingService
  ) {}

  /**
   * Open a CSV form in a dialog
   * @param formId The ID of the form to open
   * @param params Optional parameters to pass to the form
   * @returns An Observable that resolves to the form result when the dialog is closed
   */
  openFormDialog(formId: string, params?: Record<string, any>): Observable<any> {
    // Get the form definition to get the title and dimensions
    const formDefinition = this.csvFormService.getForm(formId);
    if (!formDefinition) {
      throw new Error(`Form not found: ${formId}`);
    }

    // Open the form as dialog regardless of type - the form component will handle navigation after collecting fields
    console.log(`Opening form ${formId} as dialog (FormType: ${formDefinition.formType})`);
    
    // Prepare the data first
    const dialogData: CsvFormDialogData = {
      formId,
      params: params || {},
      title: formDefinition.title,
      width: formDefinition.width // Pass the width to the dialog component
    };

    // Open the dialog with minimal configuration, similar to other dialogs
    const dialogRef = this.dialog.open(CsvFormDialogComponent, {
      data: dialogData,
      // Don't set width/height - let the dialog use default sizing from shared styles
      disableClose: false,
      autoFocus: false,
      panelClass: 'standard-dialog'
    });

    // Return the dialog result
    return dialogRef.afterClosed();
  }
}

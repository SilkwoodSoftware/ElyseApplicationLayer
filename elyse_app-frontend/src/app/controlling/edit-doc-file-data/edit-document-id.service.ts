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
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TransactionResultDialogComponent } from '../../shared/components/transaction-results/transaction-result-dialog.component';
import { Router } from '@angular/router';
import { ApplicationMessageService } from '../../shared/services/application-message.service';

@Injectable({
  providedIn: 'root'
})
export class EditDocumentIdService {
  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private router: Router,
    private applicationMessageService: ApplicationMessageService
  ) {}

  openEditDocumentIdDialog(currentDocumentId: string): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Edit Document ID',
        message: `Current Document ID: ${currentDocumentId}\nEnter the new Document ID:`,
        confirmText: 'Update',
        cancelText: 'Cancel',
        inputField: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.confirmed && result.input) {
        this.updateDocumentId(currentDocumentId, result.input).subscribe(
          (response: any) => {
            // Use database response as-is for TransactionResultDialogComponent
            this.dialog.open(TransactionResultDialogComponent, {
              data: {
                title: 'Update Document ID Result',
                message: response.transactionMessage,
                status: response.transactionStatus
              }
            }).afterClosed().subscribe(() => {
              if (response.transactionStatus === 'Good') {
                this.router.navigate(['/edit-document-data'], {
                  queryParams: { documentId: result.input }
                });
              }
            });
          },
          error => {
            console.error('Error updating document ID:', error);
            
            // Create application error message instead of hijacking database parameters
            const applicationError = this.applicationMessageService.createFromHttpError(error);
            
            // Use TransactionResultDialogComponent with application layer error
            this.dialog.open(TransactionResultDialogComponent, {
              data: {
                title: 'Application Error',
                message: applicationError.appErrors?.[0] || applicationError.systemErrors?.[0] || 'An error occurred while updating the document ID.',
                status: 'Application Error'
              }
            });
          }
        );
      }
    });
  }

  private updateDocumentId(DocumentID: string, NewDocumentID: string): Observable<any> {
    return this.http.post(`${environment.dotNetBaseUrl}/document/update-documentid`, { DocumentID, NewDocumentID });
  }
}

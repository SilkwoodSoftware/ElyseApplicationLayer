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
import { TransactionResultDialogComponent } from '../../shared/components/transaction-results/transaction-result-dialog.component';
import { ApplicationErrorDialogComponent } from '../../shared/components/application-error-dialog/application-error-dialog.component';
import { TransactionResultsComponent } from '../../shared/components/transaction-results/transaction-results.component';
import { DocumentValidationService } from '../../reading/documents/document-validation.service';
import { FileStorageService } from '../../editing/upload-file/file-storage.service';
import { TableStateService } from '../../shared/services/table-state.service';
import { forkJoin, Observable } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class FileUploadLinkService {
  constructor(
    private dialog: MatDialog,
    private documentValidationService: DocumentValidationService,
    private fileStorageService: FileStorageService,
    private tableStateService: TableStateService,
    private router: Router
  ) {}

  /**
   * Show a dialog to confirm linking files to a document
   * @param documentId The document ID to link files to
   */
  public showLinkFilesDialog(documentId: string): void {
    // Validate the document ID
    this.documentValidationService.validateDocumentId(documentId).subscribe(
      (response) => {
        if (response.validationResult === 'Pass') {
          // Document ID is valid, use browser's native confirm dialog
          if (confirm(`Link files to document ${documentId}?`)) {
            // User confirmed, open file selection dialog
            // Open file selection dialog
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.multiple = true; // Allow multiple file selection
            fileInput.accept = '*/*';
            fileInput.onchange = (event: Event) => {
              const target = event.target as HTMLInputElement;
              const files = target.files;
              if (files && files.length > 0) {
                this.uploadFiles(Array.from(files), documentId);
              } else {
                // No files selected, navigate back
                window.history.back();
              }
            };
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
          } else {
            // User cancelled, navigate back
            window.history.back();
          }
        } else {
          // Document ID is invalid, show error message
          this.dialog.open(TransactionResultDialogComponent, {
            data: {
              title: 'Document Validation Failed',
              message: response.transactionMessage,
              status: response.transactionStatus
            }
          });
          window.history.back();
        }
      },
      (error) => {
        console.error('Error validating document ID:', error);
        this.dialog.open(ApplicationErrorDialogComponent, {
          data: {
            title: 'Application Error',
            message: 'An error occurred while validating the document ID.',
            status: 'Application layer error'
          }
        });
        window.history.back();
      }
    );
  }

  /**
   * Upload files and link them to a document
   * @param files The files to upload
   * @param documentId The document ID to link files to
   */

  /**
   * Upload files and link them to a document
   * @param files The files to upload
   * @param documentId The document ID to link files to
   */
  private uploadFiles(files: File[], documentId: string): void {
    const uploadObservables: Observable<any>[] = [];

    files.forEach(file => {
      const reader = new FileReader();
      const uploadObservable = new Observable<any>(observer => {
        reader.onload = (e: ProgressEvent<FileReader>) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          this.fileStorageService.uploadFile(arrayBuffer, file.name, documentId).subscribe({
            next: (response) => {
              observer.next({ response, fileName: file.name });
              observer.complete();
            },
            error: (error) => {
              observer.error(error);
            }
          });
        };
        reader.readAsArrayBuffer(file);
      });
      uploadObservables.push(uploadObservable);
    });

    forkJoin(uploadObservables).subscribe({
      next: (results) => {
        this.showUploadResults(results, documentId);
      },
      error: (error) => {
        console.error('Error uploading files:', error);
        this.dialog.open(ApplicationErrorDialogComponent, {
          data: {
            title: 'Application Error',
            errors: [{
              fieldName: 'File Upload',
              errorMessage: error?.error?.message || error?.message || 'An error occurred while uploading files.'
            }]
          }
        });
        window.history.back();
      }
    });
  }

  /**
   * Show the results of the file upload
   * @param results The results of the file upload
   * @param documentId The document ID the files were linked to
   */
  private showUploadResults(results: any[], documentId: string): void {
    // Use the existing TransactionResultsComponent for displaying results
    const dialogRef = this.dialog.open(TransactionResultsComponent, {
      data: {
        title: 'File Upload Results',
        idColumnName: 'File ID',
        showFileName: true,
        showDocumentId: true,
        documentId: documentId,
        results: results.map(result => ({
          id: result.response.newFileId,
          fileName: result.fileName,
          transactionMessage: result.response.transactionMessage,
          transactionStatus: result.response.transactionStatus
        }))
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.tableStateService.notifyRecordUpdated('Files');
      window.history.back();
    });
  }
}

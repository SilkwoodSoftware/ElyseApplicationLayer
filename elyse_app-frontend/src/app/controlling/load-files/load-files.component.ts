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

import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, Observable } from 'rxjs';
import { FileStorageService } from '../../editing/upload-file/file-storage.service';
import { TableStateService } from '../../shared/services/table-state.service';
import { TransactionResultsComponent } from '../../shared/components/transaction-results/transaction-results.component';
import { ApplicationErrorDialogComponent } from '../../shared/components/application-error-dialog/application-error-dialog.component';

@Component({
  selector: 'app-load-files',
  template: `
    <div class="loading-container" *ngIf="isUploading">
      <div class="loading-message">Processing file upload request...</div>
    </div>
  `,
  styleUrls: ['../../shared/stylesheets/dialogs.scss', '../../shared/stylesheets/messages.scss']
})
export class LoadFilesComponent implements OnInit {
  isUploading: boolean = false;

  constructor(
    private dialog: MatDialog,
    private fileStorageService: FileStorageService,
    private tableStateService: TableStateService
  ) {}

  ngOnInit(): void {
    // Open file browser immediately
    try {
      this.openFileSelectionDialog();
    } catch (error) {
      console.error('Error opening file selection dialog:', error);
      this.navigateBack();
    }
  }

  private openFileSelectionDialog(): void {
    // Create a file input element dynamically
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true; // Allow multiple file selection
    fileInput.accept = '*/*';
    fileInput.onchange = (event: Event) => {
      try {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        if (files && files.length > 0) {
          this.isUploading = true;
          this.uploadFiles(Array.from(files));
        } else {
          // No files selected, navigate back
          this.navigateBack();
        }
      } catch (error) {
        console.error('Error handling file selection:', error);
        this.navigateBack();
      }
    };
    
    // Handle cancel case
    fileInput.oncancel = () => {
      this.navigateBack();
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  private uploadFiles(files: File[]): void {
    try {
      const uploadObservables: Observable<any>[] = [];

      files.forEach(file => {
        const reader = new FileReader();
        const uploadObservable = new Observable<any>(observer => {
          reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              // Call uploadFile without documentId
              this.fileStorageService.uploadFile(arrayBuffer, file.name).subscribe({
                next: (response) => {
                  observer.next({ response, fileName: file.name });
                  observer.complete();
                },
                error: (error) => {
                  console.error(`Error uploading file ${file.name}:`, error);
                  observer.error(error);
                }
              });
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
              observer.error(error);
            }
          };
          
          reader.onerror = (error) => {
            console.error(`Error reading file ${file.name}:`, error);
            observer.error(error);
          };
          
          reader.readAsArrayBuffer(file);
        });
        uploadObservables.push(uploadObservable);
      });

      forkJoin(uploadObservables).subscribe({
        next: (results) => {
          this.isUploading = false;
          this.showUploadResults(results);
        },
        error: (error) => {
          this.isUploading = false;
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
          this.navigateBack();
        }
      });
    } catch (error) {
      console.error('Error in uploadFiles:', error);
      this.isUploading = false;
      this.navigateBack();
    }
  }

  private showUploadResults(results: any[]): void {
    try {
      // Use the existing TransactionResultsComponent for displaying results
      const dialogRef = this.dialog.open(TransactionResultsComponent, {
        disableClose: false,
        autoFocus: true,
        panelClass: 'standard-dialog',
        data: {
          title: 'File Upload Results',
          idColumnName: 'File ID',
          showFileName: true,
          showDocumentId: false, // Don't show document ID
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
        this.navigateBack();
      });
    } catch (error) {
      console.error('Error showing upload results:', error);
      this.navigateBack();
    }
  }

  private navigateBack(): void {
    try {
      // Navigate back to the previous page
      window.history.back();
    } catch (error) {
      console.error('Error navigating back:', error);
      // As a fallback, try to navigate to the home page
      window.location.href = '/';
    }
  }
}

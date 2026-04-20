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
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, Observable } from 'rxjs';
import { FileStorageService } from '../../editing/upload-file/file-storage.service';
import { TableStateService } from '../../shared/services/table-state.service';
import { TransactionResultsComponent } from '../../shared/components/transaction-results/transaction-results.component';
import { ApplicationErrorDialogComponent } from '../../shared/components/application-error-dialog/application-error-dialog.component';

@Component({
  selector: 'app-load-files-and-link',
  template: `
    <div class="loading-container" *ngIf="isUploading">
      <div class="loading-message">Processing file upload request...</div>
    </div>
    
    <div class="dialog-backdrop" *ngIf="showConfirmation && documentId">
      <div class="dialog-container auto-width">
        <div class="message-heading">Link Files</div>
        <div class="message-text">
          <p>Link one or more files to document {{documentId}}</p>
        </div>
        <div class="message-text">
          <button class="confirmation-buttons" (click)="onConfirm()">Confirm</button>
          <button class="confirmation-buttons" (click)="onCancel()">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../shared/stylesheets/dialogs.scss', '../../shared/stylesheets/messages.scss']
})
export class LoadFilesAndLinkComponent implements OnInit {
  documentId: string | null = null;
  isUploading: boolean = false;
  showConfirmation: boolean = false;

  constructor(
    private dialog: MatDialog,
    private fileStorageService: FileStorageService,
    private tableStateService: TableStateService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get document ID from query parameters
    this.route.queryParams.subscribe(params => {
      this.documentId = params['documentId'];
      
      if (this.documentId) {
        // Show confirmation UI
        this.showConfirmation = true;
      } else {
        console.error('No document ID provided in query parameters');
        this.navigateBack();
      }
    });
  }

  onConfirm(): void {
    if (this.documentId) {
      this.showConfirmation = false;
      this.openFileSelectionDialog(this.documentId);
    }
  }

  onCancel(): void {
    this.showConfirmation = false;
    this.navigateBack();
  }

  private openFileSelectionDialog(documentId: string): void {
    // Create a file input element dynamically
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true; // Allow multiple file selection
    fileInput.accept = '*/*';
    fileInput.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        this.isUploading = true;
        this.uploadFiles(Array.from(files), documentId);
      } else {
        // No files selected, navigate back
        this.navigateBack();
      }
    };
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

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
        this.isUploading = false;
        this.showUploadResults(results, documentId);
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
  }

  private showUploadResults(results: any[], documentId: string): void {
    // Use the existing TransactionResultsComponent for displaying results
    // Add specific configuration to make it more reliable
    const dialogRef = this.dialog.open(TransactionResultsComponent, {
      disableClose: false,
      autoFocus: true,
      panelClass: 'standard-dialog',
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
      this.navigateBack();
    });
  }

  private navigateBack(): void {
    // Navigate back to the previous page
    window.history.back();
  }
}

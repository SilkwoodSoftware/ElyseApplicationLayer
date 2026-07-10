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
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { RemoveFileDocLinkService } from './remove-file-doc-link.service';
import { forkJoin } from 'rxjs';
import { TransactionResultsComponent } from '../../shared/components/transaction-results/transaction-results.component';
import { TableStateService } from '../../shared/services/table-state.service';

@Component({
  selector: 'app-remove-file-doc-link-dialog',
  template: ''
})
export class RemoveFileDocLinkDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<RemoveFileDocLinkDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { documentId: string, fileIds: number[] },
    private removeFileDocLinkService: RemoveFileDocLinkService,
    private dialog: MatDialog,
    private tableStateService: TableStateService
  ) {}

  confirmRemoval(): void {
    const requests = this.data.fileIds.map(fileId =>
      this.removeFileDocLinkService.removeFileDocumentLink(this.data.documentId, fileId)
    );

    forkJoin(requests).subscribe(
      (responses: any[]) => {
        const results = responses.map((response, index) => ({
          id: this.data.fileIds[index],
          transactionMessage: response.transactionMessage,
          transactionStatus: response.transactionStatus
        }));
        this.showResults(results);
        // Notify that a record has been updated
        this.tableStateService.notifyRecordUpdated('Documents');        
      },
      (error) => {
        console.error('Error removing file-document links:', error);
        this.dialogRef.close({ success: false });
      }
    );
  }

  private showResults(results: any[]): void {
    const dialogRef = this.dialog.open(TransactionResultsComponent, {
      data: {
        title: `Remove File-Document Links Results for Document ID: ${this.data.documentId}`,
        results: results
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.dialogRef.close({ success: true, results: results });
    });
  }
}
    

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


import { Component, Inject, ElementRef, ViewChild, Input } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { forkJoin } from 'rxjs';
import { TransactionResultsComponent } from '../../shared/components/transaction-results/transaction-results.component';
import { MessageLabelService } from '../../shared/services/message-label.service';

@Component({
  selector: 'app-link-file-to-doc-dialog',
  templateUrl: './link-file-to-doc-dialog.component.html',
  styleUrls: ['../../shared/stylesheets/dialogs.scss']
})
export class LinkFileToDocDialogComponent {
  linkForm: FormGroup;
  @ViewChild('dialogContainer') dialogContainer!: ElementRef;
  @Input() tableHeading: string = '';
  private isDragging = false;
  private mouseOffset = { x: 0, y: 0 };
  messageItems: { label: string, value: string }[] = [];
  documentId: string = '';
  

  constructor(
    public dialogRef: MatDialogRef<LinkFileToDocDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { selectedFileIds: number[], tableHeading: string },
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private dialog: MatDialog,
    private messageLabelService: MessageLabelService
  ) {
    this.linkForm = this.formBuilder.group({
      documentId: ['', Validators.required]

    });

  }
  ngOnInit(): void {
      this.tableHeading = `Link the following selected files\n\n${this.data.selectedFileIds.join('\n')}`  
  }
  
  onSubmit(): void {
    if (this.linkForm.valid) {
      this.documentId = this.linkForm.get('documentId')?.value;
      this.linkFilesToDocument(this.documentId, this.data.selectedFileIds);
    }
  }

  private linkFilesToDocument(documentId: string, fileIds: number[]): void {
    const requests = fileIds.map(fileId => 
      this.http.post(`${environment.dotNetBaseUrl}/xref/create-file-doc-link`, {
        documentId: documentId,
        fileId: fileId,
        transactionGroupId: null
      })
    );

    forkJoin(requests).subscribe(
      (responses: any[]) => {
        const results = responses.map((response, index) => ({
          id: fileIds[index],
          transactionMessage: response.transactionMessage,
          transactionStatus: response.transactionStatus
        }));
        this.updateMessageItems(results);
        this.showResults(results);
      },
      (error) => {
        console.error('Error linking files to document:', error);
      }
    );
  }
  private updateMessageItems(results: any[]): void {
    this.messageItems = [
      { label: this.messageLabelService.getLabel('transactionMessage'), value: results[0]?.transactionMessage || '' },
      { label: this.messageLabelService.getLabel('transactionStatus'), value: results[0]?.transactionStatus || '' },
      { label: this.messageLabelService.getLabel('numberOfFiles'), value: results.length.toString() }
    ];
  }

  private showResults(results: any[]): void {
    const dialogRef = this.dialog.open(TransactionResultsComponent, {
      data: {
        title: `Link Files to Document: ${this.documentId}  Results`,
        results: results,
        messageItems: this.messageItems
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.dialogRef.close(true);
    });    
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    const dialogRect = this.dialogContainer.nativeElement.getBoundingClientRect();
    this.mouseOffset = {
      x: event.clientX - dialogRect.left,
      y: event.clientY - dialogRect.top
    };
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const dialogElement = this.dialogContainer.nativeElement;
      dialogElement.style.left = `${event.clientX - this.mouseOffset.x}px`;
      dialogElement.style.top = `${event.clientY - this.mouseOffset.y}px`;
    }
  }

  onMouseUp() {
    this.isDragging = false;
  }


}
    

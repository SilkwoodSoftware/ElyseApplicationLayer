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

import { Component, Inject, ElementRef, ViewChild, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MessageLabelService } from '../../services/message-label.service';
import { DialogCompletionService } from '../../services/dialog-completion.service';

@Component({
  selector: 'app-transaction-result-dialog',
  templateUrl: './transaction-result-dialog.component.html',
  styleUrls: [ '../../stylesheets/dialogs.scss', '../../stylesheets/messages.scss']
})
export class TransactionResultDialogComponent implements OnInit {
  @ViewChild('dialogContainer') dialogContainer!: ElementRef;
  private isDragging = false;
  private mouseOffset = { x: 0, y: 0 };
  constructor(
    public dialogRef: MatDialogRef<TransactionResultDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      title: string;
      message: string;
      status: string;
      messageLabel?: string;  // Custom label for message field
      statusLabel?: string;   // Custom label for status field
      chainId?: string;
      linkId?: number;
      isPartOfChain?: boolean;
    },
    private messageLabelService: MessageLabelService,
    private dialogCompletionService: DialogCompletionService
  ) {
    console.log('TransactionResultDialogComponent constructor - Dialog data:', data);
  }
  
  ngOnInit() {
    // Set up afterClosed handler
    this.dialogRef.afterClosed().subscribe(() => {
      console.log('TransactionResultDialogComponent - Dialog closed via afterClosed()');
      
      // Signal dialog completion for DIALOG_CLOSE chain continuation
      if (this.data.chainId && this.data.linkId !== undefined) {
        console.log(`Signaling dialog completion for chain ${this.data.chainId}, link ${this.data.linkId}`);
        this.dialogCompletionService.dialogClosed(this.data.chainId, this.data.linkId, {
          transactionStatus: this.data.status,
          transactionMessage: this.data.message
        });
      } else {
        console.log('No chain information available, dialog completion not signaled');
      }
    });
  }
  
  getLabel(key: string): string {
    return this.messageLabelService.getLabel(key);
  }
  closeDialog(): void {
    console.log('TransactionResultDialogComponent.closeDialog() called');
    this.dialogRef.close();
    console.log('TransactionResultDialogComponent.closeDialog() completed');
  }
  onNoClick(): void {
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

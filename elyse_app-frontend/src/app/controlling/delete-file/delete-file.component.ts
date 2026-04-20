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

import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FileStorageService } from '../../editing/upload-file/file-storage.service';
import { MessageLabelService } from '../../shared/services/message-label.service';
import { ApplicationMessageService } from '../../shared/services/application-message.service';

@Component({
  selector: 'app-delete-file',
  templateUrl: './delete-file.component.html',
  styleUrls: ['./delete-file.component.scss']
})
export class FileDeleteComponent {
  fileId?: number;
  
  // Database response properties (read-only, for MessageLabelService)
  databaseResponse?: any;
  
  // Application layer properties
  applicationMessages?: any;
  operationStatus?: string;
  messageItems: { label: string, value: string }[] = [];

  constructor(
    private fileStorageService: FileStorageService,
    private messageLabelService: MessageLabelService,
    private applicationMessageService: ApplicationMessageService
  ) {}

  deleteFileFE() {
    if (this.fileId !== undefined) {
      this.fileStorageService.deleteFile(this.fileId).subscribe({
        next: (response: any) => {
          if (response) {
            // Store database response for MessageLabelService (read-only)
            this.databaseResponse = response;
            this.operationStatus = response.transactionStatus === 'Good' ? 'Success' : 'Failed';
            this.updateMessageItems();
          } else {
            this.operationStatus = 'Failed';
            this.applicationMessages = this.applicationMessageService.createValidationError(
              'No response received from server'
            );
            this.updateMessageItems();
          }
        },
        error: (error) => {
          // Handle error without hijacking database parameters
          this.operationStatus = 'Failed';
          this.applicationMessages = this.applicationMessageService.createFromHttpError(error);
          console.error('Error deleting file:', error);
          this.updateMessageItems();
        }
      });
    } else {
      // Application validation error - don't hijack database parameters
      this.operationStatus = 'Failed';
      this.applicationMessages = this.applicationMessageService.createValidationError(
        'Enter a valid file ID.'
      );
      this.updateMessageItems();
    }
  }

  private updateMessageItems(): void {
    this.messageItems = [];
    
    // Add database response items (if available)
    if (this.databaseResponse) {
      if (this.databaseResponse.transactionMessage) {
        this.messageItems.push({
          label: this.messageLabelService.getLabel('transactionMessage'),
          value: this.databaseResponse.transactionMessage
        });
      }
      if (this.databaseResponse.transactionStatus) {
        this.messageItems.push({
          label: this.messageLabelService.getLabel('transactionStatus'),
          value: this.databaseResponse.transactionStatus
        });
      }
    }
    
    // Add operation status
    if (this.operationStatus) {
      this.messageItems.push({
        label: this.messageLabelService.getLabel('operationStatus'),
        value: this.operationStatus
      });
    }
    
    // Filter out empty values
    this.messageItems = this.messageItems.filter(item => item.value !== '');
  }
}

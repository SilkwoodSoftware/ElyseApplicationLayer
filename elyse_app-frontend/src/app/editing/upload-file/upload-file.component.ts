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


import { Component, ViewChild, ElementRef } from '@angular/core';
import { FileStorageService } from './file-storage.service';
import { UploadResponse } from './upload-file-response.model';
import { MessageLabelService } from '../../shared/services/message-label.service';

@Component({
  selector: 'app-upload-file',
  templateUrl: './upload-file.component.html',
  styleUrls: ['./upload-file.component.scss']
})
export class UploadFileComponent {
  fileName = 'No file chosen';
  messageItems: { label: string, value: string }[] = [];  

  transactionMessage: string | null = null;
  transactionStatus: string | null = null;
  newFileId: number | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(private fileStorageService: FileStorageService,
    private messageLabelService: MessageLabelService
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      this.fileName = 'No file chosen';
      return;
    }
    const file = input.files[0];
    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
       this.fileStorageService.uploadFile(arrayBuffer, file.name).subscribe({  
      next: (response: UploadResponse) => {
        console.log('File uploaded successfully:', response);
        this.updateMessageItems(response);
      },
      error: (error) => {
        console.error('Error uploading file:', error);     
      }
    });
  };
  reader.readAsArrayBuffer(file);
  }

  onLabelClick() {
    this.fileInput.nativeElement.click();
  }
  private updateMessageItems(data: any): void {
    this.messageItems = [
      { label: this.messageLabelService.getLabel('transactionMessage'), value: data.transactionMessage || '' },
      { label: this.messageLabelService.getLabel('transactionStatus'), value: data.transactionStatus || '' },
      { label: this.messageLabelService.getLabel('newFileId'), value: data.newFileId?.toString() || '' }
    ].filter(item => item.value !== ''); // Remove empty items
  }  
}

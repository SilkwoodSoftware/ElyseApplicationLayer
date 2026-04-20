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
import { CreateDocumentIdService } from './create-document-id.service';
import { MessageLabelService } from '../../shared/services/message-label.service';
import * as JSONbig from 'json-bigint';

@Component({
  selector: 'app-create-document-id',
  templateUrl: './create-document-id.component.html',
  styleUrls: ['./create-document-id.component.scss']
})
export class CreateDocumentIdComponent {
  result: any; 
  messageItems: { label: string, value: string }[] = [];
  constructor(private createDocumentIdService: CreateDocumentIdService,
  private messageLabelService: MessageLabelService
  ) { }
  
  createDocumentId(documentId: string, transactionGroupId: string, idLockStatus: string): void {
    const transactionGroupBigInt = BigInt(transactionGroupId);
    const data = {
      documentId: documentId,
      transactionGroupId: transactionGroupId,
      idLockStatus: idLockStatus
    };
    const serializedData = JSONbig.stringify(data);
    this.createDocumentIdService.createDocumentId(serializedData).subscribe(result => {
      this.result = result;
    this.updateMessageItems(result);
    });

  }
  private updateMessageItems(data: any): void {
    this.messageItems = [
      { label: this.messageLabelService.getLabel('transactionMessage'), value: data.transactionMessage || '' },
      { label: this.messageLabelService.getLabel('transactionStatus'), value: data.transactionStatus || '' },
      { label: this.messageLabelService.getLabel('newDocId'), value: data.newDocId?.toString() || '' }
    ];
  }  
}

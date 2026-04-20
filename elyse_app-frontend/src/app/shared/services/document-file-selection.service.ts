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
import { BehaviorSubject } from 'rxjs';

export interface DocumentFileSelection {
  documentId: string | null;
  fileId: number | null;
}

@Injectable({
  providedIn: 'root'
})


export class DocumentFileSelectionService {
  private selectionSource = new BehaviorSubject<DocumentFileSelection>({ documentId: null, fileId: null });
  selection$ = this.selectionSource.asObservable();

  private documentIdSource = new BehaviorSubject<string | null>(null);
  documentId$ = this.documentIdSource.asObservable();  

  setSelection(documentId: string | null, fileId: number | null): void {
    console.log('DocumentFileSelectionService.setSelection called with:', { documentId, fileId });
    this.selectionSource.next({ documentId, fileId });
    this.documentIdSource.next(documentId);
    console.log('Selected Document/File:', { documentId, fileId });
  }

  clearSelection(): void {
    this.selectionSource.next({ documentId: null, fileId: null });
    this.documentIdSource.next(null);
  }

  getSelectedDocumentId(): string | null {
    return this.selectionSource.value.documentId;
  }


}
    

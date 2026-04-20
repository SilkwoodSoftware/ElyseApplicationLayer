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


// This is the service to capture the user IDs for the table rows selected by the user. 

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SelectedIdsService {

  // Member variables for selected items
  private selectedIdsSource = new BehaviorSubject<number[]>([]);
  selectedIds$ = this.selectedIdsSource.asObservable();

  private selectedNamesSource = new BehaviorSubject<string[]>([]);
  selectedNames$ = this.selectedNamesSource.asObservable();

  private selectedUsernamesSource = new BehaviorSubject<string[]>([]);
  selectedUsernames$ = this.selectedUsernamesSource.asObservable();

  private selectedDocumentIdsSource = new BehaviorSubject<string[]>([]);
  selectedDocumentIds$ = this.selectedDocumentIdsSource.asObservable();

  private selectedFileIdsSource = new BehaviorSubject<number[]>([]);
  selectedFileIds$ = this.selectedFileIdsSource.asObservable();

  private selectedFilenamesSource = new BehaviorSubject<string[]>([]);
  selectedFilenames$ = this.selectedFilenamesSource.asObservable();

  // Other

  private userDeletedSource = new Subject<void>();
  userDeleted$ = this.userDeletedSource.asObservable(); 

  private userAddedSource = new Subject<void>();
  userAdded$ = this.userAddedSource.asObservable(); 

  private docRblistAddedSource = new Subject<void>();
  docRblistAdded$ = this.docRblistAddedSource.asObservable()

  private selectedUserDataSource = new BehaviorSubject<any>(null);
  selectedUserData$ = this.selectedUserDataSource.asObservable();;

  private userUpdatedSource = new Subject<void>();
  userUpdated$ = this.userUpdatedSource.asObservable();


  setSelectedIdsAndUsernames(ids: number[], usernames: string[]): void {
    this.selectedIdsSource.next(ids);
    this.selectedUsernamesSource.next(usernames);
    // Log removed as part of console log consolidation
  }
  setSelectedIdsAndNames(ids: number[], names: string[]): void {
    this.selectedIdsSource.next(ids);
    this.selectedNamesSource.next(names);
    // Log removed as part of console log consolidation
  }
  setSelectedDocumentIds(documentIds: string[]): void {
    this.selectedDocumentIdsSource.next(documentIds);
  }
  
  setSelectedFileIds(fileIds: number[]): void {
    // Log removed as part of console log consolidation
    this.selectedFileIdsSource.next(fileIds);
  }
  setSelectedFilenames(filenames: string[]): void {
    // Log removed as part of console log consolidation
    this.selectedFilenamesSource.next(filenames);
  }

  notifyUserDeleted(): void {
    this.userDeletedSource.next(); // Emit an event when a user is deleted
  }

  notifyUserAdded(): void {
    this.userAddedSource.next(); // Emit an event when a user is added
  }

  notifyDocRblistAdded(): void {
    this.docRblistAddedSource.next();
  }

  setSelectedUserData(userData: any): void {
    this.selectedUserDataSource.next(userData);
  }

  notifyUserUpdated(): void {
    this.userUpdatedSource.next();
  }
  
}
    

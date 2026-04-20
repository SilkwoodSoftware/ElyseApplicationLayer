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
 import { HttpClient } from '@angular/common/http';
 import { Observable } from 'rxjs';
 import { MatDialog } from '@angular/material/dialog';
 import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
 import { DeleteRecordTransactionComponent } from '../../../../shared/components/transaction-results/delete-record-transaction.component';
 import { SelectedIdsService } from '../../../../shared/services/selected-ids.service';
 import { forkJoin, map } from 'rxjs';
 import { environment } from '../../../../../../src/environments/environment';
 import { DocRblistRefreshService } from '../read-doc-rblist-names/doc-rblist-refresh.service';

 @Injectable({
   providedIn: 'root'
 })
 export class DeleteDocRblistService {
  private readonly apiUrl = environment.dotNetBaseUrl;    

   constructor(
     private http: HttpClient,
     private dialog: MatDialog,
     private selectedIdsService: SelectedIdsService,
     private docRblistRefreshService: DocRblistRefreshService
    ) {}

   deleteDocRblist(docRadiobListId: number): Observable<any> {
     const url = `${this.apiUrl}/doc-attr/doc-rblist-names/delete?docRblistId=${docRadiobListId}`;
     return this.http.delete(url);
   }

   deleteDocRblists(selectedIds: number[], selectedNames: string[]): void {
    if (selectedIds.length > 0) {
       const confirmationDialogRef = this.dialog.open(ConfirmationDialogComponent, {
         data: {
           title: 'Confirm Delete',
           message: `Are you sure you want to delete the selected document radio button lists?\n\n${selectedNames.join('\n')}`,
           confirmText: 'Delete',
           cancelText: 'Cancel'
         }
       });

       confirmationDialogRef.afterClosed().subscribe(result => {
         if (result) {
          const deleteRequests = selectedIds.map((docRadiobListId, index) => this.deleteDocRblist(docRadiobListId).pipe(
            map(response => ({                            
              firstColumnValue: selectedNames[index],
              transactionMessage: response.transactionMessage,
              transactionStatus: response.transactionStatus
             }))
           ));

           forkJoin(deleteRequests).subscribe(results => {
             const dialogRef = this.dialog.open(DeleteRecordTransactionComponent, {
               data: {
                 title: 'Delete Document Radio Button List Results',
                 firstColumnHeader: 'Name',
                 results: results
               }
             });

             dialogRef.afterClosed().subscribe(() => {
               this.selectedIdsService.notifyDocRblistAdded();
               this.docRblistRefreshService.notifyRefresh();        
             });
           }, error => {
             console.error('Error deleting document radio button lists:', error);
           });
         }
       });
     }
   }
 }
 

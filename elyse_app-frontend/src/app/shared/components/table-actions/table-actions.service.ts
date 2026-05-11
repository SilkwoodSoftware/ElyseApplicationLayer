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
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { TransactionResultDialogComponent } from '../transaction-results/transaction-result-dialog.component';
import { DeleteUserService } from '../../../authorising/delete-user/delete-user.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { SelectedIdsService } from '../../services/selected-ids.service';
import { AddSidStringComponent } from '../../../controlling/add-user/add-sid-string.component';
import { DeleteRecordTransactionComponent } from '../transaction-results/delete-record-transaction.component';
import { UpdateUserComponent } from '../../../controlling/update-users/update-user.component'; 
import { take } from 'rxjs/operators';
import { ReadRolesByUserService } from '../../../authorising/read-roles-by-user/read-roles-by-user.service'; 
import { ReadRolesByUserComponent } from '../../../authorising/read-roles-by-user/read-roles-by-user.component'; 
import { ManageUserRolesComponent } from '../../../authorising/manage-user-roles/manage-user-roles.component'; 
import { AddDocRblistComponent } from '../../../configuring/metadata/lookups/add-doc-rblist/add-doc-rblist.component';
import { ReadDocRblistNamesService } from '../../../configuring/metadata/lookups/read-doc-rblist-names/read-doc-rblist-names.service';
import { DeleteDocRblistComponent } from '../../../configuring/metadata/lookups/delete-doc-rblist-name/delete-doc-rblist.component';
import { RemoveFileDocLinkDialogComponent } from '../../../controlling/link-file-to-document/remove-file-doc-link-dialog.component';




@Injectable({
  providedIn: 'root'
})
export class TableActionsService {
  constructor(
    private dialog: MatDialog,
    private deleteUserService: DeleteUserService,
    private selectedIdsService: SelectedIdsService,
    private readRolesByUserService: ReadRolesByUserService,
    private readDocRblistNamesService: ReadDocRblistNamesService,
   
  ) {}

  onDeleteUser(selectedIds: number[], selectedUsernames: string[]): void {
    if (selectedIds.length > 0) {
      const confirmationDialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: {
          title: 'Confirm Delete',
          message: `Are you sure you want to delete the following?\n\n${selectedUsernames.join('\n')}`,
          confirmText: 'Delete',
          cancelText: 'Cancel'
        }
      });

      confirmationDialogRef.afterClosed().subscribe(result => {
        if (result) {
          const deleteRequests = selectedIds.map((userId, index) => this.deleteUserService.deleteUser(userId).pipe(
            map(response => ({
              firstColumnValue: selectedUsernames[index], // Include username in the results
              // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
              transactionMessage: response.transactionMessage,
              transactionStatus: response.transactionStatus
            }))
          ));

          forkJoin(deleteRequests).subscribe(results => {
            console.log(results);
            const dialogRef = this.dialog.open(DeleteRecordTransactionComponent, {
              data: {
                title: 'Delete User Results',
                firstColumnHeader: 'Username',       
                results: results
              }
            });

            dialogRef.afterClosed().subscribe(() => {
              this.selectedIdsService.notifyUserDeleted();
            });
          }, error => {
            console.error('Error deleting users:', error);
          });
        } else {
          console.warn('No user ID selected for deletion');
        }
      });
    }
  }

  openAddUserDialog(): void {
    const dialogRef = this.dialog.open(AddSidStringComponent, {
      width: '400px',
    });

    
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

  openAddDocRblistDialog(): void {
    const dialogRef = this.dialog.open(AddDocRblistComponent, {
     
    });


    dialogRef.afterClosed().subscribe(result => {
      
    });
  }

  onEditUser(): void {
    this.selectedIdsService.selectedIds$.pipe(take(1)).subscribe(selectedIds => {
      if (selectedIds.length === 1) {
        const dialogRef = this.dialog.open(UpdateUserComponent, {
          width: '400px',
        });
 
        dialogRef.afterClosed().subscribe(result => {
          console.log('The dialog was closed');
        });
      }
    });
  }
  onRolesByUser(): void {
    this.selectedIdsService.selectedUserData$.pipe(take(1)).subscribe(userData => {
      if (userData) {
        this.readRolesByUserService.getRolesByUser(userData.id).subscribe(
        (response) => {
          const dialogRef = this.dialog.open(ManageUserRolesComponent, { 
            data: {
                userId: userData.id,
                username: userData.username,
                roles: response.roles
              }
            });
            dialogRef.afterClosed().subscribe((transactionResults) => {
              console.log('Manage User Roles dialog closed');
              console.log('Transaction Results:', transactionResults);
              if (transactionResults) {
                // Notify ListUsersComponent to refresh the table
                this.selectedIdsService.notifyUserUpdated();
              }
            });
          },
          (error) => {
            console.error('Error fetching roles by user:', error);
          }
        );
      }
    });
  }

  // NEW: Method for context menu integration - preserves existing functionality
  public openManageUserRolesFromContextMenu(userId: number, username: string): void {
    this.readRolesByUserService.getRolesByUser(userId).subscribe(
      (response) => {
        const dialogRef = this.dialog.open(ManageUserRolesComponent, {
          data: {
            userId: userId,
            username: username,
            roles: response.roles
          }
        });
        
        dialogRef.afterClosed().subscribe((transactionResults) => {
          console.log('Manage User Roles dialog closed from context menu');
          if (transactionResults) {
            this.selectedIdsService.notifyUserUpdated();
          }
        });
      },
      (error) => {
        console.error('Error fetching roles by user from context menu:', error);
      }
    );
  }

  openDeleteDocRblistDialog(): void {
    this.selectedIdsService.selectedIds$.pipe(take(1)).subscribe(selectedIds => {
      this.readDocRblistNamesService.getAllDocRblistNames().subscribe(
        (response) => {
          this.selectedIdsService.selectedNames$.pipe(take(1)).subscribe(selectedNames => {
            const dialogRef = this.dialog.open(DeleteDocRblistComponent, {
              data: {
                docRblists: response.docRblistNames,
                selectedIds: selectedIds,
                selectedNames: selectedNames
              }
            });
 
            dialogRef.afterClosed().subscribe((result) => {
              if (result) {
                this.selectedIdsService.notifyDocRblistAdded();
              }
            });
          });
        },
        (error) => {
          console.error('Error fetching document radio button lists:', error);
        }
      );
    });
  }

  openRemoveFileDocLinkDialog(documentId: string, fileIds: number[]): void {
    const confirmationDialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm Remove Link',
        message: `Remove link to document ${documentId} for the following files:\n${fileIds.join(', ')}`,
        confirmText: 'Confirm',
        cancelText: 'Cancel'
      }
    });

    confirmationDialogRef.afterClosed().subscribe(result => {
      if (result) {
        const removeDialogRef = this.dialog.open(RemoveFileDocLinkDialogComponent, {
          data: { documentId, fileIds }
        });
        removeDialogRef.componentInstance.confirmRemoval();
      }
      
    });
  }
}


    

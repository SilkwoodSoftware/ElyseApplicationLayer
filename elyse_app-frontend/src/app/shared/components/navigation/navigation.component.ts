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


import { Component, OnInit, ViewChild, ElementRef, Output, EventEmitter, Input, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SelectedIdsService } from '../../services/selected-ids.service';
import { TableActionsService } from '../table-actions/table-actions.service';
import { MatDialog } from '@angular/material/dialog';
import { RolesComponent } from '../../../reading/roles/roles.component';
import { AddDocRblistComponent } from '../../../configuring/metadata/lookups/add-doc-rblist/add-doc-rblist.component';
import { SearchDocumentDialogComponent } from '../search-dialog/search-document-dialog.component';
import { SearchDocumentByTitleDialogComponent } from '../search-dialog/search-document-by-title-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DocumentFileSelectionService, DocumentFileSelection } from '../../services/document-file-selection.service';
import { LinkFileToDocDialogComponent } from '../../../controlling/link-file-to-document/link-file-to-doc-dialog.component'
import { tap, map } from 'rxjs/operators';
import { FileStorageService } from '../../../editing/upload-file/file-storage.service';
import { forkJoin, Observable } from 'rxjs';
import { TransactionResultsComponent } from '../transaction-results/transaction-results.component';
import { TableStateService } from '../../services/table-state.service';
import { CreateDocumentIdDialogComponent } from '../../../controlling/create-document-id/create-document-id-dialog.component';
import { TransactionResultDialogComponent } from '../transaction-results/transaction-result-dialog.component';
import { ApplicationErrorDialogComponent } from '../application-error-dialog/application-error-dialog.component';
import { DeleteDocumentIdService } from '../../../controlling/delete-document-id/delete-document-id.service';
import { DocumentValidationService } from '../../../reading/documents/document-validation.service';
import { GenericSearchDialogComponent } from '../generic-search-dialog/generic-search-dialog.component';
import { FilesSearchService } from '../../services/files-search.service';
import { EditDocumentIdService } from '../../../controlling/edit-doc-file-data/edit-document-id.service';
import { filter } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';
import { HelpMenuService, HelpMenuItem } from '../../services/help-menu.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  selectedDocumentId: string | null = null;
  selectedFileId: number | null = null;
  isListUsersPage: boolean = false;
  isAllUsersRolesPage: boolean = false; 
  isDocRblistNamesPage: boolean = false; 
  isDocRblistAttributesPage: boolean = false; 
  isAllDocumentsPage: boolean = false;  
  isAllFilesPage: boolean = false;  
  selectedRoles: any[] = []; 
  anyRowsSelected: boolean = false;
  isDocsByTextFieldPage: boolean = false;
  isOneDocumentDataPage: boolean = false;
  isAllFilesOneDocPage: boolean = false;
  isFileSearchResultsPage: boolean = false;
  @Input() selectedIds: number[] = [];
  @Input() selectedDocumentIds: string[] = [];  
  @Input() selectedFileIds: number[] = [];   
  @Input() selectedUsernames: string[] = []; 
  @Output() userDeleted: EventEmitter<void> = new EventEmitter<void>();
  selectedFilenames: string[] = [];
  documentId: string | null = null;
  isEditDocFileDataPage: boolean = false;
  documentIdAvailable: boolean = false;
  

  constructor(
    private router: Router,
    private selectedIdsService: SelectedIdsService,
    public tableActionsService: TableActionsService,
    private dialog: MatDialog,
    private http: HttpClient,
    private documentFileSelectionService: DocumentFileSelectionService,
    private fileStorageService: FileStorageService,
    private tableStateService: TableStateService,
    private deleteDocumentIdService: DeleteDocumentIdService,
    private route: ActivatedRoute,
    private documentValidationService: DocumentValidationService,
    private filesSearchService: FilesSearchService,
    private editDocumentIdService: EditDocumentIdService,
    private helpMenuService: HelpMenuService
    ) {
      console.log('Navigation component constructed');
    }


    
  ngOnInit() {
    this.getSelectedRoles();
    this.checkCurrentRoute();
    this.subscribeToSelectedIdsAndUsernames();
    this.initializeHelpSystem();
 
    this.selectedIdsService.selectedFileIds$.pipe(
      tap(ids => {
        // Only log when there are actual changes or non-empty arrays to reduce console spam
        if (ids.length > 0 || (this.selectedFileIds.length > 0 && ids.length === 0)) {
          console.log('Navigation: Received updated file IDs from SelectedIdsService:', ids);
        }
      })
    ).subscribe(ids => {
      this.selectedFileIds = ids;
      if (ids.length > 0 || (this.selectedFileIds.length !== ids.length)) {
        console.log('Navigation: Updated selectedFileIds:', this.selectedFileIds);
      }
    });
 
    this.documentFileSelectionService.selection$.pipe(
      tap((selection: DocumentFileSelection) => {
        // Only log when there are meaningful changes
        if (selection.documentId || selection.fileId) {
          console.log('Navigation: Received selection from DocumentFileSelectionService:', selection);
        }
      })
    ).subscribe((selection: DocumentFileSelection) => {
      const prevDocId = this.selectedDocumentId;
      const prevFileId = this.selectedFileId;
      
      this.selectedDocumentId = selection.documentId;
      this.selectedFileId = selection.fileId;
      
      if (prevDocId !== selection.documentId || prevFileId !== selection.fileId) {
        console.log('Navigation: Updated selection - Doc ID:', this.selectedDocumentId, 'File ID:', this.selectedFileId);
      }
 
      // Update selectedFileIds based on the selection
      if (selection.fileId) {
        this.selectedFileIds = [selection.fileId];
      } else {
        this.selectedFileIds = [];
      }
      
      if (selection.fileId || this.selectedFileIds.length > 0) {
        console.log('Navigation: Updated selectedFileIds based on selection:', this.selectedFileIds);
      }
    });
 
    this.selectedIdsService.selectedDocumentIds$.pipe(
      tap(ids => {
        // Only log when there are actual changes or non-empty arrays
        if (ids.length > 0 || (this.selectedDocumentIds.length > 0 && ids.length === 0)) {
          console.log('Navigation: Received updated document IDs:', ids);
        }
      })
    ).subscribe(ids => {
      this.selectedDocumentIds = ids;
      if (ids.length > 0 || (this.selectedDocumentIds.length !== ids.length)) {
        console.log('Navigation: Updated selectedDocumentIds:', this.selectedDocumentIds);
      }
    });

    this.selectedIdsService.selectedFilenames$.subscribe(filenames => {
      this.selectedFilenames = filenames;
      console.log('Navigation: Updated selectedFilenames:', this.selectedFilenames);
    });
    
    this.route.queryParams.subscribe(params => {
      this.documentId = params['documentId'] || null;
      this.documentIdAvailable = !!this.documentId;      
      console.log('Navigation: Updated documentId:', this.documentId);
      console.log('Navigation: Updated documentIdAvailable:', this.documentIdAvailable);
    });

    this.documentFileSelectionService.documentId$.subscribe(documentId => {
      this.documentId = documentId;
      this.documentIdAvailable = !!this.documentId;
      console.log('Navigation: Updated documentId from service:', this.documentId);
      console.log('Navigation: Updated documentIdAvailable:', this.documentIdAvailable);
    });

 
    console.log('Navigation: Initial state after ngOnInit');
    console.log('- selectedFileIds:', this.selectedFileIds);
    console.log('- selectedDocumentId:', this.selectedDocumentId);
    console.log('- selectedFileId:', this.selectedFileId);
    console.log('- selectedDocumentIds:', this.selectedDocumentIds);
    console.log('- selectedFilenames:', this.selectedFilenames);
   
    
  }

  onLinkFileToDoc(): void {
    if (this.selectedFileIds.length === 0) {
      this.dialog.open(ConfirmationDialogComponent, {
        data: {
          title: 'Error',
          message: 'Select at least one file to link.',
          confirmText: 'OK'
        }
      });
      return;
    }

    const dialogRef = this.dialog.open(LinkFileToDocDialogComponent, {
      width: '400px',
      data: { selectedFileIds: this.selectedFileIds,
       }
    });
    
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Link file to doc dialog closed with result:', result);
      }
    });
  }
  getSelectedRoles(): void {
    const storedRoles = localStorage.getItem('selectedRoles');
    if (storedRoles) {
      this.selectedRoles = JSON.parse(storedRoles);
    }
  }


  openEditDocumentIdDialog(): void {
    let currentDocumentId = this.documentFileSelectionService.getSelectedDocumentId();    
    if (currentDocumentId) {
      this.editDocumentIdService.openEditDocumentIdDialog(currentDocumentId);
    } else {
      console.error('No document ID available');
      this.dialog.open(ApplicationErrorDialogComponent, {
        data: {
          title: 'Application Error',
          errors: [{
            fieldName: 'Document ID',
            errorMessage: 'No document ID available'
          }]
        }
      });
    }
  }

  hasRole(role: string): boolean {
    return this.selectedRoles.some(selectedRole => selectedRole['Role Name']?.toLowerCase() === role.toLowerCase());
  }

  checkCurrentRoute(): void { 
    this.router.events.subscribe(() => {
      this.isListUsersPage = this.router.url === '/list-users';
      this.isAllUsersRolesPage = this.router.url === '/all-users-roles';
      this.isDocRblistNamesPage = this.router.url === '/doc-rblist-names/read';  
      this.isDocRblistAttributesPage = this.router.url === '/doc-attr/all-doc-rblist-attributes';          
      this.isDocRblistNamesPage = this.router.url === '/doc-rblist-names/read';
      this.isAllDocumentsPage = this.router.url === '/document/list-all-docs';     
      this.isAllFilesPage = this.router.url === '/file/list-all-files'; 
      this.isDocsByTextFieldPage = this.router.url.includes('/document/docs-by-text-field');
      this.isOneDocumentDataPage = this.router.url.includes('/document/one-document-data');      
      this.isAllFilesOneDocPage = this.router.url.includes('/document/all-files-for-one-documen');  
      this.isFileSearchResultsPage = this.router.url.includes('/file/search-results');
      this.isEditDocFileDataPage = this.router.url.includes('/edit-doc-file-data');
      this.documentIdAvailable = !!this.documentId;      
      if (!this.isListUsersPage && !this.isAllUsersRolesPage && !this.isDocRblistNamesPage &&
        !this.isDocRblistAttributesPage && !this.isAllDocumentsPage && !this.isAllFilesPage &&
        !this.isFileSearchResultsPage) { 
        this.selectedIdsService.setSelectedIdsAndUsernames([], []); 
        this.selectedIdsService.setSelectedIdsAndNames([], []);     
        this.selectedIdsService.setSelectedFileIds([]);        
            }
    });
  }

  onEditDocumentOrFile(): void {
    console.log('onEditDocumentOrFile called - Doc ID:', this.selectedDocumentId, 'File ID:', this.selectedFileId);
      if (this.selectedDocumentId && this.selectedFileId) {
        this.router.navigate(['/edit-document-data'], {
          queryParams: {
            documentId: encodeURIComponent(this.selectedDocumentId),
            fileId: this.selectedFileId
          }
        });
      } else if (this.selectedDocumentId) {
        this.router.navigate(['/edit-document-data'], {
          queryParams: { documentId: this.selectedDocumentId }
        });
      } else if (this.selectedFileId) {
        this.router.navigate(['/edit-document-data'], {
          queryParams: {
            fileId: this.selectedFileId,
            isFile: true
          }
        });
      }
    }

  subscribeToSelectedIdsAndUsernames(): void {
    this.selectedIdsService.selectedIds$.subscribe(selectedIds => {
      this.selectedIds = selectedIds;
    });

    this.selectedIdsService.selectedUsernames$.subscribe(selectedUsernames => {
      this.selectedUsernames = selectedUsernames;
    });
    this.selectedIdsService.selectedDocumentIds$.subscribe(selectedDocumentIds => {
      this.selectedDocumentIds = selectedDocumentIds;
    });    
    this.selectedIdsService.selectedFileIds$.subscribe(selectedFileIds => {
      this.selectedFileIds = selectedFileIds;
    });      
  }

  onDeleteRecord(): void {
    this.tableActionsService.onDeleteUser(this.selectedIds, this.selectedUsernames);
  }
  onEditUser(): void {
    this.tableActionsService.onEditUser();
  }
  onEditDocument(): void {
    if (this.selectedDocumentIds.length === 1) {
      const documentId = this.selectedDocumentIds[0];
      this.router.navigate(['/edit-document-data'], {
        queryParams: { documentId: documentId }
      });
    }
  }
  onEditFile(): void {
    if (this.selectedFileIds.length === 1) {
      const fileId = this.selectedFileIds[0];
      this.router.navigate(['/edit-document-data'], {
        queryParams: {
          fileId: fileId,
          isFile: true
        }
      });
    }
  }
  onRolesByUser(): void {
    this.tableActionsService.onRolesByUser();
  }
  openRolesDialog(): void {
    const dialogRef = this.dialog.open(RolesComponent, {
      width: '400px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

  openAddDocRblistDialog(): void {
    this.tableActionsService.openAddDocRblistDialog();
  }
  onDeleteDocRblists(): void {
    this.tableActionsService.openDeleteDocRblistDialog();
  }
  openSearchDocumentDialog(endpoint: string): void {
    const dialogRef = this.dialog.open(SearchDocumentDialogComponent, {
      width: '400px',
      disableClose: true,
      data: { endpoint: endpoint }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate([`/document/${endpoint}`], { queryParams: { documentId: encodeURIComponent(result) } });
      }
    });
  }


  openSearchDocumentByTitleDialogComponent(): void {
    this.dialog.open(SearchDocumentByTitleDialogComponent, {
      width: '400px',
      disableClose: true
    });
  }

  openAllDocumentsDialog(): void {
    this.http.get<{numberOfDocs: number}>(`${environment.dotNetBaseUrl}/document/number-of-all-docs`).subscribe(
      (response) => {
        const message = `This is an unfiltered list of all documents. \nNumber of documents: ${response.numberOfDocs}`;
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
          data: {
            title: 'List All Documents',
            message: message,
            confirmText: 'Confirm',
            cancelText: 'Cancel'
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.router.navigate(['/document/list-all-docs']);
          }
        });
      },
      (error) => {
        console.error('Error fetching number of documents:', error);
      }
    );
  }

  openAllFilesDialog(): void {
    this.http.get<{numberOfFiles: number}>(`${environment.dotNetBaseUrl}/file/number-of-all-files`).subscribe(
      (response) => {
        const message = `This is an unfiltered list of all files. \nNumber of files: ${response.numberOfFiles}`;
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
          data: {
            title: 'List All Files',
            message: message,
            confirmText: 'Confirm',
            cancelText: 'Cancel'
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.router.navigate(['/file/list-all-files']);
          }
        });
      },
      (error) => {
        console.error('Error fetching number of files:', error);
      }
    );
  }

  onRemoveFileDocLink(): void {
    console.log('onRemoveFileDocLink called');
    console.log('selectedDocumentId:', this.selectedDocumentId);
    console.log('selectedFileId:', this.selectedFileId);
    console.log('selectedDocumentIds:', this.selectedDocumentIds);
    console.log('selectedFileIds:', this.selectedFileIds);
 
    let docId: string | null = this.selectedDocumentId;
   let fileIds: number[] = [];

   if (this.selectedFileId) {
     // Single selection case
     fileIds = [this.selectedFileId];
   } else if (this.selectedFileIds.length > 0) {
     // Multi-selection case
     fileIds = this.selectedFileIds;
     if (!docId && this.selectedDocumentIds.length > 0) {
       docId = this.selectedDocumentIds[0];
     }
   }

   if (docId && fileIds.length > 0) {
     console.log('Removing link - Doc ID:', docId, 'File IDs:', fileIds);
     this.tableActionsService.openRemoveFileDocLinkDialog(docId, fileIds);
   } else {
     console.error('No document or file selected for unlinking');
     console.error('docId:', docId, 'fileIds:', fileIds);
   }
 }
 
 onAddFilesToDoc(): void {
  if (!this.documentId) {
    console.error('No document ID available');
    return;
  }
  this.onAddFile(this.documentId);
}

onAddFile(documentId: string | null = null): void {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true; 
  fileInput.accept = '*/*'; 
  fileInput.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      this.uploadFiles(Array.from(files), documentId);
    }
  };
  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
}

private uploadFiles(files: File[], documentId: string | null = null): void {
  const uploadObservables: Observable<any>[] = [];

  files.forEach(file => {
    const reader = new FileReader();
    const uploadObservable = new Observable<any>(observer => {
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        this.fileStorageService.uploadFile(arrayBuffer, file.name, documentId || undefined).subscribe({
          next: (response) => {
            observer.next({ response, fileName: file.name });
            observer.complete();
          },
          error: (error) => {
            observer.error(error);
          }
        });
      };
      reader.readAsArrayBuffer(file);
    });
    uploadObservables.push(uploadObservable);
  });

  forkJoin(uploadObservables).subscribe({
    next: (results) => {
      this.showUploadResults(results);
    },
    error: (error) => {
      console.error('Error uploading files:', error);
      this.dialog.open(ApplicationErrorDialogComponent, {
        data: {
          title: 'Application Error',
          errors: [{
            fieldName: 'File Upload',
            errorMessage: error?.error?.message || error?.message || 'An error occurred while uploading files.'
          }]
        }
      });
    }
  });
}



private showUploadResults(results: any[]): void {
  const dialogRef = this.dialog.open(TransactionResultsComponent, {
    data: {
      title: 'File Upload Results',
      idColumnName: 'File ID',
      showFileName: true,
      showDocumentId: !!this.documentId,
      documentId: this.documentId,
      results: results.map(result => ({
        id: result.response.newFileId,
        fileName: result.fileName,
        // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
        transactionMessage: result.response.transactionMessage,
        transactionStatus: result.response.transactionStatus
      }))
    }
  });

  dialogRef.afterClosed().subscribe(() => {
    this.tableStateService.notifyRecordUpdated('Files');
  });
}

onDeleteFiles(): void {
  if (this.selectedFileIds.length > 0) {
    const fileInfo = this.selectedFileIds.map((id, index) => `${id} ${this.selectedFilenames[index]}`);
    const confirmationDialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm Delete',
        message: `Delete the following file(s)? \n${fileInfo.join('\n')}`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    confirmationDialogRef.afterClosed().subscribe(result => {
      if (result) {
        const deleteRequests = this.selectedFileIds.map((fileId, index) =>
          this.fileStorageService.deleteFile(fileId).pipe(
            map((response: any) => ({
              ...response,
              id: fileId,
              fileName: this.selectedFilenames[index]
            }))
          )
        );

        forkJoin(deleteRequests).subscribe(
          (responses) => {
            const results = responses.map((response) => ({
              id: response.id,
              fileName: response.fileName,
              // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
              transactionMessage: response.transactionMessage,
              transactionStatus: response.transactionStatus
            }));

            const dialogRef = this.dialog.open(TransactionResultsComponent, {
              data: {
                title: 'Delete Files Results',
                results: results,
                showFileName: true
              }              
            });

            dialogRef.afterClosed().subscribe(() => {
              this.tableStateService.notifyRecordUpdated('Files');
            });
          },
          (error) => {
            console.error('Error deleting files:', error);
          }
        );
      }
    });
  }
}

private refreshFileList(): void {
  // Notify that the files table needs to be refreshed
  this.tableStateService.notifyRecordUpdated('Files');
}

ngOnDestroy(): void {
  // Implement any necessary cleanup
}
openCreateDocumentIdDialog(): void {
  const dialogRef = this.dialog.open(CreateDocumentIdDialogComponent, {
    width: '400px',
    disableClose: true
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      const dialogRef = this.dialog.open(TransactionResultDialogComponent, {
        data: {
          title: `Create Document ID Result (New ID: ${result.newDocId})`,
          // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
          message: result.transactionMessage,
          status: result.transactionStatus
        }
      });

      dialogRef.afterClosed().subscribe(() => {
        this.tableStateService.notifyRecordUpdated('Documents');
        this.tableStateService.notifyRecordUpdated('DocumentsByTextField');
      });
    }
  });
}

onDeleteDocumentId(): void {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    data: {
      title: 'Delete Document ID',
      message: 'Enter the ID of a document to delete:',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      inputField: true
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result && result.confirmed && result.input) {
      const documentId = result.input;
      const deleteObservable = this.deleteDocumentIdService.deleteDocumentId(documentId);

      deleteObservable.subscribe(
        (response) => {
          const dialogRef = this.dialog.open(TransactionResultDialogComponent, {
            data: {
              title: 'Delete Document ID Result',
              message: response.transactionMessage,
              status: response.transactionStatus
            }
          });

          dialogRef.afterClosed().subscribe(() => {
            this.tableStateService.notifyRecordUpdated('Documents');
          });
        },
        (error) => {
          console.error('Error deleting document ID:', error);
          this.dialog.open(ApplicationErrorDialogComponent, {
            data: {
              title: 'Application Error',
              errors: [{
                fieldName: '',
                errorMessage: error?.error?.message || error?.message || error?.error || JSON.stringify(error)
              }]
            }
          });
        }
      );
    }
  });
}

onDeleteDocuments(): void {
  if (this.selectedDocumentIds.length > 0) {
    const documentInfo = this.selectedDocumentIds.map((id) => `${id}`).join('\n');
    const confirmationDialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm Delete',
        message: `Delete the following document(s)? \n${documentInfo}`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });
    confirmationDialogRef.afterClosed().subscribe(result => {
      if (result) {
        const deleteRequests = this.selectedDocumentIds.map(documentId =>
          this.deleteDocumentIdService.deleteDocumentId(documentId)
        );

        forkJoin(deleteRequests).subscribe(
          (responses) => {
            const results = responses.map((response, index) => ({
              id: this.selectedDocumentIds[index],
              // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
              transactionMessage: response.transactionMessage,
              transactionStatus: response.transactionStatus
            }));

            const dialogRef = this.dialog.open(TransactionResultsComponent, {
              data: {
                title: 'Delete Documents Results',
                results: results,
                idColumnName: 'Document ID'
              }
              
            });
            
            dialogRef.afterClosed().subscribe(() => {
              this.tableStateService.notifyRecordUpdated('Documents');
              console.log('Notified document update');
              this.selectedDocumentIds = [];
              this.selectedIdsService.setSelectedDocumentIds([]);
            });

          },
          (error) => {
            console.error('Error deleting documents:', error);
            this.dialog.open(ApplicationErrorDialogComponent, {
              data: {
                title: 'Application Error',
                errors: [{
                  fieldName: '',
                  errorMessage: error?.error?.message || error?.message || error?.error || JSON.stringify(error)
                }]
              }
            });
          }
        );
      }
    });
  

  }
}
openEditDocumentDataDialog(): void {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    data: {
      title: 'Edit Document Data',
      message: 'Enter the ID of a docuument to edit:',
      confirmText: 'Edit',
      cancelText: 'Cancel',
      inputField: true
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result && result.confirmed && result.input) {
      const documentId = result.input;
      this.editDocumentData(documentId);
    }
  });
}

editDocumentData(documentId: string): void {
  this.selectedIdsService.setSelectedDocumentIds([encodeURIComponent(documentId)]);
  this.router.navigate(['/edit-document-data'], {
    queryParams: { documentId: documentId }
  });
}
openEditFileDataDialog(): void {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    data: {
      title: 'Edit File Data',
      message: 'Enter the ID for a File to edit:',
      confirmText: 'Edit',
      cancelText: 'Cancel',
      inputField: true
    }
  });

  dialogRef.afterClosed().subscribe(result =>{
    if (result && result.confirmed && result.input) {
      const fileId = parseInt(result.input, 10);
      if (!isNaN(fileId)) {
        this.editFileData(fileId);
      } else {
        console.error('Invalid File ID entered');
      }
    }
  });
}

editFileData(fileId: number): void {
  this.selectedIdsService.setSelectedFileIds([fileId]);
  this.router.navigate(['/edit-document-data'], {
    queryParams: {
      fileId: fileId,
      isFile: true
    }
  });
}

openLoadAndLinkFileDialog(): void {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    data: {
      title: 'File/s will be linked to this document ID',
      message: 'Enter the ID of a document:',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      inputField: true
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result && result.confirmed && result.input) {
      const documentId = result.input;
      this.documentValidationService.validateDocumentId(documentId).subscribe(
        (response) => {
          if (response.validationResult === 'Pass') {
            this.onAddFile(documentId);
          } else {
            this.dialog.open(TransactionResultDialogComponent, {
              data: {
                title: 'Document Validation Failed',
                message: response.transactionMessage,
                status: response.transactionStatus
              }
            });
          }
        },
        (error) => {
          console.error('Error validating document ID:', error);
          this.dialog.open(ApplicationErrorDialogComponent, {
            data: {
              title: 'Application Error',
              errors: [{
                fieldName: '',
                errorMessage: error?.error?.message || error?.message || error?.error || JSON.stringify(error)
              }]
            }
          });
        }
      );
    }
  });
}
openSearchFilesByFilenameDialog(): void {
  const dialogRef = this.dialog.open(GenericSearchDialogComponent, {
    width: '400px',
    disableClose: true,
    data: {
      title: 'Search Files by Filename',
      placeholder: 'Enter filename',
      searchType: 'file'
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.filesSearchService.searchFilesByFilename(result).subscribe(
        (searchResults) => {
          this.router.navigate(['/file/search-results'], {
            queryParams: { searchTerm: result },
            state: { searchResults: searchResults }
          });
        },
        (error) => {
          console.error('Error searching files:', error);
        }
      );
    }
  });
}

// Help system methods
initializeHelpSystem(): void {
  // Initialize help service to ensure help data is loaded
  this.helpMenuService.helpItems$.subscribe(() => {
    // Help items are loaded and ready for popup window
  });
}

openHelpWindow(): void {
  // Open the help system in a new window
  this.helpMenuService.openHelpWindow();
}

navigateToRoot(): void {
  this.router.navigate(['/']);
}

}
     

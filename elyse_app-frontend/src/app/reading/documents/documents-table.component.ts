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


import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener, Input, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DocumentFileSelectionService } from '../../shared/services/document-file-selection.service';
import { GenericTableService, TableType } from '../../shared/services/generic-table.service';
import { TableStateService } from '../../shared/services/table-state.service';
import { TableActionsService } from '../../shared/services/table-actions.service';
import { TableConfigService } from '../../shared/services/table-config.service';
import { DocumentReadingService } from './document-reading.service';
import { CommonModule } from '@angular/common';
import { NavigationStart, ActivatedRoute, Router } from '@angular/router';
import { FileDownloadService } from '../file-download/file-download.service';
import { filter, Observable, Subscription } from 'rxjs';
import { SelectedIdsService } from '../../shared/services/selected-ids.service';
import { MessageLabelService } from '../../shared/services/message-label.service';
import { RemoveFileDocLinkDialogComponent } from '../../controlling/link-file-to-document/remove-file-doc-link-dialog.component';
import { SharedModule } from '../../shared/shared.module';

interface DocumentData {
  [key: string]: any;
}

interface MessageItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-documents-table',
  templateUrl: './documents-table.component.html',
  styleUrls: ['../../shared/stylesheets/tables.scss', '../../shared/stylesheets/messages.scss'],
  standalone: true,
  imports: [CommonModule, SharedModule]  
})
export class DocumentsTableComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() tableHeading: string = '';
  @Input() parameterLabel: string = 'Parameter';
  @Input() endpoint: string = 'document/one-document-data';
  @Input() parameterName: string = 'documentId';
  @Input() fetchDataFunction: (params: any) => Observable<any> = this.defaultFetchDataFunction.bind(this);
  @Input() excludeFileId: boolean = false;  
  tooltips: { [key: string]: string } = {}; 
  columnMapping: {[key: string]: string} = {}; 
  private isFirstLoad = true;
    
  private isDragging: boolean = false;
  private dragStartPosition: { x: number, y: number } | null = null;
  documentData: DocumentData[] = [];
  columns: string[] = [];
  messageItems: MessageItem[] = [];
  selectedRows: DocumentData[] = [];
  selectedIds: string[] = [];
  parameterValue: string = '';
  lastSelectedIndex: number = -1;
  isOneDocumentData: boolean = false;
  isAllFilesForOneDocument: boolean = false;
  isDocsByTextField: boolean = false;
  
  private recordUpdatedSubscription: Subscription | undefined;

  @ViewChild('tableContainer') tableContainer!: ElementRef;  
  
  readonly tableType: TableType = {
    name: 'Documents',
    endpoint: this.endpoint,
    idType: 'string',
    dataField: 'documentData'
  };

  constructor(
    private documentFileSelectionService: DocumentFileSelectionService,
    private genericTableService: GenericTableService<DocumentData>,
    private tableStateService: TableStateService,
    private tableActionsService: TableActionsService,    
    private tableConfigService: TableConfigService,
    private documentReadingService: DocumentReadingService,
    private route: ActivatedRoute,
    private router: Router,
    private fileDownloadService: FileDownloadService,
    private selectedIdsService: SelectedIdsService,
    private messageLabelService: MessageLabelService,
    private dialog: MatDialog
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      this.isFirstLoad = false;
    });
   }
        
  ngOnInit(): void {
    if (this.isFirstLoad) {
      this.clearAllSelections();
      console.log('Selections cleared on first page load');
    }
    this.route.queryParams.subscribe(params => {
      if (params['documentId']) {   
        this.parameterName = 'documentId';
        this.parameterLabel = 'Document ID';
        if (this.router.url.includes('/document/all-files-for-one-document')) {
          this.endpoint = 'document/all-files-for-one-document';
          this.isAllFilesForOneDocument = true;
          this.isOneDocumentData = false;
          this.isDocsByTextField = false;
        } else {
          this.endpoint = 'document/one-document-data';
          this.isAllFilesForOneDocument = false;
          this.isOneDocumentData = true;
        }
        this.tableType.endpoint = this.endpoint; 
        this.excludeFileId = false;    
        this.isDocsByTextField = false;      
      } else if (params['likeString']) {
        this.parameterName = 'likeString';
        this.parameterLabel = 'Title Contains';
        this.endpoint = 'document/docs-by-text-field';
        this.tableType.endpoint = this.endpoint; 
        this.excludeFileId = false;      
        this.isOneDocumentData = false;
        this.isAllFilesForOneDocument = false;
        this.isDocsByTextField = true;
      } else {
        this.parameterName = '';
        this.parameterLabel = '';
        this.endpoint = 'document/list-all-docs';
        this.tableType.endpoint = this.endpoint;
        this.tableHeading = 'All Documents';   
        this.excludeFileId = true;   
        this.isOneDocumentData = false;
        this.isAllFilesForOneDocument = false;  
        this.isDocsByTextField = false;                       
      }
      this.parameterValue = params[this.parameterName] ? decodeURIComponent(params[this.parameterName]) : '';
      this.setTableHeading();
      this.fetchData(params);
    });
    this.tableStateService.tableState$.subscribe(state => {
      if (state[this.tableType.name]) {
        this.selectedRows = state[this.tableType.name].selectedRows;
        this.selectedIds = state[this.tableType.name].selectedIds;   
        console.log('Selected Row IDs:', this.selectedIds); // Log selected row IDs         
        this.selectedIdsService.setSelectedDocumentIds(this.selectedIds);          
        this.applySortState();
        this.applyColumnWidths();        
      }
    });

    this.recordUpdatedSubscription = this.tableStateService.recordUpdated$.subscribe(
      (tableName: string) => {
        console.log('Received update notification for table:', tableName);
        if (tableName === this.tableType.name || 
          (tableName === 'Files' && (this.isAllFilesForOneDocument || this.isOneDocumentData || this.isDocsByTextField))) {
            console.log('Refreshing table');
            this.refreshTable();
        }
      }
    );
  }

  private getDocumentIdFromRow(row: DocumentData): string | null {
    return row['Doc ID'] || row['Document ID'] || null;
  }

  ngOnDestroy(): void {
    if (this.recordUpdatedSubscription) {
      this.recordUpdatedSubscription.unsubscribe();
    }
  }

  refreshTable(): void {
    this.fetchData(this.route.snapshot.queryParams);
  }

  getSortState(tableName: string): { column: string, direction: 'asc' | 'desc' } {
    return this.tableStateService.getSortState(tableName);
  }
  downloadFile(fileId: number): void {
    this.fileDownloadService.downloadFile(fileId);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {    
    this.initializeColumnWidths();
   });    
  }

  initializeColumnWidths(): void {
    if (this.tableContainer && this.tableContainer.nativeElement) {
    const tableElement = this.tableContainer.nativeElement.querySelector('table');
    if (tableElement) {
      const headerCells = tableElement.querySelectorAll('th');
      const columnWidths = Array.from(headerCells).map(cell => (cell as HTMLElement).offsetWidth);
      this.tableStateService.setColumnWidths(this.tableType.name, columnWidths);
    }
    }
  }

  fetchData(params: any): void {
    const decodedParams = Object.keys(params).reduce((acc, key) => {
      acc[key] = decodeURIComponent(params[key]);
      return acc;
    }, {} as any);
    this.fetchDataFunction(decodedParams).subscribe({
      next: (data: any) => {

        this.documentData = data.data || [];
        this.columns = this.getRelevantColumns(this.documentData);
        this.messageItems = this.extractMessageItems(data);
          this.tableStateService.setTableData(this.tableType.name, this.documentData);
          this.initializeColumnWidths();   
          this.tooltips = data.tooltips || {};     
          this.columnMapping = data.columnMapping || {};
          console.log('Tooltips received:', this.tooltips); 
          console.log('Column mapping:', this.columnMapping);
      },
      error: (error) => {
        console.error('Error fetching document data:', error);     
        this.documentData = [];
        this.columns = [];        
      }
    });
  }
  
  defaultFetchDataFunction(params: any): Observable<any> {
    return this.genericTableService.getTableData(this.tableType, params);
    }

    private extractMessageItems(data: any): { label: string, value: string }[] {
      const relevantKeys = [
        'transactionMessage',
        'transactionStatus',
        'numberOfRecords',
        'numberOfDocs',
        'numberOfFiles'
      ];
 
      return relevantKeys
        .filter(key => data[key] !== undefined)
        .map(key => ({
          label: this.messageLabelService.getLabel(key),
          value: data[key]?.toString() || ''
        }));
    }
  getRelevantColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    const sampleRow = data[0];
    let relevantColumns = Object.keys(sampleRow);
    
    if (this.excludeFileId) {
      relevantColumns = relevantColumns.filter(col => col !== 'File ID');
    }
    
    return relevantColumns;
  }
  onRowSelect(row: DocumentData): void {
    this.tableStateService.selectRow(this.tableType.name, row);
    const documentId = this.getDocumentIdFromRow(row);
    const fileId = row['File ID'] ? parseInt(row['File ID']) : null;
    console.log('Row data:', row);
    console.log('Extracted IDs - Doc ID:', documentId, 'File ID:', fileId);


   // Set single selection
   this.documentFileSelectionService.setSelection(documentId, fileId);

   if (documentId) {
     this.selectedIdsService.setSelectedDocumentIds([documentId]);
   }
   if (fileId !== null) {
     this.selectedIdsService.setSelectedFileIds([fileId]);
   }

   

   // Set multi-selection
   this.selectedIds = [this.getRowId(row)];
  this.selectedRows = [row];
  
  console.log('Documents table: Updated selections');
  console.log('- Selected Document ID:', documentId);
  console.log('- Selected File ID:', fileId);
  console.log('- Selected IDs:', this.selectedIds);

   // Add a small delay to ensure all updates have propagated
   setTimeout(() => {
     console.log('Documents table: Final state after selection');
     console.log('- selectedIds:', this.selectedIds);
   }, 0);
    
  }

  onRowMultiSelect(event: MouseEvent, row: DocumentData): void {
    if (!this.isDragging) {
      const index = this.documentData.indexOf(row);
      if (event.ctrlKey || event.metaKey) {
        const selectedIndex = this.selectedRows.indexOf(row);
        if (selectedIndex > -1) {
          this.selectedRows.splice(selectedIndex, 1);
          this.selectedIds.splice(selectedIndex, 1);
        } else {
          this.selectedRows.push(row);
          this.selectedIds.push(this.getRowId(row));
        }
        this.lastSelectedIndex = index;
      } else if (event.shiftKey && this.lastSelectedIndex > -1) {
        const start = Math.min(this.lastSelectedIndex, index);
        const end = Math.max(this.lastSelectedIndex, index);
        this.selectedRows = this.documentData.slice(start, end + 1);
        this.selectedIds = this.selectedRows.map(selectedRow => this.getRowId(selectedRow));
      } else {
        this.selectedRows = [row];
        this.selectedIds = [this.getRowId(row)];
        this.lastSelectedIndex = index;
      }
      
      this.tableStateService.setSelectedRows(this.tableType.name, this.selectedRows);

          // Create an array of Doc ID and File ID pairs
    const selectedPairs = this.selectedRows.map(row => ({
      docId: row['Doc ID'] || null,
      fileId: row['File ID'] ? parseInt(row['File ID']) : null
    }));
      
    if (this.selectedIds.length === 1) {
      
      let documentId: string | null;
      if (this.isAllFilesForOneDocument) {
        documentId = this.parameterValue;
      } else if (this.isDocsByTextField || !this.isOneDocumentData) {
        // For docs-by-text-field and other multi-document tables, get Doc ID from the row
        documentId = row['Doc ID'] || row['Document ID'] || null;
      } else {
        // For one-document-data, use parameterValue
        documentId = this.parameterValue;
      }

      let fileId: number | null = row['File ID'] ? parseInt(row['File ID']) : null;

      console.log('Setting selection - Doc ID:', documentId, 'File ID:', fileId);
      this.documentFileSelectionService.setSelection(documentId, fileId);     
      console.log('Single Selection - Doc ID:', documentId, 'File ID:', fileId);
    } else {
      this.documentFileSelectionService.clearSelection();
      console.log('Multi-Selection - Selected Doc ID and File ID pairs:', selectedPairs);
    }
    
    // Update selected document IDs and file IDs
    const uniqueDocIds = [...new Set(this.selectedRows.map(row => this.getDocumentIdFromRow(row)).filter((id): id is string => id !== null))];
    this.selectedIdsService.setSelectedDocumentIds(uniqueDocIds);
    const uniqueFileIds = [...new Set(selectedPairs.map(pair => pair.fileId).filter((id): id is number => id !== null))];
    

    const selectedFilenames = this.selectedRows.map(row => {
      // Directly access the 'Filename' property
      return row['Filename'] || '';
    }).filter(name => name !== '');
 
    this.selectedIdsService.setSelectedDocumentIds(uniqueDocIds);
    this.selectedIdsService.setSelectedFileIds(uniqueFileIds);
    this.selectedIdsService.setSelectedFilenames(selectedFilenames);
 
    console.log('Updated selections - Doc IDs:', uniqueDocIds, 'File IDs:', uniqueFileIds, 'Filenames:',
  selectedFilenames);
  }
 }
  private getRowId(row: DocumentData): string {
    return row['Doc ID']?.toString() || '';
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.isDragging = false;
    this.dragStartPosition = { x: event.clientX, y: event.clientY };
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.dragStartPosition) {
      const dragDistance = Math.sqrt(
        Math.pow(event.clientX - this.dragStartPosition.x, 2) +
        Math.pow(event.clientY - this.dragStartPosition.y, 2)
      );
      if (dragDistance > 5) {
        this.isDragging = true;
      }
    }
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    this.dragStartPosition = null;
  }

  onColumnSelect(column: string): void {
    const currentSortState = this.tableStateService.getSortState(this.tableType.name); 
    let newDirection: 'asc' | 'desc' = 'asc';
    if (currentSortState.column === column) {
      newDirection = currentSortState.direction === 'asc' ? 'desc' : 'asc';
    }    
    this.tableActionsService.sortTable(this.tableType.name, column, newDirection);
    this.applySortState();
  }

  applySortState(): void {
    const sortState = this.tableStateService.getSortState(this.tableType.name);
    if (sortState.column) {
      this.documentData = this.genericTableService.sortTableData(this.documentData, sortState.column, sortState.direction);
    }
  }

  onColumnResize(event: MouseEvent, columnIndex: number): void {
    event.preventDefault();
    if (this.tableContainer && this.tableContainer.nativeElement) {
    const headerRow = this.tableContainer.nativeElement.querySelector('tr');
    if (headerRow) {
    const th = headerRow.children[columnIndex] as HTMLElement;
    const startX = event.pageX;
    const startWidth = th.offsetWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      th.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.saveColumnWidths();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
   }
  }
}
 
  applyColumnWidths(): void {
    const columnWidths = this.tableStateService.getColumnWidths(this.tableType.name);
    if (this.tableContainer && this.tableContainer.nativeElement) {
    const tableElement = this.tableContainer.nativeElement.querySelector('table');
    if (tableElement) {
      columnWidths.forEach((width, index) => {
        const thElement = tableElement.querySelector(`th:nth-child(${index + 1})`);
        if (thElement) {
          thElement.style.width = `${width}px`;
        }
      });
    }
  }
}

  saveColumnWidths(): void {
    if (this.tableContainer && this.tableContainer.nativeElement) {
    const headerCells = this.tableContainer.nativeElement.querySelectorAll('th');
    const columnWidths = Array.from(headerCells).map(cell => (cell as HTMLElement).offsetWidth);
    this.tableStateService.setColumnWidths(this.tableType.name, columnWidths);
  }
}
openRemoveFileDocLinkDialog(documentId: string, fileIds: number[]): void {
  const dialogRef = this.dialog.open(RemoveFileDocLinkDialogComponent, {
    data: { documentId, fileIds }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result && result.success) {
      // The operation was successful, refresh the table
      this.fetchData(this.route.snapshot.queryParams);
    }
  });
}
private setTableHeading(): void {
  if (this.isAllFilesForOneDocument) {
    this.tableHeading = 'All Files for Document. This is an unfiltered list of the files linked to this document. ';
  } else if (this.isOneDocumentData) {
    this.tableHeading = 'Document Details. The document ID is subject to filtering.  This is a filtered list of the files linked to this document. ';
  } else if (this.isDocsByTextField) {
    this.tableHeading = 'Documents by Title. This is a filtered list of documents.';
  } else {
    this.tableHeading = 'All Documents';
  }
}

private clearAllSelections(): void {
  // Clear selections in the component
  this.selectedRows = [];
  this.selectedIds = [];

  // Clear selections in other services
  this.documentFileSelectionService.clearSelection();
  this.selectedIdsService.setSelectedDocumentIds([]);
  this.selectedIdsService.setSelectedFileIds([]);

  // Update the table state service
  this.tableStateService.setSelectedRows(this.tableType.name, []);

  console.log('All selections cleared');
}

getTooltip(column: string): string {
  const fullKey = this.columnMapping[column];
  return fullKey ? (this.tooltips[fullKey] || '') : '';
}

}

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
import { GenericTableService, TableType } from '../../shared/services/generic-table.service';
import { TableStateService } from '../../shared/services/table-state.service';
import { TableActionsService } from '../../shared/services/table-actions.service';
import { TableConfigService } from '../../shared/services/table-config.service';
import { FileDownloadService } from '../file-download/file-download.service';
import { ActivatedRoute, Router, Navigation } from '@angular/router';
import { SelectedIdsService } from '../../shared/services/selected-ids.service';
import { MessageLabelService } from '../../shared/services/message-label.service';
import { Subscription } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { FilesSearchService } from '../../shared/services/files-search.service';
import { ApplicationMessageService } from '../../shared/services/application-message.service';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

interface FileData {
  [key: string]: any;
}

@Component({
  selector: 'app-file-search-results',
  templateUrl: './file-search-results.component.html',
  styleUrls: ['../../shared/stylesheets/tables.scss', '../../shared/stylesheets/messages.scss'],
  standalone: true,
  imports: [CommonModule, MatTooltipModule]
})
export class FileSearchResultsComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() tableHeading: string = 'Search Results';
  private isDragging: boolean = false;
  private dragStartPosition: { x: number, y: number } | null = null;
  fileData: FileData[] = [];
  columns: string[] = [];
  message: string = '';
  transactionStatus: string = '';
  numberOfRows: string = '';
  numberOfFiles: string = '';
  selectedRows: FileData[] = [];
  selectedIds: (string | number)[] = [];
  messageItems: { label: string, value: string }[] = [];
  lastSelectedIndex: number = -1;
  private recordUpdatedSubscription: Subscription | undefined;
  tooltips: { [key: string]: string } = {};
  searchTerm: string = '';
  
  // Application messages (separate from database messages)
  appErrors: string[] = [];
  appWarnings: string[] = [];
  appInfo: string[] = [];
  systemErrors: string[] = [];
  

  @ViewChild('tableContainer') tableContainer!: ElementRef;  
  
  readonly tableType: TableType = {
    name: 'FileSearchResults',
    endpoint: 'file/file-name/read',
    idType: 'bigint',
    dataField: 'fileData'
  };

  constructor(
    private genericTableService: GenericTableService<FileData>,
    public tableStateService: TableStateService,
    public tableActionsService: TableActionsService,
    private fileDownloadService: FileDownloadService,
    private tableConfigService: TableConfigService,
    private selectedIdsService: SelectedIdsService,
    private messageLabelService: MessageLabelService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private filesSearchService: FilesSearchService,
    private applicationMessageService: ApplicationMessageService
  ) { }

  ngOnInit(): void {
    this.tableType.dataField = 'fileData';
    this.route.queryParams.subscribe(params => {
      this.searchTerm = params['searchTerm'];
      if (this.searchTerm) {
        this.fetchSearchResults();
      } else {
        const navigation = this.router.getCurrentNavigation();
        if (navigation && navigation.extras && navigation.extras.state) {
          const state = navigation.extras.state as { searchResults: any, searchTerm: string };
          this.searchTerm = state.searchTerm;
          this.processSearchResults(state.searchResults);
        } else {
          console.error('Application error');
          this.appErrors = ['Application error.'];
          this.message = '';
          this.transactionStatus = '';
          // Ensure data arrays are empty
          this.fileData = [];
          this.columns = [];
          this.numberOfFiles = '';
        }
      }
    });
 
    this.tableStateService.tableState$.subscribe(state => {
      if (state[this.tableType.name]) {
        this.selectedRows = state[this.tableType.name].selectedRows;
        this.selectedIds = state[this.tableType.name].selectedIds;
        this.applySortState();
        this.applyColumnWidths();
      }
    });
 
    this.recordUpdatedSubscription = this.tableStateService.recordUpdated$.subscribe(
      (tableName: string) => {
        if (tableName === this.tableType.name) {
          this.refreshTable();
        }
      }
    );
  }
 
  private processSearchResults(results: any): void {
    if (results && results.data) {
      this.fileData = results.data;
      if (this.fileData.length > 0) {
        // Extract column names and separate from tooltips
        this.columns = Object.keys(this.fileData[0]).map(key => {
          // Extract just the column name without tooltip
          // Some column names might contain both name and tooltip separated by ::
          const headerParts = key.split('::');
          return headerParts[0].trim();
        });
      }
      this.message = results.transactionMessage || '';
      this.transactionStatus = results.transactionStatus || '';
      this.numberOfFiles = results.numberOfFiles || '';
      this.tableStateService.setTableData(this.tableType.name, this.fileData);
      this.initializeColumnWidths();
      this.updateMessageItems(results);
      this.tooltips = results.tooltips || {};
    } else {
      console.error('Invalid search results structure:', results);
      this.appErrors = ['Search completed but returned invalid data format.'];
      this.message = '';
      this.transactionStatus = '';
      // Clear any previous data
      this.fileData = [];
      this.columns = [];
      this.numberOfFiles = '';
    }
  }



  fetchSearchResults(): void {
    this.genericTableService.getTableData(this.tableType, { likeString: this.searchTerm }).subscribe({
      next: (data: any) => {
        this.processSearchResults(data);
      },
      error: (error) => {
        console.error('Error fetching search results:', error);
        const errorResponse = this.applicationMessageService.createFromHttpError(error);
        this.appErrors = errorResponse.appErrors || ['Search request failed. Please try again.'];
        this.systemErrors = errorResponse.systemErrors || [];
        this.message = '';
        this.transactionStatus = '';
        // Clear any previous data to avoid showing stale results
        this.fileData = [];
        this.columns = [];
        this.numberOfFiles = '';
      }
    });
  }

  refreshTable(): void {
    this.fetchSearchResults();
  }

  ngOnDestroy(): void {
    if (this.recordUpdatedSubscription) {
      this.recordUpdatedSubscription.unsubscribe();
    }
  }

  ngAfterViewInit(): void {
    this.initializeColumnWidths();
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

  private updateMessageItems(data: any): void {
    this.messageItems = [
      { label: this.messageLabelService.getLabel('transactionMessage'), value: data.transactionMessage || '' },
      { label: this.messageLabelService.getLabel('transactionStatus'), value: data.transactionStatus || '' },
      { label: this.messageLabelService.getLabel('numberOfFiles'), value: data.numberOfFiles?.toString() || '' }
    ];
  }

  onRowSelect(row: FileData): void {
    this.selectedRows = [row];
    this.selectedIds = [this.getRowId(row)];
    this.tableStateService.setSelectedRows(this.tableType.name, this.selectedRows);
    this.selectedIdsService.setSelectedFileIds([Number(this.getRowId(row))]);
    this.selectedIdsService.setSelectedFilenames([row['Filename']]);
 
    console.log('File Search Results: Row selected');
    console.log('- Selected Row:', row);
    console.log('- Selected IDs:', this.selectedIds);
    console.log('- Selected File IDs:', [Number(this.getRowId(row))]);
    console.log('- Selected Filenames:', [row['Filename']]);
 
    // Add a small delay to ensure all updates have propagated
    setTimeout(() => {
      console.log('File Search Results: Final state after selection');
      console.log('- selectedIds:', this.selectedIds);
    }, 0);
  }

  onRowMultiSelect(event: MouseEvent, row: FileData): void {
    if (!this.isDragging) {
      const index = this.fileData.indexOf(row);
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
        this.selectedRows = this.fileData.slice(start, end + 1);
        this.selectedIds = this.selectedRows.map(selectedRow => this.getRowId(selectedRow));
      } else {
        this.selectedRows = [row];
        this.selectedIds = [this.getRowId(row)];
        this.lastSelectedIndex = index;
      }
 
      this.tableStateService.setSelectedRows(this.tableType.name, this.selectedRows);
      this.selectedIdsService.setSelectedFileIds(this.selectedIds.map(id => Number(id)));
      this.selectedIdsService.setSelectedFilenames(this.selectedRows.map(row => row['Filename']));
    }
  }

  private getRowId(row: FileData): number {
    return row['File ID'];
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
      this.fileData = this.genericTableService.sortTableData(this.fileData, sortState.column, sortState.direction);
    }
  }

  downloadFile(fileId: number): void {
    this.fileDownloadService.downloadFile(fileId); 
  }

  onColumnResize(event: MouseEvent, columnIndex: number): void {
    event.preventDefault();
    if (this.tableContainer && this.tableContainer.nativeElement) {    
      const headerRow = this.tableContainer.nativeElement.querySelector('tr');
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
  
  getTooltip(column: string): string {
    // Check if there's a tooltip for this column
    // First try direct lookup
    if (this.tooltips[column]) {
      return this.tooltips[column];
    }
    
    // Then check if there's a column with tooltip in the format "Column::Tooltip"
    const fullColumnKey = Object.keys(this.fileData[0]).find(key => {
      const parts = key.split('::');
      return parts[0].trim() === column;
    });
    
    if (fullColumnKey && fullColumnKey.includes('::')) {
      const tooltipPart = fullColumnKey.split('::')[1].trim();
      return tooltipPart;
    }
    
    return '';
  }

  getSortState(tableName: string): { column: string, direction: 'asc' | 'desc' } {
    return this.tableStateService.getSortState(tableName);
  }
}
    

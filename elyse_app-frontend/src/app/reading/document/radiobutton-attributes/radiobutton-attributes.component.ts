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

import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { TableType } from '../../../shared/services/generic-table.service';
import { TableConfigService } from '../../../shared/services/table-config.service';
import { TableStateService } from '../../../shared/services/table-state.service';
import { GenericTableService } from '../../../shared/services/generic-table.service';
import { TableActionsService } from '../../../shared/services/table-actions.service';
import { MessageLabelService } from '../../../shared/services/message-label.service';
import { Subscription } from 'rxjs';

interface AttributeData {
  'List ID': number;
  'List Name': string;
  'Name List Position': number;
  'Attribute ID': number;
  'Mnemonic': string;
  [key: string]: any;
}

@Component({
  selector: 'app-radiobutton-attributes',
  templateUrl: './radiobutton-attributes.component.html',
  styleUrls: ['../../../shared/stylesheets/tables.scss', '../../../shared/stylesheets/messages.scss']
})
export class RadiobuttonAttributesComponent implements OnInit, AfterViewInit {
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  readonly tableType: TableType = {
    name: 'document-radiobutton-attributes',
    endpoint: 'document/radio-button/attribute/read',
    idType: 'bigint',
    dataField: 'attributesData'
  };

  tableHeading: string = 'Document Radio Button Attributes';
  tableData: AttributeData[] = [];
  columns: string[] = [];
  selectedRows: AttributeData[] = [];
  selectedIds: (string | number)[] = [];
  messageItems: { label: string, value: string }[] = [];
  tooltips: { [key: string]: string } = {};
  columnMapping: {[key: string]: string} = {};
  private isDragging: boolean = false;
  private dragStartPosition: { x: number, y: number } | null = null;
  private recordUpdatedSubscription: Subscription | undefined;

  constructor(
    private genericTableService: GenericTableService<AttributeData>,
    private tableStateService: TableStateService,
    private tableActionsService: TableActionsService,
    private tableConfigService: TableConfigService,
    private messageLabelService: MessageLabelService
  ) {}

  ngOnInit() {
    this.fetchData();
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

  ngAfterViewInit(): void {
    this.initializeColumnWidths();
  }

  ngOnDestroy(): void {
    if (this.recordUpdatedSubscription) {
      this.recordUpdatedSubscription.unsubscribe();
    }
  }

  private displayColumns: string[] = [
    'List Name',
    'Mnemonic',
    'Name',
    'Description'
  ];

  private fetchData(): void {
    this.genericTableService.getTableData(this.tableType).subscribe({
      next: (data: any) => {
        if (data && data.data) {
          this.tableData = data.data;  // Keep full data with all columns
          this.columns = this.displayColumns;  // Only show specified columns
          this.tableStateService.setTableData(this.tableType.name, this.tableData);
          this.initializeColumnWidths();
          this.updateMessageItems(data);
          this.tooltips = data.tooltips || {};
          this.columnMapping = data.columnMapping || {};
        }
      },
      error: (error) => {
        console.error('Error fetching radio button attributes:', error);
      }
    });
  }

  private updateMessageItems(data: any): void {
    this.messageItems = [
      { label: this.messageLabelService.getLabel('transactionMessage'), value: data.transactionMessage || '' },
      { label: this.messageLabelService.getLabel('transactionStatus'), value: data.transactionStatus || '' }
    ];
  }

  refreshTable(): void {
    this.fetchData();
  }

  onRowMultiSelect(event: MouseEvent, row: AttributeData): void {
    if (!this.isDragging) {
      console.log('Row clicked:', { 
        id: row['Attribute ID'],
        name: row['Name'],
        selectionType: event.ctrlKey ? 'Ctrl-click' : event.shiftKey ? 'Shift-click' : 'Single-click'
      });

      if (event.ctrlKey || event.metaKey) {
        // Multi-select with Ctrl/Cmd key
        const selectedIndex = this.selectedRows.findIndex(
          selectedRow => selectedRow['Attribute ID'] === row['Attribute ID']
        );
        if (selectedIndex > -1) {
          this.selectedRows.splice(selectedIndex, 1);
          this.selectedIds = this.selectedRows.map(row => row['Attribute ID']);
          console.log('Ctrl-click deselected row. Current selection:', {
            selectedIds: this.selectedIds,
            selectedCount: this.selectedRows.length
          });
        } else {
          this.selectedRows.push(row);
          this.selectedIds = this.selectedRows.map(row => row['Attribute ID']);
          console.log('Ctrl-click added row. Current selection:', {
            selectedIds: this.selectedIds,
            selectedCount: this.selectedRows.length
          });
        }
      } else if (event.shiftKey && this.selectedRows.length > 0) {
        // Multi-select with Shift key
        const lastSelectedRow = this.selectedRows[this.selectedRows.length - 1];
        const lastSelectedIndex = this.tableData.findIndex(
          r => r['Attribute ID'] === lastSelectedRow['Attribute ID']
        );
        const currentIndex = this.tableData.findIndex(
          r => r['Attribute ID'] === row['Attribute ID']
        );
        
        if (lastSelectedIndex > -1 && currentIndex > -1) {
          const startIndex = Math.min(lastSelectedIndex, currentIndex);
          const endIndex = Math.max(lastSelectedIndex, currentIndex);
          
          this.selectedRows = this.tableData.slice(startIndex, endIndex + 1);
          this.selectedIds = this.selectedRows.map(row => row['Attribute ID']);
          console.log('Shift-click range selection:', {
            startIndex,
            endIndex,
            selectedIds: this.selectedIds,
            selectedCount: this.selectedRows.length
          });
        }
      } else {
        // Single select
        const isSameRow = this.selectedRows.length === 1 && 
                       this.selectedRows[0]['Attribute ID'] === row['Attribute ID'];
        
        if (isSameRow) {
          // Deselect if clicking the same row
          this.selectedRows = [];
          this.selectedIds = [];
          console.log('Single-click deselected row. Selection cleared.');
        } else {
          this.selectedRows = [row];
          this.selectedIds = [row['Attribute ID']];
          console.log('Single-click selected row:', {
            selectedId: row['Attribute ID'],
            name: row['Name']
          });
        }
      }
      
      // Update the table state
      this.tableStateService.setSelectedRows(this.tableType.name, this.selectedRows);
      console.log('Final selection state:', {
        selectedIds: this.selectedIds,
        totalSelected: this.selectedRows.length
      });
    }
  }

  private getRowId(row: AttributeData): number {
    if (row['Attribute ID'] === undefined) {
      console.error('Row missing Attribute ID:', row);
    }
    return row['Attribute ID'];
  }

  getSortState(tableName: string): { column: string, direction: 'asc' | 'desc' } {
    return this.tableStateService.getSortState(tableName);
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
      this.tableData = this.genericTableService.sortTableData(this.tableData, sortState.column, sortState.direction);
    }
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
    const fullKey = this.columnMapping[column];
    return fullKey ? (this.tooltips[fullKey] || '') : '';
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
}

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

interface FormFieldData {
  [key: string]: any;
}

@Component({
  selector: 'app-form-fields',
  templateUrl: './form-fields.component.html',
  styleUrls: ['../../../shared/stylesheets/tables.scss', '../../../shared/stylesheets/messages.scss']
})
export class FormFieldsComponent implements OnInit, AfterViewInit {
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  readonly tableType: TableType = {
    name: 'form-fields',
    endpoint: 'forms/all-form-fields',
    idType: 'bigint',
    dataField: 'formFieldsData'
  };

  tableHeading: string = 'Form Fields';
  tableData: FormFieldData[] = [];
  columns: string[] = [];
  selectedRows: FormFieldData[] = [];
  selectedIds: (string | number)[] = [];
  messageItems: { label: string, value: string }[] = [];
  tooltips: { [key: string]: string } = {};
  columnMapping: {[key: string]: string} = {};
  private isDragging: boolean = false;
  private dragStartPosition: { x: number, y: number } | null = null;
  private recordUpdatedSubscription: Subscription | undefined;

  constructor(
    private genericTableService: GenericTableService<FormFieldData>,
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

  private fetchData(): void {
    this.genericTableService.getTableData(this.tableType).subscribe({
      next: (data: any) => {
        if (data && data.data) {
          this.tableData = data.data;
          if (this.tableData.length > 0) {
            this.columns = Object.keys(this.tableData[0]);
          }
          this.tableStateService.setTableData(this.tableType.name, this.tableData);
          this.initializeColumnWidths();
          this.updateMessageItems(data);
          this.tooltips = data.tooltips || {};
          this.columnMapping = data.columnMapping || {};
        }
      },
      error: (error) => {
        console.error('Error fetching form fields:', error);
      }
    });
  }

  private updateMessageItems(data: any): void {
    this.messageItems = [
      { label: this.messageLabelService.getLabel('transactionMessage'), value: data.transactionMessage || '' },
      { label: this.messageLabelService.getLabel('transactionStatus'), value: data.transactionStatus || '' },
      { label: this.messageLabelService.getLabel('numberOfRows'), value: data.numberOfRows?.toString() || '' }
    ];
  }

  refreshTable(): void {
    this.fetchData();
  }

  onRowMultiSelect(event: MouseEvent, row: FormFieldData): void {
    if (!this.isDragging) {
      const index = this.tableData.indexOf(row);
      if (event.ctrlKey || event.metaKey) {
        const selectedIndex = this.selectedRows.indexOf(row);
        if (selectedIndex > -1) {
          this.selectedRows.splice(selectedIndex, 1);
          this.selectedIds = this.selectedRows.map(row => this.getRowId(row));
        } else {
          this.selectedRows.push(row);
          this.selectedIds = this.selectedRows.map(row => this.getRowId(row));
        }
      } else {
        this.selectedRows = [row];
        this.selectedIds = [this.getRowId(row)];
      }
      this.tableStateService.setSelectedRows(this.tableType.name, this.selectedRows);
    }
  }

  private getRowId(row: FormFieldData): string | number {
    return row['Form ID'] || row['id'] || JSON.stringify(row);
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

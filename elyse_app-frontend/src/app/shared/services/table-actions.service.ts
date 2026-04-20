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


import { Injectable, Inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { TransactionResultDialogComponent } from '../components/transaction-results/transaction-result-dialog.component';
import { ApplicationErrorDialogComponent } from '../components/application-error-dialog/application-error-dialog.component';
import { GenericTableService } from './generic-table.service';
import { TableStateService } from './table-state.service';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TableActionsService {
  constructor(
    private dialog: MatDialog,
    @Inject(GenericTableService) private tableService: GenericTableService<any>,
    @Inject(TableStateService) private tableStateService: TableStateService
  ) {}

  onDeleteRecords(tableName: string, tableType: any): void {
    const selectedIds = this.tableStateService.getSelectedIds(tableName);
    if (selectedIds.length > 0) {
      const confirmationDialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: {
          title: 'Confirm Delete',
          message: `Are you sure you want to delete the selected records?`,
          confirmText: 'Delete',
          cancelText: 'Cancel'
        }
      });

      confirmationDialogRef.afterClosed().subscribe(result => {
        if (result) {
          const deleteRequests = selectedIds.map(id => this.tableService.deleteRecord(tableType, id));

          forkJoin(deleteRequests).subscribe(
            () => {
              this.tableStateService.notifyRecordDeleted(tableName);
              this.dialog.open(TransactionResultDialogComponent, {
                data: {
                  title: 'Delete Records',
                  message: 'Records deleted successfully',
                  status: 'Success'
                }
              });
            },
            error => {
              console.error('Error deleting records:', error);
              this.dialog.open(ApplicationErrorDialogComponent, {
                data: {
                  title: 'Application Error',
                  message: 'An error occurred while deleting records',
                  status: 'Application layer error'
                }
              });
            }
          );
        }
      });
    }
  }

  openAddRecordDialog(tableName: string, tableType: any): void {
    // Implement the logic to open the add record dialog
    // You can create a generic dialog component or use table-specific components
    // Pass the necessary data and configurations to the dialog
    // Subscribe to the dialog result and handle the record addition accordingly
    // Notify the table state service when a record is successfully added
  }

  openEditRecordDialog(tableName: string, tableType: any): void {
    const selectedRows = this.tableStateService.getSelectedRows(tableName);
    if (selectedRows.length === 1) {
      console.log(`Opening edit record dialog for table ${tableName}`, selectedRows[0]);
    }
  }

  sortTable(tableName: string, column: string, direction: 'asc' | 'desc'): void {
    this.tableStateService.setSortState(tableName, column, direction);
    const currentData = this.tableStateService.getTableData(tableName);
    const sortedData = this.tableService.sortTableData(currentData, column, direction);
    this.tableStateService.setTableData(tableName, sortedData);
  }

  filterTable(tableName: string, filterCriteria: any): void {
    // Implement filtering logic using the GenericTableService
    this.tableService.applyFilter(tableName, filterCriteria).subscribe(
      (filteredData) => {
        this.tableStateService.setTableData(tableName, filteredData);
      },
      (error) => {
        console.error('Error applying filter:', error);
      }
    );
  }

  exportTable(tableName: string, format: 'csv' | 'excel'): void {
    // Implement export logic
    console.log(`Exporting table ${tableName} to ${format} format`);
   }
   
  resizeColumn(tableName: string, columnIndex: number, newWidth: number): void {
    this.tableService.resizeColumn(tableName, columnIndex, newWidth);
    const currentWidths = this.tableStateService.getColumnWidths(tableName);
    currentWidths[columnIndex] = newWidth;
    this.tableStateService.setColumnWidths(tableName, currentWidths);
  }

  refreshTable(tableName: string, tableType: any): void {
    this.tableService.refreshTable(tableType).subscribe(
      (refreshedData) => {
        this.tableStateService.setTableData(tableName, refreshedData.data);
      },
      (error) => {
        console.error('Error refreshing table:', error);
      }
    );
  }

  persistTableState(tableName: string): void {
    this.tableStateService.persistTableState(tableName);
  }

  restoreTableState(tableName: string): void {
    this.tableStateService.restoreTableState(tableName);
  }
  }

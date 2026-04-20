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

import { Directive, Input, OnInit, OnDestroy } from '@angular/core';
import { TableStateService } from '../../services/table-state.service';
import { TableType } from '../../services/generic-table.service';

@Directive()
export abstract class BaseTableComponent implements OnInit, OnDestroy {
  @Input() tableType!: TableType;
  
  constructor(protected tableStateService: TableStateService) {}
  
  ngOnInit(): void {
    // Restore table state on initialization
    if (this.tableType && this.tableType.name) {
      this.tableStateService.restoreTableState(this.tableType.name);
    }
    
    // Register this component as the current table component
    this.tableStateService.setCurrentTableComponent(this);
  }
  
  ngOnDestroy(): void {
    // Persist table state on component destruction
    if (this.tableType && this.tableType.name) {
      this.tableStateService.persistTableState(this.tableType.name);
    }
  }
  
  // Method that can be called by TableStateService.refreshCurrentTable()
  refreshTableData(): void {
    // Implementation to be provided by derived classes
    this.refreshTable();
  }
  
  // Method to be implemented by derived classes
  abstract refreshTable(): void;
}

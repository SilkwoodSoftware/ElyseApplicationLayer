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

export interface ColumnConfig {
  key: string;
  header: string;
  sortable: boolean;
  resizable: boolean;
  width?: string;
}

export interface TableConfig {
  columns: ColumnConfig[];
  dataSource: string;
  actions: string[];
  defaultSort?: { column: string, direction: 'asc' | 'desc' };
}

@Injectable({
  providedIn: 'root'
})
export class TableConfigService {
  private tableConfigs: { [tableName: string]: TableConfig } = {};

  setTableConfig(tableName: string, config: TableConfig): void {
    this.tableConfigs[tableName] = config;
  }

  getTableConfig(tableName: string): TableConfig {
    return this.tableConfigs[tableName];
  }

  updateColumnConfig(tableName: string, columnKey: string, updates: Partial<ColumnConfig>): void {
    const config = this.tableConfigs[tableName];
    if (config) {
      const columnIndex = config.columns.findIndex(col => col.key === columnKey);
      if (columnIndex !== -1) {
        config.columns[columnIndex] = { ...config.columns[columnIndex], ...updates };
      }
    }
  }

  addColumn(tableName: string, column: ColumnConfig, index?: number): void {
    const config = this.tableConfigs[tableName];
    if (config) {
      if (index !== undefined) {
        config.columns.splice(index, 0, column);
      } else {
        config.columns.push(column);
      }
    }
  }

  removeColumn(tableName: string, columnKey: string): void {
    const config = this.tableConfigs[tableName];
    if (config) {
      config.columns = config.columns.filter(col => col.key !== columnKey);
    }
  }

  updateTableActions(tableName: string, actions: string[]): void {
    const config = this.tableConfigs[tableName];
    if (config) {
      config.actions = actions;
    }
  }
}
    

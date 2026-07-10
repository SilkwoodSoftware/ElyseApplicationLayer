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

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TableConfig } from '../../services/table-config.service';

@Component({
  selector: 'app-generic-table',
  template: `
    <table>
      <thead>
        <tr>
          <th *ngFor="let column of visibleColumns">{{ column.header }}</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let row of data" (click)="onRowClick(row)">
          <td *ngFor="let column of visibleColumns">{{ row[column.key] }}</td>
        </tr>
      </tbody>
    </table>
  `,
  styles: [`
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    tr:hover {
      background-color: #f5f5f5;
      cursor: pointer;
    }
  `]
})
export class GenericTableComponent {
  @Input() config!: TableConfig;
  @Input() data: any[] = [];
  @Input() hiddenColumns: string[] = [];
  @Output() rowSelect = new EventEmitter<any>();

  get visibleColumns() {
    if (!this.config?.columns) return [];
    return this.config.columns.filter(col => !this.hiddenColumns.includes(col.key));
  }

  onRowClick(row: any) {
    this.rowSelect.emit(row);
  }
}

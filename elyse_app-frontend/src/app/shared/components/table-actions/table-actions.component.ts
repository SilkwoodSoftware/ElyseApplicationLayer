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
import { TableActionsService } from './table-actions.service';
import { TableConfig } from './table-config';

@Component({
  selector: 'app-table-actions',
  templateUrl: './table-actions.component.html',
  styleUrls: []
})
export class TableActionsComponent {
  @Input() selectedIds: number[] = [];
  @Input() selectedUsernames: string[] = []; // New input property for selected usernames
  @Input() config!: TableConfig;
  @Output() userDeleted: EventEmitter<void> = new EventEmitter<void>();

  constructor(public tableActionsService: TableActionsService) { }

  onDeleteUser(): void {
    if (this.config.actions.includes('delete')) {
      this.tableActionsService.onDeleteUser(this.selectedIds, this.selectedUsernames);
    }
  }

  openAddUserDialog(): void {
    if (this.config.actions.includes('add')) {
      this.tableActionsService.openAddUserDialog();
    }
  }
}
    

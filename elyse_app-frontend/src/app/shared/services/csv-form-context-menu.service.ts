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
import { CsvFormMenuIntegrationService } from './csv-form-menu-integration.service';
import { Observable } from 'rxjs';
import { TableStateService } from './table-state.service';

/**
 * Service for integrating CSV forms with the context menu system
 * This is completely independent of the existing form functionality
 */
@Injectable({
  providedIn: 'root'
})
export class CsvFormContextMenuService {
  constructor(
    private csvFormMenuIntegrationService: CsvFormMenuIntegrationService,
    private tableStateService: TableStateService
  ) {}

  /**
   * Handle a context menu item action
   * @param tableName The name of the table
   * @param actionType The type of action (FORM, CHAIN)
   * @param reference The reference to the form or chain
   * @param params Optional additional parameters to pass to the form
   * @returns An Observable that resolves to the result of the action
   */
  handleContextMenuAction(tableName: string, actionType: string, reference: string, params: Record<string, any> = {}): Observable<any> {
    // Get the selected row data from the table state
    const selectedRows = this.tableStateService.getSelectedRows(tableName);
    
    if (!selectedRows || selectedRows.length === 0) {
      throw new Error('No rows selected');
    }
    
    // For now, we only handle the first selected row
    // In the future, we could implement iteration over multiple selected rows
    const selectedRow = selectedRows[0];
    
    return this.csvFormMenuIntegrationService.handleContextMenuAction(actionType, reference, selectedRow, params);
  }
}

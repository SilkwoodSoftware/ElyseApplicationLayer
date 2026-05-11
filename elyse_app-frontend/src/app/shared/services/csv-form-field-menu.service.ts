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
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { validateCsv } from '../utils/csv-validator';
import { FORM_FIELD_MENUS_SCHEMA } from '../utils/csv-schemas';
import { CsvDiagnosticService } from './csv-diagnostic.service';

/**
 * Interface for CSV form field menu
 * Represents a menu item for a form field loaded from form-field-menus.csv
 */
export interface CsvFormFieldMenu {
  /** Form field ID this menu belongs to */
  formFieldId: string;
  /** Label for the menu item */
  menuLabel: string;
  /** Type of menu item (FORM, TABLE) */
  type: string;
  /** Reference to a form or table */
  reference: string;
  /** Description or tooltip */
  description?: string;
  /** Icon for the menu item */
  icon?: string;
}

/**
 * Service for handling CSV form field menus
 * This is completely independent of the existing form functionality
 */
@Injectable({
  providedIn: 'root'
})
export class CsvFormFieldMenuService {
  /** Map of form field menus indexed by form field ID */
  private formFieldMenus = new Map<string, CsvFormFieldMenu[]>();

  constructor(private http: HttpClient, private csvDiagnosticService: CsvDiagnosticService) {
    this.loadFormFieldMenus();
  }

  /**
   * Load form field menus from CSV file
   */
  private loadFormFieldMenus(): void {
    this.http.get('/assets/form-field-menus.csv', { responseType: 'text' })
      .pipe(
        map(csv => this.parseFormFieldMenusCsv(csv)),
        catchError(error => {
          console.error('Error loading form field menus:', error);
          return of([]);
        })
      )
      .subscribe(menus => {
        // Group menus by formFieldId
        menus.forEach(menu => {
          if (!this.formFieldMenus.has(menu.formFieldId)) {
            this.formFieldMenus.set(menu.formFieldId, []);
          }
          this.formFieldMenus.get(menu.formFieldId)!.push(menu);
        });
        
        console.log('Loaded CSV form field menus:', this.formFieldMenus);
      });
  }

  /**
   * Get form field menus for a specific form field
   * @param formFieldId The ID of the form field to get menus for
   * @returns An array of form field menus for the specified form field
   */
  getFormFieldMenus(formFieldId: string): CsvFormFieldMenu[] {
    return this.formFieldMenus.get(formFieldId) || [];
  }

  /**
   * Check if a form field has menus
   * @param formFieldId The ID of the form field to check
   * @returns True if the form field has menus, false otherwise
   */
  hasMenus(formFieldId: string): boolean {
    const menus = this.formFieldMenus.get(formFieldId);
    return !!menus && menus.length > 0;
  }

  /**
   * Parse the form field menus CSV into form field menu objects
   * @param csv The CSV string to parse
   * @returns An array of form field menu objects
   */
  private parseFormFieldMenusCsv(csv: string): CsvFormFieldMenu[] {
    const result = validateCsv(csv, FORM_FIELD_MENUS_SCHEMA);

    this.csvDiagnosticService.reportErrors(
      FORM_FIELD_MENUS_SCHEMA.fileName, result.errors, result.validRows.length, result.rejectedRowCount
    );

    return result.validRows.map(row => ({
      formFieldId: row['FormFieldMenuID'],
      menuLabel: row['MenuLabel'],
      type: row['Type'],
      reference: row['Reference'],
      description: row['Description'] || undefined,
      icon: row['Icon'] || undefined
    }));
  }
}

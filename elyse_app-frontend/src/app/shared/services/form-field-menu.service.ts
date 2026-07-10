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
 * Interface for form field menu item
 * Represents a menu item from form-field-menus.csv
 */
export interface FormFieldMenuItem {
  /** Unique identifier for the menu */
  formFieldMenuId: string;
  /** Label to display in the menu */
  menuLabel: string;
  /** Type of menu item (TABLE or FORM) */
  type: 'TABLE' | 'FORM';
  /** Reference to a table name or form ID */
  reference: string;
  /** Description or tooltip for the menu item */
  description?: string;
  /** Display order */
  order: number;
  /** Icon to display with the menu item */
  icon?: string;
}

/**
 * Service for handling form field menus
 * 
 * This service loads and processes form field menu definitions from form-field-menus.csv
 * and provides methods to get menu items for a specific FormFieldMenuID.
 */
@Injectable({
  providedIn: 'root'
})
export class FormFieldMenuService {
  /** Map of menu items indexed by FormFieldMenuID */
  private menuItems = new Map<string, FormFieldMenuItem[]>();

  constructor(private http: HttpClient, private csvDiagnosticService: CsvDiagnosticService) {
    this.loadFormFieldMenus();
  }

  /**
   * Load form field menu definitions from CSV file
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
      .subscribe(menuItems => {
        // Group menu items by FormFieldMenuID
        menuItems.forEach(item => {
          if (!this.menuItems.has(item.formFieldMenuId)) {
            this.menuItems.set(item.formFieldMenuId, []);
          }
          this.menuItems.get(item.formFieldMenuId)!.push(item);
        });

        // Sort menu items by order
        this.menuItems.forEach(items => {
          items.sort((a, b) => a.order - b.order);
        });

        console.log('Loaded form field menus:', this.menuItems);
      });
  }

  /**
   * Parse CSV content into FormFieldMenuItem objects
   */
  private parseFormFieldMenusCsv(csv: string): FormFieldMenuItem[] {
    const result = validateCsv(csv, FORM_FIELD_MENUS_SCHEMA);

    this.csvDiagnosticService.reportErrors(
      FORM_FIELD_MENUS_SCHEMA.fileName, result.errors, result.validRows.length, result.rejectedRowCount
    );

    return result.validRows.map(row => {
      // Type is validated by schema enum — faithfully map the value
      const type: 'TABLE' | 'FORM' = row['Type'].trim() === 'FORM' ? 'FORM' : 'TABLE';

      // Parse order
      let order = 0;
      const rawOrder = row['Order']?.trim();
      if (rawOrder && !isNaN(parseInt(rawOrder))) {
        order = parseInt(rawOrder);
      }

      return {
        formFieldMenuId: row['FormFieldMenuID'],
        menuLabel: row['MenuLabel'],
        type,
        reference: row['Reference'],
        description: row['Description'] || undefined,
        order,
        icon: row['Icon'] || undefined,
      };
    });
  }

  /**
   * Get menu items for a specific FormFieldMenuID
   * @param formFieldMenuId The FormFieldMenuID to get menu items for
   * @returns An array of menu items for the specified FormFieldMenuID
   */
  getMenuItems(formFieldMenuId: string): FormFieldMenuItem[] {
    return this.menuItems.get(formFieldMenuId) || [];
  }
}

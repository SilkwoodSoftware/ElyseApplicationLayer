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

  constructor(private http: HttpClient) {
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
    const lines = csv.split('\n');
    const items: FormFieldMenuItem[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV parsing with potential quoted values containing commas
      const values: string[] = [];
      let inQuotes = false;
      let currentValue = '';

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      values.push(currentValue);

      // Skip empty rows or rows with insufficient values
      if (values.length < 4 || !values[0]) continue;

      // Validate type
      let type: 'TABLE' | 'FORM' = 'TABLE';
      if (values[2] === 'FORM') {
        type = 'FORM';
      }

      // Parse order if present
      let order = 0;
      if (values[5] && !isNaN(parseInt(values[5]))) {
        order = parseInt(values[5]);
      }

      items.push({
        formFieldMenuId: values[0],
        menuLabel: values[1],
        type,
        reference: values[3],
        description: values[4] || undefined,
        order,
        icon: values[6] || undefined
      });
    }

    return items;
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

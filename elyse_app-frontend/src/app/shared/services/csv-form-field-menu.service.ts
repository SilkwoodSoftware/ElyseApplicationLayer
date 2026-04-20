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

  constructor(private http: HttpClient) {
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
    const menus: CsvFormFieldMenu[] = [];
    const lines = csv.split('\n');
    
    // Get header row to validate column positions
    if (lines.length < 2) {
      console.error('Form field menus CSV file is empty or missing header row');
      return [];
    }
    
    const headerLine = lines[0].trim();
    const headers = this.parseCSVLine(headerLine);
    
    // Get column indices
    const formFieldIdIndex = headers.indexOf('FormFieldID');
    const menuLabelIndex = headers.indexOf('MenuLabel');
    const typeIndex = headers.indexOf('Type');
    const referenceIndex = headers.indexOf('Reference');
    const descriptionIndex = headers.indexOf('Description');
    const iconIndex = headers.indexOf('Icon');
    
    // Validate required columns exist
    if (formFieldIdIndex === -1 || menuLabelIndex === -1 || typeIndex === -1 || referenceIndex === -1) {
      console.error('Form field menus CSV is missing required columns');
      return [];
    }
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      
      // Skip lines with insufficient values
      if (values.length <= Math.max(formFieldIdIndex, menuLabelIndex, typeIndex, referenceIndex)) {
        console.warn(`Line ${i+1} in form-field-menus.csv has insufficient values`);
        continue;
      }
      
      const menu: CsvFormFieldMenu = {
        formFieldId: values[formFieldIdIndex],
        menuLabel: values[menuLabelIndex],
        type: values[typeIndex],
        reference: values[referenceIndex],
        description: descriptionIndex >= 0 && descriptionIndex < values.length ? values[descriptionIndex] : undefined,
        icon: iconIndex >= 0 && iconIndex < values.length ? values[iconIndex] : undefined
      };
      
      menus.push(menu);
    }
    
    return menus;
  }

  /**
   * Helper method to parse CSV line with proper handling of quoted values
   * @param line The CSV line to parse
   * @returns An array of values from the CSV line
   */
  private parseCSVLine(line: string): string[] {
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
    
    return values;
  }
}

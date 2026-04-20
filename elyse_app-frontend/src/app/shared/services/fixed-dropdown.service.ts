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
import { map, catchError, tap, shareReplay } from 'rxjs/operators';

/**
 * Interface for fixed dropdown option
 * Represents an option from fixed-dropdowns.csv
 */
export interface FixedDropdownOption {
  /** The dropdown list ID this option belongs to */
  dropdownListId: string;
  /** The value for the dropdown option */
  optionValue: string;
  /** The display order */
  order: number;
}

/**
 * Service for handling fixed dropdowns
 * 
 * This service loads and processes fixed dropdown options from fixed-dropdowns.csv
 * and provides methods to get options for a specific DropdownListID.
 */
@Injectable({
  providedIn: 'root'
})
export class FixedDropdownService {
  /** Map of dropdown options indexed by DropdownListID */
  private dropdownOptions = new Map<string, FixedDropdownOption[]>();
  
  /** Observable that completes when the dropdown options are loaded */
  private dropdownOptionsLoaded$: Observable<boolean>;

  constructor(private http: HttpClient) {
    this.dropdownOptionsLoaded$ = this.loadFixedDropdowns().pipe(
      shareReplay(1)
    );
  }

  /**
   * Load fixed dropdown options from CSV file
   * @returns An Observable that completes when the dropdown options are loaded
   */
  private loadFixedDropdowns(): Observable<boolean> {
    return this.http.get('assets/fixed-dropdowns.csv', { responseType: 'text' })
      .pipe(
        map(csv => this.parseFixedDropdownsCsv(csv)),
        tap(options => {
          // Group options by DropdownListID
          options.forEach(option => {
            if (!this.dropdownOptions.has(option.dropdownListId)) {
              this.dropdownOptions.set(option.dropdownListId, []);
            }
            this.dropdownOptions.get(option.dropdownListId)!.push(option);
          });

          // Sort options by order
          this.dropdownOptions.forEach(options => {
            options.sort((a, b) => a.order - b.order);
          });
        }),
        map(() => true),
        catchError(error => {
          console.error('Error loading fixed dropdowns:', error);
          return of(false);
        })
      );
  }

  /**
   * Parse CSV content into FixedDropdownOption objects
   * @param csv The CSV content to parse
   * @returns An array of FixedDropdownOption objects
   */
  private parseFixedDropdownsCsv(csv: string): FixedDropdownOption[] {
    const lines = csv.split('\n');
    const options: FixedDropdownOption[] = [];

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

      // Skip lines with insufficient values
      if (values.length < 3) continue;

      options.push({
        dropdownListId: values[0].trim(),
        optionValue: values[1].trim(),
        order: parseInt(values[2].trim()) || 0
      });
    }

    return options;
  }

  /**
   * Get dropdown options for a specific DropdownListID
   * @param dropdownListId The DropdownListID to get options for
   * @returns An Observable of FixedDropdownOption objects for the specified DropdownListID
   */
  getDropdownOptions(dropdownListId: string): Observable<FixedDropdownOption[]> {
    return this.dropdownOptionsLoaded$.pipe(
      map(() => this.dropdownOptions.get(dropdownListId) || [])
    );
  }

  /**
   * Get dropdown options in a standardized format for a specific DropdownListID
   * @param dropdownListId The DropdownListID to get options for
   * @returns An Observable of standardized dropdown options with Id and Name properties
   */
  getDropdownOptionsAsStandardFormat(dropdownListId: string): Observable<Array<{Id: string, Name: string}>> {
    return this.getDropdownOptions(dropdownListId).pipe(
      map(options => options.map(option => ({
        Id: option.optionValue,
        Name: option.optionValue
      })))
    );
  }

  /**
   * Check if a DropdownListID exists
   * @param dropdownListId The DropdownListID to check
   * @returns An Observable that emits true if the DropdownListID exists, false otherwise
   */
  hasDropdownList(dropdownListId: string): Observable<boolean> {
    return this.dropdownOptionsLoaded$.pipe(
      map(() => this.dropdownOptions.has(dropdownListId))
    );
  }

  /**
   * Get all available DropdownListIDs
   * @returns An Observable of all available DropdownListIDs
   */
  getAllDropdownListIds(): Observable<string[]> {
    return this.dropdownOptionsLoaded$.pipe(
      map(() => Array.from(this.dropdownOptions.keys()))
    );
  }
}

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
import { validateCsv } from '../utils/csv-validator';
import { FIXED_DROPDOWNS_SCHEMA } from '../utils/csv-schemas';
import { CsvDiagnosticService } from './csv-diagnostic.service';

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

  constructor(private http: HttpClient, private csvDiagnosticService: CsvDiagnosticService) {
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
    const result = validateCsv(csv, FIXED_DROPDOWNS_SCHEMA);

    this.csvDiagnosticService.reportErrors(
      FIXED_DROPDOWNS_SCHEMA.fileName, result.errors, result.validRows.length, result.rejectedRowCount
    );

    return result.validRows.map(row => ({
      dropdownListId: row['DropdownListID'].trim(),
      optionValue: row['OptionValue'].trim(),
      order: parseInt(row['Order'].trim()) || 0,
    }));
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

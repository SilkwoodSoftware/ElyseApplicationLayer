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
import { BehaviorSubject, Observable } from 'rxjs';
import { validateCsv } from '../utils/csv-validator';
import { DOC_FILE_FORM_FIELD_ROUTING_SCHEMA } from '../utils/csv-schemas';
import { CsvDiagnosticService } from './csv-diagnostic.service';

@Injectable({
  providedIn: 'root'
})
export class FormFieldRoutingService {
  private formFieldRouting: any[] = [];
  private isLoaded$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient, private csvDiagnosticService: CsvDiagnosticService) {
    this.loadFormFieldRouting();
  }

  private loadFormFieldRouting() {
    this.http.get('assets/doc-file-form-field-routing.csv', { responseType: 'text' })
      .subscribe(
        data => {
          this.formFieldRouting = this.parseCSV(data);
          console.log('Parsed form field routing:', this.formFieldRouting);
          this.isLoaded$.next(true);
        },
        error => {
          console.error('Error loading form field routing:', error);
          this.isLoaded$.next(true); // Still mark as loaded to prevent hanging
        }
      );
  }

  private parseCSV(csvContent: string): Record<string, string>[] {
    const result = validateCsv(csvContent, DOC_FILE_FORM_FIELD_ROUTING_SCHEMA);

    this.csvDiagnosticService.reportErrors(
      DOC_FILE_FORM_FIELD_ROUTING_SCHEMA.fileName, result.errors, result.validRows.length, result.rejectedRowCount
    );

    return result.validRows;
  }

  getRoutingInfo(fieldType: string) {
    return this.formFieldRouting.find(row => row['Field Type'] === fieldType);
  }

  /**
   * Returns all field types where Data Type is "MultiSelectList"
   */
  getMultiSelectFieldTypes(): string[] {
    return this.formFieldRouting
      .filter(row => row['Data Type'] === 'MultiSelectList')
      .map(row => row['Field Type']);
  }

  /**
   * Returns an observable that emits when the CSV data has been loaded
   */
  isLoaded(): Observable<boolean> {
    return this.isLoaded$.asObservable();
  }

  /**
   * Check if the service has finished loading the CSV data
   */
  get isDataLoaded(): boolean {
    return this.isLoaded$.value;
  }
}
    

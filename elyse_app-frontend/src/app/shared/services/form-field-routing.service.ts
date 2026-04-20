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

@Injectable({
  providedIn: 'root'
})
export class FormFieldRoutingService {
  private formFieldRouting: any[] = [];
  private isLoaded$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
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

  private parseCSV(csvContent: string): any[] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      console.error('CSV file is empty or contains only whitespace');
      return [];
    }
 
    const headers = lines[0].split(',').map(header => header.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(value => value.trim());
      if (values.length !== headers.length) {
        console.warn(`Skipping malformed line: ${line}`);
        return null;
      }
      return headers.reduce((obj: { [key: string]: string }, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {});
    }).filter(item => item !== null);
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
    

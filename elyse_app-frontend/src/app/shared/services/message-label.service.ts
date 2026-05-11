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
import { validateCsv } from '../utils/csv-validator';
import { OUTPUT_PARAMETER_LABELS_SCHEMA } from '../utils/csv-schemas';
import { CsvDiagnosticService } from './csv-diagnostic.service';

@Injectable({
  providedIn: 'root'
})
export class MessageLabelService {
  private labelMap: { [key: string]: string } = {};

  constructor(private http: HttpClient, private csvDiagnosticService: CsvDiagnosticService) {
    this.loadLabelsFromCsv();
  }

  getLabel(key: string): string {
    return this.labelMap[key] || key;
  }

  private loadLabelsFromCsv(): void {
    this.http.get('assets/output-parameter-labels.csv', { responseType: 'text' })
      .subscribe({
        next: (data: string) => {
          this.parseCsvData(data);
        },
        error: (error) => {
          console.error('Error loading output parameter labels:', error);
        }
      });
  }

  private parseCsvData(csvData: string): void {
    const result = validateCsv(csvData, OUTPUT_PARAMETER_LABELS_SCHEMA);

    this.csvDiagnosticService.reportErrors(
      OUTPUT_PARAMETER_LABELS_SCHEMA.fileName, result.errors, result.validRows.length, result.rejectedRowCount
    );

    result.validRows.forEach(row => {
      const key = row['OutputParameterName'].trim();
      const value = row['MessageLabel'].trim();
      if (key && value) {
        this.labelMap[key] = value;
      }
    });
  }
}

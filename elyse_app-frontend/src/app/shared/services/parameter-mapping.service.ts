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
import { TableSelectionExtensionService } from './table-selection-extension.service';
import { ReadRouteConfigService } from './read-route-config.service';
import { validateCsv } from '../utils/csv-validator';
import { INPUT_ID_PARAMETER_MAPPING_SCHEMA } from '../utils/csv-schemas';
import { CsvDiagnosticService } from './csv-diagnostic.service';

export interface ParameterMapping {
  parameterName: string;
  alias: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParameterMappingService {
  private parameterMappings: ParameterMapping[] = [];

  constructor(
    private http: HttpClient,
    private tableSelectionExtensionService: TableSelectionExtensionService,
    private readRouteConfigService: ReadRouteConfigService,
    private csvDiagnosticService: CsvDiagnosticService
  ) {
    this.loadParameterMappings();
  }

  /**
   * Load parameter mappings from CSV file
   */
  private loadParameterMappings(): void {
    this.http.get('assets/input-id-parameter-mapping.csv', { responseType: 'text' })
      .pipe(
        map(csv => this.parseParameterMappingsCsv(csv)),
        catchError(error => {
          console.error('Error loading parameter mappings:', error);
          return of([]);
        })
      )
      .subscribe(mappings => {
        this.parameterMappings = mappings;
      });
  }

  /**
   * Parse CSV content into ParameterMapping objects
   */
  private parseParameterMappingsCsv(csv: string): ParameterMapping[] {
    const result = validateCsv(csv, INPUT_ID_PARAMETER_MAPPING_SCHEMA);

    this.csvDiagnosticService.reportErrors(
      INPUT_ID_PARAMETER_MAPPING_SCHEMA.fileName, result.errors, result.validRows.length, result.rejectedRowCount
    );

    return result.validRows.map(row => ({
      parameterName: row['InputParameter'].trim(),
      alias: row['IDNameAlias'].trim(),
      description: row['Description']?.trim() || undefined,
    }));
  }

  // The mapParametersForRoute method has been removed
  // Parameter mapping is now handled directly in the ContextMenuService
  
  /**
   * Get the parameter mapping for a parameter name
   * @param parameterName The parameter name to look up
   * @returns The parameter mapping or undefined if not found
   */
  getParameterMapping(parameterName: string): ParameterMapping | undefined {
    return this.parameterMappings.find(m => m.parameterName === parameterName);
  }
}

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
    private readRouteConfigService: ReadRouteConfigService
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
    const lines = csv.split('\n');
    // Get header row to determine column indices
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Find column indices
    const paramNameIndex = headers.indexOf('InputParameter');
    const aliasIndex = headers.indexOf('IDNameAlias');
    const descIndex = headers.indexOf('Description');
    
    // Ensure required columns exist
    if (paramNameIndex === -1 || aliasIndex === -1) {
      console.error('Required columns not found in parameter mapping CSV');
      return [];
    }
    
    const mappings: ParameterMapping[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',');
      if (values.length >= Math.max(paramNameIndex, aliasIndex) + 1) {
        mappings.push({
          parameterName: values[paramNameIndex].trim(),
          alias: values[aliasIndex].trim(),
          description: descIndex !== -1 && values.length > descIndex ? values[descIndex].trim() : undefined
        });
      }
    }

    return mappings;
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

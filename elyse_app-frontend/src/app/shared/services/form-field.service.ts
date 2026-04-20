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
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface DropdownFieldMapping {
  inputParameter: string;
  idFieldName: string;
  nameFieldName: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormFieldService {
  private fieldMappings: DropdownFieldMapping[] = [];
  private mappingsLoaded = false;

  constructor(private http: HttpClient) {
    this.loadFieldMappings();
  }

  private loadFieldMappings(): void {
    this.http.get('assets/input-id-parameter-mapping.csv', { responseType: 'text' })
      .pipe(
        map(csv => this.parseFieldMappingsCsv(csv)),
        catchError(error => {
          console.error('Error loading dropdown field mappings:', error);
          return of([]);
        })
      )
      .subscribe(mappings => {
        this.fieldMappings = mappings;
        this.mappingsLoaded = true;
      });
  }

  private parseFieldMappingsCsv(csv: string): DropdownFieldMapping[] {
    const mappings: DropdownFieldMapping[] = [];
    const lines = csv.split('\n');
    
    if (lines.length < 2) return mappings;
    
    const headers = lines[0].split(',').map(h => h.trim());
    const inputParameterIndex = headers.indexOf('InputParameter');
    const idAliasIndex = headers.indexOf('IDNameAlias');
    const nameAliasIndex = headers.indexOf('NameFieldAlias');
    
    if (inputParameterIndex === -1 || idAliasIndex === -1 || nameAliasIndex === -1) {
      console.error('Required columns not found in input-id-parameter-mapping.csv');
      return mappings;
    }
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      if (values.length > Math.max(inputParameterIndex, idAliasIndex, nameAliasIndex)) {
        const inputParameter = values[inputParameterIndex].trim();
        const idFieldName = values[idAliasIndex].trim();
        const nameFieldName = values[nameAliasIndex].trim();
        
        if (inputParameter && idFieldName && nameFieldName) {
          mappings.push({ inputParameter, idFieldName, nameFieldName });
        }
      }
    }
    
    return mappings;
  }

  fetchDropdownOptions(route: string, params: { [key: string]: string }, attributeParameterId?: string): Observable<any[]> {
    const url = `${environment.dotNetBaseUrl}/${route}`;
    const httpParams = new HttpParams({ fromObject: params });

    return this.http.get(url, { params: httpParams }).pipe(
      map((response: any) => {
        if (response && Array.isArray(response.dropDownOptions)) {
          return response.dropDownOptions.map((item: any) => {
            let id = 0;
            let name = '\u00A0'; // Non-breaking space default
            
            // If attributeParameterId is provided, use it to find the EXACT mapping
            if (attributeParameterId) {
              const idFieldName = this.getIdFieldNameForParameter(attributeParameterId);
              const mapping = this.fieldMappings.find(m => m.idFieldName === idFieldName);
              
              if (mapping) {
                if (item[mapping.idFieldName] !== undefined && item[mapping.idFieldName] !== null) {
                  id = item[mapping.idFieldName];
                  name = item[mapping.nameFieldName] || '\u00A0';
                } else {
                  console.error(`Required field '${mapping.idFieldName}' not found in API response for parameter '${attributeParameterId}'. Available fields:`, Object.keys(item));
                  // Don't throw - return default values to avoid breaking the entire dropdown
                }
              } else {
                console.error(`No field mapping found for attribute parameter '${attributeParameterId}' (expected ID field: '${idFieldName}'). Available mappings:`, this.fieldMappings.map(m => m.idFieldName));
                // Fallback to first available field
                for (const fallbackMapping of this.fieldMappings) {
                  if (item[fallbackMapping.idFieldName] !== undefined && item[fallbackMapping.idFieldName] !== null) {
                    id = item[fallbackMapping.idFieldName];
                    name = item[fallbackMapping.nameFieldName] || '\u00A0';
                    console.warn(`Using fallback mapping: ${fallbackMapping.idFieldName} -> ${fallbackMapping.nameFieldName}`);
                    break;
                  }
                }
              }
            } else {
              // No attribute parameter specified - try to find ANY matching field
              let found = false;
              for (const mapping of this.fieldMappings) {
                if (item[mapping.idFieldName] !== undefined && item[mapping.idFieldName] !== null) {
                  id = item[mapping.idFieldName];
                  name = item[mapping.nameFieldName] || '\u00A0';
                  found = true;
                  break;
                }
              }
              if (!found) {
                console.error('No matching ID field found in API response. Available fields:', Object.keys(item));
              }
            }
            
            const mapped = {
              Name: name,
              Id: id,
              Mnemonic: item.Mnemonic || '',
              Description: item.Description || '',
              ListPosition: item['List Position'] || 0
            };
            return mapped;
          });
        } else {
          console.error('Unexpected response format:', response);
          return [];
        }
      }),
      catchError(error => {
        console.error('Error fetching dropdown options:', error);
        return of([]);
      })
    );
  }
  
  private getIdFieldNameForParameter(parameterName: string): string {
    // Find the mapping from the CSV file based on the InputParameter column
    const mapping = this.fieldMappings.find(m => m.inputParameter === parameterName);
    
    if (mapping) {
      return mapping.idFieldName;
    }
    
    // If no mapping found, log a warning and return the parameter name as fallback
    console.warn(`No mapping found for parameter '${parameterName}' in input-id-parameter-mapping.csv`);
    return parameterName;
  }
  
  updateDropdownOption(route: string, data: any): Observable<any> {
    const url = `${environment.dotNetBaseUrl}/${route}`;
    return this.http.post(url, data);
  }

  deleteFieldValue(route: string, data: any): Observable<any> {
    const url = `${environment.dotNetBaseUrl}/${route}`;
    return this.http.post(url, data);
  }

  updateDateAction(dateValueDto: any, route: string): Observable<any> {
    const url = `${environment.dotNetBaseUrl}/${route}`;
    return this.http.post(url, dateValueDto);
  }

  deleteDateValue(route: string, data: any): Observable<any> {
    const url = `${environment.dotNetBaseUrl}/${route}`;
    return this.http.post(url, data);
  }

}
    

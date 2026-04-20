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
import { BaseRouteConfigService } from './base-route-config.service';
import { ReadRouteConfig } from '../interfaces/read-route.interface';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ReadRouteConfigService extends BaseRouteConfigService<ReadRouteConfig> {
    protected csvPath = '/assets/read-routes.csv';
    private initialized$ = new BehaviorSubject<boolean>(false);

    constructor(http: HttpClient) {
        super(http);
        this.loadRouteConfigs().subscribe(() => {
            this.initialized$.next(true);
        });
    }

    override getRouteConfig(routeUrl: string): Observable<ReadRouteConfig | undefined> {
        return this.initialized$.pipe(
            filter(initialized => initialized),
            map(() => this.routes.get(routeUrl))
        );
    }

    protected parseCsvData(csvData: string): ReadRouteConfig[] {
        const lines = csvData.split('\n');
        const headers = this.parseCSVLine(lines[0]);
        
        return lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
                const values = this.parseCSVLine(line);
                const row = headers.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {} as any);

                return {
                    routeUrl: row.RouteUrl,
                    apiEndpoint: row.ApiEndpoint,
                    displayName: row.DisplayName,
                    role: row.Role,
                    dataField: row.DataField || '',
                    useTransform: row.UseTransform === 'true',
                    inputParameters: this.parseParameters(row.InputParameters),
                    outputParameters: this.parseParameters(row.OutputParameters),
                    displayParameters: row.DisplayParameters || '',
                    tableConfig: {
                        keyColumns: this.extractKeyColumns(row.KeyColumns),
                        keyColumnPairs: this.parseKeyColumnPairs(row.KeyColumns),
                        hiddenColumns: row.HiddenColumns ? row.HiddenColumns.split(';').map((h: string) => h.trim()) : [],
                        defaultSort: row.DefaultSort ? this.parseDefaultSort(row.DefaultSort) : undefined
                    }
                };
            });
    }

    protected validateConfig(config: ReadRouteConfig): boolean {
        return !!(
            config.routeUrl &&
            config.apiEndpoint &&
            config.tableConfig
        );
    }

    private parseDefaultSort(sortString: string): { column: string; direction: 'asc' | 'desc' } | undefined {
        if (!sortString) return undefined;
        
        const [column, direction] = sortString.split('::').map(s => s.trim());
        if (!column || !direction) return undefined;

        return {
            column,
            direction: direction.toLowerCase() as 'asc' | 'desc'
        };
    }
    
    /**
     * Extracts just the column names from KeyColumns field
     * For backward compatibility with existing code
     */
    private extractKeyColumns(keyColumnsString: string): string[] {
        if (!keyColumnsString) return [];
        
        // Split by semicolon to get multiple pairs
        return keyColumnsString.split(';')
            .map(pair => {
                // For each pair, take just the first part (before the colon)
                // Use regex to split by either single or double colon
                const parts = pair.split(/::?/);
                return parts[0]?.trim() || '';
            })
            .filter(column => column); // Filter out empty columns
    }
    
    /**
     * Parses the KeyColumns field into ID/Name pairs
     * Format: "ID Field:Name Field;Another ID:Another Name"
     */
    private parseKeyColumnPairs(keyColumnsString: string): Array<{idField: string, nameField: string}> {
        if (!keyColumnsString) return [];
        
        // Split by semicolon to get multiple pairs
        const pairs = keyColumnsString.split(';')
            .map(pair => {
                // Use regex to split by either single or double colon
                const [idField, nameField] = pair.split(/::?/);
                return {
                    idField: idField?.trim() || '',
                    nameField: nameField?.trim() || ''
                };
            })
            .filter(pair => pair.idField && pair.nameField); // Filter out incomplete pairs
        
        return pairs;
    }
    
    private parseCSVLine(line: string): string[] {
        const values: string[] = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        values.push(currentValue.trim());
        
        return values;
    }
}

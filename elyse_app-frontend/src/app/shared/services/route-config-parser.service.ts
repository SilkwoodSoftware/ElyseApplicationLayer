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
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export interface RouteConfig {
  TableName: string;
  StoredProcedure: string;
  DataField: string;
  RouteUrl: string;
  ApiEndpoint: string;
  KeyColumns: string;
  HiddenColumns: string;
  DisplayName: string;
  DefaultSort: string;
  Role: string;
  InputParameters: string;
  OutputParameters: string;
  Description: string;
  UseTransform: string;
  idNamePairs?: Array<{idField: string, nameField: string}>;
  keyColumnPairs?: Array<{idField: string, nameField: string}>;
}

@Injectable({
  providedIn: 'root'
})
export class RouteConfigParserService {
  private routeConfigsCache$: Observable<RouteConfig[]> | null = null;
  
  constructor(private http: HttpClient) {}
  
  loadRouteConfigurations(): Observable<RouteConfig[]> {
    // Return cached observable if it exists
    if (this.routeConfigsCache$) {
      return this.routeConfigsCache$;
    }
    
    // Load and cache the route configurations
    console.log('RouteConfigParserService: Loading read-routes.csv for the first time');
    this.routeConfigsCache$ = this.http.get('assets/read-routes.csv', { responseType: 'text' })
      .pipe(
        map(csv => this.parseRoutesCSV(csv)),
        shareReplay(1) // Cache the result and share it with all subscribers
      );
    
    return this.routeConfigsCache$;
  }
  
  // Get the table name for a given route URL
  getTableNameForRouteUrl(routeUrl: string): Observable<string | undefined> {
    return this.loadRouteConfigurations().pipe(
      map(configs => {
        // Find the config with the matching route URL (exact match only)
        const config = configs.find(c => c.RouteUrl === routeUrl);
        
        if (config) {
          console.log(`Found table name ${config.TableName} for route ${routeUrl}`);
        } else {
          console.log(`No table name found for route ${routeUrl}`);
        }
        
        return config?.TableName;
      })
    );
  }
  
  private parseRoutesCSV(csv: string): RouteConfig[] {
    // Basic CSV parsing logic
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1)
      .filter(line => line.trim() !== '') // Skip empty lines
      .map(line => {
        const values = line.split(',');
        const config: any = {};
        
        headers.forEach((header, index) => {
          config[header] = values[index] || '';
        });
        
        // Parse ID/Name pairs from DefaultSort column
        if (config.DefaultSort) {
          config.idNamePairs = this.parseIdNamePairs(config.DefaultSort);
        }
        
        // Parse ID/Name pairs from KeyColumns field
        if (config.KeyColumns) {
          // Only log for tables that actually have KeyColumns defined
          if (config.KeyColumns.trim()) {
            console.debug(`Parsing KeyColumns for ${config.TableName}: "${config.KeyColumns}"`);
          }
          config.keyColumnPairs = this.parseIdNamePairs(config.KeyColumns);
        } else {
          config.keyColumnPairs = [];
        }
        
        // Make sure TableName is set
        if (!config.TableName && values.length > 0) {
          config.TableName = values[0] || '';
        }
        
        return config as RouteConfig;
      });
  }
  
  private parseIdNamePairs(pairString: string): Array<{idField: string, nameField: string}> {
    // If pairString is empty or undefined, return empty array without logging
    if (!pairString) {
      return [];
    }
    
    // Split by semicolon to get multiple pairs
    const splitPairs = pairString.split(';');
    
    // Only log for debugging if needed
    if (splitPairs.length > 1 || (splitPairs.length === 1 && splitPairs[0].includes(':'))) {
      console.debug(`Processing ID/Name pairs: "${pairString}"`);
    }
    
    const pairs = splitPairs
      .map(pair => {
        // Use regex to split by either single or double colon
        const splitResult = pair.split(/::?/);
        
        const [idField, nameField] = splitResult;
        const trimmedIdField = idField?.trim();
        const trimmedNameField = nameField?.trim();
        
        return {
          idField: trimmedIdField,
          nameField: trimmedNameField
        };
      })
      .filter(pair => {
        // Only keep pairs where both idField and nameField are non-empty
        return pair.idField && pair.nameField;
      });
    
    return pairs;
  }
  
  /**
   * Gets the key column pairs for a specific route
   * @param routeUrl The route URL to get key column pairs for
   * @returns Observable of key column pairs
   */
  getKeyColumnPairsForRoute(routeUrl: string): Observable<Array<{idField: string, nameField: string}> | undefined> {
    return this.loadRouteConfigurations().pipe(
      map(configs => {
        // Find the config with the matching route URL (exact match only)
        const config = configs.find(c => c.RouteUrl === routeUrl);
        
        if (config) {
          console.log(`Found key column pairs for route ${routeUrl}`);
        } else {
          console.log(`No key column pairs found for route ${routeUrl}`);
        }
        
        return config?.keyColumnPairs;
      })
    );
  }

  /**
   * Gets the route URL for a specific table name
   * @param tableName The table name to get the route URL for
   * @returns Observable of the route URL
   */
  getRouteUrlForTableName(tableName: string): Observable<string | undefined> {
    return this.loadRouteConfigurations().pipe(
      map(configs => {
        // Find the config with the matching table name (exact match only)
        const config = configs.find(c => c.TableName === tableName);
        
        if (config) {
          console.log(`Found route URL ${config.RouteUrl} for table name ${tableName}`);
        } else {
          console.log(`No route URL found for table name ${tableName}`);
        }
        
        return config?.RouteUrl;
      })
    );
  }
}

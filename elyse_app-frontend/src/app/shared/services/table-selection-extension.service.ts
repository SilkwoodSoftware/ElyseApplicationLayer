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

import { Injectable, OnDestroy } from '@angular/core';
import { RouteConfigParserService, RouteConfig } from './route-config-parser.service';
import { KeyValuePairsService } from './key-value-pairs.service';
import { TableStateService } from './table-state.service';
import { Subscription, Observable } from 'rxjs';
import { ReadRouteConfigService } from './read-route-config.service';

@Injectable({
  providedIn: 'root'
})
export class TableSelectionExtensionService implements OnDestroy {
  private routeConfigs: RouteConfig[] = [];
  private subscription: Subscription;
  
  constructor(
    private routeConfigParser: RouteConfigParserService,
    private keyValuePairsService: KeyValuePairsService,
    private tableStateService: TableStateService,
    private readRouteConfigService: ReadRouteConfigService
  ) {
    this.subscription = this.initRouteConfigs();
  }
  
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  
  private initRouteConfigs(): Subscription {
    return this.routeConfigParser.loadRouteConfigurations().subscribe({
      next: (configs) => {
        this.routeConfigs = configs;
      },
      error: (error) => {
        console.error('Error loading route configurations:', error);
      }
    });
  }
  
  // Call this when rows are selected in a table
  processSelectedRows(tableName: string, rows: any[]): void {
    // Reload route configurations to ensure we have the latest data
    this.routeConfigParser.loadRouteConfigurations().subscribe({
      next: (configs) => {
        // Update the route configs with the latest data
        this.routeConfigs = configs;
        
        // Find the route config for this table using the updated configs
        const config = this.routeConfigs.find(c => c.TableName === tableName);
        
        // Only process if we found a valid config for this table
        if (config) {
          // Transform rows to preserve all ID/Name pairs
          const processedRows = rows.map(row => {
            const processedRow: Record<string, any> = {};
            
            // Process ID/Name pairs from DefaultSort
            if (config.idNamePairs?.length) {
              config.idNamePairs.forEach(pair => {
                const { idField, nameField } = pair;
                if (row[idField] !== undefined) processedRow[idField] = row[idField];
                if (row[nameField] !== undefined) processedRow[nameField] = row[nameField];
              });
            }
            
            // Process Key Column pairs from KeyColumns
            if (config.KeyColumns && config.keyColumnPairs?.length) {
              config.keyColumnPairs.forEach(pair => {
                const { idField, nameField } = pair;
                if (row[idField] !== undefined) processedRow[idField] = row[idField];
                
                // If nameField is the same as idField, add a suffix to make it unique
                if (nameField === idField) {
                  const uniqueNameField = `${nameField}_display`;
                  if (row[nameField] !== undefined) processedRow[uniqueNameField] = row[nameField];
                } else {
                  if (row[nameField] !== undefined) processedRow[nameField] = row[nameField];
                }
              });
            }
            
            return processedRow;
          });
          
          // Store the processed rows
          this.keyValuePairsService.storeRows(tableName, processedRows);
          
          // Log the processed rows in a row-based format
          console.log('Selected rows:');
          console.table(processedRows);
          
          // For backward compatibility, also store using the old method
          this.storeKeyValuePairsLegacy(tableName, rows, config);
        }
      },
      error: (error) => {
        console.error('Error loading route configurations:', error);
      }
    });
  }
  
  // Legacy method for backward compatibility
  private storeKeyValuePairsLegacy(tableName: string, rows: any[], config: RouteConfig): void {
    // Process ID/Name pairs from DefaultSort
    if (config.idNamePairs?.length) {
      this.storeKeyValuePairs(tableName, rows, config.idNamePairs);
    }
    
    // Process Key Column pairs from KeyColumns
    if (config.KeyColumns && config.keyColumnPairs?.length) {
      this.storeKeyValuePairs(tableName, rows, config.keyColumnPairs);
    }
  }
  
  // Helper method to store key-value pairs 
  private storeKeyValuePairs(tableName: string, rows: any[], pairs: Array<{idField: string, nameField: string}>): void {
    pairs.forEach(pair => {
      const { idField, nameField } = pair;
      
      // Create a map of ID -> Name for all selected rows
      const pairsMap = new Map<string, string>();
      
      // Add valid pairs to the map
      rows.forEach(row => {
        if (row[idField] !== undefined && row[nameField] !== undefined) {
          pairsMap.set(row[idField].toString(), row[nameField].toString());
        }
      });
      
      // Only store pairs if we have valid data
      if (pairsMap.size > 0) {
        // Store the pairs with a unique key (tableName + idField)
        const pairKey = `${tableName}_${idField}`;
        this.keyValuePairsService.storePairs(pairKey, pairsMap);
        
        // If idField and nameField are the same, also store with a unique key for the display field
        if (idField === nameField) {
          const displayPairKey = `${tableName}_${idField}_display`;
          this.keyValuePairsService.storePairs(displayPairKey, pairsMap);
        }
      }
    });
  }
  
  // Get all rows for a specific table
  getRows(tableName: string): any[] {
    return this.keyValuePairsService.getRows(tableName);
  }
  
  // Get all ID/Name pairs for a specific table and ID field
  getIdNamePairs(tableName: string, idField: string): Map<string, string> | undefined {
    // For backward compatibility, still use the old method
    const pairKey = `${tableName}_${idField}`;
    return this.keyValuePairsService.getPairs(pairKey);
  }
  
  // Get display name for a specific ID
  getDisplayName(tableName: string, idField: string, id: string): string | undefined {
    // Find the route config for this table
    const config = this.routeConfigs.find(c => c.TableName === tableName);
    if (!config) return undefined;
    
    // Find the name field corresponding to the ID field
    const pair = [...(config.idNamePairs || []), ...(config.keyColumnPairs || [])]
      .find(p => p.idField === idField);
    if (!pair) return undefined;
    
    const nameField = pair.nameField;
    
    // Try to get from the new row-based structure first
    const rows = this.keyValuePairsService.getRows(tableName);
    const row = rows.find(r => r[idField]?.toString() === id);
    if (row) {
      // If idField and nameField are the same, look for the display field
      if (idField === nameField) {
        const displayField = `${nameField}_display`;
        if (row[displayField] !== undefined) {
          return row[displayField];
        }
      }
      return row[nameField];
    }
    
    // Fall back to the old method
    if (idField === nameField) {
      const displayPairKey = `${tableName}_${idField}_display`;
      const displayName = this.keyValuePairsService.getDisplayName(displayPairKey, id);
      if (displayName) return displayName;
    }
    
    const pairKey = `${tableName}_${idField}`;
    return this.keyValuePairsService.getDisplayName(pairKey, id);
  }
  
  // Get all IDs for a specific table and ID field
  getIds(tableName: string, idField: string): string[] {
    // Try to get from the new row-based structure first
    const rows = this.keyValuePairsService.getRows(tableName);
    const ids = rows
      .map(row => row[idField])
      .filter(id => id !== undefined)
      .map(id => id.toString());
    
    if (ids.length > 0) {
      return ids;
    }
    
    // Fall back to the old method
    const pairKey = `${tableName}_${idField}`;
    return this.keyValuePairsService.getIds(pairKey);
  }
  
  // Get all display names for a specific table and ID field
  getDisplayNames(tableName: string, idField: string): string[] {
    // Find the route config for this table
    const config = this.routeConfigs.find(c => c.TableName === tableName);
    if (!config) return [];
    
    // Find the name field corresponding to the ID field
    const pair = [...(config.idNamePairs || []), ...(config.keyColumnPairs || [])]
      .find(p => p.idField === idField);
    if (!pair) return [];
    
    const nameField = pair.nameField;
    
    // Try to get from the new row-based structure first
    const rows = this.keyValuePairsService.getRows(tableName);
    
    // If idField and nameField are the same, look for the display field
    if (idField === nameField) {
      const displayField = `${nameField}_display`;
      const displayNames = rows
        .map(row => row[displayField])
        .filter(name => name !== undefined)
        .map(name => name.toString());
      
      if (displayNames.length > 0) {
        return displayNames;
      }
    }
    
    const names = rows
      .map(row => row[nameField])
      .filter(name => name !== undefined)
      .map(name => name.toString());
    
    if (names.length > 0) {
      return names;
    }
    
    // Fall back to the old method
    if (idField === nameField) {
      const displayPairKey = `${tableName}_${idField}_display`;
      const displayNames = this.keyValuePairsService.getDisplayNames(displayPairKey);
      if (displayNames.length > 0) return displayNames;
    }
    
    const pairKey = `${tableName}_${idField}`;
    return this.keyValuePairsService.getDisplayNames(pairKey);
  }
  
  // Get the table name for a given route URL
  getTableNameForRouteUrl(routeUrl: string): Observable<string | undefined> {
    return this.routeConfigParser.getTableNameForRouteUrl(routeUrl);
  }
  
  // Get the key column pairs for a given route URL
  getKeyColumnPairsForRoute(routeUrl: string): Observable<Array<{idField: string, nameField: string}> | undefined> {
    return this.routeConfigParser.getKeyColumnPairsForRoute(routeUrl);
  }
}

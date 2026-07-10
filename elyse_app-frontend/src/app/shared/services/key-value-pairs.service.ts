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
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KeyValuePairsService {
  // Change from Map<string, Map<string, string>> to Map<string, any[]>
  private rowsMapSource = new BehaviorSubject<Map<string, any[]>>(new Map());
  rowsMap$ = this.rowsMapSource.asObservable();
  
  // For backward compatibility
  private pairsMapSource = new BehaviorSubject<Map<string, Map<string, string>>>(new Map());
  pairsMap$ = this.pairsMapSource.asObservable();
  
  // Store rows for a specific table
  // tableKey: Unique identifier for the table (e.g., route name or table name)
  // rows: Array of objects where each object represents a row with ID/Name pairs
  storeRows(tableKey: string, rows: any[]): void {
    const currentMap = this.rowsMapSource.value;
    currentMap.set(tableKey, rows);
    this.rowsMapSource.next(currentMap);
    
    // Also update the old format for backward compatibility
    this.updatePairsMapFromRows(tableKey, rows);
  }
  
  // Get all rows for a specific table
  getRows(tableKey: string): any[] {
    return this.rowsMapSource.value.get(tableKey) || [];
  }
  
  // For backward compatibility - update pairsMap from rows
  private updatePairsMapFromRows(tableKey: string, rows: any[]): void {
    // Since we're now using unmodified KeyColumn names, we need to identify ID/Name pairs
    // This requires knowledge of the route configuration, which we don't have here
    // For backward compatibility, we'll use a simplified approach
    
    // Create a map of all possible pairs
    const pairs = new Map<string, string>();
    
    // For each row, try to identify ID/Name pairs based on common patterns
    rows.forEach(row => {
      // Process all keys in the row
      Object.keys(row).forEach(idField => {
        // Look for potential name fields that might be paired with this ID field
        Object.keys(row).forEach(nameField => {
          // Skip if they're the same field
          if (idField === nameField) return;
          
          // Check if the fields might be an ID/Name pair
          // Common patterns: "ID"/"Name", "Id"/"Name", "ID"/"Text", etc.
          const idLower = idField.toLowerCase();
          const nameLower = nameField.toLowerCase();
          
          if ((idLower.includes('id') && (nameLower.includes('name') || nameLower.includes('text'))) ||
              (idLower.endsWith('id') && nameLower.endsWith('name'))) {
            
            // Store as a potential ID/Name pair
            if (row[idField] !== undefined && row[nameField] !== undefined) {
              pairs.set(row[idField].toString(), row[nameField].toString());
            }
            
            // Store in the old format
            const pairKey = `${tableKey}_${idField}`;
            const currentMap = this.pairsMapSource.value;
            currentMap.set(pairKey, pairs);
            this.pairsMapSource.next(currentMap);
          }
        });
      });
    });
  }
  
  // For backward compatibility
  storePairs(tableKey: string, pairs: Map<string, string>): void {
    const currentMap = this.pairsMapSource.value;
    currentMap.set(tableKey, pairs);
    this.pairsMapSource.next(currentMap);
  }
  
  // For backward compatibility
  getPairs(tableKey: string): Map<string, string> | undefined {
    return this.pairsMapSource.value.get(tableKey);
  }
  
  // Get display name for a specific ID in a table
  getDisplayName(tableKey: string, id: string): string | undefined {
    // Try to get from the new format first
    const tableParts = tableKey.split('_');
    if (tableParts.length >= 2) {
      const tableName = tableParts[0];
      const idField = tableParts[1];
      const rows = this.getRows(tableName);
      
      // Find the row with the matching ID
      const row = rows.find(r => r[idField]?.toString() === id);
      if (row) {
        // Look for a potential name field
        for (const key of Object.keys(row)) {
          const keyLower = key.toLowerCase();
          const idFieldLower = idField.toLowerCase();
          
          // Check if this might be the corresponding name field
          if (key !== idField &&
              ((idFieldLower.includes('id') && (keyLower.includes('name') || keyLower.includes('text'))) ||
               (idFieldLower.endsWith('id') && keyLower.endsWith('name')))) {
            return row[key];
          }
        }
      }
    }
    
    // Fall back to the old format
    const tablePairs = this.pairsMapSource.value.get(tableKey);
    return tablePairs?.get(id);
  }
  
  // Get all IDs for a specific table and field
  getIds(tableKey: string): string[] {
    // Try to get from the new format first
    const tableParts = tableKey.split('_');
    if (tableParts.length >= 2) {
      const tableName = tableParts[0];
      const idField = tableParts[1];
      const rows = this.getRows(tableName);
      return rows
        .map(row => row[idField])
        .filter(id => id !== undefined)
        .map(id => id.toString());
    }
    
    // Fall back to the old format
    const tablePairs = this.pairsMapSource.value.get(tableKey);
    return tablePairs ? Array.from(tablePairs.keys()) : [];
  }
  
  // Get all display names for a specific table and field
  getDisplayNames(tableKey: string): string[] {
    // Try to get from the new format first
    const tableParts = tableKey.split('_');
    if (tableParts.length >= 2) {
      const tableName = tableParts[0];
      const idField = tableParts[1];
      const rows = this.getRows(tableName);
      
      // Find the corresponding name field for each row
      const names: string[] = [];
      
      rows.forEach(row => {
        // Look for a potential name field
        for (const key of Object.keys(row)) {
          const keyLower = key.toLowerCase();
          const idFieldLower = idField.toLowerCase();
          
          // Check if this might be the corresponding name field
          if (key !== idField &&
              ((idFieldLower.includes('id') && (keyLower.includes('name') || keyLower.includes('text'))) ||
               (idFieldLower.endsWith('id') && keyLower.endsWith('name')))) {
            if (row[key] !== undefined) {
              names.push(row[key].toString());
              break; // Found a name field, no need to check others
            }
          }
        }
      });
      
      return names;
    }
    
    // Fall back to the old format
    const tablePairs = this.pairsMapSource.value.get(tableKey);
    return tablePairs ? Array.from(tablePairs.values()) : [];
  }
}

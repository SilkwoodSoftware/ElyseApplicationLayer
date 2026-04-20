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
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import Fuse from 'fuse.js';
import { ConfigService } from '../../config.service';
import { CsvFormService } from './csv-form.service';

export interface CommandPaletteCommand {
  CommandId: string;
  Label: string;
  Roles: string;
  ActionType: string;
  Reference: string;
  Shortcut: string;
  Description: string;
  Icon: string;
  Actions: string;
  Objects: string;
  Fields: string;
  Weight: number;
}

export interface FieldName {
  FieldID: string;
  FieldName: string;
  FieldType: string;
}

export interface ScoredCommand {
  command: CommandPaletteCommand;
  score: number;
  matchedActions: string[];
  matchedObjects: string[];
  matchedFields: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CommandPaletteService {
  private commandsSubject = new BehaviorSubject<CommandPaletteCommand[]>([]);
  public commands$ = this.commandsSubject.asObservable();

  private fieldNamesSubject = new BehaviorSubject<FieldName[]>([]);
  public fieldNames$ = this.fieldNamesSubject.asObservable();

  private actionsSubject = new BehaviorSubject<string[]>([]);
  public actions$ = this.actionsSubject.asObservable();

  private objectsSubject = new BehaviorSubject<string[]>([]);
  public objects$ = this.objectsSubject.asObservable();

  private recentCommandsSubject = new BehaviorSubject<CommandPaletteCommand[]>([]);
  public recentCommands$ = this.recentCommandsSubject.asObservable();

  private favoritesSubject = new BehaviorSubject<string[]>([]);
  public favorites$ = this.favoritesSubject.asObservable();

  private userRoles: string[] = [];

  private actionsFuse: Fuse<string> | null = null;
  private objectsFuse: Fuse<string> | null = null;
  private fieldNamesFuse: Fuse<FieldName> | null = null;

  private readonly FAVORITES_KEY = 'commandPaletteFavorites';
  private readonly FIELD_NAMES_CACHE_KEY = 'commandPaletteFieldNames';
  private readonly COMMANDS_CACHE_KEY = 'commandPaletteCommands';
  private readonly ACTIONS_CACHE_KEY = 'commandPaletteActions';
  private readonly OBJECTS_CACHE_KEY = 'commandPaletteObjects';
  private readonly ROLES_HASH_KEY = 'commandPaletteRolesHash';
  private readonly CACHE_TIMESTAMP_KEY = 'commandPaletteCacheTimestamp';
  private readonly MAX_RECENT = 20;
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  // Cache flag to prevent re-loading field names
  private isInitialized = false;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private csvFormService: CsvFormService
  ) {
    this.loadFavorites();
    this.loadCachedData();
  }
  
  /**
   * Generate a hash from role names for cache validation
   */
  private hashRoles(roles: string[]): string {
    if (!roles || roles.length === 0) return 'no-roles';
    // Sort roles to ensure consistent hash regardless of order
    const sortedRoles = [...roles].sort().join('|');
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < sortedRoles.length; i++) {
      const char = sortedRoles.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  
  /**
   * Check if cached data is valid for current roles and not expired
   */
  private isCacheValid(): boolean {
    try {
      const cachedRolesHash = localStorage.getItem(this.ROLES_HASH_KEY);
      const cachedTimestamp = localStorage.getItem(this.CACHE_TIMESTAMP_KEY);
      
      if (!cachedRolesHash || !cachedTimestamp) {
        console.log('Command palette cache: No cached roles hash or timestamp found');
        return false;
      }
      
      const currentRolesHash = this.hashRoles(this.userRoles);
      
      // Check if roles have changed
      if (cachedRolesHash !== currentRolesHash) {
        console.log('Command palette cache: Roles have changed, invalidating cache');
        console.log('  Cached roles hash:', cachedRolesHash);
        console.log('  Current roles hash:', currentRolesHash);
        return false;
      }
      
      // Check if cache has expired
      const timestamp = parseInt(cachedTimestamp, 10);
      if (isNaN(timestamp) || Date.now() - timestamp > this.CACHE_EXPIRY_MS) {
        console.log('Command palette cache: Cache has expired');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to validate cache:', error);
      return false;
    }
  }
  
  /**
   * Clear all command palette cache from localStorage
   */
  public clearCache(): void {
    try {
      localStorage.removeItem(this.FIELD_NAMES_CACHE_KEY);
      localStorage.removeItem(this.COMMANDS_CACHE_KEY);
      localStorage.removeItem(this.ACTIONS_CACHE_KEY);
      localStorage.removeItem(this.OBJECTS_CACHE_KEY);
      localStorage.removeItem(this.ROLES_HASH_KEY);
      localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
      this.isInitialized = false;
      console.log('Command palette cache cleared');
    } catch (error) {
      console.error('Failed to clear command palette cache:', error);
    }
  }
  
  /**
   * Load cached data from localStorage with validation
   */
  private loadCachedData(): void {
    try {
      // First check if cache is valid for current roles
      if (!this.isCacheValid()) {
        console.log('Command palette cache invalid, will reload from server');
        this.clearCache();
        return;
      }
      
      const cachedFieldNames = localStorage.getItem(this.FIELD_NAMES_CACHE_KEY);
      const cachedCommands = localStorage.getItem(this.COMMANDS_CACHE_KEY);
      const cachedActions = localStorage.getItem(this.ACTIONS_CACHE_KEY);
      const cachedObjects = localStorage.getItem(this.OBJECTS_CACHE_KEY);
      
      if (cachedFieldNames && cachedCommands && cachedActions && cachedObjects) {
        const fieldNames: FieldName[] = JSON.parse(cachedFieldNames);
        const commands: CommandPaletteCommand[] = JSON.parse(cachedCommands);
        const actions: string[] = JSON.parse(cachedActions);
        const objects: string[] = JSON.parse(cachedObjects);
        
        this.fieldNamesSubject.next(fieldNames);
        this.commandsSubject.next(commands);
        this.actionsSubject.next(actions);
        this.objectsSubject.next(objects);
        
        // Initialize Fuse instances
        this.initializeFuseInstances(actions, objects, fieldNames);
        
        this.isInitialized = true;
        console.log('Command palette loaded from cache:', {
          commands: commands.length,
          fieldNames: fieldNames.length,
          actions: actions.length,
          objects: objects.length,
          roles: this.userRoles
        });
      }
    } catch (error) {
      console.error('Failed to load cached command palette data:', error);
      // Clear corrupted cache
      this.clearCache();
    }
  }
  
  /**
   * Save data to localStorage cache with role hash and timestamp
   */
  private saveCachedData(commands: CommandPaletteCommand[], fieldNames: FieldName[], actions: string[], objects: string[]): void {
    try {
      // Save the data
      localStorage.setItem(this.FIELD_NAMES_CACHE_KEY, JSON.stringify(fieldNames));
      localStorage.setItem(this.COMMANDS_CACHE_KEY, JSON.stringify(commands));
      localStorage.setItem(this.ACTIONS_CACHE_KEY, JSON.stringify(actions));
      localStorage.setItem(this.OBJECTS_CACHE_KEY, JSON.stringify(objects));
      
      // Save role hash and timestamp for validation
      const rolesHash = this.hashRoles(this.userRoles);
      localStorage.setItem(this.ROLES_HASH_KEY, rolesHash);
      localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log('Command palette data saved to cache with roles hash:', rolesHash);
    } catch (error) {
      console.error('Failed to save command palette data to cache:', error);
      // If localStorage is full or unavailable, clear old cache and try again
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('localStorage quota exceeded, clearing cache and retrying');
        this.clearCache();
        try {
          localStorage.setItem(this.FIELD_NAMES_CACHE_KEY, JSON.stringify(fieldNames));
          localStorage.setItem(this.COMMANDS_CACHE_KEY, JSON.stringify(commands));
          localStorage.setItem(this.ACTIONS_CACHE_KEY, JSON.stringify(actions));
          localStorage.setItem(this.OBJECTS_CACHE_KEY, JSON.stringify(objects));
          localStorage.setItem(this.ROLES_HASH_KEY, this.hashRoles(this.userRoles));
          localStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (retryError) {
          console.error('Failed to save cache even after clearing:', retryError);
        }
      }
    }
  }

  /**
   * Initialize the command palette by loading all necessary data
   * Validates cache against current roles before using cached data
   */
  public initialize(userRoles: string[]): Observable<boolean> {
    this.userRoles = userRoles;
    
    // Check if cache is valid for current roles
    if (this.isInitialized && this.isCacheValid()) {
      console.log('Command palette already initialized with valid cache for current roles');
      return of(true);
    }
    
    // If roles changed or cache invalid, clear and reload
    if (this.isInitialized && !this.isCacheValid()) {
      console.log('Command palette cache invalid for current roles, reloading...');
      this.clearCache();
      this.isInitialized = false;
    }
    
    console.log('Command palette initializing - loading from server with roles:', userRoles);
    
    return forkJoin({
      commands: this.loadCommands(),
      fieldNames: this.loadFieldNames()
    }).pipe(
      map(({ commands, fieldNames }) => {
        this.commandsSubject.next(commands);
        this.fieldNamesSubject.next(fieldNames);
        
        // Extract unique actions and objects
        const actionsSet = new Set<string>();
        const objectsSet = new Set<string>();
        
        commands.forEach(cmd => {
          if (cmd.Actions) {
            cmd.Actions.split(';').forEach(action => {
              const trimmed = action.trim();
              if (trimmed) actionsSet.add(trimmed);
            });
          }
          if (cmd.Objects) {
            cmd.Objects.split(';').forEach(obj => {
              const trimmed = obj.trim();
              if (trimmed) objectsSet.add(trimmed);
            });
          }
        });
        
        const actions = Array.from(actionsSet).sort();
        const objects = Array.from(objectsSet).sort();
        
        this.actionsSubject.next(actions);
        this.objectsSubject.next(objects);
        
        // Initialize Fuse instances for fuzzy matching
        this.initializeFuseInstances(actions, objects, fieldNames);
        
        // Save to cache
        this.saveCachedData(commands, fieldNames, actions, objects);
        
        // Mark as initialized
        this.isInitialized = true;
        console.log('Command palette initialization complete - data cached');
        
        return true;
      }),
      catchError(error => {
        console.error('Failed to initialize command palette:', error);
        return of(false);
      })
    );
  }

  /**
   * Load commands from command-palette.csv
   */
  private loadCommands(): Observable<CommandPaletteCommand[]> {
    return this.http.get('assets/command-palette.csv', { responseType: 'text' }).pipe(
      map(csv => this.parseCommandsCsv(csv)),
      catchError(error => {
        console.error('Failed to load commands:', error);
        return of([]);
      })
    );
  }

  /**
   * Load field names from metadata-field-loading.csv and retrieve actual field names from database
   */
  private loadFieldNames(): Observable<FieldName[]> {
    return forkJoin({
      metadataFields: this.http.get('assets/metadata-field-loading.csv', { responseType: 'text' }),
      commands: this.http.get('assets/command-palette.csv', { responseType: 'text' })
    }).pipe(
      switchMap(({ metadataFields, commands }) => {
        const fieldLoadRequests: Observable<FieldName[]>[] = [];
        const fixedFieldsSet = new Set<string>();
        const fieldTypesSet = new Set<string>();
        
        // Parse metadata-field-loading.csv to get field types and their read routes
        const metadataLines = metadataFields.split('\n').slice(1); // Skip header
        metadataLines.forEach(line => {
          if (!line.trim()) return;
          const parts = this.parseCsvLine(line);
          if (parts.length >= 3) {
            const fieldType = parts[0].trim();
            const readRoute = parts[1].trim();
            const fieldKeys = parts[2].trim();
            
            if (fieldType && readRoute && fieldKeys) {
              // Store the FieldType so we can exclude it from fixed fields
              fieldTypesSet.add(fieldType);
              
              // Parse FieldKeys to extract ID and Name aliases
              const keyParts = fieldKeys.split('::');
              if (keyParts.length >= 2) {
                const idAlias = keyParts[0].trim();
                const nameAlias = keyParts[1].trim();
                
                // Create an observable that fetches dropdown options and maps to FieldName format
                const request = this.csvFormService.fetchDropdownOptions(readRoute, {}, idAlias, nameAlias).pipe(
                  map(options => {
                    return options.map(option => ({
                      FieldID: option.Id?.toString() || '',
                      FieldName: option.Name || '',
                      FieldType: fieldType
                    }));
                  }),
                  catchError(error => {
                    console.error(`Failed to load field names for ${fieldType} from ${readRoute}:`, error);
                    return of([]);
                  })
                );
                
                fieldLoadRequests.push(request);
              }
            }
          }
        });
        
        // Parse command-palette.csv to find additional fixed field names
        // Only add strings that are NOT FieldType values
        const commandLines = commands.split('\n').slice(1);
        
        commandLines.forEach(line => {
          if (!line.trim()) return;
          const parts = this.parseCsvLine(line);
          if (parts.length >= 11) {
            const fieldsColumn = parts[10].trim();
            if (fieldsColumn) {
              fieldsColumn.split(';').forEach(field => {
                const trimmed = field.trim();
                // Only add if it's not a FieldType
                if (trimmed && !fieldTypesSet.has(trimmed)) {
                  fixedFieldsSet.add(trimmed);
                }
              });
            }
          }
        });
        
        // If there are no field load requests, return fixed fields only
        if (fieldLoadRequests.length === 0) {
          const fixedFields: FieldName[] = Array.from(fixedFieldsSet).map(fieldName => ({
            FieldID: '',
            FieldName: fieldName,
            FieldType: fieldName
          }));
          return of(fixedFields);
        }
        
        // Execute all field load requests in parallel
        return forkJoin(fieldLoadRequests).pipe(
          map(results => {
            // Flatten all results
            const allFieldNames: FieldName[] = results.flat();
            
            // Add fixed fields (which are already filtered to exclude FieldTypes)
            fixedFieldsSet.forEach(fieldName => {
              allFieldNames.push({
                FieldID: '',
                FieldName: fieldName,
                FieldType: fieldName
              });
            });
            
            console.log(`Loaded ${allFieldNames.length} field names for command palette (${results.length} database queries, ${fixedFieldsSet.size} fixed fields)`);
            
            return allFieldNames;
          })
        );
      }),
      catchError(error => {
        console.error('Failed to load field names:', error);
        return of([]);
      })
    );
  }

  /**
   * Initialize Fuse.js instances for fuzzy matching
   */
  private initializeFuseInstances(actions: string[], objects: string[], fieldNames: FieldName[]): void {
    this.actionsFuse = new Fuse(actions, {
      threshold: 0.4,
      distance: 100,
      includeScore: true
    });
    
    this.objectsFuse = new Fuse(objects, {
      threshold: 0.4,
      distance: 100,
      includeScore: true
    });
    
    this.fieldNamesFuse = new Fuse(fieldNames, {
      keys: ['FieldName'],  
      threshold: 0.4,
      distance: 100,
      includeScore: true
    });
  }

  /**
   * Search for matching actions using fuzzy matching
   */
  public searchActions(query: string): string[] {
    if (!query || !this.actionsFuse) return [];
    
    const results = this.actionsFuse.search(query);
    return results.map(result => result.item);
  }

  /**
   * Search for matching objects using fuzzy matching
   */
  public searchObjects(query: string): string[] {
    if (!query || !this.objectsFuse) return [];
    
    const results = this.objectsFuse.search(query);
    return results.map(result => result.item);
  }

  /**
   * Search for matching field names using fuzzy matching
   */
  public searchFieldNames(query: string): FieldName[] {
    if (!query || !this.fieldNamesFuse) return [];
    
    const results = this.fieldNamesFuse.search(query);
    return results.map(result => result.item);
  }

  /**
   * Find commands matching the selected actions, objects, and fields
   */
  public findMatchingCommands(
    selectedActions: string[],
    selectedObjects: string[],
    selectedFields: FieldName[]
  ): ScoredCommand[] {
    const commands = this.commandsSubject.value;
    const scoredCommands: ScoredCommand[] = [];
    
    commands.forEach(command => {
      // Check role-based filtering
      if (!this.hasRequiredRole(command.Roles)) {
        return;
      }
      
      let score = 0;
      const matchedActions: string[] = [];
      const matchedObjects: string[] = [];
      const matchedFields: string[] = [];
      
      // Score actions
      if (command.Actions) {
        const commandActions = command.Actions.split(';').map(a => a.trim());
        selectedActions.forEach(selectedAction => {
          if (commandActions.some(ca => ca.toLowerCase() === selectedAction.toLowerCase())) {
            score++;
            matchedActions.push(selectedAction);
          }
        });
      }
      
      // Score objects
      if (command.Objects) {
        const commandObjects = command.Objects.split(';').map(o => o.trim());
        selectedObjects.forEach(selectedObject => {
          if (commandObjects.some(co => co.toLowerCase() === selectedObject.toLowerCase())) {
            score++;
            matchedObjects.push(selectedObject);
          }
        });
      }
      
      // Score fields
      if (command.Fields) {
        const commandFields = command.Fields.split(';').map(f => f.trim());
        selectedFields.forEach(selectedField => {
          if (commandFields.some(cf => cf.toLowerCase() === selectedField.FieldType.toLowerCase())) {
            score++;
            matchedFields.push(selectedField.FieldName);
          }
        });
      }
      
      // Only include commands with at least one match
      if (score > 0) {
        scoredCommands.push({
          command,
          score,
          matchedActions,
          matchedObjects,
          matchedFields
        });
      }
    });
    
    // Sort by score descending, then by weight descending (highest weight first)
    scoredCommands.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Within same score, sort by weight (highest first)
      return b.command.Weight - a.command.Weight;
    });
    
    // Get top score
    const topScore = this.getTopScore(scoredCommands);
    
    // Filter to only include commands with top score
    return scoredCommands.filter(sc => sc.score === topScore);
  }

  /**
   * Get the top score value
   */
  private getTopScore(scoredCommands: ScoredCommand[]): number {
    if (scoredCommands.length === 0) return 0;
    const uniqueScores = Array.from(new Set(scoredCommands.map(sc => sc.score))).sort((a, b) => b - a);
    return uniqueScores[0];
  }

  /**
   * Check if user has required role for command
   */
  private hasRequiredRole(commandRoles: string): boolean {
    if (!commandRoles || commandRoles.trim() === '') {
      return true; // No role requirement
    }
    
    const requiredRoles = commandRoles.split(';').map(r => r.trim());
    return requiredRoles.some(role => this.userRoles.includes(role));
  }

  /**
   * Get all commands filtered by user roles
   */
  public getAllCommands(): CommandPaletteCommand[] {
    return this.commandsSubject.value.filter(cmd => this.hasRequiredRole(cmd.Roles));
  }

  /**
   * Add command to recent list
   */
  public addToRecent(command: CommandPaletteCommand): void {
    const recent = this.recentCommandsSubject.value;
    const filtered = recent.filter(c => c.CommandId !== command.CommandId);
    filtered.unshift(command);
    
    if (filtered.length > this.MAX_RECENT) {
      filtered.splice(this.MAX_RECENT);
    }
    
    this.recentCommandsSubject.next(filtered);
  }

  /**
   * Add command to favorites
   */
  public addToFavorites(commandId: string): void {
    const favorites = this.favoritesSubject.value;
    if (!favorites.includes(commandId)) {
      favorites.push(commandId);
      this.favoritesSubject.next(favorites);
      this.saveFavorites();
    }
  }

  /**
   * Remove command from favorites
   */
  public removeFromFavorites(commandId: string): void {
    const favorites = this.favoritesSubject.value.filter(id => id !== commandId);
    this.favoritesSubject.next(favorites);
    this.saveFavorites();
  }

  /**
   * Check if command is in favorites
   */
  public isFavorite(commandId: string): boolean {
    return this.favoritesSubject.value.includes(commandId);
  }

  /**
   * Get favorite commands
   */
  public getFavoriteCommands(): CommandPaletteCommand[] {
    const favorites = this.favoritesSubject.value;
    const commands = this.commandsSubject.value;
    return commands.filter(cmd => favorites.includes(cmd.CommandId) && this.hasRequiredRole(cmd.Roles));
  }

  /**
   * Save favorites to localStorage with error handling
   */
  private saveFavorites(): void {
    try {
      localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(this.favoritesSubject.value));
    } catch (error) {
      console.error('Failed to save favorites to localStorage:', error);
      // If localStorage is unavailable (e.g., Safari private browsing), favorites will only persist in memory
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, favorites will not persist across sessions');
      }
    }
  }

  /**
   * Load favorites from localStorage with error handling
   */
  private loadFavorites(): void {
    try {
      const stored = localStorage.getItem(this.FAVORITES_KEY);
      if (stored) {
        const favorites = JSON.parse(stored);
        this.favoritesSubject.next(favorites);
      }
    } catch (error) {
      console.error('Failed to load favorites from localStorage:', error);
      // Clear corrupted favorites data
      try {
        localStorage.removeItem(this.FAVORITES_KEY);
      } catch (clearError) {
        console.error('Failed to clear corrupted favorites:', clearError);
      }
    }
  }

  /**
   * Parse CSV line handling quoted fields
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Parse commands CSV
   */
  private parseCommandsCsv(csv: string): CommandPaletteCommand[] {
    const lines = csv.split('\n');
    const commands: CommandPaletteCommand[] = [];
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = this.parseCsvLine(line);
      if (parts.length >= 11) {
        // Parse weight from column 12 (index 11), default to 0 if not present or invalid
        const weightStr = parts.length >= 12 ? parts[11].trim() : '';
        const weight = weightStr ? parseFloat(weightStr) : 0;
        
        commands.push({
          CommandId: parts[0].trim(),
          Label: parts[1].trim(),
          Roles: parts[2].trim(),
          ActionType: parts[3].trim(),
          Reference: parts[4].trim(),
          Shortcut: parts[5].trim(),
          Description: parts[6].trim(),
          Icon: parts[7].trim(),
          Actions: parts[8].trim(),
          Objects: parts[9].trim(),
          Fields: parts[10].trim(),
          Weight: isNaN(weight) ? 0 : weight
        });
      }
    }
    
    return commands;
  }
}

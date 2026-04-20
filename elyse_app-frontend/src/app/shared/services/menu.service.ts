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
import { MenuTreeBuilder, MenuForest } from '../utils/MenuTreeBuilder';
import * as E from 'fp-ts/Either';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { MenuComponentModel } from '../components/menu/menu-item.model';
import { MenuComponentErrorType } from '../models/menu-component-error.model';
import { MenuConverter } from '../utils/MenuConverter';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private menuForestSubject = new BehaviorSubject<E.Either<any, MenuForest>>(
    E.right([])
  );
  public menuForest$ = this.menuForestSubject.asObservable();

  private menuComponentModelSubject = new BehaviorSubject<
    E.Either<MenuComponentErrorType, MenuComponentModel>
  >(E.right({ items: [] }));
  public menuComponentModel$ = this.menuComponentModelSubject.asObservable();

  private menuSpecPath = 'assets/navigation-bar.csv';
  
  // Configuration option to enable multiple navigation menus
  private useNavigationMenus = true; // Set to true to enable multiple dropdowns

  constructor(private http: HttpClient) {}

  /**
   * Loads the menu specification from the CSV file and builds the menu tree.
   * This method should be called during application initialization.
   * It does not render the menu - just loads and parses the data structure.
   */
  public loadMenuSpec(): Observable<E.Either<any, MenuForest>> {
    // Define functions for the pipe operations
    const buildMenuTree = (csvString: string) => {
      try {
        const result = MenuTreeBuilder.build(csvString);
        
        if (E.isLeft(result)) {
          // Instead of failing completely, try to build a partial menu
          const partialResult = this.buildPartialMenuTree(csvString);
          this.menuForestSubject.next(partialResult);
          return partialResult;
        } else {
          this.menuForestSubject.next(result);
          this.convertMenuForestToComponentModel(result.right);
          return result;
        }
      } catch (error) {
        // Try to build a partial menu as fallback
        const partialResult = this.buildPartialMenuTree(csvString);
        this.menuForestSubject.next(partialResult);
        return partialResult;
      }
    };

    const handleError = (error: any) => {
      const errorResult = E.left({
        type: 'GenericMenuTreeBuilderError',
        message: `Error loading menu CSV: ${error.message || error}`,
      });
      this.menuForestSubject.next(errorResult);
      return of(errorResult);
    };

    // The data flow
    return this.http
      .get(this.menuSpecPath, { responseType: 'text' })
      .pipe(map(buildMenuTree), catchError(handleError));
  }

  /**
   * Build a partial menu tree by filtering out problematic rows
   * This is a fallback method when the main MenuTreeBuilder fails
   */
  private buildPartialMenuTree(csvString: string): E.Either<any, MenuForest> {
    try {
      // Split CSV into lines
      const lines = csvString.split('\n');
      const header = lines[0];
      
      // Parse header to get column indices
      const headerCols = this.parseCSVLine(header);
      const menuItemIdIndex = headerCols.indexOf('MenuItemId');
      const parentMenuIndex = headerCols.indexOf('ParentMenu');
      const rolesIndex = headerCols.indexOf('Roles');
      const actionTypeIndex = headerCols.indexOf('ActionType');
      const referenceIndex = headerCols.indexOf('Reference');
      
      // First pass: collect all menu item IDs and fix role formatting
      const menuItemIds = new Set<string>();
      const fixedLines: string[] = [header];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          const columns = this.parseCSVLine(line);
          
          // Basic validation
          if (columns.length < Math.max(menuItemIdIndex, parentMenuIndex, rolesIndex) + 1) {
            continue;
          }
          
          const menuItemId = columns[menuItemIdIndex]?.trim();
          const actionType = actionTypeIndex >= 0 ? columns[actionTypeIndex]?.trim() : '';
          const reference = referenceIndex >= 0 ? columns[referenceIndex]?.trim() : '';
          
          // Skip if no MenuItemId
          if (!menuItemId) {
            continue;
          }
          
          // Skip CUSTOM actions with empty reference
          if (actionType === 'CUSTOM' && !reference) {
            continue;
          }
          
          // Fix roles: convert comma-separated to semicolon-separated
          if (rolesIndex >= 0 && columns[rolesIndex]) {
            const originalRoles = columns[rolesIndex];
            // Check if roles contain commas (invalid format)
            if (originalRoles.includes(',') && !originalRoles.includes(';')) {
              const fixedRoles = originalRoles.split(',').map(r => r.trim()).join(';');
              columns[rolesIndex] = fixedRoles;
            }
          }
          
          // Collect valid menu item ID
          menuItemIds.add(menuItemId);
          
          // Rebuild line with fixed data
          fixedLines.push(this.buildCSVLine(columns));
          
        } catch (error) {
          // Skip problematic lines
          continue;
        }
      }
      
      // Second pass: iteratively filter out rows with missing parent references
      // We need to do this iteratively because removing orphans can create new orphans
      let validLines: string[] = fixedLines.slice(); // Copy the array
      let iteration = 0;
      let removedInLastIteration = 0;
      
      do {
        iteration++;
        removedInLastIteration = 0;
        const tempValidLines: string[] = [header];
        const validItemIds = new Set<string>();
        
        // First, collect all valid item IDs from this iteration
        for (let i = 1; i < validLines.length; i++) {
          const line = validLines[i];
          const columns = this.parseCSVLine(line);
          const menuItemId = columns[menuItemIdIndex]?.trim();
          if (menuItemId) {
            validItemIds.add(menuItemId);
          }
        }
        
        // Now filter out items with missing parents
        for (let i = 1; i < validLines.length; i++) {
          const line = validLines[i];
          const columns = this.parseCSVLine(line);
          
          const parentMenu = parentMenuIndex >= 0 ? columns[parentMenuIndex]?.trim() : '';
          
          // If parentMenu is specified, check if it exists in the valid set
          if (parentMenu && !validItemIds.has(parentMenu)) {
            removedInLastIteration++;
            continue;
          }
          
          tempValidLines.push(line);
        }
        
        validLines = tempValidLines;
        
      } while (removedInLastIteration > 0 && iteration < 10); // Max 10 iterations to prevent infinite loops
      
      // Rebuild CSV with valid lines
      const cleanedCsv = validLines.join('\n');
      
      // Try to build with cleaned CSV
      const result = MenuTreeBuilder.build(cleanedCsv);
      
      if (E.isRight(result)) {
        this.convertMenuForestToComponentModel(result.right);
      } else {
        // Return empty menu as last resort
        const emptyMenu: MenuForest = [];
        return E.right(emptyMenu);
      }
      
      return result;
      
    } catch (error) {
      // Return empty menu as last resort
      const emptyMenu: MenuForest = [];
      return E.right(emptyMenu);
    }
  }
  
  /**
   * Parse a CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
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
   * Build a CSV line from columns, quoting if necessary
   */
  private buildCSVLine(columns: string[]): string {
    return columns.map(col => {
      // Quote if contains comma, newline, or quotes
      if (col.includes(',') || col.includes('\n') || col.includes('"')) {
        return '"' + col.replace(/"/g, '""') + '"';
      }
      return col;
    }).join(',');
  }

  /**
   * Get the current menu forest value
   */
  public getMenuForest(): E.Either<any, MenuForest> {
    return this.menuForestSubject.getValue();
  }

  /**
   * Converts the MenuForest to a MenuComponentModel using functional programming.
   * This method is called automatically when a new MenuForest is loaded.
   * Uses either single menu or multiple navigation dropdowns based on configuration.
   *
   * @param menuForest The MenuForest to convert
   * @returns Either an error or a MenuComponentModel
   */
  private convertMenuForestToComponentModel(
    menuForest: MenuForest
  ): E.Either<MenuComponentErrorType, MenuComponentModel> {
    let result: E.Either<MenuComponentErrorType, MenuComponentModel>;

    if (this.useNavigationMenus) {
      // Use multiple navigation dropdowns
      result = MenuConverter.convertForestToNavigationMenus(menuForest);
      console.log('Converting menu forest to navigation menus');
    } else {
      // Use single menu
      result = MenuConverter.convertForestToComponentModel(menuForest);
      console.log('Converting menu forest to single menu component');
    }

    // Update the menu component model subject
    this.menuComponentModelSubject.next(result);

    if (E.isLeft(result)) {
      console.error(
        'Error converting menu forest to component model:',
        result.left
      );
    } else {
      const componentModel = result.right;
      if (componentModel.navigationMenus) {
        console.log(`Menu forest converted to ${componentModel.navigationMenus.length} navigation menus successfully`);
      } else {
        console.log('Menu forest converted to single menu component successfully');
      }
    }

    return result;
  }

  /**
   * Enable or disable multiple navigation menus
   * @param enabled Whether to use navigation menus (true) or single menu (false)
   */
  public setNavigationMenusEnabled(enabled: boolean): void {
    if (this.useNavigationMenus !== enabled) {
      this.useNavigationMenus = enabled;
      console.log(`Navigation menus ${enabled ? 'enabled' : 'disabled'}`);
      
      // Reconvert the current menu forest with the new setting
      const currentForest = this.getMenuForest();
      if (E.isRight(currentForest)) {
        this.convertMenuForestToComponentModel(currentForest.right);
      }
    }
  }

  /**
   * Get the current navigation menus setting
   */
  public isNavigationMenusEnabled(): boolean {
    return this.useNavigationMenus;
  }

  /**
   * Get the current menu component model value
   */
  public getMenuComponentModel(): E.Either<
    MenuComponentErrorType,
    MenuComponentModel
  > {
    return this.menuComponentModelSubject.getValue();
  }
}

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

import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { filter, map, switchMap, tap, catchError } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { RouteManagerService } from './route-manager.service';
import { RouteConfigParserService } from './route-config-parser.service';
import { TableSelectionExtensionService } from './table-selection-extension.service';
import { TableStateService } from './table-state.service';
import { ParameterMappingService } from './parameter-mapping.service';
import { ContextAwareRoutingService } from './context-aware-routing.service';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { TransactionResultsComponent } from '../components/transaction-results/transaction-results.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { TableActionsService } from '../components/table-actions/table-actions.service';
import { FileDownloadService } from '../../reading/file-download/file-download.service';
import { CsvFormNavigationService } from './csv-form-navigation.service';
import { ApplicationMessageService } from './application-message.service';
import { ProcessingIndicatorService } from './processing-indicator.service';
import { CsvFormService } from './csv-form.service';

export interface ContextMenuItem {
  tableName: string;
  menuItemId: string;
  label: string;
  roles: string[];
  visibilityConstraint: 'ALWAYS' | 'SINGLE_ROW' | 'ANY_ROWS';
  actionType: 'READ' | 'DUC' | 'FORM' | 'CUSTOM';
  reference: string;
  keyboardShortcut?: string;
  tooltip?: string;
  order?: number;
  parentMenuId?: string;  // Add parent menu reference
  children?: ContextMenuItem[];  // Add children array
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuService {
  private menuItems: ContextMenuItem[] = [];
  private menuVisible = new BehaviorSubject<boolean>(false);
  private menuPosition = new BehaviorSubject<{ x: number, y: number }>({ x: 0, y: 0 });
  private activeMenuItems = new BehaviorSubject<ContextMenuItem[]>([]);
  private currentTableName = new BehaviorSubject<string>('');
  private selectedRowCount = new BehaviorSubject<number>(0);
  private selectedRoles: Array<{[key: string]: string} | string> = [];
  
  // Subject to notify when context menu is about to open
  private contextMenuOpening = new BehaviorSubject<boolean>(false);
  public contextMenuOpening$ = this.contextMenuOpening.asObservable();

  menuVisible$ = this.menuVisible.asObservable();
  menuPosition$ = this.menuPosition.asObservable();
  activeMenuItems$ = this.activeMenuItems.asObservable();
  currentTableName$ = this.currentTableName.asObservable();
  
  /**
   * Get the current table name
   */
  getCurrentTableName(): string {
    return this.currentTableName.getValue();
  }
  
  /**
   * Set the current table name
   */
  setCurrentTableName(tableName: string): void {
    this.currentTableName.next(tableName);
  }
  
  /**
   * Get the selected row count
   */
  getSelectedRowCount(): number {
    return this.selectedRowCount.getValue();
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private routeManagerService: RouteManagerService,
    private tableSelectionExtensionService: TableSelectionExtensionService,
    private tableStateService: TableStateService,
    private parameterMappingService: ParameterMappingService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private routeConfigParser: RouteConfigParserService,
    private injector: Injector,
    private tableActionsService: TableActionsService,
    private fileDownloadService: FileDownloadService,
    private contextAwareRouting: ContextAwareRoutingService,
    private csvFormNavigationService: CsvFormNavigationService,
    private applicationMessageService: ApplicationMessageService,
    private processingIndicator: ProcessingIndicatorService,
    private csvFormService: CsvFormService
  ) {
    this.loadContextMenus();
    this.trackCurrentRoute();
    this.trackSelectedRows();
    this.loadUserRoles();
    this.trackRoleChanges();
  }

  /**
   * Load user roles from localStorage
   */
  private loadUserRoles(): void {
    const rolesJson = localStorage.getItem('selectedRoles');
    if (rolesJson) {
      try {
        this.selectedRoles = JSON.parse(rolesJson);
        console.log('Loaded user roles:', this.selectedRoles);
      } catch (error) {
        console.error('Error parsing user roles from localStorage:', error);
        this.selectedRoles = [];
      }
    } else {
      console.log('No user roles found in localStorage');
      this.selectedRoles = [];
    }
  }

  /**
   * Track changes to the selected roles in localStorage
   */
  private trackRoleChanges(): void {
    // Listen for storage events to detect when selectedRoles changes
    window.addEventListener('storage', (event) => {
      if (event.key === 'selectedRoles') {
        console.log('Selected roles changed in localStorage');
        this.loadUserRoles();
        
        // Refresh the context menu if it's currently visible
        if (this.menuVisible.getValue()) {
          const position = this.menuPosition.getValue();
          this.showContextMenu(position.x, position.y);
        }
      }
    });
  }
  
  /**
   * Check if the user has a specific role (case-insensitive comparison)
   */
  private hasRole(role: string): boolean {
    return this.selectedRoles.some((selectedRole: {[key: string]: string} | string) =>
      (typeof selectedRole === 'object' && selectedRole['Role Name']?.toLowerCase() === role.toLowerCase()) ||
      (typeof selectedRole === 'string' && selectedRole.toLowerCase() === role.toLowerCase())
    );
  }

  /**
   * Load context menu definitions from CSV file
   */
  private loadContextMenus(): void {
    // Use the correct path to the CSV file
    this.http.get('/assets/context-menus.csv', { responseType: 'text' })
      .pipe(
        map(csv => this.parseContextMenusCsv(csv)),
        catchError(error => {
          console.error('Error loading context menus:', error);
          // Add a default menu item for testing
          return of([{
            tableName: 'all-documents',
            menuItemId: 'FilesOneDoc',
            label: 'Files For One Document',
            roles: ['Reader', 'Controller', 'Editor', 'Reviewer', 'Configurator'],
            visibilityConstraint: 'SINGLE_ROW' as 'ALWAYS' | 'SINGLE_ROW' | 'ANY_ROWS',
            actionType: 'READ' as 'READ' | 'DUC' | 'FORM',
            reference: 'files-for-one-document',
            keyboardShortcut: '',
            tooltip: 'Lists the filtered files for the selected document'
          }]);
        })
      )
      .subscribe(menuItems => {
        this.menuItems = menuItems;
      });
  }

  /**
   * Track the current route and update the current table name
   */
  private trackCurrentRoute(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      switchMap(() => {
        const currentUrl = this.router.url;
        // Extract the route path without query parameters
        const routePath = currentUrl.split('?')[0];
        
        // Use the RouteConfigParserService directly to get the table name from the route URL
        return this.routeConfigParser.getTableNameForRouteUrl(routePath).pipe(
          catchError(error => {
            console.error('Error getting table name for route:', error);
            return of(null);
          })
        );
      }),
      filter(tableName => !!tableName)
    ).subscribe(tableName => {
      if (tableName) {
        this.currentTableName.next(tableName);
        console.log('Current table name from route config:', tableName);
      } else {
        console.log('No table name found for current route');
      }
    });
  }

  /**
   * Track selected rows and update the selected row count
   */
  private trackSelectedRows(): void {
    // Use the TableStateService to track selected rows
    this.tableStateService.tableState$.subscribe((state: any) => {
      console.log('CONTEXT MENU: Table state updated:', state);
      
      const currentTable = this.currentTableName.getValue();
      console.log('CONTEXT MENU: Current table name:', currentTable);
      
      // Log all tables in the state
      Object.keys(state).forEach(tableName => {
        console.log(`CONTEXT MENU: Table ${tableName} has ${state[tableName].selectedRows.length} selected rows`);
      });
      
      if (currentTable && state[currentTable]) {
        const selectedRowCount = state[currentTable].selectedRows.length;
        this.selectedRowCount.next(selectedRowCount);
        console.log('CONTEXT MENU: Selected row count for', currentTable, ':', selectedRowCount);
        console.log('CONTEXT MENU: Selected rows:', state[currentTable].selectedRows);
      } else {
        // Reset selected row count when no current table or no state for current table
        this.selectedRowCount.next(0);
        console.log('CONTEXT MENU: Resetting selected row count to 0');
        
        if (!currentTable) {
          console.log('CONTEXT MENU: No current table name set');
        } else if (!state[currentTable]) {
          console.log('CONTEXT MENU: No state for table:', currentTable);
        }
      }
    });
  }

  /**
   * Parse CSV content into ContextMenuItem objects
   */
  private parseContextMenusCsv(csv: string): ContextMenuItem[] {
    const lines = csv.split('\n');
    // Skip header row
    const items: ContextMenuItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV parsing with potential quoted values containing commas
      const values: string[] = [];
      let inQuotes = false;
      let currentValue = '';

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      values.push(currentValue);

      if (values.length >= 7) {
        // Extract parentMenu (now at index 3)
        const parentMenuId = values[3] ? values[3].trim() : undefined;
        
        // Validate visibilityConstraint (now at index 5)
        let visibilityConstraint: 'ALWAYS' | 'SINGLE_ROW' | 'ANY_ROWS' = 'ALWAYS';
        if (values[5] === 'SINGLE_ROW' || values[5] === 'ANY_ROWS') {
          visibilityConstraint = values[5];
        }
        
        // Validate actionType (now at index 6)
        let actionType: 'READ' | 'DUC' | 'FORM' | 'CUSTOM' = 'READ';
        if (values[6] === 'DUC' || values[6] === 'FORM' || values[6] === 'CUSTOM') {
          actionType = values[6];
        }
        
        // Parse order if present (now at index 9)
        let order: number | undefined = undefined;
        if (values[9] && !isNaN(parseInt(values[9]))) {
          order = parseInt(values[9]);
        }
        
        items.push({
          tableName: values[0],
          menuItemId: values[1],
          label: values[2],
          parentMenuId,
          roles: values[4] ? values[4].split(';').map(role => role.trim()).filter(role => role.length > 0) : [],
          visibilityConstraint,
          actionType,
          reference: values[7],
          keyboardShortcut: values[8],
          tooltip: values[10],
          order
        });
      }
    }

    return items;
  }

  /**
   * Show context menu at specified position
   */
  showContextMenu(x: number, y: number): void {
    // Notify that context menu is opening (so navigation menus can close)
    this.contextMenuOpening.next(true);
    
    const tableName = this.currentTableName.getValue();
    console.log('SHOW MENU: Showing context menu for table:', tableName);
    
    const selectedRowCount = this.selectedRowCount.getValue();
    console.log('SHOW MENU: Selected row count from BehaviorSubject:', selectedRowCount);
    
    // Get the selected rows directly from TableStateService
    const selectedRows = this.tableStateService.getSelectedRows(tableName);
    console.log('SHOW MENU: Selected rows from TableStateService:', selectedRows);
    console.log('SHOW MENU: Number of selected rows from TableStateService:', selectedRows ? selectedRows.length : 0);
    
    // Check the table state directly
    const tableState = (this.tableStateService as any).tableState;
    console.log('SHOW MENU: Full table state:', tableState);
    
    // Log all tables in the state
    Object.keys(tableState).forEach(tableName => {
      console.log(`SHOW MENU: Table ${tableName} has ${tableState[tableName].selectedRows.length} selected rows`);
    });
    
    // Get menu items for the current table
    const items = this.getMenuItemsForTable(tableName);
    console.log('SHOW MENU: Menu items for table:', items);
    
    // Apply visibility constraints based on row selection
    const filteredItems = this.applyVisibilityConstraints(items, selectedRowCount);
    console.log('SHOW MENU: Filtered menu items:', filteredItems);
    
    // Build the menu tree
    const menuTree = this.buildMenuTree(filteredItems);
    console.log('SHOW MENU: Menu tree:', menuTree);
    
    // Sort menu tree by order recursively
    const sortedTree = this.sortMenuTreeByOrder(menuTree);
    console.log('SHOW MENU: Sorted menu tree:', sortedTree);
    
    // Update observables
    this.menuPosition.next({ x, y });
    this.activeMenuItems.next(sortedTree);
    this.menuVisible.next(true);
  }

  /**
   * Hide context menu
   */
  hideContextMenu(): void {
    this.menuVisible.next(false);
  }

  /**
   * Get menu items for a specific table
   */
  private getMenuItemsForTable(tableName: string): ContextMenuItem[] {
    return this.menuItems.filter(item => item.tableName === tableName);
  }

  /**
   * Apply visibility constraints based on row selection
   */
  private applyVisibilityConstraints(items: ContextMenuItem[], selectedRowCount: number): ContextMenuItem[] {
    console.log('APPLY CONSTRAINTS: Applying visibility constraints with selectedRowCount:', selectedRowCount);
    
    // Get the current table name
    const tableName = this.currentTableName.getValue();
    console.log('APPLY CONSTRAINTS: Current table name:', tableName);
    
    // Get the selected rows from the TableSelectionExtensionService
    const selectedRows = this.tableSelectionExtensionService.getRows(tableName);
    const actualSelectedRowCount = selectedRows ? selectedRows.length : 0;
    console.log('APPLY CONSTRAINTS: Selected rows from TableSelectionExtensionService:', selectedRows);
    console.log('APPLY CONSTRAINTS: Number of selected rows from TableSelectionExtensionService:', actualSelectedRowCount);
    
    return items.filter(item => {
      let isVisible = false;
      
      // Use the actual selected row count from TableSelectionExtensionService
      switch (item.visibilityConstraint) {
        case 'ALWAYS':
          isVisible = true;
          break;
        case 'SINGLE_ROW':
          isVisible = actualSelectedRowCount === 1;
          break;
        case 'ANY_ROWS':
          isVisible = actualSelectedRowCount > 0;
          break;
      }
      
      // Check if the user has any of the required roles
      const hasRequiredRole = item.roles.length === 0 || item.roles.some(role => this.hasRole(role));
      
      // Item is visible only if it passes both the visibility constraint and role check
      isVisible = isVisible && hasRequiredRole;
      
      console.log(`APPLY CONSTRAINTS: Menu item "${item.label}" with constraint "${item.visibilityConstraint}" and roles [${item.roles.join(', ')}] is ${isVisible ? 'visible' : 'hidden'}`);
      return isVisible;
    });
  }

  /**
   * Build a hierarchical menu tree from flat menu items
   * Items with no parent or with a parent that doesn't exist will be at the root level
   */
  private buildMenuTree(items: ContextMenuItem[]): ContextMenuItem[] {
    // Create a map of menu items by ID for quick lookup
    const menuItemsMap = new Map<string, ContextMenuItem>();
    
    // Initialize children arrays
    const itemsWithChildren = items.map(item => ({
      ...item,
      children: []
    }));
    
    // Add all items to the map
    itemsWithChildren.forEach(item => {
      menuItemsMap.set(item.menuItemId, item);
    });
    
    // Build the tree structure
    const rootItems: ContextMenuItem[] = [];
    
    itemsWithChildren.forEach(item => {
      if (item.parentMenuId && menuItemsMap.has(item.parentMenuId)) {
        // Add as child to parent
        const parent = menuItemsMap.get(item.parentMenuId)!;
        parent.children!.push(item);
      } else {
        // Add to root items if no parent or parent not found
        rootItems.push(item);
      }
    });
    
    return rootItems;
  }

  /**
   * Sort menu tree by order recursively
   * Sorts each level of the tree by order
   */
  private sortMenuTreeByOrder(items: ContextMenuItem[]): ContextMenuItem[] {
    // Sort the current level
    const sortedItems = this.sortMenuItemsByOrder(items);
    
    // Sort children recursively
    return sortedItems.map(item => {
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: this.sortMenuTreeByOrder(item.children)
        };
      }
      return item;
    });
  }

  /**
   * Sort menu items by order
   * Items with no order value will be placed at the end
   */
  private sortMenuItemsByOrder(items: ContextMenuItem[]): ContextMenuItem[] {
    return [...items].sort((a, b) => {
      // If both items have order, sort by order
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      
      // If only a has order, a comes first
      if (a.order !== undefined) {
        return -1;
      }
      
      // If only b has order, b comes first
      if (b.order !== undefined) {
        return 1;
      }
      
      // If neither has order, maintain original order
      return 0;
    });
  }

  /**
   * Handle menu item selection
   */
  handleMenuItemSelection(item: ContextMenuItem): void {
    // Handle different action types
    if (item.actionType === 'READ') {
      this.handleReadAction(item);
    } else if (item.actionType === 'DUC') {
      this.handleDucAction(item);
    } else if (item.actionType === 'FORM') {
      this.handleFormAction(item);
    } else if (item.actionType === 'CUSTOM') {
      this.handleCustomAction(item);
    } else {
      console.warn(`Unknown action type ${item.actionType}`);
    }
    
    // Hide the menu after selection
    this.hideContextMenu();
  }
  
  /**
   * Handle READ action type
   */
  private handleReadAction(item: ContextMenuItem): void {
    const tableName = this.currentTableName.getValue();
    
    // Store the current route so we can return to it if needed
    this.csvFormNavigationService.storeReturnRoute();
    
    // Look up the RouteUrl for the TableName (item.reference) in read-routes.csv
    this.routeConfigParser.getRouteUrlForTableName(item.reference).pipe(
      switchMap(routeUrl => {
        if (!routeUrl) {
          throw new Error(`No RouteUrl found for TableName: ${item.reference}`);
        }
        return this.routeManagerService.getReadRouteConfig(routeUrl);
      })
    ).subscribe(routeConfig => {
      if (routeConfig) {
        // Get the selected rows from the source table
        const selectedRows = this.tableSelectionExtensionService.getRows(tableName);
        if (!selectedRows || selectedRows.length === 0) {
          console.error(`No selected rows found for source: ${tableName}`);
          return;
        }
        
        // Get the input parameters for the route
        const inputParameters = routeConfig.inputParameters;
        
        // Convert parameter map to query string
        const queryParams: { [key: string]: string } = {};
        
        // For each input parameter, find the corresponding value in the selected row
        inputParameters.forEach(paramName => {
          // Use the ParameterMappingService to get the alias for this parameter
          const parameterMapping = this.parameterMappingService.getParameterMapping(paramName);
          if (parameterMapping) {
            // Get the value from the selected row using the alias
            const value = selectedRows[0][parameterMapping.alias];
            if (value !== undefined) {
              queryParams[paramName] = value.toString();
            }
          }
        });
        
        // Convert query params to query string
        const queryString = Object.keys(queryParams)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
          .join('&');
        
        // Navigate to the route with the mapped parameters using window.location
        const url = `${routeConfig.routeUrl}${queryString ? '?' + queryString : ''}`;
        window.location.href = url;
      } else {
        console.error(`Route not found for reference: ${item.reference}`);
      }
    });
  }
  
  /**
   * Handle DUC action type (Data Update/Create)
   * Supports iteration over multiple selected rows for single-parameter actions
   */
  private handleDucAction(item: ContextMenuItem): void {
    const tableName = this.currentTableName.getValue();
    
    // Store the current route so we can return to it after the operation completes
    this.csvFormNavigationService.storeReturnRoute();
    
    // Look up the route in duc-routes.csv by RouteId (which is the reference in context-menus.csv)
    this.routeManagerService.getDucRouteConfig(item.reference).subscribe(routeConfig => {
      if (routeConfig) {
        // Get the selected rows from the source table
        const selectedRows = this.tableSelectionExtensionService.getRows(tableName);
        if (!selectedRows || selectedRows.length === 0) {
          console.error(`No selected rows found for source: ${tableName}`);
          return;
        }
        
        // Get the input parameters for the route
        const inputParameters = routeConfig.inputParameters;
        if (!inputParameters || inputParameters.length === 0) {
          console.error(`No input parameters found for route: ${item.reference}`);
          return;
        }
        
        // Check if this action should iterate over selected rows
        const shouldIterate = this.shouldIterateAction(inputParameters, selectedRows);
        
        if (shouldIterate) {
          console.log('DUC action will iterate over', selectedRows.length, 'rows');
          this.iterateDucAction(routeConfig, selectedRows, inputParameters);
        } else {
          console.log('DUC action will execute as single call');
          this.executeSingleDucAction(routeConfig, selectedRows, inputParameters);
        }
      } else {
        // NO FALLBACKS - If the route is not found, throw an error
        throw new Error(`DUC route not found for reference: ${item.reference}`);
      }
    });
  }

  /**
   * Check if an action should iterate over multiple selected rows
   * Returns true if:
   * - More than one row is selected
   * - There's only one non-hardcoded input parameter
   */
  private shouldIterateAction(inputParameters: string[], selectedRows: any[]): boolean {
    // Need more than one row to iterate
    if (selectedRows.length <= 1) return false;
    
    // Count non-hardcoded parameters (those without '=')
    const nonHardcodedParams = inputParameters.filter(p => !p.includes('='));
    
    // Iterate only if there's exactly one non-hardcoded parameter
    return nonHardcodedParams.length === 1;
  }

  /**
   * Execute DUC action by iterating over each selected row
   * Makes one API call per row and shows consolidated results
   */
  private iterateDucAction(routeConfig: any, selectedRows: any[], inputParameters: string[]): void {
    console.log('Starting iterated DUC action for', selectedRows.length, 'rows');
    
    // Show thinking indicator
    this.processingIndicator.show();
    
    const requests: Observable<any>[] = [];
    
    // Create one API request for each selected row
    selectedRows.forEach((row, index) => {
      const params = this.buildQueryParamsForRow(row, inputParameters);
      // Construct the API URL with proper slash handling
      const apiUrl = `${environment.dotNetBaseUrl}/${routeConfig.apiEndpoint.replace(/^\//, '')}`;
      
      console.log(`Creating request ${index + 1}/${selectedRows.length} to ${apiUrl} with params:`, params);
      
      // All DUC routes use POST method with JSON body (standardized approach)
      requests.push(
        this.http.post(apiUrl, params, {
          headers: {
            'Content-Type': 'application/json'
          }
        }).pipe(
          map((response: any) => {
            console.log(`Request ${index + 1} success:`, response);
            // Extract an identifier from the row for display
            const rowId = row['Document ID'] || row['File ID'] || row['ID'] || index + 1;
            return {
              id: rowId,
              displayName: row['Document Name'] || row['File Name'] || row['Name'] || `Record ${index + 1}`,
              // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
              transactionMessage: response.transactionMessage,
              transactionStatus: response.transactionStatus
            };
          }),
          catchError((error: any) => {
            // Extract an identifier from the row for display
            const rowId = row['Document ID'] || row['File ID'] || row['ID'] || index + 1;
            console.error(`Error on request ${index + 1}:`, error);
            console.error(`Error status: ${error.status}, Error body:`, error.error);
            
            // Check if we got a database response in error.error
            // The database returns transactionMessage and transactionStatus even on errors (e.g. validation failures)
            if (error.error && error.error.transactionMessage && error.error.transactionStatus) {
              // Database error - use the database response
              return of({
                id: rowId,
                displayName: row['Document Name'] || row['File Name'] || row['Name'] || `Record ${index + 1}`,
                // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                transactionMessage: error.error.transactionMessage,
                transactionStatus: error.error.transactionStatus
              });
            } else {
              // HTTP/Application error (no database response)
              // Do NOT hijack transactionMessage and transactionStatus - these are for database only
              // Use applicationError field for non-database errors
              return of({
                id: rowId,
                displayName: row['Document Name'] || row['File Name'] || row['Name'] || `Record ${index + 1}`,
                transactionMessage: undefined,
                transactionStatus: undefined,
                applicationError: error.message || 'HTTP error occurred'
              });
            }
          })
        )
      );
    });
    
    // Execute all requests in parallel and show consolidated results
    forkJoin(requests).subscribe(results => {
      console.log('All iterated requests completed:', results);
      // Hide thinking indicator
      this.processingIndicator.hide();
      this.showIterationResults(results, routeConfig.title || 'Operation Results');
    });
  }

  /**
   * Execute DUC action as a single call (legacy behavior)
   * Used when iteration conditions are not met
   */
  private executeSingleDucAction(routeConfig: any, selectedRows: any[], inputParameters: string[]): void {
    // Build query parameters from selected rows and route configuration
    const queryParams: { [key: string]: string } = {};
    
    // Get current URL parameters
    const currentUrlParams = new URLSearchParams(window.location.search);
    
    // For each input parameter, find the corresponding value
    inputParameters.forEach(paramDef => {
      // Check if the parameter has a hardcoded value (contains '=')
      if (paramDef.includes('=')) {
        // For parameters with '=', use the hardcoded value
        const [paramName, hardcodedValue] = paramDef.split('=', 2);
        queryParams[paramName] = hardcodedValue;
        console.log(`Using hardcoded value for ${paramName}: ${hardcodedValue}`);
      } else {
        // For parameters without '=', look in state variables and URL
        const paramName = paramDef;
        
        // First try to get the value from the selected row(s)
        const parameterMapping = this.parameterMappingService.getParameterMapping(paramName);
        let paramValue: string | undefined;
        
        if (parameterMapping && selectedRows.length > 0) {
          // Check if this is a multi-row operation (more than one row selected)
          if (selectedRows.length > 1) {
            // For multi-row operations, collect all values as comma-separated
            const values = selectedRows
              .map(row => row[parameterMapping.alias])
              .filter(val => val !== undefined)
              .map(val => val.toString());
            
            if (values.length > 0) {
              paramValue = values.join(',');
              console.log(`Parameter ${paramName} set to multiple values: ${paramValue}`);
            }
          } else {
            // Single row - use the first row's value
            const value = selectedRows[0][parameterMapping.alias];
            if (value !== undefined) {
              paramValue = value.toString();
            }
          }
        }
        
        // If not found in the selected rows, check the current URL
        if (paramValue === undefined && currentUrlParams.has(paramName)) {
          paramValue = currentUrlParams.get(paramName) || undefined;
        }
        
        // Add the parameter to the query params if we have a value
        if (paramValue !== undefined) {
          queryParams[paramName] = paramValue;
          console.log(`Parameter ${paramName} set to ${paramValue}`);
        }
      }
    });
    
    // Convert query params to query string
    const queryString = Object.keys(queryParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');
    
    // Navigate to DUC route component - let it handle ALL HTTP operations
    // The routeUrl is for the Angular router, the apiEndpoint is for the API call
    const routeUrlWithoutLeadingSlash = routeConfig.routeUrl.replace(/^\//, '');
    
    // Construct the full URL with query parameters
    const url = `/${routeUrlWithoutLeadingSlash}${queryString ? '?' + queryString : ''}`;
    console.log('Navigating to DUC route:', url);
    
    // Navigate to the route - DUC route component will handle the HTTP call
    window.location.href = url;
  }

  /**
   * Build query parameters for a single row
   * Helper method for iteration
   */
  private buildQueryParamsForRow(row: any, inputParameters: string[]): { [key: string]: string } {
    const queryParams: { [key: string]: string } = {};
    const currentUrlParams = new URLSearchParams(window.location.search);
    
    inputParameters.forEach(paramDef => {
      if (paramDef.includes('=')) {
        // Hardcoded value
        const [paramName, hardcodedValue] = paramDef.split('=', 2);
        queryParams[paramName] = hardcodedValue;
      } else {
        // Get value from row or URL
        const paramName = paramDef;
        const parameterMapping = this.parameterMappingService.getParameterMapping(paramName);
        
        let paramValue: string | undefined;
        
        if (parameterMapping && row[parameterMapping.alias] !== undefined) {
          paramValue = row[parameterMapping.alias].toString();
        } else if (currentUrlParams.has(paramName)) {
          paramValue = currentUrlParams.get(paramName) || undefined;
        }
        
        if (paramValue !== undefined) {
          queryParams[paramName] = paramValue;
        }
      }
    });
    
    return queryParams;
  }

  /**
   * Build API URL with query parameters
   * Helper method for iteration
   */
  private buildApiUrl(apiEndpoint: string, queryParams: { [key: string]: string }): string {
    const queryString = Object.keys(queryParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');
    
    const baseUrl = environment.dotNetBaseUrl || '';
    return `${baseUrl}${apiEndpoint}${queryString ? '?' + queryString : ''}`;
  }

  /**
   * Show iteration results in a dialog
   * Displays success/failure for each iterated operation
   */
  private showIterationResults(results: any[], title: string): void {
    const dialogRef = this.dialog.open(TransactionResultsComponent, {
      disableClose: false,
      autoFocus: true,
      panelClass: 'standard-dialog',
      data: {
        title: title,
        results: results,
        idColumnName: 'Record'
      }
    });
    
    dialogRef.afterClosed().subscribe(() => {
      console.log('Iteration results dialog closed');
      // Refresh the source table by reloading
      const returnRoute = (this.csvFormNavigationService as any).getStoredReturnRoute();
      if (returnRoute) {
        window.location.href = returnRoute;
      } else {
        window.location.reload();
      }
    });
  }

  /**
   * Handle FORM action type for form navigation
   * Supports iteration over multiple selected rows for forms with missing parameters
   */
  private handleFormAction(item: ContextMenuItem): void {
    const tableName = this.currentTableName.getValue();
    
    // Store the current route so we can return to it after the operation completes
    this.csvFormNavigationService.storeReturnRoute();
    
    // Get the selected rows from the source table
    const selectedRows = this.tableSelectionExtensionService.getRows(tableName);
    if (!selectedRows || selectedRows.length === 0) {
      console.error(`No selected rows found for source: ${tableName}`);
      return;
    }

    // Get the form definition
    const formDefinition = this.csvFormService.getForm(item.reference);
    if (!formDefinition) {
      console.error(`Form definition not found: ${item.reference}`);
      return;
    }

    // Check if this is a DUC form that might need iteration
    if (formDefinition.formType === 'DUC' && selectedRows.length > 1) {
      // Get the DUC route config to check if iteration is needed
      this.routeManagerService.getDucRouteConfig(formDefinition.reference).subscribe(routeConfig => {
        if (routeConfig) {
          const shouldIterate = this.shouldIterateFormAction(routeConfig.inputParameters, selectedRows, item.reference);
          
          if (shouldIterate) {
            console.log('Form action will iterate over', selectedRows.length, 'rows');
            this.openFormAndIterate(formDefinition, routeConfig, selectedRows, tableName);
            return;
          }
        }
        
        // If not iterating, proceed with normal form opening
        this.openFormNormally(item.reference, selectedRows);
      });
    } else {
      // Single row or non-DUC form - open normally
      this.openFormNormally(item.reference, selectedRows);
    }
  }

  /**
   * Check if a form action should iterate over multiple selected rows
   * Returns true if:
   * - More than one row is selected
   * - At least one form field can be populated from row data (will be disabled during iteration)
   */
  private shouldIterateFormAction(inputParameters: string[], selectedRows: any[], formId: string): boolean {
    // Need more than one row to iterate
    if (selectedRows.length <= 1) return false;
    
    // Get form fields
    const formFields = this.csvFormService.getFormFields(formId);
    
    // Get non-hardcoded DUC parameters
    const ducParams = inputParameters.filter(p => !p.includes('='));
    
    // Check if ANY form field can be mapped from row data
    // These fields will be disabled and populated from each row during iteration
    const hasIterableFields = formFields.some(field => {
      if (!field.parameterId) return false;
      
      // Check if this parameter is in DUC parameters
      if (!ducParams.includes(field.parameterId)) return false;
      
      // Check if this parameter can be mapped from row data
      const mapping = this.parameterMappingService.getParameterMapping(field.parameterId);
      return mapping !== undefined;
    });
    
    console.log(`Form iteration check: ${formFields.length} form fields, hasIterableFields: ${hasIterableFields}`);
    return hasIterableFields;
  }

  /**
   * Open form and iterate submission over selected rows
   */
  private openFormAndIterate(formDefinition: any, routeConfig: any, selectedRows: any[], tableName: string): void {
    // Build initial params for form (for pre-population if single field)
    const params = this.buildFormParams(selectedRows[0], formDefinition.formId);
    
    // Identify which form fields should be disabled during iteration
    // Pass the selected rows so we can check which parameters are actually available from the rows
    const disabledFields = this.identifyDisabledFieldsForIteration(formDefinition.formId, routeConfig.inputParameters, selectedRows);
    
    // Add disabled fields metadata to params
    params['__disabledFields'] = disabledFields;
    params['__selectedRowCount'] = selectedRows.length;
    
    console.log('Opening form for iteration:', formDefinition.formId, 'with disabled fields:', disabledFields);
    
    // Open form once to collect user input
    this.csvFormNavigationService.openForm(formDefinition.formId, params, false).subscribe({
      next: (formResult) => {
        if (formResult) {
          console.log('Form submitted, starting iteration with result:', formResult);
          // User submitted form - now iterate over selected rows
          this.iterateFormSubmission(formDefinition, routeConfig, selectedRows, formResult);
        } else {
          console.log('Form cancelled, no iteration');
        }
      },
      error: (error) => {
        console.error('Error opening form for iteration:', error);
      }
    });
  }

  /**
   * Identify which form fields should be disabled during iteration
   * Returns array of field IDs that should be disabled
   *
   * A field is disabled if:
   * 1. Its parameter can be mapped from row data (has a mapping in input-id-parameter-mapping.csv)
   * 2. The mapped column actually exists in the selected rows
   * 3. Multiple rows are selected (iteration context)
   */
  private identifyDisabledFieldsForIteration(formId: string, inputParameters: string[], selectedRows: any[]): string[] {
    if (selectedRows.length <= 1) {
      return []; // No disabled fields if only one row selected
    }

    const disabledFieldIds: string[] = [];
    const formFields = this.csvFormService.getFormFields(formId);
    
    // Get non-hardcoded DUC parameters
    const ducParams = inputParameters.filter(p => !p.includes('='));
    
    // Use first row as a sample to check which columns are available
    const sampleRow = selectedRows[0];
    
    // For each form field, check if its parameter can be mapped from the ACTUAL selected row data
    formFields.forEach(field => {
      if (field.parameterId) {
        // Check if this parameter is in DUC parameters
        if (ducParams.includes(field.parameterId)) {
          // Check if this parameter can be mapped from row data
          const paramMapping = this.parameterMappingService.getParameterMapping(field.parameterId);
          if (paramMapping) {
            // Check if the mapped column actually exists in the selected rows
            if (sampleRow[paramMapping.alias] !== undefined) {
              // This field should be disabled - it will be populated from each row during iteration
              disabledFieldIds.push(field.id);
              console.log(`Field "${field.id}" (${field.label}, param: ${field.parameterId}) will be disabled - found column "${paramMapping.alias}" in selected rows`);
            } else {
              console.log(`Field "${field.id}" (${field.label}, param: ${field.parameterId}) will NOT be disabled - column "${paramMapping.alias}" not found in selected rows`);
            }
          }
        }
      }
    });
    
    return disabledFieldIds;
  }

  /**
   * Open form normally without iteration
   */
  private openFormNormally(formId: string, selectedRows: any[]): void {
    // Build parameters from the selected row
    const params = this.buildFormParams(selectedRows[0], formId);

    // Use csvFormNavigationService to open the form in a data-driven way
    console.log('Opening form normally:', formId, 'with params:', params);
    this.csvFormNavigationService.openForm(formId, params, false).subscribe({
      next: (result) => {
        console.log('Form completed with result:', result);
      },
      error: (error) => {
        console.error('Error opening form:', error);
      }
    });
  }

  /**
   * Build form parameters from selected row with pre-population support
   *
   * Data-driven approach using field configuration:
   * - Always passes ID value (for API submission) via field.id
   * - For fields with nameAlias, also passes display name via field.id + '__displayName'
   * - Form component uses both: ID in form control, display name in input element
   */
  private buildFormParams(selectedRow: any, formId: string): { [key: string]: any } {
    const params: { [key: string]: any } = {};
    
    // Get the form definition to access form fields
    const formDefinition = this.csvFormService.getForm(formId);
    if (formDefinition) {
      const formFields = this.csvFormService.getFormFields(formId);
      
      // For each form field, check if we can pre-populate from the selected row
      formFields.forEach(field => {
        if (field.parameterId) {
          // Use ParameterMappingService to get the column alias for this parameter
          const paramMapping = this.parameterMappingService.getParameterMapping(field.parameterId);
          if (paramMapping && selectedRow[paramMapping.alias] !== undefined) {
            // ALWAYS use the ID value from the mapped column for API compatibility
            const idValue = selectedRow[paramMapping.alias];
            params[field.id] = idValue;
            
            // For fields with nameAlias configured, also pass the display name
            // This allows the form component to show the name while storing the ID
            if (field.nameAlias && selectedRow[field.nameAlias] !== undefined) {
              const displayName = selectedRow[field.nameAlias];
              params[`${field.id}__displayName`] = displayName;
              console.log(`Pre-populating field "${field.id}" (${field.label}, type: ${field.populationType}) with ID: ${idValue}, display name: ${displayName}`);
            } else {
              console.log(`Pre-populating field "${field.id}" (${field.label}, type: ${field.populationType}) with value: ${idValue}`);
            }
          }
        }
      });
    }
    
    // Also include all selected row data for backwards compatibility
    Object.keys(selectedRow).forEach(key => {
      const value = selectedRow[key];
      if (value !== undefined && value !== null && params[key] === undefined) {
        params[key] = value;
      }
    });
    
    return params;
  }

  /**
   * Iterate form submission over multiple selected rows
   * Makes one API call per row with merged parameters
   */
  private iterateFormSubmission(formDefinition: any, routeConfig: any, selectedRows: any[], formResult: any): void {
    console.log('Starting iterated form submission for', selectedRows.length, 'rows');
    
    // Show thinking indicator
    this.processingIndicator.show();
    
    const requests: Observable<any>[] = [];
    
    // Create one API request for each selected row
    selectedRows.forEach((row, index) => {
      // Merge form result with row data
      const params = this.mergeParamsForIteration(row, formResult, routeConfig.inputParameters, formDefinition.formId);
      
      // Construct the API URL
      const apiUrl = `${environment.dotNetBaseUrl}/${routeConfig.apiEndpoint.replace(/^\//, '')}`;
      
      console.log(`Creating request ${index + 1}/${selectedRows.length} to ${apiUrl} with params:`, params);
      
      // All DUC routes use POST method with JSON body
      requests.push(
        this.http.post(apiUrl, params, {
          headers: {
            'Content-Type': 'application/json'
          }
        }).pipe(
          map((response: any) => {
            console.log(`Request ${index + 1} success:`, response);
            // Extract an identifier from the row for display
            const rowId = row['Document ID'] || row['File ID'] || row['ID'] || index + 1;
            return {
              id: rowId,
              displayName: row['Document Name'] || row['File Name'] || row['Name'] || `Record ${index + 1}`,
              transactionMessage: response.transactionMessage,
              transactionStatus: response.transactionStatus
            };
          }),
          catchError((error: any) => {
            // Extract an identifier from the row for display
            const rowId = row['Document ID'] || row['File ID'] || row['ID'] || index + 1;
            console.error(`Error on request ${index + 1}:`, error);
            console.error(`Error status: ${error.status}, Error body:`, error.error);
            
            // Check if we got a database response in error.error
            // The database returns transactionMessage and transactionStatus even on errors (e.g. validation failures)
            if (error.error && error.error.transactionMessage && error.error.transactionStatus) {
              // Database error - use the database response
              return of({
                id: rowId,
                displayName: row['Document Name'] || row['File Name'] || row['Name'] || `Record ${index + 1}`,
                // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                transactionMessage: error.error.transactionMessage,
                transactionStatus: error.error.transactionStatus
              });
            } else {
              // HTTP/Application error (no database response)
              // Do NOT hijack transactionMessage and transactionStatus - these are for database only
              // Use applicationError field for non-database errors
              return of({
                id: rowId,
                displayName: row['Document Name'] || row['File Name'] || row['Name'] || `Record ${index + 1}`,
                transactionMessage: undefined,
                transactionStatus: undefined,
                applicationError: error.message || 'HTTP error occurred'
              });
            }
          })
        )
      );
    });
    
    // Execute all requests in parallel and show consolidated results
    forkJoin(requests).subscribe(results => {
      console.log('All iterated form requests completed:', results);
      this.processingIndicator.hide();
      this.showIterationResults(results, formDefinition.title || 'Operation Results');
    });
  }

  /**
   * Merge parameters from form result and selected row for iteration
   * Form parameters are shared across all iterations, row parameters vary
   */
  private mergeParamsForIteration(row: any, formResult: any, inputParameters: string[], formId: string): { [key: string]: any } {
    const params: { [key: string]: any } = {};
    const currentUrlParams = new URLSearchParams(window.location.search);
    const formFields = this.csvFormService.getFormFields(formId);
    
    console.log('=== MERGE PARAMS DEBUG ===');
    console.log('Row data:', row);
    console.log('Form result:', formResult);
    console.log('Input parameters:', inputParameters);
    console.log('==========================');
    
    inputParameters.forEach(paramDef => {
      if (paramDef.includes('=')) {
        // Hardcoded parameter
        const [paramName, hardcodedValue] = paramDef.split('=', 2);
        params[paramName] = hardcodedValue;
      } else {
        const paramName = paramDef;
        
        // Check if this parameter can be mapped from row data
        const parameterMapping = this.parameterMappingService.getParameterMapping(paramName);
        const canMapFromRow = parameterMapping && row[parameterMapping.alias] !== undefined;
        
        if (canMapFromRow) {
          // This parameter comes from selected row (varies per iteration)
          // Always use row data for parameters that can be mapped from rows
          params[paramName] = row[parameterMapping.alias];
        } else {
          // Not mappable from row - check if it comes from form field
          const formField = formFields.find(f => f.parameterId === paramName);
          if (formField && formResult[formField.id] !== undefined && formResult[formField.id] !== 'Multiple Values') {
            // This parameter comes from form - use form result
            // Skip if value is 'Multiple Values' placeholder
            params[paramName] = formResult[formField.id];
          } else if (currentUrlParams.has(paramName)) {
            // Fallback to URL parameter
            params[paramName] = currentUrlParams.get(paramName) || undefined;
          }
        }
      }
    });
    
    return params;
  }

  /**
   * Parse form config from CSV data
   */
  private parseFormConfig(csvData: string, formId: string): any {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim());
      if (values.length < headers.length) continue;
      
      // Check if this is the row we're looking for
      if (values[0] === formId) { // FormId is the first column
        return {
          formId: values[0],
          formType: values[1],
          reference: values[2],
          title: values[3],
          titleData: values[4],
          instructions: values[5],
          width: values[6],
          height: values[7]
        };
      }
    }
    
    return null;
  }

  /**
   * Handle CUSTOM action type for custom views
   */
  private handleCustomAction(item: ContextMenuItem): void {
    const tableName = this.currentTableName.getValue();
    
    // Handle specific custom action references
    switch (item.reference) {
      case 'file-save-as':
        this.handleFileSaveAsAction(tableName);
        return;
      case 'manage-user-roles':
        this.handleManageUserRolesAction(tableName);
        return;
        
      default:
        // Default behavior for custom views
        break;
    }
    
    // Clear any existing chain state before handling custom action
    this.csvFormNavigationService.resetNavigationState();
    
    // Store the current route so we can return to it after the operation completes
    this.csvFormNavigationService.storeReturnRoute();
    
    // Get the selected rows from the source table
    const selectedRows = this.tableSelectionExtensionService.getRows(tableName);
    if (!selectedRows || selectedRows.length === 0) {
      console.error(`No selected rows found for source: ${tableName}`);
      return;
    }

    // Get the custom view config from custom-views.csv using the reference (viewId)
    this.http.get('/assets/custom-views.csv', { responseType: 'text' }).subscribe({
      next: (csvData: string) => {
        const customViewConfig = this.parseCustomViewConfig(csvData, item.reference);
        if (!customViewConfig) {
          console.error(`Custom view config not found for viewId: ${item.reference}`);
          return;
        }

        // Get the input parameters for the custom view
        const inputParameters = customViewConfig.inputParameters;
        if (!inputParameters || inputParameters.length === 0) {
          console.error(`No input parameters found for custom view: ${item.reference}`);
          return;
        }

        // Convert parameter map to query string
        const queryParams: { [key: string]: string } = {};
        
        // For each input parameter, find the corresponding value in the selected row
        inputParameters.forEach((paramName: string) => {
          // Use the ParameterMappingService to get the alias for this parameter
          const parameterMapping = this.parameterMappingService.getParameterMapping(paramName);
          if (parameterMapping) {
            // Get the value from the selected row using the alias
            const value = selectedRows[0][parameterMapping.alias];
            if (value !== undefined) {
              queryParams[paramName] = value.toString();
            }
          }
        });
        
        // Convert query params to query string
        const queryString = Object.keys(queryParams)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
          .join('&');
        
        // Navigate to the custom view route with the mapped parameters using context-aware routing
        const url = `${customViewConfig.routeUrl}${queryString ? '?' + queryString : ''}`;
        console.log('Navigating to custom view with context:', url);
        
        // Use ContextAwareRoutingService to provide proper routing context
        this.contextAwareRouting.navigateWithContext({
          actionType: 'CUSTOM',
          reference: item.reference,
          routeUrl: url
        });
      },
      error: (error) => {
        console.error('Error loading custom view config:', error);
      }
    });
  }

  /**
   * Handle manage user roles action from context menu
   */
  private handleManageUserRolesAction(tableName: string): void {
    // Get the selected rows from the source table
    const selectedRows = this.tableSelectionExtensionService.getRows(tableName);
    if (!selectedRows || selectedRows.length !== 1) {
      console.error(`Expected exactly one selected row for manage user roles, got: ${selectedRows?.length || 0}`);
      return;
    }

    const selectedRow = selectedRows[0];
    
    // Extract userId and username from the selected row
    // Common field names that might contain the user ID
    const userId = selectedRow['User ID'] || selectedRow['ID'] || selectedRow['UserId'];
    
    // Common field names that might contain the username (can be empty)
    const username = selectedRow['System Username'] || selectedRow['Username'] || selectedRow['User Name'] || selectedRow['Name'] || '';
    
    // Only check if userId exists, username can be empty
    if (!userId) {
      console.error('Could not extract userId from selected row:', selectedRow);
      console.error('Available fields:', Object.keys(selectedRow));
      return;
    }

    console.log(`Opening manage user roles for userId: ${userId}, username: "${username}"`);
    
    // Call the TableActionsService method to open the manage user roles dialog
    this.tableActionsService.openManageUserRolesFromContextMenu(userId, username);
  }

  /**
   * Handle file save-as action from context menu
   */
  private handleFileSaveAsAction(tableName: string): void {
    // Get the selected rows from the source table
    const selectedRows = this.tableSelectionExtensionService.getRows(tableName);
    if (!selectedRows || selectedRows.length === 0) {
      console.error(`No selected rows found for source: ${tableName}`);
      return;
    }

    // Extract file information from selected rows
    const selectedFiles = selectedRows.map(row => {
      // Get fileId using parameter mapping
      const fileIdMapping = this.parameterMappingService.getParameterMapping('fileId');
      const fileId = fileIdMapping ? row[fileIdMapping.alias] : row['File ID'];
      
      // Get display name (filename or file ID)
      const displayName = row['File Name'] || row['Filename'] || `File ${fileId}`;
      
      return {
        id: parseInt(fileId),
        displayName: displayName
      };
    }).filter(file => !isNaN(file.id));

    if (selectedFiles.length === 0) {
      console.error('No valid file IDs found in selected rows');
      return;
    }

    // Handle single file vs multiple files
    if (selectedFiles.length === 1) {
      // Single file - use direct save dialog and show results
      this.processingIndicator.show();
      this.fileDownloadService.saveAsFile(selectedFiles[0].id, selectedFiles[0].displayName).then(
        (result: any) => {
          this.processingIndicator.hide();
          // Show results dialog for single file
          const dialogRef = this.dialog.open(TransactionResultsComponent, {
            disableClose: false,
            autoFocus: true,
            panelClass: 'standard-dialog',
            data: {
              title: 'File Save Results',
              results: [result],
              idColumnName: 'File Name'
            }
          });

          dialogRef.afterClosed().subscribe(() => {
            console.log('Single file save results dialog closed');
          });
        }
      ).catch((error) => {
        this.processingIndicator.hide();
        // Handle errors
        console.error('Error saving file:', error);
        this.snackBar.open(
          `Error: ${error.message || 'Failed to save file'}`,
          'Close',
          { duration: 5000 }
        );
      });
    } else {
      // Multiple files - show confirmation dialog then batch save
      const filesInfo = selectedFiles.map(file => `   ${file.displayName}`).join('\n');
      const confirmationMessage = `Save the following ${selectedFiles.length} files to a folder?`;

      const confirmationDialogRef = this.dialog.open(ConfirmationDialogComponent, {
        disableClose: false,
        autoFocus: true,
        panelClass: 'standard-dialog',
        data: {
          title: 'Confirm Save As',
          message: `<strong>${confirmationMessage}</strong>\n${filesInfo}`,
          confirmText: 'Save Files',
          cancelText: 'Cancel'
        }
      });

      confirmationDialogRef.afterClosed().subscribe(result => {
        if (result) {
          // User confirmed - proceed with batch save
          this.processingIndicator.show();
          this.fileDownloadService.saveAsFilesToFolder(selectedFiles).then(
            (results: any[]) => {
              this.processingIndicator.hide();
              // Show results dialog
              const dialogRef = this.dialog.open(TransactionResultsComponent, {
                disableClose: false,
                autoFocus: true,
                panelClass: 'standard-dialog',
                data: {
                  title: 'File Save Results',
                  results: results,
                  idColumnName: 'File Name'
                }
              });

              dialogRef.afterClosed().subscribe(() => {
                console.log('File save results dialog closed');
              });
            }
          ).catch((error) => {
            this.processingIndicator.hide();
            // Handle errors
            console.error('Error saving files:', error);
            this.snackBar.open(
              `Error: ${error.message || 'Failed to save files'}`,
              'Close',
              { duration: 5000 }
            );
          });
        }
      });
    }
  }

  /**
   * Parse custom view config from CSV data
   */
  private parseCustomViewConfig(csvData: string, viewId: string): any {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim());
      if (values.length < headers.length) continue;
      
      // Check if this is the row we're looking for
      if (values[0] === viewId) { // ViewId is the first column
        console.log('CONTEXT MENU DEBUG: Found custom view config for', viewId, ':', values);
        return {
          viewId: values[0],
          storedProcedure: values[1],
          routeUrl: values[2],
          apiEndpoint: values[3],
          viewType: values[4],
          templateName: values[5],
          inputParameters: values[6] ? values[6].split(';').map(p => p.trim()).filter(p => p) : [],
          outputParameters: values[7] ? values[7].split(';').map(p => p.trim()).filter(p => p) : [],
          title: values[8],
          width: values[9],
          height: values[10],
          description: values[11]
        };
      }
    }
    
    console.log('CONTEXT MENU DEBUG: Custom view config NOT found for', viewId);
    return null;
  }

  /**
   * Update the selected row count
   */
  updateSelectedRowCount(count: number): void {
    this.selectedRowCount.next(count);
  }

  /**
   * Refresh the selected roles from localStorage
   * This should be called when roles are changed within the application
   */
  refreshSelectedRoles(): void {
    this.loadUserRoles();
    
    // Refresh the context menu if it's currently visible
    if (this.menuVisible.getValue()) {
      const position = this.menuPosition.getValue();
      this.showContextMenu(position.x, position.y);
    }
  }
}

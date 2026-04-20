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

import { Component, OnInit, OnDestroy, HostListener, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  CommandPaletteService,
  CommandPaletteCommand,
  FieldName,
  ScoredCommand
} from '../../services/command-palette.service';
import { Token, TokenInputComponent } from '../token-input/token-input.component';
import { CsvFormMenuIntegrationService } from '../../services/csv-form-menu-integration.service';
import { CsvFormDialogService } from '../../services/csv-form-dialog.service';
import { CsvFormService } from '../../services/csv-form.service';
import { TableStateService } from '../../services/table-state.service';
import { TableSelectionExtensionService } from '../../services/table-selection-extension.service';
import { ContextMenuService } from '../../services/context-menu.service';
import { RouteConfigParserService } from '../../services/route-config-parser.service';
import { RouteManagerService } from '../../services/route-manager.service';
import { CustomViewConfigService } from '../../services/custom-view-config.service';
import { ContextAwareRoutingService } from '../../services/context-aware-routing.service';

type ViewMode = 'search' | 'nameDescription' | 'all' | 'recent' | 'favorites';

@Component({
  selector: 'app-command-palette',
  templateUrl: './command-palette.component.html',
  styleUrls: ['./command-palette.component.scss']
})
export class CommandPaletteComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('actionInput') actionInput?: TokenInputComponent;
  @ViewChild('nameDescriptionInput') nameDescriptionInput?: any;
  
  viewMode: ViewMode = 'search';
  
  actionTokens: Token[] = [];
  objectTokens: Token[] = [];
  fieldTokens: Token[] = [];
  nameDescriptionSearchText: string = '';
  
  searchResults: ScoredCommand[] = [];
  allCommands: CommandPaletteCommand[] = [];
  recentCommands: CommandPaletteCommand[] = [];
  favoriteCommands: CommandPaletteCommand[] = [];
  
  displayedCommands: CommandPaletteCommand[] = [];
  
  // Column sorting
  sortColumn: string = '';
  sortOrder: 'asc' | 'desc' = 'asc';
  
  // Keyboard navigation
  selectedCommandIndex: number = -1;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private commandPaletteService: CommandPaletteService,
    private csvFormMenuIntegrationService: CsvFormMenuIntegrationService,
    private csvFormDialogService: CsvFormDialogService,
    private csvFormService: CsvFormService,
    private tableStateService: TableStateService,
    private tableSelectionExtensionService: TableSelectionExtensionService,
    private contextMenuService: ContextMenuService,
    private routeConfigParserService: RouteConfigParserService,
    private routeManagerService: RouteManagerService,
    private customViewConfigService: CustomViewConfigService,
    private contextAwareRoutingService: ContextAwareRoutingService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Set the window title from within the component (safe for all browsers including Edge)
    document.title = 'Command Palette';
    
    // Load initial data
    this.loadAllCommands();
    this.loadRecentCommands();
    this.loadFavoriteCommands();
    
    // Subscribe to recent commands updates
    this.commandPaletteService.recentCommands$
      .pipe(takeUntil(this.destroy$))
      .subscribe(recent => {
        this.recentCommands = recent;
        if (this.viewMode === 'recent') {
          this.displayedCommands = recent;
        }
      });
    
    // Subscribe to favorites updates
    this.commandPaletteService.favorites$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadFavoriteCommands();
      });
  }
  
  ngAfterViewInit(): void {
    // Auto-focus the first input field when dialog opens
    setTimeout(() => {
      if (this.actionInput && this.actionInput.inputElement) {
        this.actionInput.inputElement.nativeElement.focus();
      }
    }, 0);
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load all commands
   */
  private loadAllCommands(): void {
    this.allCommands = this.commandPaletteService.getAllCommands();
  }
  
  /**
   * Load recent commands
   */
  private loadRecentCommands(): void {
    this.commandPaletteService.recentCommands$
      .pipe(takeUntil(this.destroy$))
      .subscribe(recent => {
        this.recentCommands = recent;
      });
  }
  
  /**
   * Load favorite commands
   */
  private loadFavoriteCommands(): void {
    this.favoriteCommands = this.commandPaletteService.getFavoriteCommands();
  }
  
  /**
   * Search function for actions
   */
  searchActions = (query: string): string[] => {
    return this.commandPaletteService.searchActions(query);
  };
  
  /**
   * Search function for objects
   */
  searchObjects = (query: string): string[] => {
    return this.commandPaletteService.searchObjects(query);
  };
  
  /**
   * Search function for fields
   */
  searchFields = (query: string): FieldName[] => {
    return this.commandPaletteService.searchFieldNames(query);
  };
  
  /**
   * Handle name/description search text change
   */
  onNameDescriptionSearchChange(): void {
    this.performNameDescriptionSearch();
  }
  
  /**
   * Handle action tokens change
   */
  onActionTokensChange(tokens: Token[]): void {
    this.actionTokens = tokens;
    this.performSearch();
  }
  
  /**
   * Handle object tokens change
   */
  onObjectTokensChange(tokens: Token[]): void {
    this.objectTokens = tokens;
    this.performSearch();
  }
  
  /**
   * Handle field tokens change
   */
  onFieldTokensChange(tokens: Token[]): void {
    this.fieldTokens = tokens;
    this.performSearch();
  }
  
  /**
   * Perform search based on selected tokens
   */
  private performSearch(): void {
    if (this.viewMode !== 'search') {
      return;
    }
    
    const selectedActions = this.actionTokens.map(t => t.displayName);
    const selectedObjects = this.objectTokens.map(t => t.displayName);
    const selectedFields = this.fieldTokens.map(t => t.value as FieldName);
    
    if (selectedActions.length === 0 && selectedObjects.length === 0 && selectedFields.length === 0) {
      this.searchResults = [];
      this.displayedCommands = [];
      this.resetSort();
      return;
    }
    
    this.searchResults = this.commandPaletteService.findMatchingCommands(
      selectedActions,
      selectedObjects,
      selectedFields
    );
    
    this.displayedCommands = this.searchResults.map(sr => sr.command);
    this.resetSort();
  }
  
  /**
   * Perform name/description search
   */
  private performNameDescriptionSearch(): void {
    const allCommands = this.commandPaletteService.getAllCommands();
    const searchText = this.nameDescriptionSearchText.trim().toLowerCase();
    
    if (!searchText) {
      this.displayedCommands = [];
      this.resetSort();
      return;
    }
    
    // Filter commands that match the search text in Label or Description
    this.displayedCommands = allCommands.filter(cmd => {
      const labelMatch = cmd.Label && cmd.Label.toLowerCase().includes(searchText);
      const descMatch = cmd.Description && cmd.Description.toLowerCase().includes(searchText);
      return labelMatch || descMatch;
    });
    this.resetSort();
  }
  
  /**
   * Switch view mode
   */
  switchViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.selectedCommandIndex = -1; // Reset selection when switching modes
    this.resetSort(); // Reset sort when switching modes
    
    switch (mode) {
      case 'all':
        this.displayedCommands = this.allCommands;
        break;
      case 'recent':
        this.displayedCommands = this.recentCommands;
        break;
      case 'favorites':
        this.displayedCommands = this.favoriteCommands;
        break;
      case 'search':
        this.performSearch();
        break;
      case 'nameDescription':
        this.performNameDescriptionSearch();
        break;
    }
  }
  
  /**
   * Reset sort state
   */
  private resetSort(): void {
    this.sortColumn = '';
    this.sortOrder = 'asc';
  }
  
  /**
   * Handle keyboard navigation
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Check if the event target is one of the input fields
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || target.closest('app-token-input');
    
    switch (event.key) {
      case 'ArrowDown':
        // Only handle arrow keys if not in an input field or if suggestions are not showing
        if (!isInputField) {
          event.preventDefault();
          this.selectNextCommand();
        }
        break;
        
      case 'ArrowUp':
        // Only handle arrow keys if not in an input field or if suggestions are not showing
        if (!isInputField) {
          event.preventDefault();
          this.selectPreviousCommand();
        }
        break;
        
      case 'Enter':
        // Only execute command if not in an input field
        if (!isInputField) {
          event.preventDefault();
          if (this.selectedCommandIndex >= 0 && this.selectedCommandIndex < this.displayedCommands.length) {
            this.executeCommand(this.displayedCommands[this.selectedCommandIndex]);
          }
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
        
      case 'Tab':
        // Allow Tab to work normally for field navigation
        // Do not prevent default
        break;
    }
  }
  
  /**
   * Select next command in list
   */
  private selectNextCommand(): void {
    if (this.displayedCommands.length === 0) return;
    
    this.selectedCommandIndex = Math.min(
      this.selectedCommandIndex + 1,
      this.displayedCommands.length - 1
    );
    this.scrollToSelectedCommand();
  }
  
  /**
   * Select previous command in list
   */
  private selectPreviousCommand(): void {
    if (this.displayedCommands.length === 0) return;
    
    this.selectedCommandIndex = Math.max(this.selectedCommandIndex - 1, 0);
    this.scrollToSelectedCommand();
  }
  
  /**
   * Scroll to the selected command to keep it visible
   */
  private scrollToSelectedCommand(): void {
    setTimeout(() => {
      const selectedElement = document.querySelector('.command-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 0);
  }
  
  /**
   * Check if a command is selected
   */
  isCommandSelected(index: number): boolean {
    return this.selectedCommandIndex === index;
  }
  
  /**
   * Execute a command
   */
  executeCommand(command: CommandPaletteCommand): void {
    // Add to recent commands
    this.commandPaletteService.addToRecent(command);
    
    // Execute command based on ActionType
    // If we're in a popup window, navigate in the opener window
    if (window.opener && !window.opener.closed) {
      // Use the opener's router to navigate
      this.navigateToCommandInOpener(command);
    } else {
      // Fallback: navigate in current window
      this.navigateToCommand(command);
    }
    
    // Note: Window stays open so user can execute multiple commands
  }
  
  /**
   * Navigate to command using existing menu integration services
   * This follows the exact same pattern as the menu system
   */
  private navigateToCommand(command: CommandPaletteCommand): void {
    const actionType = command.ActionType;
    const reference = command.Reference;
    
    // Check if there's a selected row in any table (for context menu-style execution)
    const selectedRowData = this.getSelectedRowData();
    
    switch (actionType) {
      case 'READ':
        // For READ action type, use RouteConfigParserService to get the RouteUrl
        this.routeConfigParserService.getRouteUrlForTableName(reference)
          .subscribe({
            next: (routeUrl: string | undefined) => {
              if (routeUrl) {
                console.log(`Found RouteUrl: ${routeUrl} for TableName: ${reference}`);
                // Use context-aware routing to preserve ActionType
                this.contextAwareRoutingService.navigateWithContext({
                  actionType: 'READ',
                  reference: reference,
                  routeUrl: routeUrl
                });
              } else {
                console.error(`No RouteUrl found for TableName: ${reference}`);
              }
            },
            error: (error: Error) => {
              console.error(`Error looking up RouteUrl for TableName: ${reference}`, error);
            }
          });
        break;
        
      case 'FORM':
        // For FORM action type, open the form dialog directly (matching menu system behavior)
        console.log(`Opening form with ID: ${reference}`);
        
        // If there's selected row data, map column names to form field IDs
        // Selected row has table column names (e.g., 'Document ID')
        // Form expects field IDs (e.g., 'DocIDByMenu')
        // Map using form field's idAlias property
        let formParams: Record<string, any> = {};
        
        if (selectedRowData) {
          console.log(`COMMAND PALETTE: Mapping selected row data:`, selectedRowData);
          
          // Get form fields to perform the mapping
          const formFields = this.csvFormService.getFormFields(reference);
          
          // Map from column names (idAlias) to field IDs
          formFields.forEach(field => {
            if (field.idAlias && selectedRowData[field.idAlias] !== undefined) {
              formParams[field.id] = selectedRowData[field.idAlias];
              console.log(`COMMAND PALETTE: Mapped column '${field.idAlias}' to field '${field.id}': ${selectedRowData[field.idAlias]}`);
            }
          });
          
          console.log(`COMMAND PALETTE: Final mapped params:`, formParams);
        }
        
        try {
          // Check if this is a CUSTOM form
          const formDefinition = this.csvFormService.getForm(reference);
          
          this.csvFormDialogService.openFormDialog(reference, formParams)
            .subscribe({
              next: (result) => {
                console.log(`Form ${reference} submitted with result:`, result);
                
                // If this is a CUSTOM form, navigate to the custom route after dialog closes
                if (formDefinition && formDefinition.formType === 'CUSTOM' && formDefinition.reference) {
                  console.log(`COMMAND PALETTE: CUSTOM form submitted, navigating to ${formDefinition.reference}`);
                  
                  // Map form data to query parameters
                  const queryParams: Record<string, string> = {};
                  if (result) {
                    // Get form fields to map field IDs to parameter IDs
                    const formFields = this.csvFormService.getFormFields(reference);
                    
                    formFields.forEach(field => {
                      if (field.parameterId && result[field.id] !== undefined) {
                        queryParams[field.parameterId] = String(result[field.id]);
                      }
                    });
                  }
                  
                  const targetUrl = `/${formDefinition.reference}`;
                  const queryString = new URLSearchParams(queryParams).toString();
                  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
                  
                  console.log(`COMMAND PALETTE: Navigating to custom view: ${fullUrl}`);
                  
                  // Use context-aware routing to navigate
                  this.contextAwareRoutingService.navigateWithContext({
                    actionType: 'CUSTOM',
                    reference: formDefinition.reference,
                    routeUrl: fullUrl
                  });
                }
              },
              error: (error) => {
                console.error(`Error opening form ${reference}:`, error);
              }
            });
        } catch (error) {
          console.error(`Failed to open form ${reference}:`, error);
        }
        break;
        
      case 'DUC':
        // For DUC action type, use RouteManagerService to get the route config
        this.routeManagerService.getDucRouteConfig(reference).subscribe({
          next: (routeConfig) => {
            if (routeConfig) {
              console.log(`Navigating to DUC route: ${routeConfig.routeUrl}`);
              // Use context-aware routing to preserve ActionType
              this.contextAwareRoutingService.navigateWithContext({
                actionType: 'DUC',
                reference: reference,
                routeUrl: `/${routeConfig.routeUrl}`
              });
            } else {
              console.error(`DUC route not found for reference: ${reference}`);
            }
          },
          error: (error: Error) => {
            console.error(`Error looking up DUC route for reference: ${reference}`, error);
          }
        });
        break;
        
      case 'CHAIN':
        // For CHAIN action type, use CsvFormMenuIntegrationService
        if (selectedRowData) {
          // Context menu-style: with selected row data
          this.csvFormMenuIntegrationService.handleContextMenuAction(actionType, reference, selectedRowData)
            .subscribe({
              next: (result) => {
                console.log(`Chain ${reference} executed with result:`, result);
              },
              error: (error) => {
                console.error(`Error executing chain ${reference}:`, error);
              }
            });
        } else {
          // Main menu-style: without selected row data
          this.csvFormMenuIntegrationService.handleMainMenuAction(actionType, reference)
            .subscribe({
              next: (result) => {
                console.log(`Chain ${reference} executed with result:`, result);
              },
              error: (error) => {
                console.error(`Error executing chain ${reference}:`, error);
              }
            });
        }
        break;
        
      case 'CUSTOM':
        // For CUSTOM action type, use CustomViewConfigService
        this.customViewConfigService.getViewConfig(reference).subscribe({
          next: (viewConfig) => {
            if (viewConfig && viewConfig.routeUrl) {
              console.log(`Navigating to custom view: ${viewConfig.routeUrl}`);
              // Use context-aware routing to preserve ActionType
              this.contextAwareRoutingService.navigateWithContext({
                actionType: 'CUSTOM',
                reference: reference,
                routeUrl: viewConfig.routeUrl
              });
            } else {
              console.error(`Custom view configuration not found for reference: ${reference}`);
            }
          },
          error: (error) => {
            console.error(`Error loading custom view config for ${reference}:`, error);
          }
        });
        break;
        
      default:
        console.error(`Unsupported action type: ${actionType}`);
    }
  }
  
  /**
   * Get selected row data from the current table
   * Returns the first selected row found, or null if no rows are selected
   * Uses TableSelectionExtensionService which stores processed row data with ID/Name pairs
   */
  private getSelectedRowData(): any | null {
    // Get the current table name from the context menu service
    const tableName = this.contextMenuService.getCurrentTableName();
    
    if (!tableName) {
      console.log('COMMAND PALETTE: No current table name found');
      return null;
    }
    
    console.log(`COMMAND PALETTE: Getting selected rows for table '${tableName}'`);
    
    // Get selected rows from TableSelectionExtensionService (which has processed ID/Name pairs)
    const selectedRows = this.tableSelectionExtensionService.getRows(tableName);
    
    if (!selectedRows || selectedRows.length === 0) {
      console.log(`COMMAND PALETTE: No selected rows found for table '${tableName}'`);
      return null;
    }
    
    console.log(`COMMAND PALETTE: Found ${selectedRows.length} selected row(s) for table '${tableName}':`, selectedRows[0]);
    return selectedRows[0];
  }
  
  /**
   * Toggle favorite status
   */
  toggleFavorite(command: CommandPaletteCommand, event: Event): void {
    event.stopPropagation();
    
    if (this.isFavorite(command)) {
      this.commandPaletteService.removeFromFavorites(command.CommandId);
    } else {
      this.commandPaletteService.addToFavorites(command.CommandId);
    }
    
    // Refresh favorites list if in favorites view
    if (this.viewMode === 'favorites') {
      this.loadFavoriteCommands();
      this.displayedCommands = this.favoriteCommands;
    }
  }
  
  /**
   * Check if command is favorite
   */
  isFavorite(command: CommandPaletteCommand): boolean {
    return this.commandPaletteService.isFavorite(command.CommandId);
  }
  
  /**
   * Get score for command in search results
   */
  getCommandScore(command: CommandPaletteCommand): number {
    const result = this.searchResults.find(sr => sr.command.CommandId === command.CommandId);
    return result ? result.score : 0;
  }
  
  /**
   * Get matched items for command
   */
  getMatchedItems(command: CommandPaletteCommand): string {
    const result = this.searchResults.find(sr => sr.command.CommandId === command.CommandId);
    if (!result) return '';
    
    const matches: string[] = [];
    if (result.matchedActions.length > 0) {
      matches.push(`Actions: ${result.matchedActions.join(', ')}`);
    }
    if (result.matchedObjects.length > 0) {
      matches.push(`Objects: ${result.matchedObjects.join(', ')}`);
    }
    if (result.matchedFields.length > 0) {
      matches.push(`Fields: ${result.matchedFields.join(', ')}`);
    }
    
    return matches.join(' | ');
  }
  
  /**
   * Navigate to command in the opener window
   */
  private navigateToCommandInOpener(command: CommandPaletteCommand): void {
    // Send complete command to opener window to execute
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({
        type: 'EXECUTE_COMMAND',
        command: command
      }, window.location.origin);
    }
  }
  
  /**
   * Navigate to command via BroadcastChannel (Edge browser fallback)
   * Used when window.opener is null but we know we're in a popup window.
   * Edge can nullify window.opener for popup windows; BroadcastChannel
   * provides a same-origin communication mechanism that works regardless.
   */
  private navigateToCommandViaBroadcast(command: CommandPaletteCommand): void {
    try {
      const channel = new BroadcastChannel('commandPaletteChannel');
      channel.postMessage({
        type: 'EXECUTE_COMMAND',
        command: command
      });
      // Close the channel after sending - the receiver has its own channel instance
      channel.close();
      console.log('CommandPalette: Sent command via BroadcastChannel (Edge fallback)');
    } catch (e) {
      console.error('CommandPalette: BroadcastChannel not supported, falling back to in-window navigation', e);
      // Last resort fallback: navigate in current window
      this.navigateToCommand(command);
    }
  }
  
  /**
   * Handle column header click for sorting
   */
  onColumnSelect(column: string): void {
    if (this.sortColumn === column) {
      // Toggle sort order if clicking the same column
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new column and default to ascending
      this.sortColumn = column;
      this.sortOrder = 'asc';
    }
    this.sortDisplayedCommands();
  }
  
  /**
   * Sort the displayed commands based on current sort column and order
   */
  private sortDisplayedCommands(): void {
    if (!this.sortColumn) return;
    
    this.displayedCommands.sort((a, b) => {
      const valueA = a[this.sortColumn as keyof CommandPaletteCommand];
      const valueB = b[this.sortColumn as keyof CommandPaletteCommand];
      
      // Handle null/undefined values
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return 1;
      if (valueB == null) return -1;
      
      // Compare values
      if (valueA < valueB) {
        return this.sortOrder === 'asc' ? -1 : 1;
      } else if (valueA > valueB) {
        return this.sortOrder === 'asc' ? 1 : -1;
      } else {
        return 0;
      }
    });
  }
  
  /**
   * Close window
   */
  close(): void {
    // Check both window.opener and window.name to handle Edge browser
    if (window.opener || window.name === 'commandPaletteWindow') {
      window.close();
    } else {
      // If not in a popup, navigate back
      this.router.navigate(['/']);
    }
  }
}

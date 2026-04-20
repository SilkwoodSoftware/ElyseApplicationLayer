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

import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  OnDestroy,
  ViewContainerRef,
  ComponentFactoryResolver,
  HostListener,
} from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SelectedIdsService } from './shared/services/selected-ids.service';
import { InitialRolesComponent } from './reading/roles/initial-roles.component';
import { MenuService } from './shared/services/menu.service';
import * as E from 'fp-ts/Either';
import { MenuForest } from './shared/utils/MenuTreeBuilder';
import { MenuComponentModel } from './shared/components/menu/menu-item.model';
import { ContextMenuService } from './shared/services/context-menu.service';
import { RouteConfigParserService } from './shared/services/route-config-parser.service';
import { HelpMenuService } from './shared/services/help-menu.service';
import { ExcelExportService } from './shared/services/excel-export.service';
import { ProcessingIndicatorService } from './shared/services/processing-indicator.service';
import { MatDialog } from '@angular/material/dialog';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { CommandPaletteCommand, CommandPaletteService } from './shared/services/command-palette.service';
import { CsvFormMenuIntegrationService } from './shared/services/csv-form-menu-integration.service';
import { CsvFormDialogService } from './shared/services/csv-form-dialog.service';
import { CsvFormService } from './shared/services/csv-form.service';
import { TableStateService } from './shared/services/table-state.service';
import { TableSelectionExtensionService } from './shared/services/table-selection-extension.service';
import { RouteManagerService } from './shared/services/route-manager.service';
import { CustomViewConfigService } from './shared/services/custom-view-config.service';
import { ContextAwareRoutingService } from './shared/services/context-aware-routing.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  template: '<ng-container #container></ng-container>',
})
export class AppComponent implements OnInit, OnDestroy {
  // Added title for tests
  title = 'elyse_app-frontend';

  selectedIds: number[] = [];
  selectedUsernames: string[] = [];
  menuForest: MenuForest = [];
  menuComponentModel: MenuComponentModel = { items: [] };
  hideNavigation = false;
  showExcelButton = false;
  
  // BroadcastChannel for Edge browser fallback communication with command palette popup
  private commandPaletteChannel: BroadcastChannel | null = null;

  @Output() userDeleted: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private selectedIdsService: SelectedIdsService,
    private viewContainerRef: ViewContainerRef,
    private componentFactoryResolver: ComponentFactoryResolver,
    private menuService: MenuService,
    private contextMenuService: ContextMenuService,
    private routeConfigParser: RouteConfigParserService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private helpMenuService: HelpMenuService,
    private excelExportService: ExcelExportService,
    public processingIndicator: ProcessingIndicatorService,
    private dialog: MatDialog,
    private commandPaletteService: CommandPaletteService,
    private csvFormMenuIntegrationService: CsvFormMenuIntegrationService,
    private csvFormDialogService: CsvFormDialogService,
    private csvFormService: CsvFormService,
    private tableStateService: TableStateService,
    private tableSelectionExtensionService: TableSelectionExtensionService,
    private routeManagerService: RouteManagerService,
    private customViewConfigService: CustomViewConfigService,
    private contextAwareRoutingService: ContextAwareRoutingService
  ) { }

  onSelectedIdsChange(selectedIds: number[]): void {
    this.selectedIds = selectedIds;
  }

  ngOnInit(): void {
    // Check initial route
    this.checkHelpRoute();
    
    // Subscribe to router events to detect help routes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkHelpRoute();
        this.updateExcelButtonVisibility();
      });
    
    // Listen for messages from command palette popup window (via postMessage)
    window.addEventListener('message', (event) => {
      // Verify the message is from our origin
      if (event.origin !== window.location.origin) {
        return;
      }
      
      // Handle command execution from popup
      if (event.data && event.data.type === 'EXECUTE_COMMAND') {
        console.log('AppComponent: Received command from popup via postMessage:', event.data);
        this.executeCommandFromPopup(event.data.command);
      }
    });
    
    // Listen for messages from command palette popup window (via BroadcastChannel)
    // This is a fallback for Edge browser where window.opener can be null for popups
    try {
      this.commandPaletteChannel = new BroadcastChannel('commandPaletteChannel');
      this.commandPaletteChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'EXECUTE_COMMAND') {
          console.log('AppComponent: Received command from popup via BroadcastChannel:', event.data);
          this.executeCommandFromPopup(event.data.command);
        }
      };
    } catch (e) {
      console.warn('AppComponent: BroadcastChannel not available:', e);
    }
    
    const componentFactory =
      this.componentFactoryResolver.resolveComponentFactory(
        InitialRolesComponent
      );
    this.viewContainerRef.createComponent(componentFactory);

    this.selectedIdsService.selectedIds$.subscribe((ids) => {
      this.selectedIds = ids;
    });

    this.selectedIdsService.userDeleted$.subscribe(() => {
      this.refreshTable();
    });

    // Load the menu specification from CSV
    this.menuService.loadMenuSpec().subscribe((result) => {
      if (E.isRight(result)) {
        this.menuForest = result.right;
        console.log('Menu forest loaded:', this.menuForest);
      } else {
        console.error('Failed to load menu forest:', result.left);
      }
    });

    // Subscribe to menu component model
    this.menuService.menuComponentModel$.subscribe((result) => {
      if (E.isRight(result)) {
        this.menuComponentModel = result.right;
        console.log('Menu component model loaded:', this.menuComponentModel);
      } else {
        console.error('Failed to load menu component model:', result.left);
      }
    });

    // Initial check for Excel button visibility
    this.updateExcelButtonVisibility();
  }

  ngOnDestroy(): void {
    // Clean up BroadcastChannel
    if (this.commandPaletteChannel) {
      this.commandPaletteChannel.close();
      this.commandPaletteChannel = null;
    }
  }

  private checkHelpRoute(): void {
    // Check if the current route has hideNavigation flag set in its data
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.hideNavigation = route.snapshot.data['hideNavigation'] === true;
  }

  openHelpWindow(): void {
    this.helpMenuService.openHelpWindow();
  }

  /**
   * Handle Excel export button click
   */
  async onExcelExport(): Promise<void> {
    try {
      await this.excelExportService.exportTableToExcel();
    } catch (error) {
      console.error('Excel export failed:', error);
    }
  }

  /**
   * Update Excel button visibility based on table availability
   */
  private updateExcelButtonVisibility(): void {
    // Use a small delay to ensure the DOM is updated after route change
    setTimeout(() => {
      this.showExcelButton = this.excelExportService.isTableAvailable();
    }, 100);
  }

  refreshTable(): void {
    // This method will be triggered when userDeleted$ emits a value
    // No need to emit another event here since we're subscribing directly to the service
    // Emit an event to notify the ListUsersComponent to refresh the table
    // this.userDeleted.emit();
  }
  
  /**
   * Open the command palette in a separate window
   */
  openCommandPalette(): void {
    console.log('AppComponent: Opening command palette window');
    
    // Open command palette in a popup window
    const paletteRoute = `/command-palette`;
    const fullUrl = `${window.location.origin}${paletteRoute}`;
    
    console.log('AppComponent: Opening popup with URL:', fullUrl);
    
    // Calculate window size (80% of screen)
    const windowWidth = Math.floor(screen.width * 0.8);
    const windowHeight = Math.floor(screen.height * 0.8);
    
    // Center the window on screen
    const left = Math.floor((screen.width - windowWidth) / 2);
    const top = Math.floor((screen.height - windowHeight) / 2);
    
    const popup = window.open(
      fullUrl,
      'commandPaletteWindow',
      `width=${windowWidth},height=${windowHeight},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no,directories=no,addressbar=no,personalbar=no,copyhistory=no`
    );
    
    console.log('AppComponent: Popup window object:', popup);
    
    if (popup) {
      popup.focus();
      // Note: Do NOT access popup.document here - in Edge, accessing popup.document
      // while the Angular app is bootstrapping can blank the page. The title is set
      // from within the CommandPaletteComponent itself via document.title.
    } else {
      console.error('AppComponent: Failed to open command palette window - popup blocked?');
      // Fallback to same-window navigation if popup is blocked
      this.router.navigate([paletteRoute]);
    }
  }
  
  /**
   * Execute a command received from the command palette popup window
   * This replicates the exact logic from CommandPaletteComponent.navigateToCommand()
   */
  private executeCommandFromPopup(command: CommandPaletteCommand): void {
    const actionType = command.ActionType;
    const reference = command.Reference;
    
    console.log(`AppComponent: Executing command - ActionType: ${actionType}, Reference: ${reference}`);
    
    // Check if there's a selected row in any table (for context menu-style execution)
    const selectedRowData = this.getSelectedRowData();
    
    switch (actionType) {
      case 'READ':
        // For READ action type, use RouteConfigParserService to get the RouteUrl
        this.routeConfigParser.getRouteUrlForTableName(reference)
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
        let formParams: Record<string, any> = {};
        
        if (selectedRowData) {
          console.log(`APP COMPONENT: Mapping selected row data:`, selectedRowData);
          
          // Get form fields to perform the mapping
          const formFields = this.csvFormService.getFormFields(reference);
          
          // Map from column names (idAlias) to field IDs
          formFields.forEach(field => {
            if (field.idAlias && selectedRowData[field.idAlias] !== undefined) {
              formParams[field.id] = selectedRowData[field.idAlias];
              console.log(`APP COMPONENT: Mapped column '${field.idAlias}' to field '${field.id}': ${selectedRowData[field.idAlias]}`);
            }
          });
          
          console.log(`APP COMPONENT: Final mapped params:`, formParams);
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
                  console.log(`APP COMPONENT: CUSTOM form submitted, navigating to ${formDefinition.reference}`);
                  
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
                  
                  console.log(`APP COMPONENT: Navigating to custom view: ${fullUrl}`);
                  
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
   */
  private getSelectedRowData(): any | null {
    // Get the current table name from the context menu service
    const tableName = this.contextMenuService.getCurrentTableName();
    
    if (!tableName) {
      console.log('APP COMPONENT: No current table name found');
      return null;
    }
    
    console.log(`APP COMPONENT: Getting selected rows for table '${tableName}'`);
    
    // Get selected rows from TableSelectionExtensionService
    const selectedRows = this.tableSelectionExtensionService.getRows(tableName);
    
    if (!selectedRows || selectedRows.length === 0) {
      console.log(`APP COMPONENT: No selected rows found for table '${tableName}'`);
      return null;
    }
    
    console.log(`APP COMPONENT: Found ${selectedRows.length} selected row(s) for table '${tableName}':`, selectedRows[0]);
    return selectedRows[0];
  }
  
  /**
   * Handle keyboard shortcuts
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+Shift+P to open command palette
    if (event.ctrlKey && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      this.openCommandPalette();
    }
  }
  
  /**
   * Handle context menu events directly
   */
  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): boolean {
    // Check if we're right-clicking on a table row
    const target = event.target as HTMLElement;
    const tableRow = this.findParentTableRow(target);
    
    if (tableRow) {
      // Prevent default browser context menu
      event.preventDefault();
      event.stopPropagation();

      // Get the current URL path
      const currentPath = window.location.pathname;
      
      // Look up the table name from the read-routes.csv file
      this.routeConfigParser.getTableNameForRouteUrl(currentPath).subscribe(tableName => {
        if (tableName) {
          // If we found a matching table name in the route configuration, use it
          console.log('Found table name in route configuration:', tableName, 'for route:', currentPath);
          
          // Set the current table name in the context menu service
          this.contextMenuService.setCurrentTableName(tableName);
          
          // Set the selected row count to 1 for the context menu
          // In a real implementation, this would come from the table state service
          this.contextMenuService.updateSelectedRowCount(1);
    
          // Show context menu at cursor position
          this.contextMenuService.showContextMenu(
            event.pageX,
            event.pageY
          );
        } else {
          // If no table name is found, log an error and don't show the context menu
          console.error('No table name found in route configuration for route:', currentPath);
        }
      });
      
      // Return false to prevent the default context menu
      return false;
    }
    
    return true;
  }
  
  /**
   * Find the parent table row element
   */
  private findParentTableRow(element: HTMLElement | null): HTMLElement | null {
    if (!element) return null;
    
    // Check if the element is a table row
    if (element.tagName === 'TR') {
      return element;
    }
    
    // Check for elements with row-related classes or attributes
    if (
      element.classList.contains('row') ||
      element.classList.contains('table-row') ||
      element.getAttribute('role') === 'row' ||
      element.hasAttribute('data-row-id')
    ) {
      return element;
    }
    
    // Check parent elements (up to 10 levels to avoid infinite recursion)
    let parent = element.parentElement;
    let level = 0;
    while (parent && level < 10) {
      if (
        parent.tagName === 'TR' ||
        parent.classList.contains('row') ||
        parent.classList.contains('table-row') ||
        parent.getAttribute('role') === 'row' ||
        parent.hasAttribute('data-row-id')
      ) {
        return parent;
      }
      parent = parent.parentElement;
      level++;
    }
    
    return null;
  }
}

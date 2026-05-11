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

import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { MenuComponentModel, MenuItemModel, ActionMenuItemModel, ParentMenuItemModel, NavigationMenu } from './menu-item.model';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReadRouteConfigService } from '../../services/read-route-config.service';
import { RouteConfigParserService } from '../../services/route-config-parser.service';
import { CsvFormDialogService } from '../../services/csv-form-dialog.service';
import { CsvFormMenuIntegrationService } from '../../services/csv-form-menu-integration.service';
import { RouteManagerService } from '../../services/route-manager.service';
import { DucRouteConfig } from '../../interfaces/duc-route.interface';
import { CustomViewConfigService } from '../../services/custom-view-config.service';
import { ContextAwareRoutingService } from '../../services/context-aware-routing.service';
import { ContextMenuService } from '../../services/context-menu.service';
import { CsvFormService } from '../../services/csv-form.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class MenuComponent implements OnInit, OnDestroy {
  @Input() model: MenuComponentModel = { items: [] };
  private routeConfigsMap = new Map<string, any>();
  private selectedRoles: Array<{[key: string]: string} | string> = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private readRouteConfigService: ReadRouteConfigService,
    private routeConfigParserService: RouteConfigParserService,
    private csvFormDialogService: CsvFormDialogService,
    private csvFormMenuIntegrationService: CsvFormMenuIntegrationService,
    private routeManagerService: RouteManagerService,
    private customViewConfigService: CustomViewConfigService,
    private contextRouting: ContextAwareRoutingService,
    private contextMenuService: ContextMenuService,
    private csvFormService: CsvFormService
  ) {}

  // Track active menus
  public activeMenus: Set<string> = new Set();

  // Add a click listener to the document to close menus when clicking outside
  @HostListener('document:click')
  onDocumentClick() {
    this.closeAllMenus();
  }

  ngOnInit() {
    // Log the menu model to debug
    console.log('Menu component model:', this.model);

    // Log structure to verify all levels
    this.logMenuStructure(this.model.items, 0);
    
    // Initialize route configs map
    this.initRouteConfigsMap();
    
    // Load user roles from localStorage
    this.loadUserRoles();
    
    // Subscribe to context menu opening events to close navigation menus
    this.subscriptions.push(
      this.contextMenuService.contextMenuOpening$.subscribe(isOpening => {
        if (isOpening) {
          console.log('Context menu is opening - closing all navigation menus');
          this.closeAllMenus();
        }
      })
    );
  }
  
  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
   * Check if the user has a specific role
   */
  hasRole(role: string): boolean {
    return this.selectedRoles.some((selectedRole: {[key: string]: string} | string) =>
      (typeof selectedRole === 'object' && selectedRole['Role Name']?.toLowerCase() === role.toLowerCase()) ||
      (typeof selectedRole === 'string' && selectedRole.toLowerCase() === role.toLowerCase())
    );
  }
  
  /**
   * Check if the user has any of the roles required for a menu item
   */
  hasRequiredRole(item: MenuItemModel): boolean {
    // For parent menu items, first check parent-level roles, then check children
    if (this.isParentMenuItem(item)) {
      const parentItem = item as ParentMenuItemModel;
      
      // If the parent has explicit roles defined, the user must have one of those roles
      if (parentItem.roles && parentItem.roles.length > 0) {
        const hasParentRole = parentItem.roles.some((role: string) => this.hasRole(role));
        if (!hasParentRole) {
          return false;
        }
      }
      
      // Then check if any children are visible
      return parentItem.children.some(child => this.hasRequiredRole(child));
    }
    
    // For action menu items, check the roles
    if (this.isActionMenuItem(item)) {
      const roles = (item as ActionMenuItemModel).roles;
      if (!roles || roles.length === 0) {
        return true; // No roles required, so everyone can see it
      }
      
      // Check if the user has any of the required roles
      return roles.some((role: string) => this.hasRole(role));
    }
    
    return true; // Default to visible for unknown item types
  }

  /**
   * Check if the user has any of the roles required for a navigation menu
   */
  hasRequiredRoleForNavMenu(navMenu: NavigationMenu): boolean {
    // If explicit roles are defined at the nav menu level, check them
    if (navMenu.roles && navMenu.roles.length > 0) {
      return navMenu.roles.some((role: string) => this.hasRole(role));
    }
    
    // Otherwise, check if any children are visible to the user
    return navMenu.items.some(item => this.hasRequiredRole(item));
  }

  /**
   * Check if navigation menus are being used
   */
  get isUsingNavigationMenus(): boolean {
    return !!this.model.navigationMenus && this.model.navigationMenus.length > 0;
  }

  /**
   * Toggle a menu open or closed
   */
  toggleMenu(event: Event, menuId: string): void {
    event.stopPropagation(); // Prevent the click from bubbling up
    
    const menuElement = document.getElementById(menuId);
    if (!menuElement) return;
    
    // Check if this menu is already active
    if (this.activeMenus.has(menuId)) {
      // Close this menu and all its children
      this.closeMenuAndChildren(menuId);
    } else {
      // Opening a menu - close any open context menu first
      this.contextMenuService.hideContextMenu();
      
      // Close all other menus at the same level
      this.closeMenusAtSameLevel(menuId);
      
      // Open this menu
      menuElement.style.display = 'block';
      this.activeMenus.add(menuId);
    }
  }
  
  /**
   * Close a menu and all its child submenus
   */
  private closeMenuAndChildren(menuId: string): void {
    const menuElement = document.getElementById(menuId);
    if (menuElement) {
      menuElement.style.display = 'none';
    }
    this.activeMenus.delete(menuId);
    
    // Close all child menus that belong to this parent
    // Child menus have IDs that start with the parent ID pattern
    const childMenuIds = Array.from(this.activeMenus).filter(id => {
      // For navigation menus: navsubmenu-{menuIndex}-{level}-{itemId}
      // Children will have the same menuIndex but higher level
      if (menuId.startsWith('nav-') && id.startsWith('navsubmenu-')) {
        const parentIndex = menuId.replace('nav-', '');
        return id.startsWith(`navsubmenu-${parentIndex}-`);
      }
      
      // For legacy menus: submenu-{i}-{j}, subsubmenu-{i}-{j}-{k}
      // Children will have IDs that start with the parent prefix
      if (menuId.startsWith('menu-') && (id.startsWith('submenu-') || id.startsWith('subsubmenu-'))) {
        const parentIndex = menuId.replace('menu-', '');
        return id.startsWith(`submenu-${parentIndex}-`) || id.startsWith(`subsubmenu-${parentIndex}-`);
      }
      
      // For submenu children: subsubmenu should match parent submenu
      if (menuId.startsWith('submenu-') && id.startsWith('subsubmenu-')) {
        // Extract parent pattern: submenu-{i}-{j} -> subsubmenu-{i}-{j}-
        const parts = menuId.split('-');
        if (parts.length >= 3) {
          const parentPattern = `subsubmenu-${parts[1]}-${parts[2]}-`;
          return id.startsWith(parentPattern);
        }
      }
      
      // For navsubmenu children: find only descendants (higher level numbers)
      if (menuId.startsWith('navsubmenu-')) {
        const parts = menuId.split('-');
        const idParts = id.split('-');
        
        // navsubmenu-{menuIndex}-{level}-{itemId}
        if (parts.length >= 4 && idParts.length >= 4 && id.startsWith('navsubmenu-')) {
          const menuIndex = parts[1];
          const currentLevel = parseInt(parts[2], 10);
          const childMenuIndex = idParts[1];
          const childLevel = parseInt(idParts[2], 10);
          
          // Only close children: same menuIndex AND higher level number
          return menuIndex === childMenuIndex && childLevel > currentLevel;
        }
      }
      
      return false;
    });
    
    // Close all child menus
    childMenuIds.forEach(childId => {
      const childElement = document.getElementById(childId);
      if (childElement) {
        childElement.style.display = 'none';
      }
      this.activeMenus.delete(childId);
    });
  }
  
  /**
   * Close all menus
   */
  closeAllMenus(): void {
    this.activeMenus.forEach(menuId => {
      const menuElement = document.getElementById(menuId);
      if (menuElement) {
        menuElement.style.display = 'none';
      }
    });
    this.activeMenus.clear();
  }
  
  /**
   * Close all menus at the same level as the given menu
   */
  closeMenusAtSameLevel(menuId: string): void {
    console.log('closeMenusAtSameLevel called with menuId:', menuId);
    
    // Handle different menu ID patterns
    if (menuId.startsWith('navsubmenu-')) {
      // NEW navigation system: navsubmenu-menuIndex-level-itemId
      // Only close menus at the exact same level within the same parent menu
      const parts = menuId.split('-');
      if (parts.length >= 3) {
        const menuIndex = parts[1];
        const level = parts[2];
        const levelPrefix = `navsubmenu-${menuIndex}-${level}-`;
        
        console.log('Closing navsubmenu level with prefix:', levelPrefix);
        
        this.activeMenus.forEach(id => {
          if (id.startsWith(levelPrefix) && id !== menuId) {
            console.log('Closing menu at same level:', id);
            const menuElement = document.getElementById(id);
            if (menuElement) {
              menuElement.style.display = 'none';
            }
            this.activeMenus.delete(id);
          }
        });
      }
    } else {
      // LEGACY navigation system: menu, submenu, subsubmenu
      const level = menuId.split('-')[0]; // menu, submenu, or subsubmenu
      
      console.log('Closing legacy menu level:', level);
      
      this.activeMenus.forEach(id => {
        if (id.startsWith(level) && id !== menuId) {
          console.log('Closing legacy menu at same level:', id);
          const menuElement = document.getElementById(id);
          if (menuElement) {
            menuElement.style.display = 'none';
          }
          this.activeMenus.delete(id);
        }
      });
    }
  }

  /**
   * Initialize the route configs map for use with menu item actions
   */
  private initRouteConfigsMap() {
    // Get all read route configurations
    const readRoutes = this.readRouteConfigService.getAllRoutes();
    console.log('Available routes:', readRoutes);
    
    // Store routes by both URL and reference name to ensure we can find them
    readRoutes.forEach(config => {
      // Store by route URL
      this.routeConfigsMap.set(config.routeUrl, config);
      
      // Also store by route URL without leading slash for flexibility
      if (config.routeUrl.startsWith('/')) {
        this.routeConfigsMap.set(config.routeUrl.substring(1), config);
      }
      
      // NO FALLBACKS - Do not store by display name
    });
    
  }

  /**
   * Helper to check if a menu item is a parent (has children)
   */
  isParentMenuItem(item: MenuItemModel): item is ParentMenuItemModel {
    return item.type === 'parent';
  }

  /**
   * Helper to check if a menu item is an action item
   */
  isActionMenuItem(item: MenuItemModel): item is ActionMenuItemModel {
    return item.type === 'action';
  }

  /**
   * Helper to log the menu structure for debugging
   */
  private logMenuStructure(items: MenuItemModel[], level: number) {
    const indent = '  '.repeat(level);
    items.forEach((item) => {
      console.log(`${indent}${item.label} (${item.id})`);
      if (this.isParentMenuItem(item) && item.children.length > 0) {
        this.logMenuStructure(item.children, level + 1);
      }
    });
  }

  /**
   * Handle menu item click based on type and properties
   */
  onMenuItemClick(item: MenuItemModel): void {
    console.log('Menu item clicked:', item);
    
    if (this.isParentMenuItem(item)) {
      // If it's a parent menu item with children, don't navigate
      console.log('Item has children, no navigation needed');
      return;
    }
    
    if (!this.isActionMenuItem(item)) {
      // This shouldn't happen given our type structure, but as a safeguard
      console.error('Menu item is neither a parent nor an action item', item);
      return;
    }
    
    // Close all menus when an action item is clicked
    this.closeAllMenus();
    
    // At this point, we know it's an action item
    const actionItem = item as ActionMenuItemModel;
    
    switch (actionItem.actionType) {
      case 'READ':
        // For READ action type, map the Reference to TableName in read-routes.csv
        // and then get the corresponding RouteUrl
        console.log(`Looking up RouteUrl for TableName: ${actionItem.reference}`);
        
        this.routeConfigParserService.getRouteUrlForTableName(actionItem.reference)
          .subscribe({
            next: (routeUrl: string | undefined) => {
              if (routeUrl) {
                console.log(`Found RouteUrl: ${routeUrl} for TableName: ${actionItem.reference}`);
                // Use context-aware routing to preserve ActionType
                this.contextRouting.navigateWithContext({
                  actionType: 'READ',
                  reference: actionItem.reference,
                  routeUrl: routeUrl
                });
              } else {
                // NO FALLBACKS - If the RouteUrl is not found, throw an error
                throw new Error(`No RouteUrl found for TableName: ${actionItem.reference}`);
              }
            },
            error: (error: Error) => {
              // NO FALLBACKS - If there's an error looking up the RouteUrl, throw an error
              console.error(`Error looking up RouteUrl for TableName: ${actionItem.reference}`, error);
              throw new Error(`Failed to look up RouteUrl for TableName: ${actionItem.reference}`);
            }
          });
        break;
      
      case 'FORM':
        // For FORM action type, open the form using the reference as the formId
        console.log(`Opening form with ID: ${actionItem.reference}`);
        try {
          // Check if this is a CUSTOM form
          const formDefinition = this.csvFormService.getForm(actionItem.reference);
          
          this.csvFormDialogService.openFormDialog(actionItem.reference)
            .subscribe({
              next: (result) => {
                console.log(`Form ${actionItem.reference} submitted with result:`, result);
                
                // If this is a CUSTOM form, navigate to the custom route after dialog closes
                if (formDefinition && formDefinition.formType === 'CUSTOM' && formDefinition.reference) {
                  console.log(`MENU: CUSTOM form submitted, navigating to ${formDefinition.reference}`);
                  
                  // Map form data to query parameters
                  const queryParams: Record<string, string> = {};
                  if (result) {
                    // Get form fields to map field IDs to parameter IDs
                    const formFields = this.csvFormService.getFormFields(actionItem.reference);
                    
                    formFields.forEach(field => {
                      if (field.parameterId && result[field.id] !== undefined) {
                        queryParams[field.parameterId] = String(result[field.id]);
                      }
                    });
                  }
                  
                  const targetUrl = `/${formDefinition.reference}`;
                  const queryString = new URLSearchParams(queryParams).toString();
                  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
                  
                  console.log(`MENU: Navigating to custom view: ${fullUrl}`);
                  
                  // Use context-aware routing to navigate
                  this.contextRouting.navigateWithContext({
                    actionType: 'CUSTOM',
                    reference: formDefinition.reference,
                    routeUrl: fullUrl
                  });
                }
              },
              error: (error) => {
                console.error(`Error opening form ${actionItem.reference}:`, error);
              }
            });
        } catch (error) {
          console.error(`Failed to open form ${actionItem.reference}:`, error);
        }
        break;
      
      case 'CHAIN':
        // For CHAIN action type, use the CsvFormMenuIntegrationService to execute the chain
        console.log(`Executing form chain: ${actionItem.reference}`);
        this.csvFormMenuIntegrationService.handleMainMenuAction('CHAIN', actionItem.reference)
          .subscribe({
            next: (result) => {
              console.log(`Chain ${actionItem.reference} executed with result:`, result);
              // Handle chain result if needed
            },
            error: (error) => {
              console.error(`Error executing chain ${actionItem.reference}:`, error);
            }
          });
        break;
      
      case 'DUC':
        // For DUC action type, navigate to the route URL
        console.log(`Navigating to DUC route with reference: ${actionItem.reference}`);
        
        // Look up the route in duc-routes.csv by RouteId (which is the reference in navigation-bar.csv)
        this.routeManagerService.getDucRouteConfig(actionItem.reference).subscribe({
          next: (routeConfig: DucRouteConfig | undefined) => {
            if (routeConfig) {
              console.log(`Navigating to DUC route: ${routeConfig.routeUrl}`);
              // Use context-aware routing to preserve ActionType
              this.contextRouting.navigateWithContext({
                actionType: 'DUC',
                reference: actionItem.reference,
                routeUrl: `/${routeConfig.routeUrl}`
              });
            } else {
              console.error(`DUC route not found for reference: ${actionItem.reference}`);
            }
          },
          error: (error: Error) => {
            console.error(`Error looking up DUC route for reference: ${actionItem.reference}`, error);
          }
        });
        break;
      
      case 'CUSTOM':
        // For CUSTOM action type, look up the custom view configuration and navigate using context-aware routing
        console.log(`Handling CUSTOM action with reference: ${actionItem.reference}`);
        this.customViewConfigService.getViewConfig(actionItem.reference).subscribe({
          next: (viewConfig) => {
            if (viewConfig && viewConfig.routeUrl) {
              console.log(`Navigating to custom view: ${viewConfig.routeUrl}`);
              // Use context-aware routing to preserve ActionType
              this.contextRouting.navigateWithContext({
                actionType: 'CUSTOM',
                reference: actionItem.reference,
                routeUrl: viewConfig.routeUrl
              });
            } else {
              console.error(`Custom view configuration not found for reference: ${actionItem.reference}`);
            }
          },
          error: (error) => {
            console.error(`Error loading custom view config for ${actionItem.reference}:`, error);
          }
        });
        break;
      
      default:
        console.error(`Unsupported action type: ${actionItem.actionType}`);
        // Don't throw an error - just log it and continue
        break;
    }
  }

  // This method is only used for NAVIGATION action type
  navigateTo(route: string): void {
    if (!route) {
      console.warn('Cannot navigate to empty route');
      return;
    }
    
    console.log('Navigating to:', route);
    
    // Use Angular Router for navigation instead of window.location.href
    // to avoid Content Security Policy issues
    if (route.startsWith('/')) {
      this.router.navigateByUrl(route);
    } else {
      this.router.navigateByUrl('/' + route);
    }
  }
}

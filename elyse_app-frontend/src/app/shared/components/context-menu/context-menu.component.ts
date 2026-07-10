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

import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ContextMenuService, ContextMenuItem } from '../../services/context-menu.service';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent implements OnInit, OnDestroy {
  visible = false;
  position = { x: 0, y: 0 };
  menuItems: ContextMenuItem[] = [];
  
  private subscriptions: Subscription[] = [];
  private activeSubmenus: Set<string> = new Set();

  constructor(
    private contextMenuService: ContextMenuService,
    private elementRef: ElementRef
  ) { }

  ngOnInit(): void {
    // Subscribe to menu visibility changes
    this.subscriptions.push(
      this.contextMenuService.menuVisible$.subscribe(visible => {
        this.visible = visible;
      })
    );

    // Subscribe to menu position changes
    this.subscriptions.push(
      this.contextMenuService.menuPosition$.subscribe(position => {
        this.position = position;
        this.adjustMenuPosition();
      })
    );

    // Subscribe to active menu items
    this.subscriptions.push(
      this.contextMenuService.activeMenuItems$.subscribe(items => {
        this.menuItems = items;
      })
    );
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Handle menu item click
   */
  onMenuItemClick(event: Event, item: ContextMenuItem): void {
    // Stop propagation to prevent parent submenu from toggling
    event.stopPropagation();
    
    // Only handle selection if this item has an action (no children)
    if (!item.children || item.children.length === 0) {
      this.contextMenuService.handleMenuItemSelection(item);
      this.closeAllSubmenus();
    }
  }

  /**
   * Close menu when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Check if click is outside the menu
    if (this.visible && !this.elementRef.nativeElement.contains(event.target)) {
      this.contextMenuService.hideContextMenu();
      this.closeAllSubmenus();
    }
  }

  /**
   * Toggle submenu visibility when a parent menu item is clicked
   * Uses the same approach as the navigation menu component
   */
  toggleSubmenu(event: Event, item: ContextMenuItem): void {
    event.stopPropagation(); // Prevent the click from bubbling up
    
    // Generate a unique ID for this submenu
    const submenuId = `submenu-${item.menuItemId}`;
    
    // Use document.getElementById like the main menu does
    const menuElement = document.getElementById(submenuId);
    if (!menuElement) {
      console.error(`Submenu element with ID ${submenuId} not found`);
      return;
    }
    
    console.log(`Toggling submenu ${submenuId}`);
    
    // Check if this menu is already active
    if (this.activeSubmenus.has(submenuId)) {
      // Close this menu and all its children
      this.closeMenuAndChildren(submenuId);
    } else {
      // Close all other menus at the same level (siblings only)
      this.closeMenusAtSameLevel(submenuId);
      
      // Open this menu
      menuElement.style.display = 'block';
      this.activeSubmenus.add(submenuId);
    }
  }
  
  /**
   * Close a menu and all its child submenus
   * Based on the navigation menu component's approach
   */
  private closeMenuAndChildren(menuId: string): void {
    const menuElement = document.getElementById(menuId);
    if (menuElement) {
      menuElement.style.display = 'none';
    }
    this.activeSubmenus.delete(menuId);
    
    // Close all child menus that belong to this parent
    // Child menus have IDs that start with the parent ID
    const childMenuIds = Array.from(this.activeSubmenus).filter(id => {
      // submenu-{parentId}-{childId} pattern
      // Children will have IDs that start with submenu-{parentId}-
      if (menuId.startsWith('submenu-')) {
        const parentId = menuId.replace('submenu-', '');
        return id.startsWith(`submenu-${parentId}-`);
      }
      return false;
    });
    
    // Close all child menus
    childMenuIds.forEach(childId => {
      const childElement = document.getElementById(childId);
      if (childElement) {
        childElement.style.display = 'none';
      }
      this.activeSubmenus.delete(childId);
    });
  }
  
  /**
   * Close all menus at the same level as the given menu
   * Based on the navigation menu component's approach
   */
  private closeMenusAtSameLevel(menuId: string): void {
    console.log('closeMenusAtSameLevel called with menuId:', menuId);
    
    // For context menus, we need to determine the level by counting hyphens
    // submenu-{id} = level 1
    // submenu-{parentId}-{id} = level 2
    // submenu-{grandparentId}-{parentId}-{id} = level 3, etc.
    
    const parts = menuId.split('-');
    const level = parts.length; // Number of parts indicates the level
    
    console.log('Closing context menu level:', level, 'parts:', parts);
    
    // Close all menus with the same number of parts (same level)
    this.activeSubmenus.forEach(id => {
      const idParts = id.split('-');
      
      // Same level if same number of parts
      if (idParts.length === level && id !== menuId) {
        // Also check if they share the same parent (all parts except last match)
        const sameParent = parts.slice(0, -1).every((part, index) => part === idParts[index]);
        
        if (sameParent) {
          console.log('Closing menu at same level:', id);
          const menuElement = document.getElementById(id);
          if (menuElement) {
            menuElement.style.display = 'none';
          }
          this.activeSubmenus.delete(id);
        }
      }
    });
  }

  /**
   * Close all open submenus
   */
  private closeAllSubmenus(): void {
    this.activeSubmenus.forEach(submenuId => {
      const menuElement = document.getElementById(submenuId);
      if (menuElement) {
        menuElement.style.display = 'none';
      }
    });
    this.activeSubmenus.clear();
  }

  /**
   * Close menu when pressing Escape
   */
  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.visible) {
      this.contextMenuService.hideContextMenu();
      this.closeAllSubmenus();
    }
  }

  /**
   * Adjust menu position to ensure it stays within viewport
   */
  private adjustMenuPosition(): void {
    if (!this.visible) return;

    // We need to wait for the menu to be rendered to get its dimensions
    setTimeout(() => {
      const menu = this.elementRef.nativeElement.querySelector('.context-menu');
      if (!menu) return;

      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position if menu would go off-screen
      if (this.position.x + menuRect.width > viewportWidth) {
        this.position = {
          ...this.position,
          x: viewportWidth - menuRect.width - 5
        };
      }

      // Adjust vertical position if menu would go off-screen
      if (this.position.y + menuRect.height > viewportHeight) {
        this.position = {
          ...this.position,
          y: viewportHeight - menuRect.height - 5
        };
      }
      
      // Check if any submenus would go off-screen
      this.adjustSubmenuPositions();
    });
  }
  
  /**
   * Adjust submenu positions to ensure they stay within viewport horizontally
   * but allow them to extend beyond the viewport vertically
   */
  private adjustSubmenuPositions(): void {
    // Get all submenus
    const submenus = this.elementRef.nativeElement.querySelectorAll('.submenu');
    const viewportWidth = window.innerWidth;
    
    submenus.forEach((submenu: HTMLElement) => {
      const submenuRect = submenu.getBoundingClientRect();
      
      // If submenu would go off right edge, show it on the left side of the parent
      if (submenuRect.right > viewportWidth) {
        submenu.style.left = 'auto';
        submenu.style.right = '100%';
      }
      
      // We don't adjust for vertical overflow anymore
      // This allows the submenu to extend beyond the viewport
      // so the overall window can be scrolled to view it
    });
  }
}

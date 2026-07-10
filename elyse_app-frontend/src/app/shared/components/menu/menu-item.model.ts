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

/**
 * Menu item component model.
 * This defines the data structure for a menu item component.
 */

// Base properties that all menu items have
interface BaseMenuItemModel {
  id: string; // Used as route path for navigation
  label: string; // Display text for the menu item
}

// A parent menu item has children but no action properties
export interface ParentMenuItemModel extends BaseMenuItemModel {
  type: 'parent';
  children: MenuItemModel[];
  roles?: string[]; // Roles that can access this menu item (optional)
  description?: string; // Description of the menu item (optional)
}

// An action menu item has action properties but no children
export interface ActionMenuItemModel extends BaseMenuItemModel {
  type: 'action';
  actionType: string; // Type of action for the menu item
  roles: string[]; // Roles that can access this menu item
  reference: string; // Reference to the action to perform
  description?: string; // Description of the menu item (optional)
}

// Menu item model as a discriminated union
export type MenuItemModel = ParentMenuItemModel | ActionMenuItemModel;

// Navigation menu for multiple dropdown support
export interface NavigationMenu {
  id: string;
  label: string;
  items: MenuItemModel[];
  order: number;
  roles?: string[];
  description?: string;
}

// Menu component model is the root container for menu items
export interface MenuComponentModel {
  items: MenuItemModel[];           // Keep for backward compatibility
  navigationMenus?: NavigationMenu[]; // NEW: Multiple navigation dropdowns
}

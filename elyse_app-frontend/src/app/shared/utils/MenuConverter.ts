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
 * MenuConverter module for converting MenuForest to MenuComponentModel
 * using functional programming with fp-ts.
 *
 * All functions in this module are pure functions with no side effects.
 */

import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { MenuForest, MenuTreeNode } from './MenuTreeBuilder';
import {
  MenuComponentModel,
  MenuItemModel,
  ParentMenuItemModel,
  ActionMenuItemModel,
  NavigationMenu,
} from '../components/menu/menu-item.model';
import {
  MenuComponentErrorType,
  MenuComponentErrors,
} from '../models/menu-component-error.model';

/**
 * MenuConverter class with methods to convert MenuForest to MenuComponentModel.
 * All methods are pure functions.
 */
export class MenuConverter {
  /**
   * Convert a MenuTreeNode to an Option of MenuItemModel.
   * Returns None if the required fields are missing.
   * This is a pure function with no side effects.
   *
   * @param menuNode The MenuTreeNode to convert
   * @returns Option of MenuItemModel
   */
  private static convertMenuNode(
    menuNode: MenuTreeNode
  ): O.Option<MenuItemModel> {
    try {
      // Check if required base fields are missing
      if (!menuNode.id || !menuNode.data.label) {
        console.warn(`Skipping menu item with missing required fields: ID: ${menuNode.id}, Label: ${menuNode.data.label}`);
        return O.none;
      }

      // Process children recursively
      const processChildren = () => {
        // Sort children by order if present
        const sortedChildren = [...menuNode.children].sort((a, b) => {
          const orderA = pipe(
            a.data.order,
            O.getOrElse(() => Number.MAX_SAFE_INTEGER)
          );
          const orderB = pipe(
            b.data.order,
            O.getOrElse(() => Number.MAX_SAFE_INTEGER)
          );
          return orderA - orderB;
        });

        // Process each child and filter out None results
        return sortedChildren
          .map(child => this.convertMenuNode(child))
          .filter(O.isSome)
          .map(option => option.value);
      };
      
      const children = processChildren();
      
      // Create either a parent menu item (with children) or an action menu item (with action properties)
      // This implements the algebraic data type pattern
      
      // First check if this is a submenu item (ActionType is blank)
      // According to the functional description, a blank ActionType indicates a submenu item
      if (O.isNone(menuNode.data.actionType)) {
        // Create a parent menu item regardless of whether it has children
        const parentMenuItem: ParentMenuItemModel = {
          type: 'parent',
          id: menuNode.id,
          label: menuNode.data.label,
          children: children // This might be empty, but that's OK
        };
        
        // Add roles if they exist (controls visibility based on user roles)
        if (menuNode.data.roles && menuNode.data.roles.length > 0) {
          parentMenuItem.roles = menuNode.data.roles;
        }
        
        // Add description only if it exists
        if (O.isSome(menuNode.data.description)) {
          parentMenuItem.description = menuNode.data.description.value;
        }
        
        return O.some(parentMenuItem);
      } else if (children.length > 0) {
        // If it has children, create a parent menu item
        const parentMenuItem: ParentMenuItemModel = {
          type: 'parent',
          id: menuNode.id,
          label: menuNode.data.label,
          children: children
        };
        
        // Add roles if they exist (controls visibility based on user roles)
        if (menuNode.data.roles && menuNode.data.roles.length > 0) {
          parentMenuItem.roles = menuNode.data.roles;
        }
        
        // Add description only if it exists
        if (O.isSome(menuNode.data.description)) {
          parentMenuItem.description = menuNode.data.description.value;
        }
        
        return O.some(parentMenuItem);
      } else {
        // Check if required action fields are present for action items
        // Since we already checked for blank ActionType above, we know ActionType is present here
        // Note: Empty roles are allowed (means visible to everyone)
        if (
          !menuNode.data.roles ||
          O.isNone(menuNode.data.reference)
        ) {
          console.warn(
            `Skipping action menu item "${menuNode.data.label}" (${menuNode.id}) due to missing required fields: ` +
            `roles: ${Boolean(menuNode.data.roles)}, ` +
            `reference: ${O.isSome(menuNode.data.reference)}`
          );
          return O.none;
        }
        
        // Special handling for CUSTOM action types
        const actionType = menuNode.data.actionType.value;
        const reference = menuNode.data.reference.value;
        
        if (actionType === 'CUSTOM') {
          // For CUSTOM action types, validate that the reference is not empty
          if (!reference || reference.trim() === '') {
            console.warn(
              `Skipping CUSTOM action menu item "${menuNode.data.label}" (${menuNode.id}) due to empty reference`
            );
            return O.none;
          }
          
          // Suppress routine CUSTOM action validation messages to reduce console spam
          // console.warn(
          //   `CUSTOM action menu item "${menuNode.data.label}" (${menuNode.id}) references "${reference}" - validation deferred to runtime`
          // );
        }
        
        // Create an action menu item
        const actionMenuItem: ActionMenuItemModel = {
          type: 'action',
          id: menuNode.id,
          label: menuNode.data.label,
          actionType: actionType,
          roles: menuNode.data.roles,
          reference: reference
        };
        
        // Add description only if it exists
        if (O.isSome(menuNode.data.description)) {
          actionMenuItem.description = menuNode.data.description.value;
        }
        
        return O.some(actionMenuItem);
      }
    } catch (error) {
      console.error(
        `Unexpected error converting menu node ${menuNode.id || 'unknown'}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return O.none;
    }
  }

  /**
   * Convert a MenuForest to a MenuComponentModel.
   * This implements a hyloamorphism (anamorphism followed by catamorphism).
   *
   * @param menuForest The MenuForest to convert
   * @returns Either an error or a MenuComponentModel
   */
  static convertForestToComponentModel(
    menuForest: MenuForest
  ): E.Either<MenuComponentErrorType, MenuComponentModel> {
    try {
      // Process each root node and filter out None results
      const processRootNodes = (): MenuItemModel[] => {
        return menuForest
          .map(node => this.convertMenuNode(node))
          .filter(O.isSome)
          .map(option => option.value);
      };

      // Create the menu component
      const menuComponent: MenuComponentModel = {
        items: processRootNodes()
      };

      return E.right(menuComponent);
    } catch (error) {
      return E.left(
        MenuComponentErrors.fromMenuTreeBuilderError(
          error,
          `Unexpected error converting menu forest: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  /**
   * Convert a MenuForest to a MenuComponentModel with multiple navigation menus.
   * Finds the NavigationBar root node and converts its children into separate NavigationMenus.
   * This enables multiple navigation bar dropdowns.
   *
   * @param menuForest The MenuForest to convert
   * @returns Either an error or a MenuComponentModel with navigationMenus
   */
  static convertForestToNavigationMenus(
    menuForest: MenuForest
  ): E.Either<MenuComponentErrorType, MenuComponentModel> {
    try {
      console.log('Converting MenuForest to NavigationMenus:', menuForest.length, 'root nodes');
      
      const navigationMenus: NavigationMenu[] = [];

      // Find the NavigationBar root node (fallback to MainMenu for backward compatibility)
      const navigationBarNode = menuForest.find(node => node.id === 'NavigationBar') ||
                               menuForest.find(node => node.id === 'MainMenu');
      
      if (!navigationBarNode) {
        console.warn('NavigationBar root node not found in MenuForest');
        // Fallback: treat all root nodes as navigation menus
        for (const rootNode of menuForest) {
          if (!rootNode.id || !rootNode.data.label) {
            continue;
          }
          
          const menuItems = this.convertNodeChildrenToMenuItems(rootNode);
          const navigationMenu: NavigationMenu = {
            id: rootNode.id,
            label: rootNode.data.label,
            items: menuItems,
            order: pipe(rootNode.data.order, O.getOrElse(() => Number.MAX_SAFE_INTEGER))
          };
          
          if (rootNode.data.roles && rootNode.data.roles.length > 0) {
            navigationMenu.roles = rootNode.data.roles;
          }
          
          if (O.isSome(rootNode.data.description)) {
            navigationMenu.description = rootNode.data.description.value;
          }
          
          navigationMenus.push(navigationMenu);
        }
      } else {
        console.log('Found NavigationBar node with', navigationBarNode.children.length, 'children');
        
        // Convert each child of NavigationBar - distinguish between action items and parent menus
        for (const childNode of navigationBarNode.children) {
          // Skip nodes without required fields
          if (!childNode.id || !childNode.data.label) {
            continue;
          }

          // Check if this is a parent menu (blank ActionType) or action item (has ActionType)
          const hasActionType = O.isSome(childNode.data.actionType);
          const hasChildren = childNode.children.length > 0;

          if (!hasActionType && hasChildren) {
            // This is a parent menu - create a NavigationMenu dropdown
            const menuItems = this.convertNodeChildrenToMenuItems(childNode);

            const navigationMenu: NavigationMenu = {
              id: childNode.id,
              label: childNode.data.label,
              items: menuItems,
              order: pipe(
                childNode.data.order,
                O.getOrElse(() => Number.MAX_SAFE_INTEGER)
              )
            };

            // Add optional fields if they exist
            if (childNode.data.roles && childNode.data.roles.length > 0) {
              navigationMenu.roles = childNode.data.roles;
            }

            if (O.isSome(childNode.data.description)) {
              navigationMenu.description = childNode.data.description.value;
            }

            navigationMenus.push(navigationMenu);
          } else if (hasActionType) {
            // This is an action item - create a NavigationMenu with a single action item
            const actionItem = this.convertMenuNode(childNode);
            
            if (O.isSome(actionItem)) {
              const navigationMenu: NavigationMenu = {
                id: childNode.id,
                label: childNode.data.label,
                items: [actionItem.value], // Single action item
                order: pipe(
                  childNode.data.order,
                  O.getOrElse(() => Number.MAX_SAFE_INTEGER)
                )
              };

              // Add optional fields if they exist
              if (childNode.data.roles && childNode.data.roles.length > 0) {
                navigationMenu.roles = childNode.data.roles;
              }

              if (O.isSome(childNode.data.description)) {
                navigationMenu.description = childNode.data.description.value;
              }

              navigationMenus.push(navigationMenu);
            }
          }
        }
      }

      // Sort navigation menus by order
      navigationMenus.sort((a, b) => a.order - b.order);

      console.log(`Created ${navigationMenus.length} NavigationMenus:`, navigationMenus.map(nm => nm.label));

      // Create MenuComponentModel with navigationMenus
      const menuComponent: MenuComponentModel = {
        items: [], // Keep empty for backward compatibility
        navigationMenus: navigationMenus
      };

      return E.right(menuComponent);
    } catch (error) {
      console.error('Error in convertForestToNavigationMenus:', error);
      return E.left(
        MenuComponentErrors.fromMenuTreeBuilderError(
          error,
          `Unexpected error converting menu forest to navigation menus: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }

  /**
   * Convert a MenuTreeNode's children to an array of MenuItemModel.
   * This is used when creating NavigationMenus to populate the items array.
   *
   * @param parentNode The parent MenuTreeNode
   * @returns Array of MenuItemModel
   */
  private static convertNodeChildrenToMenuItems(
    parentNode: MenuTreeNode
  ): MenuItemModel[] {
    // Sort children by order
    const sortedChildren = [...parentNode.children].sort((a, b) => {
      const orderA = pipe(
        a.data.order,
        O.getOrElse(() => Number.MAX_SAFE_INTEGER)
      );
      const orderB = pipe(
        b.data.order,
        O.getOrElse(() => Number.MAX_SAFE_INTEGER)
      );
      return orderA - orderB;
    });

    // Convert each child to MenuItemModel and filter out failures
    return sortedChildren
      .map(child => this.convertMenuNode(child))
      .filter(O.isSome)
      .map(option => option.value);
  }
}

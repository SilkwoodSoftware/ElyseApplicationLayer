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
 * Menu item data models and related types for menu tree construction.
 * These types are used by the MenuTreeBuilder to construct menu trees.
 */

import * as O from 'fp-ts/Option';

// Type for menu item identifiers
export type MenuItemId = string;

// Enum for valid roles
export enum Role {
  Authorizer = 'Authorizer',
  Configurator = 'Configurator',
  Controller = 'Controller',
  Editor = 'Editor',
  Reviewer = 'Reviewer',
  Reader = 'Reader',
}

// Enum for action types
export enum ActionType {
  READ = 'READ',
  FORM = 'FORM',
  DUC = 'DUC',
  CHAIN = 'CHAIN',
  CUSTOM = 'CUSTOM',
}

// Menu item data structure (all fields except ID and parent)
export interface MenuItemData {
  label: string;
  roles: Role[];
  actionType: O.Option<ActionType>;
  reference: O.Option<string>;
  shortcut: O.Option<string>;
  order: O.Option<number>;
  description: O.Option<string>;
  icon: O.Option<string>;
}

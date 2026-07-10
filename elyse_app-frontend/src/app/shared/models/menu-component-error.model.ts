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
 * Error types for menu component conversion.
 * This is a sum type for possible errors when converting MenuForest to components.
 */

// Base error interface
export interface MenuComponentError {
  readonly type: string;
  readonly message: string;
}

// Error for when there's an issue with the MenuTreeBuilder result
export interface MenuTreeBuilderConversionError extends MenuComponentError {
  readonly type: 'MenuTreeBuilderConversionError';
  readonly originalError: unknown;
}

// Error for when there's an issue with component creation
export interface ComponentCreationError extends MenuComponentError {
  readonly type: 'ComponentCreationError';
  readonly nodeId: string;
}

// Union type of all possible menu component errors
export type MenuComponentErrorType =
  | MenuTreeBuilderConversionError
  | ComponentCreationError;

// Error constructors
export const MenuComponentErrors = {
  fromMenuTreeBuilderError: (
    error: unknown,
    message: string
  ): MenuTreeBuilderConversionError => ({
    type: 'MenuTreeBuilderConversionError',
    message,
    originalError: error,
  }),

  componentCreationError: (
    nodeId: string,
    message: string
  ): ComponentCreationError => ({
    type: 'ComponentCreationError',
    message,
    nodeId,
  }),
};

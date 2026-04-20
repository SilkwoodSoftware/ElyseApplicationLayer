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

import { MenuConverter } from './MenuConverter';
import { MenuForest, MenuTreeNode, ActionType } from './MenuTreeBuilder';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';

describe('MenuConverter', () => {
  // Sample test data
  const createTestMenuForest = (): MenuForest => {
    return [
      {
        id: 'menu1',
        data: {
          label: 'Menu 1',
          roles: [],
          actionType: O.none,
          reference: O.none,
          shortcut: O.none,
          order: O.none,
          description: O.none,
          icon: O.none,
        },
        children: [
          {
            id: 'submenu1',
            data: {
              label: 'Submenu 1',
              roles: [],
              actionType: O.none,
              reference: O.none,
              shortcut: O.none,
              order: O.none,
              description: O.none,
              icon: O.none,
            },
            children: [],
          },
        ],
      },
    ];
  };

  const createEmptyForest = (): MenuForest => {
    return [];
  };

  describe('convertForestToComponentModel', () => {
    it('should convert a valid MenuForest to a MenuComponentModel', () => {
      // Arrange
      const forest = createTestMenuForest();

      // Act
      const result = MenuConverter.convertForestToComponentModel(forest);

      // Assert
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const model = result.right;
        expect(model.items.length).toBe(1);
        expect(model.items[0].label).toBe('Menu 1');
        expect(model.items[0].children.length).toBe(1);
        expect(model.items[0].children[0].label).toBe('Submenu 1');
      }
    });

    it('should handle an empty forest', () => {
      // Arrange
      const emptyForest = createEmptyForest();

      // Act
      const result = MenuConverter.convertForestToComponentModel(emptyForest);

      // Assert
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const model = result.right;
        expect(model.items.length).toBe(0);
      }
    });

    it('should handle errors when input is invalid', () => {
      // Arrange
      const invalidForest = null;

      // Act
      const result = MenuConverter.convertForestToComponentModel(
        invalidForest as any
      );

      // Assert
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('MenuTreeBuilderConversionError');
      }
    });
  });
});

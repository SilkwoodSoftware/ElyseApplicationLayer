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

import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { MenuService } from './menu.service';
import * as E from 'fp-ts/Either';
import { MenuForest } from '../utils/MenuTreeBuilder';
import { MenuComponentModel } from '../components/menu/menu-item.model';
import { MenuComponentErrorType } from '../models/menu-component-error.model';

describe('MenuService', () => {
  let service: MenuService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MenuService],
    });
    service = TestBed.inject(MenuService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadMenuSpec', () => {
    it('should load menu spec and convert it to a menu forest', () => {
      // Sample CSV data for testing
      const csvData = `MenuItemId,Label,ParentMenu,Roles,ActionType,Reference,Shortcut,Order,Description,Icon
menu1,Menu 1,,Reader,,,,,First menu item,
submenu1,Submenu 1,menu1,Reader,,,,,First submenu item,`;

      // Subscribe to both observables
      let menuForestResult: E.Either<any, MenuForest> | undefined;
      let menuComponentModelResult:
        | E.Either<MenuComponentErrorType, MenuComponentModel>
        | undefined;

      service.menuForest$.subscribe((result) => {
        menuForestResult = result;
      });

      service.menuComponentModel$.subscribe((result) => {
        menuComponentModelResult = result;
      });

      // Call the method
      service.loadMenuSpec().subscribe((result) => {
        expect(E.isRight(result)).toBe(true);
      });

      // Verify HTTP request
      const req = httpMock.expectOne('assets/menu_spec.csv');
      expect(req.request.method).toBe('GET');
      req.flush(csvData);

      // Verify menuForest has been updated
      expect(menuForestResult).toBeDefined();
      expect(E.isRight(menuForestResult!)).toBe(true);

      if (E.isRight(menuForestResult!)) {
        const forest = menuForestResult!.right;
        expect(forest.length).toBe(1);
        expect(forest[0].id).toBe('menu1');
        expect(forest[0].data.label).toBe('Menu 1');
        expect(forest[0].children.length).toBe(1);
        expect(forest[0].children[0].id).toBe('submenu1');
      }

      // Verify menuComponentModel has been updated
      expect(menuComponentModelResult).toBeDefined();
      expect(E.isRight(menuComponentModelResult!)).toBe(true);

      if (E.isRight(menuComponentModelResult!)) {
        const model = menuComponentModelResult!.right;
        expect(model.items.length).toBe(1);
        expect(model.items[0].label).toBe('Menu 1');
        expect(model.items[0].children.length).toBe(1);
        expect(model.items[0].children[0].label).toBe('Submenu 1');
      }
    });

    it('should handle errors when loading menu spec', () => {
      // Subscribe to both observables
      let menuForestResult: E.Either<any, MenuForest> | undefined;

      service.menuForest$.subscribe((result) => {
        menuForestResult = result;
      });

      // Call the method
      service.loadMenuSpec().subscribe((result) => {
        expect(E.isLeft(result)).toBe(true);
      });

      // Simulate HTTP error
      const req = httpMock.expectOne('assets/menu_spec.csv');
      req.error(new ErrorEvent('Network error'));

      // Verify menuForest has error
      expect(menuForestResult).toBeDefined();
      expect(E.isLeft(menuForestResult!)).toBe(true);

      if (E.isLeft(menuForestResult!)) {
        expect(menuForestResult!.left.type).toBe('GenericMenuTreeBuilderError');
      }
    });
  });

  describe('getMenuForest', () => {
    it('should return the current menu forest value', () => {
      const result = service.getMenuForest();
      expect(E.isRight(result)).toBe(true);
      expect(E.isRight(result) ? result.right : null).toEqual([]);
    });
  });

  describe('getMenuComponentModel', () => {
    it('should return the current menu component model value', () => {
      const result = service.getMenuComponentModel();
      expect(E.isRight(result)).toBe(true);
      expect(E.isRight(result) ? result.right : null).toEqual({ items: [] });
    });
  });
});

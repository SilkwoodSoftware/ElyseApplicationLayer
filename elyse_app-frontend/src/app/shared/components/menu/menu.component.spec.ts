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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuComponent } from './menu.component';
import { By } from '@angular/platform-browser';
import { MenuComponentModel } from './menu-item.model';

describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render empty menu container when model is empty', () => {
    component.model = { items: [] };
    fixture.detectChanges();

    const menuContainer = fixture.debugElement.query(
      By.css('.navigation-menu')
    );
    expect(menuContainer).toBeTruthy();

    const dropdowns = fixture.debugElement.queryAll(By.css('.dropdown'));
    expect(dropdowns.length).toBe(0);
  });

  it('should render menu items from the model', () => {
    // Setup test data
    const testModel: MenuComponentModel = {
      items: [
        {
          id: 'menu1',
          label: 'Menu 1',
          children: [
            {
              id: 'submenu1',
              label: 'Submenu 1',
              children: [],
            },
            {
              id: 'submenu2',
              label: 'Submenu 2',
              children: [],
            },
          ],
        },
        {
          id: 'menu2',
          label: 'Menu 2',
          children: [],
        },
      ],
    };

    // Set component input and trigger change detection
    component.model = testModel;
    fixture.detectChanges();

    // Verify rendered elements
    const menuContainer = fixture.debugElement.query(
      By.css('.navigation-menu')
    );
    expect(menuContainer).toBeTruthy();

    // Check top-level menu items
    const dropdowns = fixture.debugElement.queryAll(By.css('.dropdown'));
    expect(dropdowns.length).toBe(2);

    // Check menu labels
    const menuButtons = fixture.debugElement.queryAll(By.css('.dropbtn'));
    expect(menuButtons.length).toBe(2);
    expect(menuButtons[0].nativeElement.textContent).toBe('Menu 1');
    expect(menuButtons[1].nativeElement.textContent).toBe('Menu 2');

    // Check submenu items for the first menu
    const submenuLinks = dropdowns[0].queryAll(By.css('.dropdown-content a'));
    expect(submenuLinks.length).toBe(2);
    expect(submenuLinks[0].nativeElement.textContent).toBe('Submenu 1');
    expect(submenuLinks[1].nativeElement.textContent).toBe('Submenu 2');

    // Check second menu has no submenu items
    const emptySubmenu = dropdowns[1].queryAll(By.css('.dropdown-content a'));
    expect(emptySubmenu.length).toBe(0);
  });
});

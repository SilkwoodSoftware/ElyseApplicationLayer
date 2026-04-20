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

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CsvFormFieldMenu, CsvFormFieldMenuService } from '../../services/csv-form-field-menu.service';
import { CsvFormNavigationService } from '../../services/csv-form-navigation.service';
import { CsvFormField } from '../../services/csv-form.service';

@Component({
  selector: 'app-csv-form-field-menu',
  templateUrl: './csv-form-field-menu.component.html',
  styleUrls: ['./csv-form-field-menu.component.scss']
})
export class CsvFormFieldMenuComponent implements OnInit {
  @Input() field: CsvFormField = {
    id: '',
    label: '',
    length: 0,
    dataType: '',
    isMandatory: false,
    populationType: '',
    order: 0
  };
  @Input() params: Record<string, any> = {};
  @Output() valueSelected = new EventEmitter<any>();
  @Output() menuCancelled = new EventEmitter<void>();

  menuItems: CsvFormFieldMenu[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private csvFormFieldMenuService: CsvFormFieldMenuService,
    private csvFormNavigationService: CsvFormNavigationService
  ) {}

  ngOnInit(): void {
    // Field is now always initialized with default values
    this.loadMenuItems();
  }

  /**
   * Load menu items for the field
   */
  private loadMenuItems(): void {
    this.menuItems = this.csvFormFieldMenuService.getFormFieldMenus(this.field.id);
    if (this.menuItems.length === 0) {
      this.errorMessage = `No menu items found for field: ${this.field.id}`;
    }
  }

  /**
   * Handle menu item click
   * @param menuItem The menu item that was clicked
   */
  onMenuItemClick(menuItem: CsvFormFieldMenu): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (menuItem.type === 'FORM') {
      // Open a form
      this.csvFormNavigationService.openForm(menuItem.reference, this.params, true)
        .subscribe(
          result => {
            this.isLoading = false;
            if (result) {
              this.valueSelected.emit(result);
            }
          },
          error => {
            this.isLoading = false;
            this.errorMessage = `Error opening form: ${error.message || 'Unknown error'}`;
            console.error('Error opening form:', error);
          }
        );
    } else if (menuItem.type === 'TABLE') {
      // Open a table for selection
      // This will be handled by the CsvFormNavigationService
      // The table component will call back to the form when a selection is made
      this.isLoading = true;
      // Create a field with the necessary properties for lookup
      const lookupField: CsvFormField = {
        id: this.field.id,
        label: this.field.label,
        length: this.field.length,
        dataType: this.field.dataType,
        isMandatory: this.field.isMandatory,
        populationType: 'LOOKUP_TABLE',
        reference: menuItem.reference,
        parameterId: this.field.parameterId,
        order: this.field.order
      };

      this.csvFormNavigationService.openLookupTable(lookupField, this.params)
        .subscribe(
          result => {
            this.isLoading = false;
            if (result) {
              this.valueSelected.emit(result);
            }
          },
          error => {
            this.isLoading = false;
            this.errorMessage = `Error opening table: ${error.message || 'Unknown error'}`;
            console.error('Error opening table:', error);
          }
        );
    }
  }

  /**
   * Cancel the menu
   */
  onCancel(): void {
    this.menuCancelled.emit();
  }
}

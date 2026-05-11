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


import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { FieldConfig } from '../../interfaces/field-config.interface';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { TransactionResultDialogComponent } from '../transaction-results/transaction-result-dialog.component';
import { ApplicationErrorDialogComponent } from '../application-error-dialog/application-error-dialog.component';
import { FormFieldService } from '../../services/form-field.service';
import { FormFieldRoutingService } from '../../services/form-field-routing.service';
import { DateFormatService } from '../../services/date-format.service';

@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['../../stylesheets/forms.scss', '../../stylesheets/layout.scss'],
  providers: [DateFormatService]
})
export class DynamicFormComponent implements OnChanges, OnInit {
  @Input() fields: FieldConfig[] = [];
  @Input() documentId: string | null = null;
  @Input() fileId: number | null = null;
  @Output() fieldAction = new EventEmitter<{field: FieldConfig, action: string, isActionComplete?: boolean}>();
  @Output() formSubmit = new EventEmitter<FieldConfig[]>();

  form: FormGroup; 
  private fieldsSubject = new BehaviorSubject<FieldConfig[]>([]);
  fields$ = this.fieldsSubject.asObservable();

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private formFieldService: FormFieldService,
    private formFieldRoutingService: FormFieldRoutingService,
    private _dateFormatService: DateFormatService
    
  ) {
    this.form = this.fb.group({});
  }
  get dateFormatService(): DateFormatService {
    return this._dateFormatService;
  }

  ngOnInit() {
    this.createForm();
    this.subscribeToFormChanges();
    // Force update of date input displays after initialization
    setTimeout(() => {
      this.fields.forEach(field => {
        if (field.fieldType === 'Document Date' || field.fieldType === 'File Date') {
          const control = this.form.get(field.name);
          if (control && control.value) {
            // Trigger display update
            this.cdr.detectChanges();
          }
        }
      });
    }, 100);
  }
 
  private subscribeToFormChanges() {
    this.form.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    
    if (changes['fields']) {
      this.clearDateFormatCache(); // Clear cache when fields change (important for date format style changes)
      this.fieldsSubject.next([...this.fields]); // Create new array reference to trigger change detection
      this.createForm();
    }
  }

  createForm() {
    this.form = this.fb.group({});
    this.fields.forEach(field => {
      const validators = [];
      if (field.mandatory) {
        validators.push(Validators.required);
      }
      // Add character limit validator if characterLimit is specified and greater than 0
      if (field.characterLimit && field.characterLimit > 0 && !field.isDropdown) {
        validators.push(Validators.maxLength(field.characterLimit));
      }
      let initialValue = field.isDropdown ? field.attributeId : field.value;
      
      // For date fields, convert string to Date object for mat-datepicker
      if (field.fieldType === 'Document Date' || field.fieldType === 'File Date') {
        if (field.value && typeof field.value === 'string') {
          // Try multiple conversion approaches to handle different date formats
          let convertedDate = null;
          
          // First, try with the dateFormatStyle if available
          if (field.dateFormatStyle !== undefined) {
            convertedDate = DateFormatService.convertFromApiToDate(field.value, field.dateFormatStyle);
          }
          
          // If that failed, try auto-detection (ISO format detection)
          if (!convertedDate || isNaN(convertedDate.getTime())) {
            convertedDate = DateFormatService.convertFromApiToDate(field.value);
          }
          
          // If still failed, try parsing with the display format pattern
          if ((!convertedDate || isNaN(convertedDate.getTime())) && field.dateFormatStyle !== undefined) {
            try {
              const formatPattern = DateFormatService.getFormatPattern(field.dateFormatStyle);
              convertedDate = DateFormatService.convertFromApiToDate(field.value, field.dateFormatStyle);
            } catch (error) {
              // Silent fallback
            }
          }
          
          // If conversion succeeded, use it
          if (convertedDate && !isNaN(convertedDate.getTime())) {
            initialValue = convertedDate;
          } else {
            // Set to null but don't log - the getFormattedDateDisplay will handle this
            initialValue = null;
          }
        }
      }
      
      const control = this.fb.control(initialValue, validators);
      this.form.addControl(field.name, control);

      control.valueChanges.subscribe(value => {
        this.updateFieldValue(field, value);
      });
    });
  }

  updateFieldValue(field: FieldConfig, value: any) {

  if (field.isMultiSelect) {
    // Multi-select fields don't use form control values directly
    // They are managed through the multi-select component interactions
    this.fieldAction.emit({field, action: 'change'});
  } else if (field.isDropdown) {
    
    if (field.attributeId !== value) {
      const numberValue = Number(value);
      const stringValue = value?.toString();
      const selectedOption = field.dropdownOptions?.find(option =>
        option.Id === numberValue || option.Id?.toString() === stringValue
      );
      

      if (selectedOption) {
        field.attributeId = numberValue;
        if (field.fieldType === 'Document Transaction Group' || field.fieldType === 'File Transaction Group') {
          field.value = selectedOption.Name;
        } else {
          field.value = selectedOption.Name;  // For other dropdowns, store the name as the value
        }
      } else {
        
        field.attributeId = numberValue;  // CHANGED: Store as number
        field.value = null;
        if (field.fieldType === 'Document Transaction Group' || field.fieldType === 'File Transaction Group') {
          (field as any).displayValue = null;
        }
      }
      this.fieldAction.emit({field, action: 'change'});
    }
  } else {
    // Existing logic for non-dropdown fields
    if (field.value !== value) {
      switch (field.fieldType) {
        case 'Document Date':
        case 'File Date':
          // For date fields, value from mat-datepicker is already a Date object
          if (value instanceof Date) {
            field.value = DateFormatService.convertDateToApi(value);
          } else if (typeof value === 'string' && value) {
            // Handle string date input
            field.value = DateFormatService.convertDateToApi(new Date(value));
          } else {
            field.value = value;
          }
          break;
        case 'Document Integer':
        case 'File Integer':
          field.value = parseInt(value, 10);
          break;
        case 'Document Real Number':
        case 'File Real Number':
          field.value = parseFloat(value);
          break;
        case 'Document Free Text':
        case 'File Free Text':
        default:
          field.value = value;
          field.attributeId = field.value;
          break;
      }
    }
  }
    
}

  getEffectiveFieldLength(length: number): number {
    return length === 0 ? 50 : length;
  }

  getInputType(field: FieldConfig): string {
    if (field.isMultiSelect) {
      return 'multi-select';
    }
    if (field.isDropdown) {
      return 'dropdown';
    }
    if (field.fieldType === 'Document Date' || field.fieldType === 'File Date') {
      return 'date';
    }
    // Handle "Value" data type fields (read-only display fields like Document ID Lock Status)
    if (field.fieldType === 'Document ID Lock Status') {
      return 'readonly';
    }
    const fieldLength = this.getEffectiveFieldLength(field.fieldLength);
    if (fieldLength <= 3) return 'number';
    if (fieldLength > 100) return 'textarea';
    return 'text';
  }

  getInputStyle(field: FieldConfig): any {
    const baseWidth = 0.6;
    const fieldLength = this.getEffectiveFieldLength(field.fieldLength);
    const width = Math.min(fieldLength * baseWidth, 30);
    return { 'width': `${width}em`, 'max-width': '100%' };
  }
  
  getDatePickerStyle(field: FieldConfig): any {
    const baseWidth = 0.6;
    const fieldLength = this.getEffectiveFieldLength(field.fieldLength);
    // Double the width for date picker fields
    const width = Math.min(fieldLength * baseWidth * 2, 60);
    return { 'width': `${width}em`, 'max-width': '100%' };
  }

  onSubmit() {
    if (this.form.valid) {
      const formData = this.fields.map(field => ({
        ...field,
        value: field.isDropdown ? field.value : this.form.get(field.name)?.value,
        attributeId: field.isDropdown ? this.form.get(field.name)?.value : field.attributeId
      }));
      this.formSubmit.emit(formData);
    }
  }

  onAction(field: FieldConfig, action: string) {
    const currentValue = this.form.get(field.name)?.value;
    const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
    if (!routingInfo) {
      console.error(`No routing info found for field type: ${field.fieldType}`);
      return;
    }

    const listIdParam = routingInfo['Name ID Parameter'];
    const attrParam = routingInfo['Attribute Parameter ID'];
    const attrValue = routingInfo['Attribute Value'];
    const idType = routingInfo['ID Type'];

    let dialogTitle: string;
    let dialogMessage: string;
    let apiCall: Observable<any>;
    
    const prepareApiData = () => {
      const data: any = {
        [idType === 'Document' ? 'documentId' : 'fileId']: idType === 'Document' ? this.documentId : this.fileId,
        [listIdParam]: field.nameId,
      };

      if (attrParam) {
        data[attrParam] = action === 'delete' ? field.originalAttributeId : field.attributeId;
      }
      if (attrValue) {
        if (field.fieldType === 'Document Date' || field.fieldType === 'File Date') {
          // For date fields, convert Date object to API format
          data[attrValue] = currentValue instanceof Date ?
            DateFormatService.convertDateToApi(currentValue) :
            currentValue;
        } else {
          data[attrValue] = field.isDropdown ? field.value : currentValue;
        }
      }

      return data;
    };

    switch (action) {
      case 'update':
        dialogTitle = 'Confirm Update';
        // Format dates consistently for display in confirmation dialog
        const originalDisplayValue = this.getDisplayValueForConfirmation(field, field.originalValue);
        const currentDisplayValue = this.getDisplayValueForConfirmation(field, field.value);
        const fieldDisplayName = this.getFieldDisplayName(field);
        dialogMessage = `Update the following?\n\nChange ${fieldDisplayName} from ${originalDisplayValue} to ${currentDisplayValue}`;
        apiCall = this.formFieldService.updateDropdownOption(routingInfo['Update'], prepareApiData());
        break;
      case 'delete':
        dialogTitle = 'Confirm Delete';
        const deleteFieldDisplayName = this.getFieldDisplayName(field);
        dialogMessage = `Delete the following?\n\n${deleteFieldDisplayName}`;
        apiCall = this.formFieldService.deleteFieldValue(routingInfo['Delete'], prepareApiData());
        break;
      case 'add':
        dialogTitle = 'Confirm Add';
        const addDisplayValue = this.getDisplayValueForConfirmation(field, field.value);
        const addFieldDisplayName = this.getFieldDisplayName(field);
        dialogMessage = `Add the following field?\n\n${addFieldDisplayName}: ${addDisplayValue}`;
        apiCall = this.formFieldService.updateDropdownOption(routingInfo['Create'], prepareApiData());
        break;
      case 'revert':
        // Revert the field to its original value
        const control = this.form.get(field.name);
        if (control) {
          if (field.isDropdown) {
            control.setValue(field.originalAttributeId);
            field.attributeId = field.originalAttributeId;
            field.value = field.originalValue;
          } else {
          control.setValue(field.originalValue);
          field.value = field.originalValue;
          }
        }
        this.fieldAction.emit({field, action: 'revert'});
        return;
        case 'clear':
          this.clearFieldValue(field);
          return;        
        
      default:
        console.error(`Unsupported action: ${action}`);
        return;
    }

    const confirmationDialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: dialogTitle,
        message: dialogMessage,
        confirmText: 'Confirm',
        cancelText: 'Cancel'
      }
    });

    confirmationDialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performAction(field, action, apiCall);
      }
    });
  }

  private performAction(field: FieldConfig, action: string, apiCall: Observable<any>) {
    if (field.fieldType === 'File Date' || field.fieldType === 'Document Date') {
      const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
      if (action === 'delete') {
        // For delete action, only send the ID and NameId
        const deleteDto = {
          [field.fieldType === 'File Date' ? 'fileId' : 'documentId']: field.fieldType === 'File Date' ? this.fileId : this.documentId,
          [field.fieldType === 'File Date' ? 'fileDateNameId' : 'docDateNameId']: field.nameId
        };
        apiCall = this.formFieldService.deleteDateValue(routingInfo['Delete'], deleteDto);
      } else {
        // Get the current form control value (which is a Date object for date picker)
        const currentValue = this.form.get(field.name)?.value;
        const dateValueForApi = currentValue instanceof Date ?
          DateFormatService.convertDateToApi(currentValue) :
          field.value;
          
        const dateValueDto = {
          [field.fieldType === 'File Date' ? 'fileId' : 'documentId']: field.fieldType === 'File Date' ? this.fileId : this.documentId,
          [field.fieldType === 'File Date' ? 'fileDateNameId' : 'docDateNameId']: field.nameId,
          [field.fieldType === 'File Date' ? 'fileDateValue' : 'docDateValue']: dateValueForApi
        };
        if (action === 'add' || action === 'update') {
          const routeKey = action === 'add' ? 'Create' : 'Update';
          apiCall = this.formFieldService.updateDateAction(dateValueDto, routingInfo[routeKey]);
        }
      }
    }

         apiCall.subscribe(
          (response) => {
            const dialogRef = this.dialog.open(TransactionResultDialogComponent, {
              data: {
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} Result`,
                // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                message: response.transactionMessage,
                status: response.transactionStatus
              }
            });

            dialogRef.afterClosed().subscribe(() => {
              if (response.transactionStatus === 'Good') {
                this.updateFieldState(field, action);
                // Emit the event with a flag indicating the action is complete
                this.fieldAction.emit({field, action, isActionComplete: true});
              }
              this.cdr.detectChanges();
            });
          },
          (error) => {
            console.error(`${action} failed`, error);
            this.dialog.open(ApplicationErrorDialogComponent, {
              data: {
                title: 'Application Error',
                message: 'An error occurred while processing your request.',
                status: 'Application layer error'
              }
            });
          }
        );
      }

      private updateFieldState(field: FieldConfig, action: string) {
        switch (action) {
          case 'delete':
            this.clearFieldValue(field);
            break;
          case 'add':
          case 'update':
            const control = this.form.get(field.name);
            if (control) {
              if (field.isDropdown) {
                field.originalAttributeId = control.value;
                field.attributeId = control.value;
                const selectedOption = field.dropdownOptions?.find(option => option.Id === control.value);
                if (selectedOption) {
                  field.originalValue = selectedOption.Name;
                  field.value = selectedOption.Name;
                }
              } else if (field.fieldType === 'Document Date' || field.fieldType === 'File Date') {
                // For date fields, control.value is a Date object but field.value should be API string
                if (control.value instanceof Date) {
                  const apiValue = DateFormatService.convertDateToApi(control.value);
                  field.originalValue = apiValue;
                  field.value = apiValue;
                } else {
                  field.originalValue = control.value;
                  field.value = control.value;
                }
              } else {
                field.originalValue = control.value;
                field.value = control.value;
              }
              field.existsInDatabase = true;
            }
            break;
        }
  }
  
  clearFieldValue(field: FieldConfig) {
    field.value = null;
    field.originalValue = null;
    field.attributeId = null;
    field.originalAttributeId = null;
    field.existsInDatabase = false;
    const control = this.form.get(field.name);
    if (control) {
      control.setValue(null);
    }
    this.fieldAction.emit({field, action: 'clear'});
  }

  isFieldEmpty(field: FieldConfig): boolean {
    return field.isDropdown ? 
      (field.attributeId === null || field.attributeId === undefined || field.attributeId === '') :
      (field.value === null || field.value === undefined || field.value === '');
  }

  public isFieldChanged(field: FieldConfig): boolean {
    if (field.isMultiSelect) {
      return this.isMultiSelectChanged(field);
    }
    
    const currentValue = this.form.get(field.name)?.value;
    return field.isDropdown ?
      currentValue !== field.originalAttributeId :
      currentValue !== field.originalValue;
  }

  hasCreateRoute(field: FieldConfig): boolean {
    const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
    return !!routingInfo && !!routingInfo['Create'];
  }

  hasDeleteRoute(field: FieldConfig): boolean {
    const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
    return !!routingInfo && !!routingInfo['Delete'];
  }

  hasUpdateRoute(field: FieldConfig): boolean {
    const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
    return !!routingInfo && !!routingInfo['Update'];
  }

  isAddButtonActive(field: FieldConfig): boolean {
    if (field.isMultiSelect) {
      return !field.existsInDatabase &&
             (field.selectedItems?.length || 0) > 0;
    }
    
    // Document ID Lock Status: Add button (Lock) is active when document is unlocked
    if (field.fieldType === 'Document ID Lock Status') {
      return field.value === 'Unlocked' || !field.value;
    }
    
    return !field.existsInDatabase &&
           this.isFieldChanged(field);
  }

  isDeleteButtonActive(field: FieldConfig): boolean {
    // Document ID Lock Status: Delete button (Unlock) is active when document is locked
    if (field.fieldType === 'Document ID Lock Status') {
      return field.value === 'Locked';
    }
    
    return field.existsInDatabase;
  }

  isSaveButtonActive(field: FieldConfig): boolean {
    if (field.isMultiSelect) {
      return this.isMultiSelectChanged(field);
    }
    
    if (field.fieldType === 'Document Transaction Group' || field.fieldType === 'File Transaction Group') {
      // For transaction groups:
      // - If present ID is different from original ID, or
      // - If original ID is null and present ID is not null
      // Then the action is 'update'
      return this.isFieldChanged(field);
    } else if (field.isDropdown) {
      // For general dropdown fields:
      // - If original ID is null and present ID is not null, then 'add'
      // - If original ID is not null and present ID is different, then 'update'
      return JSON.stringify(field.originalAttributeId) !== '{}' &&
              field.originalAttributeId !== null &&
              field.attributeId !== field.originalAttributeId;
    } else {
      // For non-dropdown fields, keep the existing logic
      return field.existsInDatabase && field.value !== field.originalValue;
    }
  }

  isRevertButtonActive(field: FieldConfig): boolean {
    return this.isFieldChanged(field);
  }

  getFieldTypeClass(field: FieldConfig): string {
    if (field.fieldType.startsWith('Doc')) {
      return 'document-field';
    } else if (field.fieldType.startsWith('File')) {
      return 'file-field';
    }
    return '';
  }

  // Multi-select specific methods
  onMultiSelectAdd(field: FieldConfig, selectedId: string | number) {
    if (!selectedId || selectedId === '') return;
    
    if (!field.selectedItems) {
      field.selectedItems = [];
    }
    
    const selectedOption = field.dropdownOptions?.find(option =>
      String(option.Id) === String(selectedId)
    );
    
    if (selectedOption && !field.selectedItems.some(item => String(item.id) === String(selectedId))) {
      field.selectedItems.push({
        id: selectedOption.Id,
        name: selectedOption.Name
      });
      this.fieldAction.emit({field, action: 'change'});
    }
  }

  onMultiSelectDropdownChange(field: FieldConfig, event: any) {
    const select = event.target as HTMLSelectElement;
    const selectedValue = select.value;
    
    if (selectedValue) {
      this.onMultiSelectAdd(field, selectedValue);
      select.value = ''; // Reset dropdown
    }
  }

  onMultiSelectRemove(field: FieldConfig, itemId: string | number) {
    if (field.selectedItems) {
      field.selectedItems = field.selectedItems.filter(item =>
        String(item.id) !== String(itemId)
      );
      this.fieldAction.emit({field, action: 'change'});
    }
  }

  getAvailableMultiSelectOptions(field: FieldConfig): Array<{Name: string, Id: string | number}> {
    if (!field.dropdownOptions) return [];
    
    return field.dropdownOptions.filter(option =>
      !field.selectedItems?.some(selected => String(selected.id) === String(option.Id))
    );
  }

  isMultiSelectChanged(field: FieldConfig): boolean {
    if (!field.isMultiSelect) return false;
    
    const current = field.selectedItems || [];
    const original = field.originalSelectedItems || [];
    
    if (current.length !== original.length) return true;
    
    const sortedCurrent = [...current].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const sortedOriginal = [...original].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    
    return !sortedCurrent.every((item, index) => String(item.id) === String(sortedOriginal[index].id));
  }

  onMultiSelectSave(field: FieldConfig) {
    
    // Emit event to parent component to handle the multi-select save
    this.fieldAction.emit({field, action: 'multi-select-save'});
  }

  getDatePlaceholder(field: FieldConfig): string {
    if (field.dateFormatStyle === undefined) {
      return 'Enter date';
    }
    const formatPattern = DateFormatService.getFormatPattern(field.dateFormatStyle);
    return `Enter date (${formatPattern})`;
  }

  getDateInputValue(field: FieldConfig): string {
    // Get the current Date value from the form control
    const currentValue = this.form.get(field.name)?.value;
    
    // If we have a Date object and a format style, format it for display using database format
    if (currentValue instanceof Date && field.dateFormatStyle !== undefined) {
      try {
        // Convert Date to API format first, then to display format using database format style
        const apiDateString = DateFormatService.convertDateToApi(currentValue);
        return DateFormatService.convertToDisplayFormat(apiDateString, field.dateFormatStyle);
      } catch (error) {
        console.warn(`Error formatting date for input display in field ${field.name}:`, error);
        return '';
      }
    }
    
    // Return empty string if no valid date
    return '';
  }

  onDateChange(field: FieldConfig, event: any): void {
    // The date change is already handled by the form control valueChanges subscription
    // This method is here for explicit date change handling if needed
    this.clearDateFormatCache(); // Clear cache when date changes
  }

  onDateInputChange(field: FieldConfig, event: any): void {
    // Handle real-time input changes (as user types)
    const inputValue = event.target.value;
    
    if (!inputValue) {
      // If input is cleared, clear the form control and trigger change detection
      const control = this.form.get(field.name);
      if (control && control.value) {
        control.setValue(null); // Remove { emitEvent: false } to trigger change detection
        this.clearDateFormatCache();
      }
      return;
    }
    
    // Try to parse the typed date
    this.parseAndSetDate(field, inputValue, false);
  }

  onDateInputBlur(field: FieldConfig, event: any): void {
    // Handle when user finishes typing and leaves the field
    const inputValue = event.target.value;
    
    if (inputValue) {
      // Final parsing attempt when user finishes typing
      this.parseAndSetDate(field, inputValue, true);
    }
    
    // Format the display value when user leaves the field
    this.updateInputDisplayValue(field, event.target);
    
    // Mark the control as touched to trigger validation and change detection
    const control = this.form.get(field.name);
    if (control) {
      control.markAsTouched();
      control.markAsDirty();
    }
  }

  onDateInputFocus(field: FieldConfig, event: any): void {
    // When user focuses on the field, make sure the display format is correct
    this.updateInputDisplayValue(field, event.target);
  }

  private updateInputDisplayValue(field: FieldConfig, inputElement: HTMLInputElement): void {
    const control = this.form.get(field.name);
    const currentValue = control?.value;
    
    // Only update display if we have a Date object and format style
    if (currentValue instanceof Date && field.dateFormatStyle !== undefined) {
      try {
        const apiDateString = DateFormatService.convertDateToApi(currentValue);
        const formattedDate = DateFormatService.convertToDisplayFormat(apiDateString, field.dateFormatStyle);
        if (inputElement && formattedDate && inputElement.value !== formattedDate) {
          inputElement.value = formattedDate;
        }
      } catch (error) {
        console.warn(`Error updating input display value for field ${field.name}:`, error);
      }
    }
  }

  private parseAndSetDate(field: FieldConfig, inputValue: string, showErrors: boolean): void {
    if (!inputValue || field.dateFormatStyle === undefined) return;
    
    try {
      // Try to parse the input using the field's date format style
      const parsedDate = DateFormatService.convertFromApiToDate(inputValue, field.dateFormatStyle);
      
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        // Successfully parsed - set the form control value with change detection
        const control = this.form.get(field.name);
        if (control) {
          control.setValue(parsedDate); // Remove { emitEvent: false } to trigger change detection
          this.clearDateFormatCache();
          
          // Clear any previous error
          if ((field as any).dateInputError) {
            delete (field as any).dateInputError;
          }
        }
      } else if (showErrors) {
        // Set error message for invalid date
        (field as any).dateInputError = `Invalid date format. Expected: ${DateFormatService.getFormatPattern(field.dateFormatStyle)}`;
      }
    } catch (error) {
      if (showErrors) {
        console.warn(`Error parsing date input for field ${field.name}:`, error);
        (field as any).dateInputError = `Invalid date format. Expected: ${DateFormatService.getFormatPattern(field.dateFormatStyle)}`;
      }
    }
  }

  private dateFormatCache: Map<string, string> = new Map();

  getFormattedDateDisplay(field: FieldConfig): string | null {
    const currentValue = this.form.get(field.name)?.value;
    
    if (currentValue instanceof Date && field.dateFormatStyle !== undefined) {
      // Check if date is valid
      if (isNaN(currentValue.getTime())) {
        return null;
      }

      // Create cache key
      const cacheKey = `${field.name}-${currentValue.getTime()}-${field.dateFormatStyle}`;
      
      // Check cache first
      if (this.dateFormatCache.has(cacheKey)) {
        return this.dateFormatCache.get(cacheKey)!;
      }

      try {
        const apiDateString = DateFormatService.convertDateToApi(currentValue);
        if (apiDateString && apiDateString !== 'Invalid Date') {
          const formattedDate = DateFormatService.convertToDisplayFormat(apiDateString, field.dateFormatStyle);
          this.dateFormatCache.set(cacheKey, formattedDate);
          return formattedDate;
        }
      } catch (error) {
        // Only log once per field to avoid spam
        const errorKey = `error-${field.name}`;
        if (!this.dateFormatCache.has(errorKey)) {
          console.warn(`Date formatting error for field ${field.name}:`, error);
          this.dateFormatCache.set(errorKey, 'logged');
        }
        
        // Return a safe fallback
        try {
          const fallback = currentValue.toLocaleDateString();
          this.dateFormatCache.set(cacheKey, fallback);
          return fallback;
        } catch (fallbackError) {
          return null;
        }
      }
    }
    
    // If form control value is null but field has a value, try to convert and set it
    if (!currentValue && field.value && field.dateFormatStyle !== undefined) {
      try {
        const dateFromField = DateFormatService.convertFromApiToDate(field.value, field.dateFormatStyle);
        if (dateFromField && !isNaN(dateFromField.getTime())) {
          // Set the form control value to the converted date
          const control = this.form.get(field.name);
          if (control) {
            control.setValue(dateFromField, { emitEvent: false }); // Keep emitEvent: false here to avoid recursion
            // Now format and return the display value
            const apiDateString = DateFormatService.convertDateToApi(dateFromField);
            if (apiDateString && apiDateString !== 'Invalid Date') {
              const displayValue = DateFormatService.convertToDisplayFormat(apiDateString, field.dateFormatStyle);
              return displayValue;
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to convert field value to date for ${field.name}:`, error);
      }
    }
    
    return null;
  }

  // Clear cache when form changes
  private clearDateFormatCache(): void {
    this.dateFormatCache.clear();
  }

  /**
   * Get properly formatted display value for confirmation dialogs
   */
  private getDisplayValueForConfirmation(field: FieldConfig, value: any): string {
    // For date fields, format consistently using the database format style
    if ((field.fieldType === 'Document Date' || field.fieldType === 'File Date') && value) {
      try {
        // If value is a Date object (from form control)
        if (value instanceof Date) {
          const apiDateString = DateFormatService.convertDateToApi(value);
          return DateFormatService.convertToDisplayFormat(apiDateString, field.dateFormatStyle || 0);
        }
        // If value is an API date string
        else if (typeof value === 'string') {
          // Check if it's already in display format or needs conversion
          if (value.includes('T') || value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // It's an ISO/API format, convert to display format
            return DateFormatService.convertToDisplayFormat(value, field.dateFormatStyle || 0);
          } else {
            // Assume it's already in display format
            return value;
          }
        }
      } catch (error) {
        console.warn(`Error formatting date for confirmation dialog:`, error);
        return value?.toString() || '';
      }
    }
    
    // For non-date fields, return as string
    return value?.toString() || '';
  }

  /**
   * Get formatted field display name matching the batch save table format
   */
  private getFieldDisplayName(field: FieldConfig): string {
    // Use the same format as the batch save table: "Field Type | Display Name"
    if (field.fieldType && field.displayName) {
      return `${field.fieldType} | ${field.displayName}`;
    }
    // Fallback to displayName or name if available
    return field.displayName || field.name;
  }
}
    

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

import { Component, OnInit, Input, Output, EventEmitter, ViewContainerRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CsvFormService, CsvFormDefinition, CsvFormField, FormFieldLink } from '../../services/csv-form.service';
import { DateFormatService } from '../../services/date-format.service';
import { FormFieldMenuService } from '../../services/form-field-menu.service';
import { FormFieldMenuComponent } from '../form-field-menu/form-field-menu.component';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { ReadRouteConfigService } from '../../services/read-route-config.service';
import { TableSelectionExtensionService } from '../../services/table-selection-extension.service';
import { CsvFormDialogComponent } from '../csv-form-dialog/csv-form-dialog.component';
import { DucRouteConfigService } from '../../services/duc-route-config.service';
import { TransactionResultDialogComponent } from '../transaction-results/transaction-result-dialog.component';
import { ApplicationErrorDialogComponent } from '../application-error-dialog/application-error-dialog.component';
import { TableDialogComponent } from '../table-dialog/table-dialog.component';
import { Router } from '@angular/router';
import { RouteConfigParserService } from '../../services/route-config-parser.service';
import { FixedDropdownService } from '../../services/fixed-dropdown.service';
import { ApplicationMessageService } from '../../services/application-message.service';
import { RouteManagerService } from '../../services/route-manager.service';
import { ContextAwareRoutingService } from '../../services/context-aware-routing.service';
import { forkJoin } from 'rxjs';

/**
 * CSV Form Component
 *
 * This component renders forms defined in CSV files:
 * - forms.csv: Defines forms
 * - form-fields.csv: Defines reusable form fields
 * - form-formfield-links.csv: Links forms to form fields with form-specific attributes
 *
 * The component supports the normalized data structure where form fields can be
 * reused across multiple forms. Form-specific attributes like mandatory status
 * and display order are applied from form-formfield-links.csv.
 */
@Component({
  selector: 'app-csv-form',
  templateUrl: './csv-form.component.html',
  styleUrls: ['./csv-form.component.scss']
})
export class CsvFormComponent implements OnInit, AfterViewInit {
  @Input() formId: string = '';
  @Input() params: Record<string, any> = {};
  @Input() hideTitle: boolean = false; // Hide title when used in dialog
  @Input() isPopupForm: boolean = false; // Flag to indicate if this is a popup form
  @Input() isInChain: boolean = false; // Flag to indicate if this form is part of a chain
  @Output() formSubmitted = new EventEmitter<any>();
  @Output() formCancelled = new EventEmitter<void>();

  form: FormGroup = this.fb.group({});
  formDefinition?: CsvFormDefinition;
  formFields: CsvFormField[] = [];
  isLoading = false;
  errorMessage = '';
  dropdownOptions: Map<string, any[]> = new Map();
  formTitle: string = '';
  isFormSubmitted = false; // Track whether the form has been submitted
  disabledFields: string[] = []; // Fields that should be disabled for iteration
  selectedRowCount: number = 1; // Number of rows selected (for iteration context)
  dateFormatStyle: number = 0; // Default date format style (mm/dd/yyyy)
  dateFormatString: string = ''; // Date format string for display

  // Static cache for date format - fetched once from API, reused across all form instances.
  // The date format is a system-wide setting that rarely changes.
  // Cache is cleared on page refresh (Angular app restart).
  private static cachedDateFormatStyle: number | null = null;
  private static cachedDateFormatString: string | null = null;
  
  @ViewChild('menuContainer', { read: ViewContainerRef }) menuContainer!: ViewContainerRef;

  constructor(
    private fb: FormBuilder,
    private csvFormService: CsvFormService,
    private http: HttpClient,
    private dialog: MatDialog,
    private readRouteConfigService: ReadRouteConfigService,
    private tableSelectionExtensionService: TableSelectionExtensionService,
    private ducRouteConfigService: DucRouteConfigService,
    private router: Router,
    private routeConfigParserService: RouteConfigParserService,
    private formFieldMenuService: FormFieldMenuService,
    private viewContainerRef: ViewContainerRef,
    private fixedDropdownService: FixedDropdownService,
    private applicationMessageService: ApplicationMessageService,
    private routeManagerService: RouteManagerService,
    private contextAwareRoutingService: ContextAwareRoutingService
  ) {}

  ngOnInit(): void {
    if (!this.formId) {
      this.errorMessage = 'No form ID provided';
      return;
    }

    // Extract disabled fields metadata from params
    if (this.params['__disabledFields']) {
      this.disabledFields = this.params['__disabledFields'];
      delete this.params['__disabledFields']; // Remove metadata from params
    }
    
    // Extract selected row count from params
    if (this.params['__selectedRowCount']) {
      this.selectedRowCount = this.params['__selectedRowCount'];
      delete this.params['__selectedRowCount']; // Remove metadata from params
    }

    // Fetch date format before loading form
    this.fetchDateFormat(() => {
      this.loadForm();
    });
  }
  
  /**
   * Fetch the default date format from the database
   * @param callback Optional callback to execute after fetching
   */
  private fetchDateFormat(callback?: () => void): void {
    // Use cached date format if available (avoids an API call per form open)
    if (CsvFormComponent.cachedDateFormatStyle !== null && CsvFormComponent.cachedDateFormatString !== null) {
      this.dateFormatStyle = CsvFormComponent.cachedDateFormatStyle;
      this.dateFormatString = CsvFormComponent.cachedDateFormatString;
      console.log(`CSV-FORM: Using cached date format style ${this.dateFormatStyle}: ${this.dateFormatString}`);
      if (callback) {
        callback();
      }
      return;
    }

    this.http.get(`${environment.dotNetBaseUrl}/defaults/read-date-format`).subscribe({
      next: (response: any) => {
        if (response && response.defaultDateFormat && response.defaultDateFormat.length > 0) {
          this.dateFormatStyle = response.defaultDateFormat[0]['Date Style'];
          this.dateFormatString = response.defaultDateFormat[0].Format;
          // Cache for subsequent form opens
          CsvFormComponent.cachedDateFormatStyle = this.dateFormatStyle;
          CsvFormComponent.cachedDateFormatString = this.dateFormatString;
          console.log(`CSV-FORM: Fetched and cached date format style ${this.dateFormatStyle}: ${this.dateFormatString}`);
        } else {
          this.errorMessage = 'Failed to fetch date format: Invalid response from server';
          console.error('CSV-FORM: Invalid date format response:', response);
        }
        if (callback) {
          callback();
        }
      },
      error: (error) => {
        this.errorMessage = 'Failed to fetch date format from server';
        console.error('CSV-FORM: Error fetching date format:', error);
      }
    });
  }
  
  ngAfterViewInit(): void {
    // ViewChild references are available here
    console.log('ngAfterViewInit - menuContainer initialized:', !!this.menuContainer);
  }

  /**
   * Load the form definition and fields
   *
   * This method loads the form definition and fields using the CsvFormService.
   * The service handles the normalized data structure where form fields can be
   * reused across multiple forms. Form-specific attributes like mandatory status
   * and display order are applied from form-formfield-links.csv.
   */
  private loadForm(): void {
    this.formDefinition = this.csvFormService.getForm(this.formId);
    if (!this.formDefinition) {
      this.errorMessage = `Form not found: ${this.formId}`;
      return;
    }

    try {
      this.formFields = this.csvFormService.getFormFields(this.formId);
      console.log(`CSV-FORM-COMPONENT: Loaded ${this.formFields.length} fields for form ${this.formId}`);
      this.formFields.forEach((field, index) => {
        console.log(`  Field ${index + 1}: id='${field.id}', label='${field.label}', populationType='${field.populationType}', order=${field.order}`);
      });
      
      if (this.formFields.length === 0) {
        this.errorMessage = `No fields found for form: ${this.formId}`;
        return;
      }

      this.buildForm();
      this.loadDropdownOptions();
      this.processFormTitle();
    } catch (error: any) {
      this.errorMessage = error.message || 'Error loading form fields';
      console.error('Error loading form fields:', error);
    }
  }

  /**
   * Build the reactive form based on form fields
   *
   * This method builds a reactive form based on the form fields.
   * It applies validators based on the field properties, including
   * the mandatory status which may come from form-formfield-links.csv
   * for reused form fields.
   */
  private buildForm(): void {
    const formControls: Record<string, any> = {};

    this.formFields.forEach(field => {
      // Check if this field should be disabled for iteration
      const isDisabled = this.isFieldDisabled(field.id);
      
      // Get initial value from params or default value
      let initialValue = this.params[field.id] !== undefined
        ? this.params[field.id]
        : field.defaultValue || '';
      
      // Replace with placeholder for disabled fields
      if (isDisabled) {
        initialValue = 'Multiple Values';
      }

      // Add validators
      const validators = [];
      
      // Use the isMandatory flag from the field, which comes from form-formfield-links.csv
      // Don't require validation for disabled fields
      if (field.isMandatory === true && !isDisabled) {
        validators.push(Validators.required);
      }
      
      // Add character limit validator if characterLimit is specified and greater than 0
      if (field.characterLimit && field.characterLimit > 0 &&
          field.populationType !== 'API_DROPDOWN' && field.populationType !== 'FIXED_DROPDOWN') {
        validators.push(Validators.maxLength(field.characterLimit));
      }

      // Add form control using field.id as the key (not field.label)
      formControls[field.id] = [{ value: initialValue, disabled: isDisabled }, validators];
    });

    this.form = this.fb.group(formControls);
    
    // After form is built, update input elements for fields that have display names
    // This must be done after a tick to ensure the DOM is ready
    setTimeout(() => this.applyDisplayNames(), 0);
  }
  
  /**
   * Apply display names to input elements for fields that have separate display values
   * Data-driven: checks for fieldId__displayName in params
   */
  private applyDisplayNames(): void {
    this.formFields.forEach(field => {
      const displayNameKey = `${field.id}__displayName`;
      if (this.params[displayNameKey] !== undefined) {
        // This field has a separate display name - update the input element
        const inputElement = document.getElementById(field.id) as HTMLInputElement;
        if (inputElement && inputElement.type === 'text') {
          inputElement.value = this.params[displayNameKey];
          console.log(`Applied display name for "${field.id}" (${field.label}): ${this.params[displayNameKey]} (form control has ID: ${this.form.get(field.id)?.value})`);
        }
      }
    });
  }

  /**
   * Check if a field should be disabled for iteration
   * @param fieldId The field ID to check
   * @returns True if the field should be disabled
   */
  isFieldDisabled(fieldId: string): boolean {
    return this.disabledFields.includes(fieldId);
  }

  /**
   * Load dropdown options for fields with dropdown population types
   */
  /**
   * Load dropdown options for fields with dropdown population types
   */
  private loadDropdownOptions(): void {
    this.formFields.forEach(field => {
      if (field.populationType === 'API_DROPDOWN' && field.reference) {
        this.loadApiDropdownOptions(field);
      } else if (field.populationType === 'FIXED_DROPDOWN' && field.reference) {
        // For fixed dropdowns, load options from the FixedDropdownService
        // The reference field contains the DropdownListID from fixed-dropdowns.csv
        this.loadFixedDropdownOptions(field);
      }
    });
  }

  /**
   * Load fixed dropdown options from the FixedDropdownService
   * @param field The form field to load options for
   */
  private loadFixedDropdownOptions(field: CsvFormField): void {
    if (!field.reference) {
      console.error(`No DropdownListID provided for fixed dropdown field: ${field.id} (${field.label})`);
      return;
    }

    // Get the dropdown options from the FixedDropdownService
    this.fixedDropdownService.getDropdownOptionsAsStandardFormat(field.reference)
      .subscribe({
        next: (options: Array<{Id: string, Name: string}>) => {
          this.dropdownOptions.set(field.id, options);
        },
        error: (error: Error) => {
          console.error(`Error loading fixed dropdown options for field ${field.id} (${field.label}):`, error);
          this.dropdownOptions.set(field.id, []);
        }
      });
  }

  /**
   * Load dropdown options from an API
   * @param field The form field to load options for
   */
  private loadApiDropdownOptions(field: CsvFormField): void {
    if (!field.reference) return;

    // Convert params to string values for API call
    const stringParams: Record<string, string> = {};
    if (this.params) {
      Object.keys(this.params).forEach(key => {
        if (this.params[key] !== undefined && this.params[key] !== null) {
          stringParams[key] = String(this.params[key]);
        }
      });
    }

    // Use the CsvFormService to fetch dropdown options
    // Pass field aliases to ensure correct column pair is used
    this.csvFormService.fetchDropdownOptions(field.reference, stringParams, field.idAlias, field.nameAlias)
      .subscribe({
        next: (options) => {
          this.dropdownOptions.set(field.id, options);
        },
        error: (error) => {
          console.error(`Error loading dropdown options for field ${field.id} (${field.label}):`, error);
          this.dropdownOptions.set(field.id, []);
        }
      });
  }

  /**
   * Get the field type class for styling
   * @param field The form field to get the class for
   * @returns The CSS class for the field
   */
  getFieldTypeClass(field: CsvFormField): string {
    // Normalize the data type by trimming whitespace and converting to uppercase
    const normalizedDataType = (field.dataType || '').trim().toUpperCase();
    
    if (normalizedDataType.includes('DOCUMENT')) {
      return 'document-field';
    } else if (normalizedDataType.includes('FILE')) {
      return 'file-field';
    }
    return '';
  }

  /**
   * Get the input type for a form field
   * @param field The form field to get the input type for
   * @returns The input type for the field
   */
  getInputType(field: CsvFormField): string {
    // First check population type
    if (field.populationType === 'API_DROPDOWN' || field.populationType === 'FIXED_DROPDOWN') {
      return 'dropdown';
    }
    
    if (field.populationType === 'LOOKUP_TABLE' || field.populationType === 'LOOKUP_FORM') {
      return 'lookup';
    }
    
    if (field.populationType === 'MENU') {
      return 'menu';
    }
    
    // Then check data type
    const normalizedDataType = (field.dataType || '').trim().toUpperCase();
    
    switch (normalizedDataType) {
      case 'DATE':
      case 'DOCUMENT DATE':
      case 'FILE DATE':
        return 'date';
      case 'NUMBER':
      case 'DOCUMENT INTEGER':
      case 'FILE INTEGER':
        return 'number';
      case 'PASSWORD':
        return 'password';
      case 'TEXT':
      default:
        return 'text';
    }
  }
  
  /**
   * Get the field type for a form field
   * @param field The form field to get the type for
   * @returns The HTML input type for the field
   */
  getFieldType(field: CsvFormField): string {
    // Normalize the data type by trimming whitespace and converting to uppercase
    const normalizedDataType = (field.dataType || '').trim().toUpperCase();
    
    switch (normalizedDataType) {
      case 'DATE':
      case 'DOCUMENT DATE':
      case 'FILE DATE':
        return 'date';
      case 'NUMBER':
      case 'DOCUMENT INTEGER':
      case 'FILE INTEGER':
        return 'number';
      case 'PASSWORD':
        return 'password';
      case 'TEXT':
      default:
        return 'text';
    }
  }
  
  /**
   * Get the input style for a form field
   * @param field The form field to get the style for
   * @returns The style object for the input
   */
  getInputStyle(field: CsvFormField): any {
    const baseWidth = 0.6;
    const fieldLength = field.length > 0 ? field.length : 50;
    const width = Math.min(fieldLength * baseWidth, 30);
    return { 'width': `${width}em`, 'max-width': '100%' };
  }

  /**
   * Check if a field is a dropdown
   * @param field The form field to check
   * @returns True if the field is a dropdown, false otherwise
   */
  isDropdown(field: CsvFormField): boolean {
    return field.populationType === 'API_DROPDOWN' || field.populationType === 'FIXED_DROPDOWN';
  }
  
  /**
   * Check if a field is a lookup table
   * @param field The form field to check
   * @returns True if the field is a lookup table, false otherwise
   */
  isLookupTable(field: CsvFormField): boolean {
    return field.populationType === 'LOOKUP_TABLE';
  }
  
  /**
   * Check if a field is a lookup form
   * @param field The form field to check
   * @returns True if the field is a lookup form, false otherwise
   */
  isLookupForm(field: CsvFormField): boolean {
    return field.populationType === 'LOOKUP_FORM';
  }
  
  /**
   * Open a lookup table for a field
   * @param field The form field to open a lookup table for
   */
  openLookupTable(field: CsvFormField): void {
    if (!field.reference) {
      console.error(`No reference provided for lookup table field: ${field.label}`);
      return;
    }
    
    this.routeConfigParserService.loadRouteConfigurations().subscribe({
      next: (configs) => {
        const tableConfig = configs.find(c => c.TableName === field.reference);
        if (!tableConfig) {
          console.error(`Table not found: ${field.reference}`);
          return;
        }
        
        if (!tableConfig.ApiEndpoint) {
          console.error(`No ApiEndpoint found for table ${field.reference}`);
          return;
        }
        
        const url = `${environment.dotNetBaseUrl}/${tableConfig.ApiEndpoint.replace(/^\//, '')}`;
        const params = new HttpParams({ fromObject: this.params || {} });
        
        this.http.get(url, { params }).subscribe({
          next: (response: any) => {
            console.log(`LOOKUP: table=${field.reference}, DataField=${tableConfig.DataField}, responseKeys=${Object.keys(response)}`);
            let data: any[] = [];
            
            if (tableConfig.DataField && response[tableConfig.DataField]) {
              if (Array.isArray(response[tableConfig.DataField]) &&
                  response[tableConfig.DataField].length > 0 &&
                  Array.isArray(response[tableConfig.DataField][0])) {
                data = response[tableConfig.DataField][0];
              } else if (Array.isArray(response[tableConfig.DataField])) {
                data = response[tableConfig.DataField];
              }
            } else if (Array.isArray(response)) {
              data = response;
            }
            
            console.log(`LOOKUP: extracted data.length=${data.length}`);
            
            if (data.length > 0) {
              const tableDialogRef = this.dialog.open(TableDialogComponent, {
                width: '80%',
                height: 'auto',
                data: {
                  title: field.label,
                  data,
                  tableConfig: {
                    keyColumns: field.idAlias && field.nameAlias ? `${field.idAlias}::${field.nameAlias}` : tableConfig.KeyColumns,
                    hiddenColumns: tableConfig.HiddenColumns ? tableConfig.HiddenColumns.split(';') : []
                  },
                  idAlias: field.idAlias,
                  nameAlias: field.nameAlias,
                  fullResponse: response
                }
              });
              
              tableDialogRef.afterClosed().subscribe(selectedResult => {
                if (selectedResult && field.parameterId) {
                  this.form.get(field.id)?.setValue(selectedResult.id);
                  
                  if (selectedResult.name !== undefined) {
                    const inputElement = document.getElementById(field.id) as HTMLInputElement;
                    if (inputElement) {
                      inputElement.value = selectedResult.name;
                    }
                  }
                }
              });
            } else {
              // No data found - display database response messages
              console.warn(`No data found for lookup table: ${field.reference}`);
              // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
              this.dialog.open(TransactionResultDialogComponent, {
                data: {
                  title: 'No Records Found',
                  message: response.transactionMessage,
                  status: response.transactionStatus
                },
                disableClose: false
              });
            }
          },
          error: (error) => {
            console.error(`Error fetching data for lookup table ${field.reference}:`, error);
          }
        });
      },
      error: (error) => {
        console.error(`Error loading route configurations:`, error);
      }
    });
  }
  
  /**
   * Open a lookup form for a field
   * @param field The form field to open a lookup form for
   */
  openLookupForm(field: CsvFormField): void {
    if (!field.reference) {
      console.error(`No reference provided for lookup form field: ${field.label}`);
      return;
    }
    
    // Get the form definition
    const formDefinition = this.csvFormService.getForm(field.reference);
    if (!formDefinition) {
      console.error(`Form not found: ${field.reference}`);
      return;
    }
    
    // Open the form in a dialog
    const dialogRef = this.dialog.open(CsvFormDialogComponent, {
      width: formDefinition.width || '500px',
      height: formDefinition.height || 'auto',
      data: {
        formId: field.reference,
        params: this.params || {},
        title: formDefinition.title,
        isPopupForm: true, // Flag to indicate this is a popup form - prevents navigation
        width: formDefinition.width // Pass the width to the dialog component
      }
    });
    
    // When the form is submitted, handle the result
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log(`LOOKUP_FORM dialog closed with result:`, result);
        
        // Check if result directly contains the parameterId (simple value response)
        if (field.parameterId && result[field.parameterId] && !Array.isArray(result[field.parameterId])) {
          // Direct value in response, use it
          this.form.get(field.id)?.setValue(result[field.parameterId]);
          console.log(`Using direct value from result[${field.parameterId}]`);
          return;
        }
        
        // Get the form definition to find the table reference
        if (field.reference) {
          const lookupFormDefinition = this.csvFormService.getForm(field.reference);
          console.log(`Lookup form definition for ${field.reference}:`, lookupFormDefinition);
          
          if (lookupFormDefinition && lookupFormDefinition.reference) {
            console.log(`Getting table config for ${lookupFormDefinition.reference}`);
            
            // Use RouteConfigParserService to find config by TableName (not URL)
            this.routeConfigParserService.loadRouteConfigurations().subscribe({
              next: (configs) => {
                const tableConfig = configs.find(c => c.TableName === lookupFormDefinition.reference);
                console.log('Found table config:', tableConfig);
                
                if (!tableConfig) {
                  console.error(`No configuration found for table name ${lookupFormDefinition.reference}`);
                  return;
                }
                // Extract data using the dataField from the configuration
                let data: any[] = [];
                
                console.log('Table config received:', tableConfig);
                console.log('DataField from config:', tableConfig?.DataField);
                console.log('Result object:', result);
                console.log('Result keys:', Object.keys(result));
                
                if (tableConfig?.DataField && result[tableConfig.DataField]) {
                  console.log(`Accessing result[${tableConfig.DataField}]:`, result[tableConfig.DataField]);
                  // Check if it's a nested array structure (e.g., ResultSets, userRoles, etc.)
                  if (Array.isArray(result[tableConfig.DataField]) &&
                      result[tableConfig.DataField].length > 0 &&
                      Array.isArray(result[tableConfig.DataField][0])) {
                    data = result[tableConfig.DataField][0];
                    console.log(`Found data in ${tableConfig.DataField}[0]:`, data);
                  } else {
                    data = result[tableConfig.DataField];
                    console.log(`Found data in ${tableConfig.DataField}:`, data);
                  }
                } else {
                  console.log('DataField not found or result[DataField] is empty');
                  console.log('tableConfig.DataField:', tableConfig?.DataField);
                  console.log('result[tableConfig.DataField]:', tableConfig?.DataField ? result[tableConfig.DataField] : 'N/A');
                  
                  if (Array.isArray(result)) {
                    data = result;
                    console.log(`Result is an array, using directly:`, data);
                  }
                }
                
                // If we have array data, open a table dialog to select from it
                if (data.length > 0) {
                  // Open table dialog
                  const tableDialogRef = this.dialog.open(TableDialogComponent, {
                    width: '80%',
                    height: 'auto',
                    data: {
                      title: formDefinition.title || field.label,
                      data,
                      tableConfig: {
                        keyColumns: field.idAlias && field.nameAlias ? `${field.idAlias}::${field.nameAlias}` : tableConfig?.KeyColumns,
                        hiddenColumns: tableConfig?.HiddenColumns ? tableConfig.HiddenColumns.split(';') : []
                      },
                      idAlias: field.idAlias,
                      nameAlias: field.nameAlias,
                      fullResponse: result
                    }
                  });
                  
                  // Handle table selection
                  tableDialogRef.afterClosed().subscribe(selectedResult => {
                    if (selectedResult && field.parameterId) {
                      // Store the ID value for API calls
                      this.form.get(field.id)?.setValue(selectedResult.id);
                      
                      // Update the input element to display the name
                      if (selectedResult.name !== undefined) {
                        const inputElement = document.getElementById(field.id) as HTMLInputElement;
                        if (inputElement) {
                          inputElement.value = selectedResult.name;
                        }
                      }
                    }
                  });
                } else {
                  // No data found - display database response messages
                  console.warn(`No data found to display in table dialog`);
                  // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                  this.dialog.open(TransactionResultDialogComponent, {
                    data: {
                      title: 'No Records Found',
                      message: result.transactionMessage,
                      status: result.transactionStatus
                    },
                    disableClose: false
                  });
                }
              },
              error: (error) => {
                console.error(`Error loading route configurations:`, error);
              }
            });
          } else {
            console.error(`Lookup form definition not found or has no reference for field: ${field.reference}`);
          }
        } else {
          console.error(`No reference found for lookup form field: ${field.label}`);
        }
      }
    });
  }
  
  /**
   * Open field menu for MENU type fields
   * @param event The click event
   * @param field The form field
   */
  openFieldMenu(event: MouseEvent, field: CsvFormField): void {
    console.log('openFieldMenu called', field);
    
    if (!field.reference) {
      console.error(`No reference provided for menu field: ${field.label}`);
      return;
    }
    
    // Check if menuContainer is initialized
    if (!this.menuContainer) {
      console.error('Menu container not initialized. Make sure ViewChild is available.');
      return;
    }
    
    // Clear any existing menus
    this.menuContainer.clear();
    
    // Store event coordinates since they might change if we use setTimeout
    const position = { x: event.clientX, y: event.clientY };
    
    // Use setTimeout to ensure the DOM is ready
    setTimeout(() => {
      try {
        // Create the component directly using the ViewContainerRef
        const componentRef = this.menuContainer.createComponent(FormFieldMenuComponent);
        const componentInstance = componentRef.instance;
        
        // Set the component properties
        componentInstance.formFieldMenuId = field.reference || '';
        componentInstance.position = position;
        componentInstance.idAlias = field.idAlias;
        componentInstance.nameAlias = field.nameAlias;
        
        console.log('Created menu component with ID:', field.reference, 'at position:', position);
        
        // Force change detection to ensure the component is rendered
        componentRef.changeDetectorRef.detectChanges();
        
        // Set the callback function to handle value selection
        componentInstance.onValueSelected = (value: any, displayValue: any) => {
          console.log('Value selected:', value, 'Display value:', displayValue, 'for field:', field.id, '(', field.label, ')');
          
          // Check if value is null or undefined when we have a displayValue
          if ((value === null || value === undefined) && displayValue !== undefined) {
            console.error(`Menu field ${field.id} (${field.label}) received null/undefined value with displayValue: ${displayValue}`);
            console.error(`Field configuration:`, field);
            
            // Show error dialog
            this.dialog.open(ApplicationErrorDialogComponent, {
              data: {
                title: 'Field Selection Error',
                errors: [{
                  fieldName: field.label,
                  errorMessage: `The field returned a display value but no ID value. This indicates a configuration error in the data source or form field settings.`
                }]
              }
            });
            return;
          }
          
          // Update the form field value using field.id as the key
          if (field.parameterId && value !== undefined) {
            // Store the ID value for API calls
            this.form.get(field.id)?.setValue(value);
            console.log(`Set form control ${field.id} to value:`, value);
          }
          
          // If we have a display value, show it in the input field
          if (displayValue !== undefined) {
            // This is just for display purposes - use field.id to find the correct element
            const inputElement = document.getElementById(field.id) as HTMLInputElement;
            if (inputElement) {
              inputElement.value = displayValue;
              console.log(`Set input element ${field.id} to display value:`, displayValue);
            }
          }
        };
      } catch (error) {
        console.error('Error creating menu component:', error);
      }
    }, 0);
  }

  /**
   * Get the options for a dropdown field
   * @param field The form field to get options for
   * @returns An array of options for the dropdown
   */
  getDropdownOptions(field: CsvFormField): any[] {
    return this.dropdownOptions.get(field.id) || [];
  }

  /**
   * Get the display value for a dropdown option
   * @param option The dropdown option
   * @returns The display value for the option
   */
  getOptionDisplayValue(option: any): string {
    // Use the Name property from the standardized format
    return option.Name;
  }

  /**
   * Get the value for a dropdown option
   * @param option The dropdown option
   * @returns The value for the option
   */
  getOptionValue(option: any): any {
    // Use the Id property from the standardized format
    return option.Id;
  }

  /**
   * Submit the form
   */
  onSubmit(): void {
    // Set the form as submitted
    this.isFormSubmitted = true;
    
    if (this.form.invalid) {
      console.log('Form is invalid:', this.form.errors);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Get form definition
    const formDefinition = this.formDefinition;
    if (!formDefinition) {
      this.errorMessage = 'Form definition not found';
      this.isLoading = false;
      return;
    }

    // Get form data, but exclude disabled fields in iteration context
    // Disabled fields should not be in formData - they will be populated from row data during iteration
    let formData: Record<string, any>;
    
    if (this.disabledFields.length > 0) {
      // In iteration context - exclude disabled fields from submission
      // These will be populated from row data in mergeParamsForIteration
      formData = this.form.value; // Use .value (not getRawValue) to exclude disabled fields
      
      // In iteration context, just emit the form data without making API call
      // The context-menu service will handle iteration and make multiple API calls
      this.isLoading = false;
      this.formSubmitted.emit(formData);
      return; // Exit early - don't make any API calls
    } else {
      // Normal context - include all fields
      formData = this.form.getRawValue();
    }

    // Handle different form types
    if (formDefinition.formType === 'PASSTHROUGH') {
      // For PASSTHROUGH forms, map data to parameters and emit directly without API call
      console.log('CSV-FORM: PASSTHROUGH form - emitting data directly without API call');
      this.isLoading = false;
      
      // Map form data to parameters using the same logic as other forms
      const params = this.mapFormDataToParams(formData);
      
      // Emit the mapped parameters directly
      this.formSubmitted.emit(params);
    } else if (formDefinition.formType === 'READ') {
      // For READ forms, call the read endpoint and emit the result
      this.handleReadForm(formDefinition, formData);
    } else if (formDefinition.formType === 'DUC') {
      // For DUC forms, use the centralized service method
      this.handleFormSubmissionViaCsvService(formDefinition, formData);
    } else if (formDefinition.formType === 'CUSTOM') {
      // For CUSTOM forms in chains, just emit the data and let the chain service handle navigation
      // For standalone CUSTOM forms, navigate to the custom route
      if (this.isInChain) {
        console.log('CSV-FORM: CUSTOM form is in chain, emitting data without navigating');
        this.isLoading = false;
        this.formSubmitted.emit(formData);
      } else {
        console.log('CSV-FORM: CUSTOM form is standalone, navigating to custom route');
        this.handleCustomForm(formDefinition, formData);
      }
    } else {
      this.errorMessage = `Unsupported form type: ${formDefinition.formType}`;
      this.isLoading = false;
    }
  }
  
  /**
   * Handle submission of a READ form
   * @param formDefinition The form definition
   * @param formData The form data
   */
  private handleReadForm(formDefinition: CsvFormDefinition, formData: Record<string, any>): void {
    const isSimpleSelectionForm = this.formFields.length === 1 &&
                                  (this.formFields[0].populationType === 'API_DROPDOWN' ||
                                   this.formFields[0].populationType === 'FIXED_DROPDOWN') &&
                                  formDefinition.reference === this.formFields[0].reference;
    
    if (isSimpleSelectionForm) {
      console.log('Simple selection form detected - returning form data instead of calling API');
      this.isLoading = false;
      this.formSubmitted.emit(formData);
      return;
    }
    
    // Map form fields to API parameters - all parameters are optional
    const params = this.mapFormDataToParams(formData);
    
    // Load all route configurations to get both RouteUrl and ApiEndpoint in one call
    this.routeConfigParserService.loadRouteConfigurations().subscribe({
      next: (configs) => {
        // Find the config with the matching table name
        const config = configs.find(c => c.TableName === formDefinition.reference);
        
        if (!config) {
          console.error(`No configuration found for table name ${formDefinition.reference}`);
          this.isLoading = false;
          return;
        }
        
        if (!config.RouteUrl) {
          console.error(`No RouteUrl found for table name ${formDefinition.reference}`);
          this.isLoading = false;
          return;
        }
        
        if (!config.ApiEndpoint) {
          console.error(`No ApiEndpoint found for table name ${formDefinition.reference}`);
          this.isLoading = false;
          return;
        }
        
        console.log(`Found configuration for ${formDefinition.reference}:`, config);
        console.log(`RouteUrl: ${config.RouteUrl}, ApiEndpoint: ${config.ApiEndpoint}`);
        
        // Check if this is a popup form
        if (this.isPopupForm) {
          // For popup forms, make the API call and return the data without navigating
          this.makeApiCallForPopupForm(config.ApiEndpoint, params);
        } else {
          // For regular forms, make the API call and navigate (or show in dialog if no table data)
          this.makeApiCallAndNavigate(config.ApiEndpoint, params, config.RouteUrl, config.DataField);
        }
      },
      error: (error) => {
        console.error(`Error loading route configurations:`, error);
        this.isLoading = false;
      }
    });
  }
  
  /**
   * Make an API call and then navigate to the read route
   * @param apiEndpoint The API endpoint from read-routes.csv
   * @param params The parameters to pass to the API
   * @param routeUrl The route URL to navigate to
   * @param dataField The DataField from the route configuration (undefined if endpoint doesn't return table data)
   */
  private makeApiCallAndNavigate(apiEndpoint: string, params: Record<string, any>, routeUrl: string, dataField?: string): void {
    // Construct the API URL with query parameters
    const queryParams = new HttpParams({ fromObject: params });
    
    // Use the full apiEndpoint from read-routes.csv, removing any leading slash
    const url = `${environment.dotNetBaseUrl}/${apiEndpoint.replace(/^\//, '')}`;
    
    console.log(`Making API call to ${url} with params:`, params);
    
    // Make the API call
    this.http.get(url, { params: queryParams }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.formSubmitted.emit(response);
        
        // Check if this endpoint returns table data
        // Endpoints without a DataField don't return tables and should show results in a dialog
        if (!dataField) {
          console.log('Endpoint does not return table data, showing result in dialog instead of navigating');
          
          // Show result in a transaction dialog
          this.dialog.open(TransactionResultDialogComponent, {
            data: {
              title: this.formDefinition?.title || 'Result',
              // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
              message: response.transactionMessage,
              status: response.transactionStatus || response.validationResult
            }
          });
          
          return;
        }
        
        // For endpoints that return table data, navigate to display the results
        console.log(`Navigating to read route: ${routeUrl} with params:`, params);
        
        // Convert params to query params for navigation
        const navigationParams: Record<string, string> = {};
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            navigationParams[key] = String(params[key]);
          }
        });
        
        // Use the full routeUrl directly - it already contains the correct path
        // Don't try to extract segments, as routes can be multi-level (e.g., /document/edit-permission/check)
        console.log(`Navigating to: ${routeUrl}`);
        
        // Navigate using the full route path
        this.router.navigate([routeUrl], { queryParams: navigationParams });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Application layer error.  An error occurred while submitting the form';
        console.error('Form submission error:', error);
      }
    });
  }
  
  /**
   * Make an API call for a popup form and return the data without navigating
   * @param apiEndpoint The API endpoint from read-routes.csv
   * @param params The parameters to pass to the API
   */
  private makeApiCallForPopupForm(apiEndpoint: string, params: Record<string, any>): void {
    // Construct the API URL with query parameters
    const queryParams = new HttpParams({ fromObject: params });
    
    // Use the full apiEndpoint from read-routes.csv, removing any leading slash
    const url = `${environment.dotNetBaseUrl}/${apiEndpoint.replace(/^\//, '')}`;
    
    console.log(`Making API call for popup form to ${url} with params:`, params);
    
    // Make the API call
    this.http.get(url, { params: queryParams }).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        console.log(`Received response for popup form:`, response);
        
        // Instead of navigating, emit the response data to be handled by the parent component
        this.formSubmitted.emit(response);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Application layer error.  An error occurred while submitting the form';
        console.error('Form submission error:', error);
      }
    });
  }
  
  /**
   * Handle form submission using the centralized CsvFormService
   * @param formDefinition The form definition
   * @param formData The form data
   */
  private handleFormSubmissionViaCsvService(formDefinition: CsvFormDefinition, formData: Record<string, any>): void {
    // Use the centralized CSV form service to handle the submission
    this.csvFormService.submitForm(formDefinition.formId, formData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        console.log('Form submission successful:', response);
        
        if (this.isInChain) {
          // For forms in chains, show transaction result dialog and emit response
          const displayName = formDefinition.title || 'Operation Result';
          
          // Check if we have an application error
          if (response.applicationError) {
            // Determine title based on error type
            const errorType = response.applicationError.errorType || 'Error';
            const isDbError = errorType === 'SqlException';
            
            const dialogData = {
              title: isDbError ? 'Database Error' : 'Application Error',
              message: response.applicationError.errorMessage || 'An error occurred',
              status: errorType,
              messageLabel: isDbError ? 'SQL Error Description' : 'Error Description',
              statusLabel: 'Error Type'
            };
            
            this.dialog.open(TransactionResultDialogComponent, {
              data: dialogData
            });
          } else {
            // Database transaction result - use transaction parameters with standard labels
            const dialogData = {
              title: displayName,
              // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
              message: response.transactionMessage,
              status: response.transactionStatus
              // Don't set custom labels - will use default 'Message' and 'Transaction Status'
            };
            
            this.dialog.open(TransactionResultDialogComponent, {
              data: dialogData
            });
          }
          
          // Emit the API response for chain processing
          console.log('Emitting API response for chain processing:', response);
          this.formSubmitted.emit(response);
        } else {
          // For regular forms (not in chains), emit the response
          this.formSubmitted.emit(response);
          
          // If this is a DUC form, show success dialog
          if (formDefinition.formType === 'DUC') {
            // Check if we have an application error
            if (response.applicationError) {
              // Determine title based on error type
              const errorType = response.applicationError.errorType || 'Error';
              const isDbError = errorType === 'SqlException';
              
              const dialogData = {
                title: isDbError ? 'Database Error' : 'Application Error',
                message: response.applicationError.errorMessage || 'An error occurred',
                status: errorType,
                messageLabel: isDbError ? 'SQL Error Description' : 'Error Description',
                statusLabel: 'Error Type'
              };
              
              this.dialog.open(TransactionResultDialogComponent, {
                data: dialogData
              });
            } else {
              // Database transaction result - use transaction parameters with standard labels
              const dialogData = {
                title: formDefinition.title || 'Operation Result',
                // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                message: response.transactionMessage,
                status: response.transactionStatus
                // Don't set custom labels - will use default 'Message' and 'Transaction Status'
              };
              
              this.dialog.open(TransactionResultDialogComponent, {
                data: dialogData
              });
            }
          }
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Form submission error:', error);
        
        // Create application error message instead of hijacking database parameters
        const applicationError = this.applicationMessageService.createFromHttpError(error);
        
        // Show error dialog with application messages
        this.dialog.open(ApplicationErrorDialogComponent, {
          data: {
            title: 'Application Error',
            errors: [{
              fieldName: 'Form Submission',
              errorMessage: applicationError.appErrors?.[0] || applicationError.systemErrors?.[0] || 'An error occurred while submitting the form'
            }]
          }
        });
        
        // For chains, emit application error response without hijacking database parameters
        if (this.isInChain) {
          this.formSubmitted.emit({
            applicationMessages: applicationError,
            operationStatus: 'Failed'
          });
        }
      }
    });
  }
  
  /**
   * Handle submission of a CUSTOM form
   * @param formDefinition The form definition
   * @param formData The form data
   */
  private handleCustomForm(formDefinition: CsvFormDefinition, formData: Record<string, any>): void {
    // Map form data to query parameters
    const params = this.mapFormDataToParams(formData);
    
    this.isLoading = false;
    
    // Emit the form data for processing
    this.formSubmitted.emit(formData);
    
    // Navigate to the custom route specified in the form's reference
    // CUSTOM forms should always navigate directly to their route, even in chains
    if (formDefinition.reference) {
      const targetUrl = `/${formDefinition.reference}`;
      console.log(`Navigating to custom route: ${targetUrl} with params:`, params);
      
      // Convert params to query params for navigation
      const navigationParams: Record<string, string> = {};
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          navigationParams[key] = String(params[key]);
        }
      });
      
      // CRITICAL: Determine the route type by checking CSV files BEFORE navigating
      // This ensures the correct module handles the route
      forkJoin({
        isCustomView: this.routeManagerService.isCustomViewRoute(targetUrl),
        isDuc: this.routeManagerService.isDucRoute(targetUrl),
        isRead: this.routeManagerService.isReadRoute(targetUrl)
      }).subscribe({
        next: (routeTypes) => {
          console.log(`✅ CSV-FORM: Route type check for ${targetUrl} completed:`, routeTypes);
          
          // Determine ActionType based on CSV checks
          let actionType: 'CUSTOM' | 'DUC' | 'READ';
          if (routeTypes.isCustomView) {
            actionType = 'CUSTOM';
            console.log(`✅ CSV-FORM: Route ${targetUrl} is a CUSTOM view`);
          } else if (routeTypes.isDuc) {
            actionType = 'DUC';
            console.log(`✅ CSV-FORM: Route ${targetUrl} is a DUC route`);
          } else if (routeTypes.isRead) {
            actionType = 'READ';
            console.log(`✅ CSV-FORM: Route ${targetUrl} is a READ route`);
          } else {
            console.error(`❌ CSV-FORM: Route ${targetUrl} not found in any CSV file`);
            this.errorMessage = `Route ${targetUrl} not found in configuration`;
            return;
          }
          
          const fullRouteUrl = targetUrl + (Object.keys(navigationParams).length > 0 ? '?' + new URLSearchParams(navigationParams).toString() : '');
          console.log(`✅ CSV-FORM: Setting context with ActionType: ${actionType} for ${fullRouteUrl}`);
          
          // Set context before navigation
          this.contextAwareRoutingService.navigateWithContext({
            actionType,
            reference: formDefinition.reference,
            routeUrl: fullRouteUrl
          });
          
          console.log(`✅ CSV-FORM: navigateWithContext called successfully`);
        },
        error: (error) => {
          console.error(`❌ CSV-FORM: Error determining route type for ${targetUrl}:`, error);
          this.errorMessage = `Error determining route type`;
        }
      });
    } else {
      console.error('No reference route specified for CUSTOM form');
    }
  }
  
  /**
   * Map form data to API parameters
   * @param formData The form data
   * @returns The mapped parameters
   */
  private mapFormDataToParams(formData: Record<string, any>): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Map form fields to API parameters using parameterId
    this.formFields.forEach(field => {
      // Skip empty number fields
      const normalizedDataType = (field.dataType || '').trim().toUpperCase();
      const isNumberField = normalizedDataType === 'NUMBER' ||
                           normalizedDataType === 'DOCUMENT INTEGER' ||
                           normalizedDataType === 'FILE INTEGER';
      const isDateField = normalizedDataType === 'DATE' ||
                         normalizedDataType === 'DOCUMENT DATE' ||
                         normalizedDataType === 'FILE DATE';
      
      if (field.parameterId && formData[field.id] !== undefined) {
        // For number fields, only include if value is not empty
        if (isNumberField && (formData[field.id] === '' || formData[field.id] === null)) {
          // Skip this field
          console.log(`Skipping empty number field: ${field.id} (${field.label})`);
        } else if (isDateField && formData[field.id] instanceof Date) {
          // For date fields, convert Date object to simple ISO format (YYYY-MM-DD)
          // Use DateFormatService to ensure consistent date handling
          const date = formData[field.id] as Date;
          if (!isNaN(date.getTime())) {
            const dateString = DateFormatService.convertDateToApi(date);
            console.log(`CSV-FORM DATE CONVERSION: Field ${field.id} (${field.label}): Date object ${date.toISOString()} -> API format ${dateString}`);
            params[field.parameterId] = dateString;
          }
        } else {
          params[field.parameterId] = formData[field.id];
        }
      }
    });
    
    // Add any additional parameters from the input params
    if (this.params) {
      Object.keys(this.params).forEach(key => {
        // Only add params that don't already exist
        if (!params[key] && this.params[key] !== undefined) {
          params[key] = this.params[key];
        }
      });
    }
    
    return params;
  }

  /**
   * Cancel the form
   */
  onCancel(): void {
    this.formCancelled.emit();
  }

  /**
   * Process the form title with title data
   * Format in CSV: "Text1|ColumnName1;Text2|ColumnName2,..."
   * Adds two spaces between title and title data
   */
  private processFormTitle(): void {
    if (!this.formDefinition) return;

    this.formTitle = this.formDefinition.title;

    if (this.formDefinition.titleData && this.params) {
      let titleDataText = '';
      const titleDataParts = this.formDefinition.titleData.split(';');
      
      for (const part of titleDataParts) {
        const [text, paramName] = part.split('|').map(p => p.trim());
        
        if (paramName && this.params[paramName]) {
          if (titleDataText) {
            titleDataText += ' ';
          }
          titleDataText += `${text} ${this.params[paramName]}`;
        }
      }
      
      // Add two spaces between title and title data if there is title data
      if (titleDataText) {
        this.formTitle += '  ' + titleDataText; // Two spaces here
      }
    }
  }

  /**
   * Get the formatted title including any dynamic title data
   */
  getFormattedTitle(): string {
    return this.formTitle;
  }

  /**
   * Handle dropdown interaction
   * @param event The click event
   */
  onDropdownInteraction(event: Event): void {
    // No need to do anything special here anymore
    // We're now using isFormSubmitted to control when validation errors are shown
  }
  
  /**
   * Handle dropdown change event
   * @param event The change event
   * @param fieldId The field ID
   */
  onDropdownChange(event: Event, fieldId: string): void {
    // Get the selected value for debugging
    const selectElement = event.target as HTMLSelectElement;
    const selectedValue = selectElement.value;
    
    console.log(`Dropdown ${fieldId} changed to:`, selectedValue);
  }
  
  /**
   * Get formatted date display for a field
   * @param field The form field
   * @returns The formatted date string
   */
  getFormattedDateDisplay(field: CsvFormField): string {
    const currentValue = this.form.get(field.id)?.value;
    
    // If we have a Date object and a format style, format it for display using database format
    if (currentValue instanceof Date && this.dateFormatStyle !== undefined) {
      try {
        // Convert Date to API format, then to display format
        const apiDateString = DateFormatService.convertDateToApi(currentValue);
        return DateFormatService.convertToDisplayFormat(apiDateString, this.dateFormatStyle);
      } catch (error) {
        console.error(`Error formatting date for field ${field.id}:`, error);
        return '';
      }
    }
    
    return '';
  }
  
  /**
   * Handle date picker closed event
   * @param field The form field
   */
  onDateChange(field: CsvFormField): void {
    // Date is already stored as Date object in form control by Material datepicker
    // Just log for debugging
    const currentValue = this.form.get(field.id)?.value;
    console.log(`Date changed for field ${field.id}:`, currentValue);
  }
}

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

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../../environments/environment';
import { RouteConfigParserService } from './route-config-parser.service';
import { DucRouteConfigService } from './duc-route-config.service';
import { DucRouteConfig } from '../interfaces/duc-route.interface';
import { ApplicationMessageService } from './application-message.service';
import { LayeredResponse } from '../interfaces/layered-response.interface';
import { DateFormatService } from './date-format.service';

/**
 * Form Handling Data Structure
 *
 * The form handling system uses a normalized data structure with three main components:
 *
 * 1. Forms (forms.csv) - Defines the forms and their properties
 * 2. Form Fields (form-fields.csv) - Defines reusable form fields
 * 3. Form-FormField Links (form-formfield-links.csv) - Links forms to form fields with form-specific attributes
 *
 * This normalized structure allows form fields to be reused across multiple forms,
 * reducing duplication and making maintenance easier.
 */

/**
 * Interface for CSV form definition
 * Represents a form loaded from the forms.csv file
 */
export interface CsvFormDefinition {
  /** Unique identifier for the form */
  formId: string;
  /** Type of form (READ, DUC, PASSTHROUGH, CUSTOM) */
  formType: string;
  /** Reference to RouteId in duc-routes.csv, TableName in read-routes.csv, or blank for PASSTHROUGH */
  reference: string;
  /** Title to display on the form */
  title: string;
  /** Data to use in the title (for dynamic titles) */
  titleData?: string;
  /** Instructions to display at the bottom of the form */
  instructions?: string;
  /** Width of the form dialog */
  width?: string;
  /** Height of the form dialog */
  height?: string;
}

/**
 * Interface for CSV form field
 * Represents a field in a CSV-based form
 */
export interface CsvFormField {
  /** Field ID */
  id: string;
  /** Label for the field */
  label: string;
  /** Maximum length of the field */
  length: number;
  /** Character limit for text input */
  characterLimit?: number;
  /** Data type of the field */
  dataType: string;
  /** Default value for the field */
  defaultValue?: string;
  /** How the field is populated */
  populationType: string;
  /** Reference to another entity */
  reference?: string;
  /** Parameter ID for API calls */
  parameterId?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Help text */
  helpText?: string;
  /** Alias for the ID field in dropdown options */
  idAlias?: string;
  /** Alias for the Name field in dropdown options */
  nameAlias?: string;
  
  // These properties are set from form-formfield-links.csv when used in a form
  /** Whether the field is mandatory (set from form-formfield-links.csv) */
  isMandatory?: boolean;
  /** Display order (set from form-formfield-links.csv) */
  order?: number;
}

/**
 * Interface for form-formfield link
 * Represents a link between a form and a form field from form-formfield-links.csv
 */
export interface FormFieldLink {
  /** Form ID this link belongs to */
  formId: string;
  /** Form Field ID this link references */
  formFieldId: string;
  /** Whether the field is mandatory in this form */
  isMandatory: boolean;
  /** Display order in this form */
  order: number;
}

/**
 * Service for handling CSV-based forms
 *
 * This service loads and processes form definitions from CSV files:
 * - forms.csv: Defines forms
 * - form-fields.csv: Defines reusable form fields
 * - form-formfield-links.csv: Links forms to form fields with form-specific attributes
 *
 * The service supports both the normalized data structure (using form-formfield-links.csv)
 * and the direct form-to-field mapping in form-fields.csv .
 */
@Injectable({
  providedIn: 'root'
})
export class CsvFormService {
  /** Map of form definitions indexed by form ID */
  private forms = new Map<string, CsvFormDefinition>();
  
  /** Map of form fields indexed by field ID */
  private formFieldsById = new Map<string, CsvFormField>();
  
  /** Map of form field links indexed by form ID */
  private formFieldLinks = new Map<string, FormFieldLink[]>();
  
  /** Set of parameter IDs that should be treated as numeric (vs text like Document ID) */
  private numericIdParameters = new Set<string>();
  
  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private routeConfigParserService: RouteConfigParserService,
    private ducRouteConfigService: DucRouteConfigService,
    private applicationMessageService: ApplicationMessageService
  ) {
    this.loadForms();
    this.loadFormFields();
    this.loadFormFieldLinks();
    this.loadParameterIdDataTypes();
  }
  
  /**
   * Load forms from CSV file
   */
  private loadForms(): void {
    this.http.get('/assets/forms.csv', { responseType: 'text' })
      .pipe(
        map(csv => this.parseFormsCsv(csv)),
        catchError(error => {
          console.error('Error loading forms:', error);
          return of([]);
        })
      )
      .subscribe(forms => {
        forms.forEach(form => {
          this.forms.set(form.formId, form);
        });
        console.log('Loaded CSV forms:', this.forms);
      });
  }
  
  /**
   * Load form fields from CSV file
   */
  private loadFormFields(): void {
    this.http.get('/assets/form-fields.csv', { responseType: 'text' })
      .pipe(
        map(csv => this.parseFormFieldsCsv(csv)),
        catchError(error => {
          console.error('Error loading form fields:', error);
          return of([]);
        })
      )
      .subscribe(fields => {
        // Store fields by ID
        fields.forEach(field => {
          // Store by field ID
          this.formFieldsById.set(field.id, field);
        });
        
        console.log('Loaded CSV form fields by ID:', this.formFieldsById);
      });
  }
  
  /**
   * Load form field links from CSV file
   */
  private loadFormFieldLinks(): void {
    this.http.get('/assets/form-formfield-links.csv', { responseType: 'text' })
      .pipe(
        map(csv => this.parseFormFieldLinksCsv(csv)),
        catchError(error => {
          console.error('Error loading form field links:', error);
          return of([]);
        })
      )
      .subscribe(links => {
        // Group links by formId
        links.forEach(link => {
          if (!this.formFieldLinks.has(link.formId)) {
            this.formFieldLinks.set(link.formId, []);
          }
          this.formFieldLinks.get(link.formId)!.push(link);
        });
        
        // Sort links by order
        this.formFieldLinks.forEach(links => {
          links.sort((a, b) => a.order - b.order);
        });
        
        console.log('Loaded CSV form field links:', this.formFieldLinks);
      });
    }
    
    /**
     * Load parameter ID data types from CSV file
     * This distinguishes numeric IDs (User ID, Request ID) from text IDs (Document ID)
     */
    private loadParameterIdDataTypes(): void {
      this.http.get('/assets/input-id-parameter-mapping.csv', { responseType: 'text' })
        .pipe(
          map(csv => this.parseParameterIdDataTypesCsv(csv)),
          catchError(error => {
            console.error('Error loading parameter ID data types:', error);
            return of([]);
          })
        )
        .subscribe(parameters => {
          parameters.forEach(param => {
            if (param.dataType === 'NUMBER') {
              this.numericIdParameters.add(param.parameterId);
            }
          });
          console.log('Loaded numeric ID parameters:', this.numericIdParameters);
        });
    }
    
    /**
     * Parse the parameter ID data types CSV
     * @param csv The CSV string to parse
     * @returns An array of parameter ID data type objects
     */
    private parseParameterIdDataTypesCsv(csv: string): Array<{parameterId: string, dataType: string}> {
      const parameters: Array<{parameterId: string, dataType: string}> = [];
      const lines = csv.split('\n');
      
      // Get header row
      if (lines.length < 2) {
        console.error('Parameter ID data types CSV file is empty or missing header row');
        return [];
      }
      
      const headerLine = lines[0].trim();
      const headers = this.parseCSVLine(headerLine);
      
      // Get column indices
      const parameterIdIndex = headers.indexOf('InputParameter');
      const dataTypeIndex = headers.indexOf('IdDataType');
      
      // Validate required columns exist
      if (parameterIdIndex === -1 || dataTypeIndex === -1) {
        console.error('Parameter ID data types CSV is missing required columns');
        return [];
      }
      
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = this.parseCSVLine(line);
        
        // Skip lines with insufficient values
        if (values.length <= Math.max(parameterIdIndex, dataTypeIndex)) {
          continue;
        }
        
        const parameterId = values[parameterIdIndex];
        const dataType = values[dataTypeIndex];
        
        if (parameterId && dataType) {
          parameters.push({ parameterId, dataType });
        }
      }
      
      return parameters;
    }
    
    /**
   * Get a form by its ID
   * @param formId The ID of the form to get
   * @returns The form definition or undefined if not found
   */
  getForm(formId: string): CsvFormDefinition | undefined {
    return this.forms.get(formId);
  }
  
  /**
   * Get form fields for a specific form
   * @param formId The ID of the form to get fields for
   * @returns An array of form fields for the specified form
   *
   * This method supports both data structures:
   *
   * Normalized Structure (Preferred):
   * 1. Checks if there are form field links for the given formId in form-formfield-links.csv
   * 2. If links exist, retrieves the corresponding form fields from the formFieldsById map
   * 3. Applies form-specific attributes (isMandatory, order) from the links
   * 4. Returns the customized fields sorted by order
   *
   * Legacy Structure (Backward Compatibility):
   * 1. If no links exist, falls back to the direct form field lookup using formId
   * 2. Returns the fields as defined in form-fields.csv
   */
  getFormFields(formId: string): CsvFormField[] {
    // Check if we have form field links for this form
    const links = this.formFieldLinks.get(formId);
    
    // If we have links, use them to retrieve and customize form fields
    if (links && links.length > 0) {
      console.log(`Using form field links for form ${formId}`);
      
      // Create an array to hold the customized form fields
      const customizedFields: CsvFormField[] = [];
      
      // Process each link
      links.forEach(link => {
        const matchingField = this.formFieldsById.get(link.formFieldId);
        
        if (!matchingField) {
          throw new Error(
            `Form field '${link.formFieldId}' not found in form-fields.csv for form '${formId}'. ` +
            `All form fields referenced in form-formfield-links.csv must exist in form-fields.csv. ` +
            `Check that FormFieldId '${link.formFieldId}' is defined in form-fields.csv.`
          );
        }
        
        const customField: CsvFormField = { ...matchingField };
        
        customField.isMandatory = link.isMandatory;
        customField.order = link.order;
        
        customizedFields.push(customField);
      });
      
      // Sort by order
      customizedFields.sort((a, b) => {
        // Handle undefined order values
        const orderA = a.order !== undefined ? a.order : 0;
        const orderB = b.order !== undefined ? b.order : 0;
        return orderA - orderB;
      });
      
      return customizedFields;
    }
    
    // If no links exist, return an empty array
    console.log(`No form field links found for form ${formId}`);
    return [];
  }
  
  /**
   * Process a form submission
   * @param formId The ID of the form being submitted
   * @param formData The form data to submit
   * @returns An Observable of the API response
   */
  submitForm(formId: string, formData: Record<string, any>): Observable<any> {
    const form = this.getForm(formId);
    if (!form) {
      // FIXED: Don't hijack database parameters - use application error instead
      return of(this.applicationMessageService.createFormError(`Form not found: ${formId}`));
    }
    
    // Handle PASSTHROUGH forms - return data directly without API call
    if (form.formType === 'PASSTHROUGH') {
      console.log(`PASSTHROUGH form ${formId} - returning form data directly without API call`);
      
      // Use the same field mapping logic as other forms
      const requestBody: Record<string, any> = {};
      const fields = this.getFormFields(formId);
      
      fields.forEach(field => {
        if (field.parameterId && formData[field.id] !== undefined) {
          let value = formData[field.id];
          
          // Apply the same data type conversions as other forms
          const normalizedDataType = (field.dataType || '').trim().toUpperCase();
          const isNumberField = normalizedDataType === 'NUMBER' ||
                               normalizedDataType.includes('INTEGER');
          const isDateField = normalizedDataType === 'DATE' ||
                             normalizedDataType.includes('DATE');
          const isNumericIdParameter = this.numericIdParameters.has(field.parameterId || '');
          
          if ((isNumberField || isNumericIdParameter) && (value === '' || value === null)) {
            value = null;
          } else if ((isNumberField || isNumericIdParameter) && value !== null) {
            const numValue = parseInt(value, 10);
            value = isNaN(numValue) ? null : numValue;
          } else if (isDateField && value instanceof Date) {
            value = DateFormatService.convertDateToApi(value);
          }
          
          requestBody[field.parameterId] = value;
        }
      });
      
      console.log(`PASSTHROUGH form ${formId} - Returning mapped data:`, requestBody);
      return of(requestBody);
    }
    
    // Create the request body from the form data
    const requestBody: Record<string, any> = {};
    
    // Add form fields to the request body using parameterId as the key
    const fields = this.getFormFields(formId);
    console.log(`CsvFormService.submitForm() - Form ID: ${formId}`);
    console.log(`CsvFormService.submitForm() - Fields loaded:`, fields);
    console.log(`CsvFormService.submitForm() - Form data received:`, formData);
    
    fields.forEach(field => {
      console.log(`Processing field: ${field.id} (${field.label}), parameterId: ${field.parameterId}`);
      if (field.parameterId && formData[field.id] !== undefined) {
        let value = formData[field.id];
        
        // Handle number fields - convert empty strings to null for nullable types
        const normalizedDataType = (field.dataType || '').trim().toUpperCase();
        const isNumberField = normalizedDataType === 'NUMBER' ||
                             normalizedDataType === 'DOCUMENT INTEGER' ||
                             normalizedDataType === 'FILE INTEGER';
        const isDateField = normalizedDataType === 'DATE' ||
                           normalizedDataType === 'DOCUMENT DATE' ||
                           normalizedDataType === 'FILE DATE';
        
        // Check if this parameter ID should be treated as a numeric ID
        // (using CSV-based mapping to distinguish numeric IDs from text IDs like Document ID)
        const isNumericIdParameter = this.numericIdParameters.has(field.parameterId || '');
        
        // Convert empty strings to null for number fields and numeric ID parameters
        if ((isNumberField || isNumericIdParameter) && (value === '' || value === null)) {
          value = null;
        } else if ((isNumberField || isNumericIdParameter) && value !== null) {
          // Convert to actual number for number fields and numeric ID parameters
          const numValue = parseInt(value, 10);
          value = isNaN(numValue) ? null : numValue;
        } else if (isDateField && (value === '' || value === null)) {
          // Convert empty strings to null for date fields
          value = null;
        } else if (isDateField && value instanceof Date) {
          // Convert Date objects to YYYY-MM-DD format to avoid timezone issues
          const dateString = DateFormatService.convertDateToApi(value);
          console.log(`CSV-FORM-SERVICE DATE CONVERSION: Field ${field.id} (${field.label}): Date object ${value.toString()} -> API format ${dateString}`);
          value = dateString;
        }
        
        requestBody[field.parameterId] = value;
        console.log(`✓ Mapped: ${field.id} (${field.label}) -> ${field.parameterId} = ${value} (numeric: ${isNumericIdParameter})`);
      } else {
        if (!field.parameterId) {
          console.log(`✗ Skipped field ${field.id} (${field.label}): No parameterId`);
        }
        if (formData[field.id] === undefined) {
          console.log(`✗ Skipped field ${field.id} (${field.label}): No data (formData[${field.id}] = undefined)`);
        }
      }
    });
    
    console.log(`CsvFormService.submitForm() - Final request body:`, requestBody);
    
    // Get the ApiEndpoint based on form type
    if (form.formType === 'DUC') {
      // For DUC forms, look up in duc-routes.csv by RouteId
      return this.ducRouteConfigService.getRouteConfig(form.reference).pipe(
        switchMap((ducConfig: DucRouteConfig | undefined) => {
          if (!ducConfig) {
            console.error(`No DUC route configuration found for RouteId ${form.reference}`);
            // FIXED: Don't hijack database parameters - use application error instead
            return of(this.applicationMessageService.createConfigError(`No DUC route configuration found for RouteId ${form.reference}`));
          }
          
          if (!ducConfig.apiEndpoint) {
            console.error(`No ApiEndpoint found for DUC RouteId ${form.reference}`);
            // FIXED: Don't hijack database parameters - use application error instead
            return of(this.applicationMessageService.createConfigError(`No ApiEndpoint found for DUC RouteId ${form.reference}`));
          }
          
          console.log(`Found DUC ApiEndpoint ${ducConfig.apiEndpoint} for RouteId ${form.reference}`);
          
          // Use the ApiEndpoint from the DUC configuration
          const url = `${environment.dotNetBaseUrl}/${ducConfig.apiEndpoint.replace(/^\//, '')}`;
          
          console.log(`Submitting DUC form ${formId} to ${url}:`, requestBody);
          
          // Make the API call
          return this.http.post(url, requestBody);
        })
      );
    } else {
      // For READ forms, look up in read-routes.csv by TableName
      return this.routeConfigParserService.loadRouteConfigurations().pipe(
        switchMap(configs => {
          // Find the config with the matching table name
          const config = configs.find(c => c.TableName === form.reference);
          
          if (!config) {
            console.error(`No read route configuration found for TableName ${form.reference}`);
            // FIXED: Don't hijack database parameters - use application error instead
            return of(this.applicationMessageService.createConfigError(`No read route configuration found for TableName ${form.reference}`));
          }
          
          if (!config.ApiEndpoint) {
            console.error(`No ApiEndpoint found for TableName ${form.reference}`);
            // FIXED: Don't hijack database parameters - use application error instead
            return of(this.applicationMessageService.createConfigError(`No ApiEndpoint found for TableName ${form.reference}`));
          }
          
          console.log(`Found read route ApiEndpoint ${config.ApiEndpoint} for TableName ${form.reference}`);
        
          // Use the ApiEndpoint from the read route configuration
          const url = `${environment.dotNetBaseUrl}/${config.ApiEndpoint.replace(/^\//, '')}`;
          
          console.log(`Submitting read form ${formId} to ${url}:`, requestBody);
          
          // Make the API call
          return this.http.post(url, requestBody);
        })
      );
    }
  }
  
  /**
   * Parse the forms CSV into form definitions
   * @param csv The CSV string to parse
   * @returns An array of form definitions
   */
  private parseFormsCsv(csv: string): CsvFormDefinition[] {
    const forms: CsvFormDefinition[] = [];
    const lines = csv.split('\n');
    
    // Get header row to validate column positions
    if (lines.length < 2) {
      console.error('Forms CSV file is empty or missing header row');
      return [];
    }
    
    const headerLine = lines[0].trim();
    const headers = this.parseCSVLine(headerLine);
    
    // Get column indices
    const formIdIndex = headers.indexOf('FormId');
    const formTypeIndex = headers.indexOf('FormType');
    const referenceIndex = headers.indexOf('Reference');
    const titleIndex = headers.indexOf('Title');
    const titleDataIndex = headers.indexOf('TitleData');
    const instructionsIndex = headers.indexOf('Instructions');
    const widthIndex = headers.indexOf('Width');
    const heightIndex = headers.indexOf('Height');
    
    // Validate required columns exist
    if (formIdIndex === -1 || formTypeIndex === -1 || referenceIndex === -1 ||
        titleIndex === -1) {
      console.error('Forms CSV is missing required columns');
      return [];
    }
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      
      // Skip lines with insufficient values
      if (values.length <= Math.max(formIdIndex, formTypeIndex, referenceIndex, titleIndex)) {
        console.warn(`Line ${i+1} in forms.csv has insufficient values`);
        continue;
      }
      
      const form: CsvFormDefinition = {
        formId: values[formIdIndex],
        formType: values[formTypeIndex],
        reference: values[referenceIndex],
        title: values[titleIndex],
        titleData: titleDataIndex >= 0 && titleDataIndex < values.length ? values[titleDataIndex] : undefined,
        instructions: instructionsIndex >= 0 && instructionsIndex < values.length ? values[instructionsIndex] : undefined,
        width: widthIndex >= 0 && widthIndex < values.length ? values[widthIndex] : undefined,
        height: heightIndex >= 0 && heightIndex < values.length ? values[heightIndex] : undefined
      };
      
      forms.push(form);
    }
    
    return forms;
  }
  
  /**
   * Parse the form fields CSV into form field objects
   * @param csv The CSV string to parse
   * @returns An array of form field objects
   */
  private parseFormFieldsCsv(csv: string): CsvFormField[] {
    const fields: CsvFormField[] = [];
    const lines = csv.split('\n');
    
    // Get header row to validate column positions
    if (lines.length < 2) {
      console.error('Form fields CSV file is empty or missing header row');
      return [];
    }
    
    const headerLine = lines[0].trim();
    const headers = this.parseCSVLine(headerLine);
    
    // Get column indices
    const formFieldIdIndex = headers.indexOf('FormFieldID');
    const fieldLabelIndex = headers.indexOf('FieldLabel');
    const lengthIndex = headers.indexOf('Length');
    const characterLimitIndex = headers.indexOf('CharacterLimit');
    const dataTypeIndex = headers.indexOf('DataType');
    const defaultValueIndex = headers.indexOf('DefaultValue');
    const populationTypeIndex = headers.indexOf('PopulationType');
    const referenceIndex = headers.indexOf('Reference');
    const parameterIdIndex = headers.indexOf('ParameterId');
    const placeholderIndex = headers.indexOf('Placeholder');
    const helpTextIndex = headers.indexOf('HelpText');
    const idAliasIndex = headers.indexOf('IdAlias');
    const nameAliasIndex = headers.indexOf('NameAlias');
    
    // Validate required columns exist
    if (formFieldIdIndex === -1 || fieldLabelIndex === -1 ||
        dataTypeIndex === -1 || populationTypeIndex === -1) {
      console.error('Form fields CSV is missing required columns');
      return [];
    }
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      
      // Skip lines with insufficient values
      if (values.length <= Math.max(formFieldIdIndex, fieldLabelIndex, dataTypeIndex, populationTypeIndex)) {
        console.warn(`Line ${i+1} in form-fields.csv has insufficient values`);
        continue;
      }
      
      const field: CsvFormField = {
        id: values[formFieldIdIndex],
        label: values[fieldLabelIndex],
        length: lengthIndex >= 0 && lengthIndex < values.length ? parseInt(values[lengthIndex]) || 0 : 0,
        characterLimit: characterLimitIndex >= 0 && characterLimitIndex < values.length && values[characterLimitIndex]
          ? parseInt(values[characterLimitIndex]) || undefined : undefined,
        dataType: values[dataTypeIndex],
        defaultValue: defaultValueIndex >= 0 && defaultValueIndex < values.length ? values[defaultValueIndex] : undefined,
        populationType: values[populationTypeIndex],
        reference: referenceIndex >= 0 && referenceIndex < values.length ? values[referenceIndex] : undefined,
        parameterId: parameterIdIndex >= 0 && parameterIdIndex < values.length ? values[parameterIdIndex] : undefined,
        placeholder: placeholderIndex >= 0 && placeholderIndex < values.length ? values[placeholderIndex] : undefined,
        helpText: helpTextIndex >= 0 && helpTextIndex < values.length ? values[helpTextIndex] : undefined,
        idAlias: idAliasIndex >= 0 && idAliasIndex < values.length ? values[idAliasIndex] : undefined,
        nameAlias: nameAliasIndex >= 0 && nameAliasIndex < values.length ? values[nameAliasIndex] : undefined
      };
      
      fields.push(field);
    }
    
    return fields;
  }
  
  /**
   * Parse the form field links CSV into form field link objects
   * @param csv The CSV string to parse
   * @returns An array of form field link objects
   */
  private parseFormFieldLinksCsv(csv: string): FormFieldLink[] {
    const links: FormFieldLink[] = [];
    const lines = csv.split('\n');
    
    // Get header row to validate column positions
    if (lines.length < 2) {
      console.error('Form field links CSV file is empty or missing header row');
      return [];
    }
    
    const headerLine = lines[0].trim();
    const headers = this.parseCSVLine(headerLine);
    
    // Get column indices
    const formIdIndex = headers.indexOf('FormId');
    const formFieldIdIndex = headers.indexOf('FormFieldId');
    const isMandatoryIndex = headers.indexOf('IsMandatory');
    const orderIndex = headers.indexOf('Order');
    
    // Validate required columns exist
    if (formIdIndex === -1 || formFieldIdIndex === -1 ||
        isMandatoryIndex === -1 || orderIndex === -1) {
      console.error('Form field links CSV is missing required columns');
      return [];
    }
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      
      // Skip lines with insufficient values
      if (values.length <= Math.max(formIdIndex, formFieldIdIndex, isMandatoryIndex, orderIndex)) {
        console.warn(`Line ${i+1} in form-formfield-links.csv has insufficient values`);
        continue;
      }
      
      const link: FormFieldLink = {
        formId: values[formIdIndex],
        formFieldId: values[formFieldIdIndex],
        isMandatory: values[isMandatoryIndex] === 'Y',
        order: orderIndex >= 0 && orderIndex < values.length ? parseInt(values[orderIndex]) || 0 : 0
      };
      
      links.push(link);
    }
    
    return links;
  }
  
  /**
   * Helper method to parse CSV line with proper handling of quoted values
   * @param line The CSV line to parse
   * @returns An array of values from the CSV line
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue);
    
    return values;
  }

  /**
   * Fetch dropdown options from an API endpoint
   * @param tableName The table name (Reference) to fetch options from
   * @param params Parameters to pass to the API
   * @param idAlias Optional ID alias to match against KeyColumns
   * @param nameAlias Optional Name alias to match against KeyColumns
   * @returns An observable of dropdown options
   */
  fetchDropdownOptions(tableName: string, params: { [key: string]: string }, idAlias?: string, nameAlias?: string): Observable<any[]> {
    // First, get the ApiEndpoint, DataField, and KeyColumns for the given TableName
    return this.routeConfigParserService.loadRouteConfigurations().pipe(
      switchMap(configs => {
        const config = configs.find(c => c.TableName === tableName);
        
        if (!config) {
          throw new Error(
            `No configuration found for table ${tableName} in read-routes.csv. ` +
            `All tables used in dropdowns must be defined in read-routes.csv.`
          );
        }
        
        if (!config.ApiEndpoint) {
          throw new Error(
            `No ApiEndpoint found for table ${tableName} in read-routes.csv. ` +
            `ApiEndpoint must be explicitly specified for all tables.`
          );
        }
        
        const dataField = config.DataField;
        if (!dataField) {
          throw new Error(
            `No DataField found for table ${tableName} in read-routes.csv. ` +
            `DataField must be explicitly specified for all tables.`
          );
        }
        
        const keyColumns = config.KeyColumns;
        if (!keyColumns) {
          throw new Error(
            `No KeyColumns found for table ${tableName} in read-routes.csv. ` +
            `KeyColumns must be explicitly specified for all tables used in dropdowns.`
          );
        }
        
        console.log(`Found configuration for ${tableName}:`, {
          ApiEndpoint: config.ApiEndpoint,
          DataField: dataField,
          KeyColumns: keyColumns
        });
        
        // Parse the KeyColumns to get the ID and Name aliases
        // Format is "ID Alias::Name Alias"
        const keyColumnPairs = keyColumns.split(';').map(pair => {
          const parts = pair.split('::');
          return {
            idAlias: parts[0]?.trim() || '',
            nameAlias: parts[1]?.trim() || ''
          };
        });
        
        // Use the ApiEndpoint from the configuration
        const url = `${environment.dotNetBaseUrl}/${config.ApiEndpoint.replace(/^\//, '')}`;
        const httpParams = new HttpParams({ fromObject: params });
        
        console.log(`Making API call to ${url} with params:`, params);
        
        return this.http.get(url, { params: httpParams }).pipe(
          map((response: any) => {
            if (!response) {
              throw new Error(`No response received from ${url}`);
            }
            
            console.log(`Response from ${url}:`, response);
            
            let data: any[] = [];
            
            if (dataField === 'dropDownOptions') {
              if (!Array.isArray(response.dropDownOptions)) {
                throw new Error(
                  `DataField '${dataField}' is not an array in response from ${url}. ` +
                  `Expected response.dropDownOptions to be an array. Response: ${JSON.stringify(response)}`
                );
              }
              data = response.dropDownOptions;
            } else if (response[dataField]) {
              if (!Array.isArray(response[dataField])) {
                throw new Error(
                  `DataField '${dataField}' is not an array in response from ${url}. ` +
                  `Expected response.${dataField} to be an array. Response: ${JSON.stringify(response)}`
                );
              }
              
              if (response[dataField].length > 0 && Array.isArray(response[dataField][0])) {
                data = response[dataField][0];
              } else {
                data = response[dataField];
              }
            } else {
              throw new Error(
                `DataField '${dataField}' not found in response from ${url}. ` +
                `Available fields: ${Object.keys(response).join(', ')}. ` +
                `Response: ${JSON.stringify(response)}`
              );
            }
            
            console.log(`Found ${data.length} items in ${dataField}`);
            
            if (!idAlias || !nameAlias) {
              throw new Error(
                `Missing required idAlias and nameAlias for table ${tableName}. ` +
                `Both idAlias and nameAlias must be explicitly specified in form-fields.csv. ` +
                `No default values or guessing is allowed.`
              );
            }
            
            const matchingPair = keyColumnPairs.find(pair =>
              pair.idAlias === idAlias && pair.nameAlias === nameAlias
            );
            
            if (!matchingPair) {
              throw new Error(
                `No matching key column pair found for ${idAlias}::${nameAlias} in table ${tableName}. ` +
                `Available pairs: ${keyColumnPairs.map(p => `${p.idAlias}::${p.nameAlias}`).join(', ')}. ` +
                `The idAlias and nameAlias in form-fields.csv must exactly match a KeyColumns pair in read-routes.csv.`
              );
            }
            
            const keyColumnPair = matchingPair;
            console.log(`Using key column pair: ${keyColumnPair.idAlias}::${keyColumnPair.nameAlias}`);
            
            return data.map((item: any, index: number) => {
              const id = item[keyColumnPair.idAlias];
              const name = item[keyColumnPair.nameAlias];
              
              if (id === undefined || id === null) {
                throw new Error(
                  `ID field '${keyColumnPair.idAlias}' is null or undefined in item ${index} from ${tableName}. ` +
                  `All dropdown items must have valid ID values. Item: ${JSON.stringify(item)}`
                );
              }
              
              if (name === undefined || name === null) {
                throw new Error(
                  `Name field '${keyColumnPair.nameAlias}' is null or undefined in item ${index} from ${tableName}. ` +
                  `All dropdown items must have valid Name values. Item: ${JSON.stringify(item)}`
                );
              }
              
              return {
                Name: name,
                Id: id,
                Mnemonic: item.Mnemonic !== undefined && item.Mnemonic !== null ? item.Mnemonic : '',
                Description: item.Description !== undefined && item.Description !== null ? item.Description : '',
                ListPosition: item['List Position'] !== undefined && item['List Position'] !== null ? item['List Position'] : 0
              };
            });
          })
        );
      })
    );
  }
}

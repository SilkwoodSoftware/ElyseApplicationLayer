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


import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { EditDocFileDataService } from './edit-doc-file-data.service';
import { MessageLabelService } from '../../shared/services/message-label.service';
import { FormFieldRoutingService } from '../../shared/services/form-field-routing.service';
import { FormFieldService } from '../../shared/services/form-field.service';
import { FieldConfig } from '../../shared/interfaces/field-config.interface';
import { TransactionResultDialogComponent } from '../../shared/components/transaction-results/transaction-result-dialog.component';
import { TransactionResultsComponent } from '../../shared/components/transaction-results/transaction-results.component';
import { DynamicFormComponent } from '../../shared/components/dynamic-form/dynamic-form.component';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { FormConfirmationDialogComponent } from '../../shared/components/form-confirmation-dialog/form-confirmation-dialog.component';
import { ApplicationErrorDialogComponent } from '../../shared/components/application-error-dialog/application-error-dialog.component';
import { DateFormatService } from '../../shared/services/date-format.service';
import { DocumentFileSelectionService } from '../../shared/services/document-file-selection.service';
import { ApplicationMessageService } from '../../shared/services/application-message.service';

@Component({
  selector: 'app-edit-doc-file-data',
  templateUrl: './edit-doc-file-data.component.html',
  styleUrls: [
    '../../shared/stylesheets/forms.scss',
    '../../shared/stylesheets/messages.scss'
  ]
})
export class EditDocFileDataComponent implements OnInit, OnDestroy {
  @ViewChildren(DynamicFormComponent) dynamicForms!: QueryList<DynamicFormComponent>; 

  documentId: string | null = null;
  fileId: number | null = null;
  formId: number | null = null;
  formFields: FieldConfig[] = [];
  leftColumnFields: FieldConfig[] = [];
  rightColumnFields: FieldConfig[] = [];
  messageItems: { label: string; value: string }[] = [];
  dateFormat: string = '';
  dateFormatString: string = '';
  dateFormatStyle: number | undefined = undefined;
  private excludedFieldTypes: string[] = [
    'File Content Hash',
    'File Size',
    'File Created By',
    'File Created',
    'File Created By User ID',
    'Document Created',
    'Document Created By',
    'Document Created By User ID'
  ];

  private destroy$ = new Subject<void>();
  private pendingActions = new Map<string, boolean>();
  private debounceTimer: any;

  constructor(
    private route: ActivatedRoute,
    private editDocFileDataService: EditDocFileDataService,
    private messageLabelService: MessageLabelService,
    private formFieldRoutingService: FormFieldRoutingService,
    private formFieldService: FormFieldService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private dateFormatService: DateFormatService,
    private documentFileSelectionService: DocumentFileSelectionService,
    private applicationMessageService: ApplicationMessageService
  ) {}

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(queryParams => {
      const documentId = queryParams.get('documentId') ? decodeURIComponent(queryParams.get('documentId')!) : null;
      const fileId = queryParams.get('fileId');
      const formId = queryParams.get('formId') ? Number(queryParams.get('formId')) : null;

      // If documentId is present, it's a document request (even if fileId is also present for document-file links)
      // If ONLY fileId is present (no documentId), it's a file request
      if (documentId) {
        this.documentId = documentId;
        this.fileId = fileId ? Number(fileId) : null;
      } else if (fileId) {
        // Only fileId present - this is a file request
        this.fileId = Number(fileId);
        this.documentId = null;
      } else {
        // Neither present - error case
        this.documentId = null;
        this.fileId = null;
      }
      
      this.formId = formId;

      // Wait for form field routing CSV to load, then fetch date format and form data
      this.formFieldRoutingService.isLoaded().pipe(takeUntil(this.destroy$)).subscribe(isLoaded => {
        if (isLoaded) {
          // Fetch date format first, then form data to ensure proper date format assignment
          this.fetchDateFormat(() => {
            this.fetchFormData();
          });
        }
      });

      if (this.documentId) {
        this.documentFileSelectionService.setSelection(this.documentId, null);
      }
    });
  }
  
  ngOnDestroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private extractMessageItems(data: any): { label: string; value: string }[] {
    return [
      { label: this.messageLabelService.getLabel('transactionMessage'), value: data.transactionMessage || '' },
      { label: this.messageLabelService.getLabel('transactionStatus'), value: data.transactionStatus || '' },
      { label: this.messageLabelService.getLabel('numberOfRows'), value: data.numberOfRows?.toString() || '' },
      { label: this.messageLabelService.getLabel('formName'), value: data.formName || '' }
    ].filter(item => item.value !== '');
  }

  fetchFormData() {
    if (this.documentId || this.fileId) {
      this.editDocFileDataService.getDocFileFormValues(this.documentId, this.fileId, this.formId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
         (response) => {
          // Backend returns two datasets:
          // 1. formValuesData - Fields with existing data (uses "Form Field Name ID", "Form Field Name")
          // 2. allFormFieldsData - ALL form field definitions from template (uses "Field Name ID", "Field Name")
          const formValuesData = response.formValuesData || [];
          const allFormFieldsData = response.allFormFieldsData || [];
          
          if (!response || allFormFieldsData.length === 0) {
            this.messageItems = [{ label: 'Warning', value: 'No form fields found' }];
            return;
          }
          
          // Create a map of values indexed by Field Type + Field Name ID + Field Name
          // BUT for fields with no Name ID Parameter (like Transaction Groups, Filename),
          // use only Field Type + Field Name
          const valuesMap = new Map<string, any[]>();
          formValuesData.forEach((item: any) => {
            const fieldType = item['Field Type'];
            const routingInfo = this.formFieldRoutingService.getRoutingInfo(fieldType);
            
            // If Name ID Parameter is empty, don't include Field Name ID in the key
            const hasNameIdParam = routingInfo && routingInfo['Name ID Parameter'] && routingInfo['Name ID Parameter'].trim() !== '';
            const uniqueId = hasNameIdParam
              ? `${fieldType}_${item['Form Field Name ID']}_${item['Form Field Name']}`
              : `${fieldType}_${item['Form Field Name']}`;
              
            if (!valuesMap.has(uniqueId)) {
              valuesMap.set(uniqueId, []);
            }
            valuesMap.get(uniqueId)!.push(item);
          });
          
          // Group ALL form fields - merge allFormFieldsData with formValuesData
          const groupedData = new Map<string, any[]>();
          
          allFormFieldsData.forEach((fieldDef: any) => {
            // allFormFieldsData uses "Field Name ID" and "Field Name" (without "Form Field" prefix)
            // Handle empty objects {} from backend - convert to null
            const rawFieldNameId = fieldDef['Field Name ID'];
            const fieldNameId = (rawFieldNameId && typeof rawFieldNameId === 'object' && Object.keys(rawFieldNameId).length === 0)
              ? null
              : rawFieldNameId;
            
            const fieldName = fieldDef['Field Name'];
            const fieldType = fieldDef['Field Type'];
            
            // Get routing info to determine if Name ID Parameter is used
            const routingInfo = this.formFieldRoutingService.getRoutingInfo(fieldType);
            const hasNameIdParam = routingInfo && routingInfo['Name ID Parameter'] && routingInfo['Name ID Parameter'].trim() !== '';
            
            // Create matching key - for fields without Name ID Parameter, don't include Field Name ID
            const uniqueId = hasNameIdParam
              ? `${fieldType}_${fieldNameId}_${fieldName}`
              : `${fieldType}_${fieldName}`;
            
            // Check if we have existing values for this field
            if (valuesMap.has(uniqueId)) {
              // Use existing data from formValuesData
              groupedData.set(uniqueId, valuesMap.get(uniqueId)!);
            } else {
              // No existing value - create entry from field definition, mapping field names
              // Sanitize all values - convert empty objects to null or empty string
              const sanitizeValue = (val: any, defaultVal: any = '') => {
                if (val === null || val === undefined) return defaultVal;
                if (typeof val === 'object' && Object.keys(val).length === 0) return defaultVal;
                return val;
              };
              
              const syntheticItem = {
                'Field Type': fieldType,
                'Form Field Name ID': fieldNameId,
                'Form Field Name': fieldName,
                'Form Field Mnemonic': '',
                'Record Name ID': null,  // No record exists yet
                'Record Attribute ID': null,
                'Value': null,
                // "Units" in template is a flag meaning "this field supports units"
                // For synthetic items, convert flag to empty string; keep concrete values (e.g., "Bytes")
                'Units': sanitizeValue(fieldDef['Units'], '') === 'Units' ? '' : sanitizeValue(fieldDef['Units'], ''),
                'Mandatory': sanitizeValue(fieldDef['Mandatory'], ''),
                'Position': sanitizeValue(fieldDef['Position'], ''),
                'Field Length': sanitizeValue(fieldDef['Length'], ''),
                'Attribute 1': sanitizeValue(fieldDef['Attribute 1'], ''),
                'Attribute 2': sanitizeValue(fieldDef['Attribute 2'], ''),
                'Attribute 3': sanitizeValue(fieldDef['Attribute 3'], '')
              };
              groupedData.set(uniqueId, [syntheticItem]);
            }
          });
          
          // Convert grouped data to field configurations
          this.formFields = Array.from(groupedData.entries()).map(([uniqueFieldId, items]) => {
            const firstItem = items[0]; // Use first item for common properties
            const isTransactionGroup = firstItem['Field Type'] === 'Document Transaction Group' ||
                                       firstItem['Field Type'] === 'File Transaction Group';
            const isRecordNameIdEmpty = firstItem['Record Name ID'] == null ||
                                        firstItem['Record Name ID'] === '' ||
                                     (typeof firstItem['Record Name ID'] === 'object' &&
                                      Object.keys(firstItem['Record Name ID']).length == 0) ||
                                     (typeof firstItem['Record Name ID'] === 'number' &&
                                      isNaN(firstItem['Record Name ID']));
            
            // Check if this is a multi-select field type
            const multiSelectTypes = [
              'Doc Multi-Select Attributes',
              'Doc Common Objects Multi-Sel Attr',
              'File Multi-Select Attributes',
              'File Common Objects Multi-Sel Attr',
              'Document Duty Function',
              'Document Duty Function List',
              'Document People List',
              'File Duty Function',
              'File Duty Function List',
              'File People List'
            ];
            
            const isMultiSelect = multiSelectTypes.includes(firstItem['Field Type']);
            
            let selectedItems: Array<{id: string | number, name: string}> = [];
            
            // Extract attribute ID - for dropdown/list fields, the API returns this in 'Record Attribute ID'
            // For multi-select fields, we extract from the specific ID field names
            let attributeId = firstItem['Record Attribute ID'] ||  // Single-select dropdowns use this
                             firstItem['Common Object ID'] ||      // Multi-select specific
                             firstItem['Transaction Group ID'] ||
                             firstItem['Doc Radio Button Attribute ID'] ||
                             firstItem['File Radio Button Attribute ID'] ||
                             firstItem['Duty Function ID'] ||
                             firstItem['People List ID'] ||
                             firstItem['Function List ID'] ||
                             firstItem['Doc Multi-Select Attribute ID'] ||
                             firstItem['File Multi-Select Attribute ID'] ||
                             firstItem['Document Real Number Field Name ID'] ||
                             firstItem['File Real Number Field Name ID'] ||
                             firstItem['Document Integer Field Name ID'] ||
                             firstItem['File Integer Field Name ID'] ||
                             firstItem['Document Free Text Field Name ID'] ||
                             firstItem['File Free Text Field Name ID'] ||
                             firstItem['Document Date Field Name ID'] ||
                             firstItem['File Date Field Name ID'];
            
            let value = firstItem.Value;
            
            if (isMultiSelect && items.length > 0) {
              // For multi-select fields, collect all selected items
              // The API returns the attribute ID in 'Record Attribute ID' field
              selectedItems = items
                .map(item => ({
                  id: item['Record Attribute ID'],
                  name: item.Value
                }))
                .filter(item => item.id != null && item.id !== '' &&
                               !(typeof item.id === 'object' && Object.keys(item.id).length === 0))
                .map(item => ({
                  id: item.id,
                  name: item.name || `Item ${item.id}`
                }));
            }
            
            // Get routing info to determine ID Type (Document or File) - data-driven, not pattern matching
            const routingInfo = this.formFieldRoutingService.getRoutingInfo(firstItem['Field Type']);
            const idType = routingInfo ? routingInfo['ID Type'] : null;
            
            return {
              name: uniqueFieldId,
              displayName: firstItem['Form Field Name'],
              value: value || null,
              originalValue: value || null,
              fieldType: firstItem['Field Type'],
              fieldCategory: idType || 'Unknown',  // Use ID Type from routing info, not pattern matching
              nameId: firstItem['Form Field Name ID'],
              recordNameId: firstItem['Record Name ID'],
              attributeId: attributeId,
              originalAttributeId: attributeId,
              units: firstItem.Units,
              position: firstItem.Position,
              mandatory: firstItem.Mandatory,
              fieldLength: firstItem['Field Length'],
              characterLimit: firstItem['Character Limit'] && parseInt(firstItem['Character Limit']) > 0 ? parseInt(firstItem['Character Limit']) : undefined,
              attribute1: firstItem['Attribute 1'],
              attribute2: firstItem['Attribute 2'],
              attribute3: firstItem['Attribute 3'],
              existsInDatabase: !isRecordNameIdEmpty,
              isMultiSelect: isMultiSelect,
              selectedItems: selectedItems,
              originalSelectedItems: this.deepCopyArray(selectedItems),
              dateFormatStyle: this.dateFormatStyle || 0,
              ...(isTransactionGroup && {
                displayValue: firstItem.Value,
                originalDisplayValue: firstItem.Value
              }),
            } as FieldConfig;
          });
          this.distributeFieldsToColumns();
          this.messageItems = this.extractMessageItems(response);
          // Don't call updateDateFields() here - it will be called after fetchDateFormat() completes
        },
        (error) => {
          console.error('Error fetching form data:', error);
          this.messageItems = [{ label: 'Error', value: 'Failed to fetch form data' }];
        }
      );
    } else {
      console.error('No document ID or file ID provided');
      this.messageItems = [{ label: 'Error', value: 'No document ID or file ID provided' }];      
    }
  }

  fetchDateFormat(callback?: () => void) {
    this.editDocFileDataService.getDefaultDateFormat()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (response) => {
          const newDateFormatStyle = response.defaultDateFormat[0]['Date Style'];
          
          this.dateFormat = response.defaultDateFormat[0]['Date Style Format'];
          this.dateFormatString = response.defaultDateFormat[0].Format;
          this.dateFormatStyle = newDateFormatStyle;
          
          // Update date fields after format is loaded
          this.updateDateFields();
          
          // Call callback if provided (for sequential execution)
          if (callback) {
            callback();
          }
        },
        (error) => {
          console.error('Error fetching date format:', error);
          // Still call callback even on error to prevent hanging
          if (callback) {
            callback();
          }
        }
      );
  }

  updateDateFields() {
    this.formFields.forEach((field, index) => {
      if (field.fieldType === 'File Date' || field.fieldType === 'Document Date') {
        field.dateFormat = this.dateFormat;
        
        // If format style is changing and field has a value, normalize it
        if (field.value && typeof field.value === 'string' && field.dateFormatStyle !== this.dateFormatStyle) {
          // Try to parse the existing value with the old format, then re-save in API format
          const parsedDate = DateFormatService.convertFromApiToDate(field.value, field.dateFormatStyle);
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            // Convert back to API format (ISO) so it's format-neutral
            field.value = DateFormatService.convertDateToApi(parsedDate);
            field.originalValue = field.value;
          }
        }
        
        field.dateFormatStyle = this.dateFormatStyle!;
      }
    });
    
    this.distributeFieldsToColumns();
  }

  distributeFieldsToColumns() {
    // Filter fields based on:
    // 1. Excluded field types (read-only system fields)
    // 2. ID Type matching the request (Document fields for documentId, File fields for fileId)
    let fieldsToDisplay = this.formFields.filter(field => {
      // Exclude read-only system fields
      if (this.excludedFieldTypes.includes(field.fieldType)) {
        return false;
      }
      
      // Filter by ID Type based on what we're editing
      // If BOTH documentId and fileId are present, show BOTH Document and File fields
      // If ONLY documentId is present, show only Document fields
      // If ONLY fileId is present, show only File fields
      if (this.documentId && this.fileId) {
        // Editing both document and file - show both Document and File type fields
        return field.fieldCategory === 'Document' || field.fieldCategory === 'File';
      } else if (this.documentId) {
        // Editing only a document - show only Document type fields
        return field.fieldCategory === 'Document';
      } else if (this.fileId) {
        // Editing only a file - show only File type fields
        return field.fieldCategory === 'File';
      }
      
      return false;
    });
    
    const sortedFields = fieldsToDisplay.sort((a, b) => String(a.position).localeCompare(String(b.position)));
 
    this.leftColumnFields = [];
    this.rightColumnFields = [];
 
    sortedFields.forEach((field, index) => {
      const preparedField = this.prepareField({ ...field, tabIndex: index + 1 });
      if (index % 2 === 0) {
        // Even indices go to the left column
        this.leftColumnFields.push(preparedField);
      } else {
        // Odd indices go to the right column
        this.rightColumnFields.push(preparedField);
      }
    });
  }
  
  prepareField(field: FieldConfig): FieldConfig {
    if (field.fieldType === 'Filename') {
      field.existsInDatabase = true;
    }
    
    // Document ID Lock Status is always considered to exist in database (it's a property of the document)
    if (field.fieldType === 'Document ID Lock Status') {
      field.existsInDatabase = true;
    }

    if (!field.name) {
      console.warn(`Field without name detected:`, field);
      field.name = `unnamed_field_${Math.random().toString(36).substring(2, 11)}`;
    }

    const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);

    // Detect multi-select fields
    const multiSelectTypes = [
      'Doc Multi-Select Attributes',
      'Doc Common Objects Multi-Sel Attr',
      'File Multi-Select Attributes',
      'File Common Objects Multi-Sel Attr',
      'Document Duty Function',
      'Document Duty Function List',
      'Document People List',
      'File Duty Function',
      'File Duty Function List',
      'File People List'
    ];
    
    if (multiSelectTypes.includes(field.fieldType)) {
      field.isMultiSelect = true;
      field.isDropdown = true; // Still uses dropdown for options
      // Don't reset selectedItems - they were already set in fetchFormData from API response
      if (!field.dropdownOptions) {
        field.dropdownOptions = [];
      }
      if (routingInfo) {
        this.loadDropdownOptions(field, routingInfo);
      } else {
        console.warn(`No routing info found for multi-select field type: ${field.fieldType}`);
      }
    } else if (routingInfo && routingInfo['Data Type'] === 'List' && routingInfo['Read']) {
      field.isDropdown = true;
      field.dropdownOptions = [];
      this.loadDropdownOptions(field, routingInfo);
    }
    
    return field;
  }

  loadDropdownOptions(field: FieldConfig, routingInfo: any) {
    const params: { [key: string]: string } = {};
    
    if (routingInfo['Name ID Parameter']) {
      // If nameId is null or undefined, we can't load dropdown options
      // This happens for fields defined in the form template but with no corresponding list ID
      if (field.nameId === null || field.nameId === undefined) {
        console.warn(`Cannot load dropdown options for ${field.name}: nameId is null or undefined`);
        field.dropdownOptions = [];
        return;
      }
      
      const numericNameId = Number(field.nameId);
      // Check if conversion resulted in NaN
      if (isNaN(numericNameId)) {
        console.warn(`Cannot load dropdown options for ${field.name}: nameId '${field.nameId}' is not a valid number`);
        field.dropdownOptions = [];
        return;
      }
      
      params[routingInfo['Name ID Parameter']] = numericNameId.toString();
    } else {
      // No parameter required - proceed with parameterless request
    }
    
    const endpoint = routingInfo['Read'];
    const attributeParameterId = routingInfo['Attribute Parameter ID'];
    
    this.formFieldService.fetchDropdownOptions(endpoint, params, attributeParameterId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        options => {
          if (Array.isArray(options)) {
          }
          
          if (Array.isArray(options) && options.length > 0) {
            field.dropdownOptions = options.map(option => ({
              Name: this.formatDropdownOption(field.fieldType, option),
              Id: option.Id
            }));
          } else {
            console.warn(`Received empty/invalid options for ${field.name}`);
            field.dropdownOptions = [];
          }
          this.updateFieldInArrays(field);
        },
        error => {
          console.error(`Error fetching dropdown options for ${field.name} from ${endpoint}:`, error);
          field.dropdownOptions = [];
          this.updateFieldInArrays(field);
        }
      );
  }

  formatDropdownOption(fieldType: string, option: any): string {
    if (fieldType === 'Document Transaction Group' || fieldType === 'File Transaction Group') {
      const id = typeof option.Id === 'number' ? option.Id : 'N/A';
      const note = typeof option.Name === 'string' ? option.Name : '\u00A0'; // Non-breaking space
      return `${id} - ${note.substring(0, 20)}${note.length > 20 ? '...' : ''}`;
    }
    return option.Name || '\u00A0'; // Non-breaking space to ensure dropdown items have height
  }
  
  onFieldAction(event: {field: FieldConfig, action: string, isActionComplete?: boolean}) {
    if (event.isActionComplete) {
      // Action is already complete, just update the local state
      this.updateFieldInArrays(event.field);
    } else {
      // Debounce and process the action as before
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.processFieldAction(event);
    }, 300);
  }
  }

  private processFieldAction(event: {field: FieldConfig, action: string}) {
    const { field, action } = event;
    const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
    if (!routingInfo) {
      console.error(`No routing info found for field type: ${field.fieldType}`);
      return;
    }
 
    const actionKey = `${field.name}_${action}`;

    if (this.pendingActions.get(actionKey)) {
      return;
    }

    this.pendingActions.set(actionKey, true);    

    switch (action) {
      case 'add':
      case 'delete':
      case 'update':
        // Instead of calling performApiAction, update the field in the arrays
        // The actual API call will be handled by the DynamicFormComponent
        this.updateFieldInArrays(field);
        break;
      case 'multi-select-save':
        // Handle individual multi-select save action
        this.onSaveMultiSelectField(field);
        break;
      case 'change':
        this.updateFieldInArrays(field);
        break;
      }
  
      this.pendingActions.set(actionKey, false); 
  }

  private updateFieldInArrays(updatedField: FieldConfig) {
    const formFieldIndex = this.formFields.findIndex(f => f.name === updatedField.name);
    if (formFieldIndex !== -1) {
      this.formFields[formFieldIndex] = updatedField;
    } 
    else {
      this.formFields.push(updatedField);
    }

    const updateInColumn = (column: FieldConfig[]) => {
      const index = column.findIndex(f => f.name === updatedField.name);
      if (index !== -1) {
        column[index] = updatedField;       
      }
    };  
    
    updateInColumn(this.leftColumnFields);
    updateInColumn(this.rightColumnFields);   
  }
  
  hasChanges(): boolean {
    const allFields = [...this.leftColumnFields, ...this.rightColumnFields];
    return allFields.some(field => {
      if (field.isMultiSelect) {
        // Compare arrays of selected items for multi-select fields
        return !this.arraysEqual(field.selectedItems || [], field.originalSelectedItems || []);
      } else if (field.isDropdown) {
        // For dropdown fields, compare attributeId with originalAttributeId
        // Consider it changed if originalAttributeId is null/undefined/empty and attributeId has a value
        return field.attributeId !== field.originalAttributeId ||
               ((!field.originalAttributeId || field.originalAttributeId === '') && field.attributeId);
      } else {
        // For non-dropdown fields, keep the existing comparison
        return field.value !== field.originalValue;
      }
    });
  }

   async onSaveChanges() {
     const changedFields = this.collectChangedFields();
     if (changedFields.length === 0) {
       this.dialog.open(TransactionResultDialogComponent, {
         data: {
           title: 'No Changes',
           message: 'There are no changes to save.',
           status: 'Info'
         }
       });
       return;
     }
     

     const displayFields = this.prepareFieldsForDisplay(changedFields);

     const dialogRef = this.dialog.open(FormConfirmationDialogComponent, {
      data: { changes: displayFields }
    }); 

    const confirmed = await dialogRef.afterClosed().toPromise();

    if (confirmed) {
      const results = await this.processBatchChanges(changedFields);
      this.showResultsSummary(results);
      this.fetchFormData();
    }
  }

  private collectChangedFields(): { field: FieldConfig, action: string, displayAction: string }[] {
    const allFields = [...this.leftColumnFields, ...this.rightColumnFields];
    const changedFields: { field: FieldConfig, action: string, displayAction: string }[] = [];
 
    allFields.forEach(field => {
      if (field.isMultiSelect) {
        // Multi-select fields support both individual save buttons AND batch processing
        if (!this.arraysEqual(field.selectedItems || [], field.originalSelectedItems || [])) {
          changedFields.push({
            field,
            action: 'multi-select-update',
            displayAction: 'Update Selection'
          });
        }
      } else if (field.fieldType === 'Document Transaction Group' || field.fieldType === 'File Transaction Group') {
        // For transaction groups, always use 'update' action in batch processing
        field.existsInDatabase = true;
        if (field.attributeId !== field.originalAttributeId ) {
          changedFields.push({
            field,
            action: 'update',
            displayAction: this.actionDisplayMap['update'] || 'update'
          });
        }
     } else if (field.isDropdown) {
       const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
       
        // For dropdown fields
        if (!field.existsInDatabase &&
           JSON.stringify(field.attributeId) !== '{}' &&
           field.attributeId !== null &&
           field.attributeId !== undefined &&
           routingInfo && routingInfo['Create'] && routingInfo['Create'].trim() !== '') {
           changedFields.push({
            field,
            action: 'add',
            displayAction: this.actionDisplayMap['add'] || 'add'
          });
        } else if (field.existsInDatabase && field.attributeId !== field.originalAttributeId) {
          changedFields.push({
            field,
            action: 'update',
            displayAction: this.actionDisplayMap['update'] || 'update'
          });
        }
     } else {
// For non-dropdown fields
      const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
      if (!field.existsInDatabase &&
          field.value !== null && field.value !== undefined && field.value !== '' &&
          routingInfo && routingInfo['Create'] && routingInfo['Create'].trim() !== '') {
        changedFields.push({
          field,
          action: 'add',
          displayAction: this.actionDisplayMap['add'] || 'add'
        });
      } else if (field.existsInDatabase && field.value !== field.originalValue) {
        changedFields.push({
          field,
          action: 'update',
          displayAction: this.actionDisplayMap['update'] || 'update'
        });
      }
    }
    });

    return changedFields;
  }

  private prepareFieldsForDisplay(changedFields: { field: FieldConfig, action: string, displayAction: string }[]): { field: FieldConfig, action: string, displayAction: string }[] {
    return changedFields.map(item => {
      const field = { ...item.field };
      if (field.fieldType === 'Document Date' || field.fieldType === 'File Date') {
        field.displayValue = DateFormatService.convertToDisplayFormat(field.value, field.dateFormatStyle);
      } else {
        field.displayValue = field.value;
      }
      return { ...item, field };
    });
  }

  private async processBatchChanges(changedFields: { field: FieldConfig, action: string }[]): Promise<any[]> {
    const results = [];
    for (const { field, action } of changedFields) {
      try {
        const result = await this.processIndividualFieldAction(field, action);
        
        // Handle multi-select results which return arrays of individual API call results
        if (Array.isArray(result)) {
          // Multi-select operations return multiple results - one for each API call
          result.forEach((individualResult: any, index: number) => {
            results.push({
              field: `${field.fieldType} | ${field.displayName} (${index + 1})`,
              action: individualResult.action || action,
              transactionMessage: individualResult.transactionMessage,
              transactionStatus: individualResult.transactionStatus,
              isApplicationError: individualResult.isApplicationError || false,
              applicationErrorMessage: individualResult.applicationErrorMessage
            });
          });
        } else {
          // Single operation result
          results.push({
            field: `${field.fieldType} | ${field.displayName}`,
            action,
            transactionMessage: result.transactionMessage,
            transactionStatus: result.transactionStatus,
            isApplicationError: false
          });
        }
      } catch (error: unknown) {
        // This is an application error - API call failed before reaching the database
        results.push({
          field: `${field.fieldType} | ${field.displayName}`,
          action,
          isApplicationError: true,
          applicationErrorMessage: this.extractErrorMessage(error)
        });
      }
    }
    return results;
  }

  private async processIndividualFieldAction(field: FieldConfig, action: string): Promise<any> {
    
      
    // Handle multi-select updates specially for batch processing
    if (action === 'multi-select-update') {
      return await this.processMultiSelectFieldForBatch(field);
    }

    if (!field.existsInDatabase && action !== 'add') {
      // Skip the operation - let the calling code handle this case
      throw new Error(`Field operation was skipped - field does not exist in database`);
    }

    const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
    if (!routingInfo) {
      throw new Error(`No routing info found for field type: ${field.fieldType}`);
    }

    const listIdParam = routingInfo['Name ID Parameter'];
    const attrParam = routingInfo['Attribute Parameter ID'];
    const attrValue = routingInfo['Attribute Value'];
    const idType = routingInfo['ID Type'];

    const apiData: any = {
      [idType === 'Document' ? 'documentId' : 'fileId']: idType === 'Document' ? this.documentId : this.fileId,
    };
    
    // For fields with Name ID Parameter, use it
    if (listIdParam) {
      apiData[listIdParam] = field.nameId;
    }

    if (field.fieldType === 'Document Transaction Group' || field.fieldType === 'File Transaction Group') {
      // For transaction groups, always use the update endpoint in batch processing
      apiData[attrParam] = field.attributeId;
      apiData[attrValue] = field.value;
      return await this.formFieldService.updateDropdownOption(routingInfo['Update'], apiData).toPromise();
    } else {

    if (attrParam) {
      apiData[attrParam] = action === 'delete' ? field.originalAttributeId : field.attributeId;
    }
    if (attrValue) {
      apiData[attrValue] = field.value;
    }

    let apiCall: Observable<any>;
    switch (action) {
      case 'update':
        apiCall = this.formFieldService.updateDropdownOption(routingInfo['Update'], apiData);
        break;
      case 'delete':
        apiCall = this.formFieldService.deleteFieldValue(routingInfo['Delete'], apiData);
        break;
      case 'add':
        apiCall = this.formFieldService.updateDropdownOption(routingInfo['Create'], apiData);
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return await apiCall.toPromise();
  }
}

  private async showResultsSummary(results: any[]) {
    // Separate application errors from database transaction results
    const applicationErrors = results.filter(r => r.isApplicationError);
    const databaseResults = results.filter(r => !r.isApplicationError);
    
    // Stage 1: Show application errors if any exist
    if (applicationErrors.length > 0) {
      const errorDialogRef = this.dialog.open(ApplicationErrorDialogComponent, {
        data: {
          title: 'Application Errors',
          errors: applicationErrors.map(err => ({
            fieldName: err.field,
            errorMessage: err.applicationErrorMessage
          }))
        }
      });
      
      // Wait for user to dismiss the error dialog
      await errorDialogRef.afterClosed().toPromise();
    }
    
    // Stage 2: Show database transaction results (only if there are any)
    if (databaseResults.length > 0) {
      const formattedResults = databaseResults.map(result => ({
        id: result.field,
        transactionMessage: result.transactionMessage,
        transactionStatus: result.transactionStatus
      }));
      
      this.dialog.open(TransactionResultsComponent, {
        data: {
          title: 'Save Changes Results',
          results: formattedResults,
          idColumnName: 'Field Name',
          showFileName: false,
          showDocumentId: false
        }
      });
    }
  }

  private handleError(error: any, fieldName: string) {
    console.error(`Error updating field: ${fieldName}`, error);
    this.messageItems = [{ label: 'Error', value: 'Failed to update field' }];
  }

  private actionDisplayMap = {
    'add': 'Add',
    'update': 'Update',
  };

  private extractErrorMessage(error: any): string {
    // Extract meaningful error messages from various error types
    if (!error) {
      return 'An unknown error occurred';
    }

    // HTTP error responses
    if (error.error) {
      if (typeof error.error === 'string') {
        return error.error;
      }
      if (error.error.message) {
        return error.error.message;
      }
      if (error.error.error) {
        return error.error.error;
      }
    }

    // Standard Error object
    if (error.message) {
      return error.message;
    }

    // HTTP status text
    if (error.statusText) {
      return `${error.status || ''} ${error.statusText}`.trim();
    }

    // String error
    if (typeof error === 'string') {
      return error;
    }

    // Fallback: try to stringify
    try {
      return JSON.stringify(error);
    } catch {
      return 'An unknown error occurred';
    }
  }

  private parseMultiSelectValue(value: any, attributeId?: any): Array<{id: string | number, name: string}> {
    if (!value && !attributeId) return [];
    
    // Handle different value formats from backend
    if (Array.isArray(value)) {
      return value.map(v => ({
        id: v.Id || v.id || v['Attribute ID'] || v['attributeId'],
        name: v.Name || v.name || v['Attribute Name'] || v['attributeName'] || v.toString()
      }));
    }
    
    // If comma-separated string of IDs - this would need name lookup from dropdown options
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map(id => ({
        id: id.trim(),
        name: '' // Will be populated when dropdown options are loaded
      }));
    }
    
    // Handle single selected item case
    if (value && attributeId) {
      return [{
        id: attributeId,
        name: value.toString()
      }];
    }
    
    return [];
  }

  private deepCopyArray(arr: Array<{id: string | number, name: string}>): Array<{id: string | number, name: string}> {
    if (!arr) return [];
    return arr.map(item => ({
      id: item.id,
      name: item.name
    }));
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    
    // Sort by id for consistent comparison
    const sortedA = [...a].sort((x, y) => String(x.id).localeCompare(String(y.id)));
    const sortedB = [...b].sort((x, y) => String(x.id).localeCompare(String(y.id)));
    
    return sortedA.every((item, index) => String(item.id) === String(sortedB[index].id));
  }

  async onSaveMultiSelectField(field: FieldConfig): Promise<void> {
    const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
    if (!routingInfo) {
      console.error(`No routing info found for field type: ${field.fieldType}`);
      return;
    }

    const selectedItems = field.selectedItems || [];
    const originalSelectedItems = field.originalSelectedItems || [];

    // Calculate what to add and remove
    const toAdd = selectedItems.filter(sv =>
      !originalSelectedItems.some(osv => String(osv.id) === String(sv.id)));
    const toRemove = originalSelectedItems.filter(osv =>
      !selectedItems.some(sv => String(sv.id) === String(osv.id)));


    const results: any[] = [];

    // Get the correct API parameter names from routing info
    const idType = routingInfo['ID Type'];
    const idParam = idType === 'Document' ? 'documentId' : 'fileId';
    const idValue = idType === 'Document' ? this.documentId : this.fileId;

    // Process additions
    for (const item of toAdd) {
      try {
        const apiData = this.buildMultiSelectApiData(field, item.id, routingInfo, idParam, idValue);
        const result = await this.formFieldService.updateDropdownOption(routingInfo['Create'], apiData).toPromise();
        results.push({
          action: 'Add',
          item: item.name,
          transactionMessage: result.transactionMessage,
          transactionStatus: result.transactionStatus
        });
      } catch (error) {
        console.error(`Error adding item ${item.name}:`, error);
        results.push({
          action: 'Add',
          item: item.name,
          error: error,
          success: false
        });
      }
    }

    // Process removals
    for (const item of toRemove) {
      try {
        const apiData = this.buildMultiSelectApiData(field, item.id, routingInfo, idParam, idValue);
        const result = await this.formFieldService.deleteFieldValue(routingInfo['Delete'], apiData).toPromise();
        results.push({
          action: 'Delete',
          item: item.name,
          transactionMessage: result.transactionMessage,
          transactionStatus: result.transactionStatus
        });
      } catch (error) {
        console.error(`Error removing item ${item.name}:`, error);
        results.push({
          action: 'Delete',
          item: item.name,
          error: error,
          success: false
        });
      }
    }

    // Update the original selected items to current state
    field.originalSelectedItems = this.deepCopyArray(field.selectedItems || []);

    // Show results dialog
    if (results.length > 0) {
      this.showMultiSelectResults(`${field.fieldType} | ${field.displayName}`, results);
    }

    // Update the field in arrays to reflect the new state without refreshing entire form
    this.updateFieldInArrays(field);
  }

  private buildMultiSelectApiData(field: FieldConfig, itemId: string | number, routingInfo: any, idParam: string, idValue: any): any {
    const apiData: any = {
      [idParam]: idValue
    };

    // Map the correct API parameter names based on field type
    switch (field.fieldType) {
      case 'Doc Multi-Select Attributes':
        apiData['docMultiSelectListId'] = field.nameId;
        apiData['docMultiSelectAttributeId'] = itemId;
        break;
      case 'Doc Common Objects Multi-Sel Attr':
        apiData['commonObjectListId'] = field.nameId;
        apiData['commonObjectId'] = itemId;
        break;
      case 'File Multi-Select Attributes':
        apiData['fileMultiSelectListId'] = field.nameId;
        apiData['fileMultiSelectAttributeId'] = itemId;
        break;
      case 'File Common Objects Multi-Sel Attr':
        apiData['commonObjectListId'] = field.nameId;
        apiData['commonObjectId'] = itemId;
        break;
      case 'Document Duty Function':
        apiData['generalFieldNameId'] = field.nameId;
        apiData['functionId'] = itemId;
        break;
      case 'Document Duty Function List':
        apiData['generalFieldNameId'] = field.nameId;
        apiData['functionListId'] = itemId;
        break;
      case 'Document People List':
        apiData['generalFieldNameId'] = field.nameId;
        apiData['peopleListId'] = itemId;
        break;
      case 'File Duty Function':
        apiData['generalFieldNameId'] = field.nameId;
        apiData['functionId'] = itemId;
        break;
      case 'File Duty Function List':
        apiData['generalFieldNameId'] = field.nameId;
        apiData['functionListId'] = itemId;
        break;
      case 'File People List':
        apiData['generalFieldNameId'] = field.nameId;
        apiData['peopleListId'] = itemId;
        break;
      default:
        // No fallback - fail explicitly for unsupported field types
        throw new Error(`Unsupported multi-select field type: ${field.fieldType}. Parameter mapping must be explicitly defined.`);
    }

    return apiData;
  }

  private async showMultiSelectResults(fieldName: string, results: any[]) {
    // Separate application errors from database transaction results
    const applicationErrors = results.filter(r => r.error);
    const databaseResults = results.filter(r => !r.error);
    
    // Stage 1: Show application errors if any exist
    if (applicationErrors.length > 0) {
      const errorDialogRef = this.dialog.open(ApplicationErrorDialogComponent, {
        data: {
          title: 'Application Errors',
          errors: applicationErrors.map(err => ({
            fieldName: `${fieldName} - ${err.action}: ${err.item}`,
            errorMessage: this.extractErrorMessage(err.error)
          }))
        }
      });
      
      // Wait for user to dismiss the error dialog
      await errorDialogRef.afterClosed().toPromise();
    }
    
    // Stage 2: Show database transaction results (only if there are any)
    if (databaseResults.length > 0) {
      const formattedResults = databaseResults.map(result => ({
        id: `${result.action}: ${result.item}`,
        transactionMessage: result.transactionMessage,
        transactionStatus: result.transactionStatus
      }));

      this.dialog.open(TransactionResultsComponent, {
        data: {
          title: `Multi-Select Save Results: ${fieldName}`,
          results: formattedResults,
          idColumnName: 'Operation',
          showFileName: false,
          showDocumentId: false
        }
      });
    }
  }

  private async processMultiSelectFieldForBatch(field: FieldConfig): Promise<any> {
    // Process multi-select field changes for batch save
    const routingInfo = this.formFieldRoutingService.getRoutingInfo(field.fieldType);
    if (!routingInfo) {
      throw new Error(`No routing info found for field type: ${field.fieldType}`);
    }

    const selectedItems = field.selectedItems || [];
    const originalSelectedItems = field.originalSelectedItems || [];

    // Calculate what to add and remove
    const toAdd = selectedItems.filter(sv =>
      !originalSelectedItems.some(osv => String(osv.id) === String(sv.id)));
    const toRemove = originalSelectedItems.filter(osv =>
      !selectedItems.some(sv => String(sv.id) === String(osv.id)));

    const results: any[] = [];
    const idType = routingInfo['ID Type'];
    const idParam = idType === 'Document' ? 'documentId' : 'fileId';
    const idValue = idType === 'Document' ? this.documentId : this.fileId;

    // Process additions
    for (const item of toAdd) {
      try {
        const apiData = this.buildMultiSelectApiData(field, item.id, routingInfo, idParam, idValue);
        const result = await this.formFieldService.updateDropdownOption(routingInfo['Create'], apiData).toPromise();
        results.push({
          success: true,
          transactionMessage: result.transactionMessage,
          transactionStatus: result.transactionStatus,
          isApplicationError: false
        });
      } catch (error) {
        results.push({
          success: false,
          isApplicationError: true,
          applicationErrorMessage: this.extractErrorMessage(error)
        });
      }
    }

    // Process removals
    for (const item of toRemove) {
      try {
        const apiData = this.buildMultiSelectApiData(field, item.id, routingInfo, idParam, idValue);
        const result = await this.formFieldService.deleteFieldValue(routingInfo['Delete'], apiData).toPromise();
        results.push({
          success: true,
          transactionMessage: result.transactionMessage,
          transactionStatus: result.transactionStatus,
          isApplicationError: false
        });
      } catch (error) {
        results.push({
          success: false,
          isApplicationError: true,
          applicationErrorMessage: this.extractErrorMessage(error)
        });
      }
    }

    // Update the original selected items to current state
    field.originalSelectedItems = this.deepCopyArray(field.selectedItems || []);

    // Return array of individual results so each API call gets its own row in results table
    return results.map(result => ({
      action: result.success ? 'Success' : 'Error',
      transactionMessage: result.transactionMessage,
      transactionStatus: result.transactionStatus,
      isApplicationError: result.isApplicationError || false,
      applicationErrorMessage: result.applicationErrorMessage
    }));
  }

}
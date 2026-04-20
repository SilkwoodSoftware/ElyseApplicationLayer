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

import { Component, OnInit, Input, ElementRef, HostListener } from '@angular/core';
import { FormFieldMenuService, FormFieldMenuItem } from '../../services/form-field-menu.service';
import { MatDialog } from '@angular/material/dialog';
import { CsvFormDialogComponent } from '../csv-form-dialog/csv-form-dialog.component';
import { TableDialogComponent } from '../table-dialog/table-dialog.component';
import { TransactionResultDialogComponent } from '../transaction-results/transaction-result-dialog.component';
import { ReadRouteConfigService } from '../../services/read-route-config.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { RouteConfigParserService } from '../../services/route-config-parser.service';
import { CsvFormService } from '../../services/csv-form.service';

@Component({
  selector: 'app-form-field-menu',
  templateUrl: './form-field-menu.component.html',
  styleUrls: ['./form-field-menu.component.scss']
})
export class FormFieldMenuComponent implements OnInit {
  @Input() formFieldMenuId: string = '';
  @Input() position: { x: number, y: number } = { x: 0, y: 0 };
  @Input() fieldValue: any;
  @Input() idAlias?: string;
  @Input() nameAlias?: string;
  @Input() onValueSelected: (value: any, displayValue: any) => void = () => {};

  visible = false;
  menuItems: FormFieldMenuItem[] = [];

  constructor(
    private formFieldMenuService: FormFieldMenuService,
    private elementRef: ElementRef,
    private dialog: MatDialog,
    private readRouteConfigService: ReadRouteConfigService,
    private http: HttpClient,
    private routeConfigParserService: RouteConfigParserService,
    private csvFormService: CsvFormService
  ) {}

  ngOnInit(): void {
    console.log('FormFieldMenuComponent ngOnInit, formFieldMenuId =', this.formFieldMenuId);
    
    if (!this.formFieldMenuId) {
      console.error('No FormFieldMenuID provided');
      return;
    }

    this.menuItems = this.formFieldMenuService.getMenuItems(this.formFieldMenuId);
    console.log('Menu items loaded:', this.menuItems);
    
    if (this.menuItems.length === 0) {
      console.error(`No menu items found for FormFieldMenuID: ${this.formFieldMenuId}`);
      return;
    }

    // Per functional specification: When PopulationType is MENU and there is only one menu item,
    // the single menu item is actioned immediately to save the user from a redundant extra click.
    if (this.menuItems.length === 1) {
      console.log('Single menu item detected, actioning immediately:', this.menuItems[0]);
      this.onMenuItemClick(this.menuItems[0]);
      return;
    }

    // Set visible to true and then adjust position in next tick
    setTimeout(() => {
      this.visible = true;
      console.log('Menu visibility set to:', this.visible);
      
      // Adjust position after visibility is set
      setTimeout(() => {
        this.adjustMenuPosition();
      }, 0);
    }, 0);
  }

  /**
   * Handle menu item click
   */
  onMenuItemClick(item: FormFieldMenuItem): void {
    if (item.type === 'TABLE') {
      this.handleTableMenuItem(item);
    } else if (item.type === 'FORM') {
      this.handleFormMenuItem(item);
    }
    this.hideMenu();
  }

  /**
   * Handle TABLE type menu item
   */
  private handleTableMenuItem(item: FormFieldMenuItem): void {
    console.log(`Handling TABLE menu item with reference: ${item.reference}`);
    
    // First, get the route URL for the table name
    this.routeConfigParserService.getRouteUrlForTableName(item.reference).subscribe({
      next: (routeUrl) => {
        if (!routeUrl) {
          console.error(`No route URL found for table name: ${item.reference}`);
          return;
        }
        
        console.log(`Found route URL: ${routeUrl} for table name: ${item.reference}`);
        
        // Now get the table configuration using the route URL
        this.readRouteConfigService.getRouteConfig(routeUrl).subscribe({
          next: (tableConfig) => {
            if (!tableConfig) {
              console.error(`Table configuration not found for route URL: ${routeUrl}`);
              return;
            }
            
            console.log(`Found table configuration for route URL: ${routeUrl}`, tableConfig);
            
            // Construct the API URL
            const apiEndpoint = tableConfig.apiEndpoint;
            if (!apiEndpoint) {
              console.error(`No API endpoint found for table: ${item.reference}`);
              return;
            }
            
            const url = `${environment.dotNetBaseUrl}/${apiEndpoint.replace(/^\//, '')}`;
            console.log(`Making API call to: ${url}`);
            
            // Make the API call
            this.http.get(url).subscribe({
              next: (response: any) => {
                // Extract data from response
                let data: any[] = [];
                
                // Log the full response to help with debugging
                console.log(`Full API response:`, response);
                
                if (tableConfig.dataField) {
                  console.log(`Looking for data in field: ${tableConfig.dataField}`);
                  
                  if (response[tableConfig.dataField]) {
                    // Check if it's a nested array structure (e.g., resultSets, userRoles, etc.)
                    if (Array.isArray(response[tableConfig.dataField]) && response[tableConfig.dataField].length > 0 && Array.isArray(response[tableConfig.dataField][0])) {
                      data = response[tableConfig.dataField][0];
                      console.log(`Found data in ${tableConfig.dataField}[0]:`, data);
                    } else {
                      data = response[tableConfig.dataField];
                      console.log(`Found data in ${tableConfig.dataField}:`, data);
                    }
                  } else {
                    // If the specified dataField doesn't exist, try to find any array in the response
                    console.log(`Data field ${tableConfig.dataField} not found, looking for arrays in response`);
                    for (const key in response) {
                      if (Array.isArray(response[key]) && response[key].length > 0) {
                        data = response[key];
                        console.log(`Found array data in ${key}:`, data);
                        break;
                      }
                    }
                  }
                } else {
                  // If no dataField is specified, use the entire response if it's an array
                  if (Array.isArray(response)) {
                    data = response;
                    console.log(`Using entire response as data:`, data);
                  } else {
                    // Otherwise, look for any array in the response
                    console.log(`No dataField specified, looking for arrays in response`);
                    for (const key in response) {
                      if (Array.isArray(response[key]) && response[key].length > 0) {
                        data = response[key];
                        console.log(`Found array data in ${key}:`, data);
                        break;
                      }
                    }
                  }
                }
                
                // If we still don't have data, try to convert the response to an array
                if (data.length === 0 && typeof response === 'object' && response !== null) {
                  console.log(`No array data found, converting response object to array`);
                  try {
                    // Convert object to array of objects with key-value pairs
                    data = [response];
                    console.log(`Converted response to array:`, data);
                  } catch (error) {
                    console.error(`Error converting response to array:`, error);
                  }
                }
                
                // Log the tableConfig to verify it contains hiddenColumns
                console.log('Table configuration before opening dialog:', tableConfig);
                
                // Check if tableConfig has the hiddenColumns property
                if (tableConfig.tableConfig && tableConfig.tableConfig.hiddenColumns) {
                  console.log('Hidden columns from configuration:', tableConfig.tableConfig.hiddenColumns);
                  
                  // Create a new tableConfig object with the hiddenColumns property
                  const dialogTableConfig = {
                    keyColumns: tableConfig.tableConfig.keyColumns,
                    hiddenColumns: tableConfig.tableConfig.hiddenColumns,
                    tableConfig: tableConfig.tableConfig // Keep the original tableConfig for reference
                  };
                  
                  // Open table dialog with the data and the full response for message labels
                  this.openTableDialog(item.menuLabel, data, dialogTableConfig, response);
                } else {
                  console.warn('No hiddenColumns found in tableConfig');
                  
                  // Open table dialog with the data and the full response for message labels
                  this.openTableDialog(item.menuLabel, data, tableConfig, response);
                }
              },
              error: (error) => {
                console.error(`Error fetching data for table ${item.reference}:`, error);
              }
            });
          },
          error: (error) => {
            console.error(`Error getting table configuration for route URL: ${routeUrl}`, error);
          }
        });
      },
      error: (error) => {
        console.error(`Error getting route URL for table name: ${item.reference}`, error);
      }
    });
  }

  /**
   * Handle FORM type menu item
   */
  private handleFormMenuItem(item: FormFieldMenuItem): void {
    console.log(`Handling FORM menu item with reference: ${item.reference}`);
    
    // Get the form definition
    const formDefinition = this.csvFormService.getForm(item.reference);
    const formWidth = formDefinition?.width || '50%';
    const formTitle = formDefinition?.title || item.menuLabel; // Use form title, fallback to menu label
    
    // Check if this form should bypass directly to table display
    // Per functional specification lines 257-260: Only bypass if form has one field with PopulationType=LOOKUP_TABLE
    const formFields = this.csvFormService.getFormFields(item.reference);
    const shouldBypassFormDisplay = formFields.length === 1 && formFields[0].populationType === 'LOOKUP_TABLE';
    
    console.log(`Form ${item.reference} has ${formFields.length} field(s). Should bypass form display: ${shouldBypassFormDisplay}`);
    if (formFields.length === 1) {
      console.log(`Single field PopulationType: ${formFields[0].populationType}`);
    }
    
    // If form should bypass, don't show the form dialog - go straight to table
    if (shouldBypassFormDisplay && formDefinition && formDefinition.reference) {
      console.log('Bypassing form display - opening table directly');
      this.handleTableMenuItem({ ...item, reference: formDefinition.reference });
      return;
    }
    
    // Detect if this is a "simple selection" form:
    // - Single field with API_DROPDOWN or FIXED_DROPDOWN
    // - Form's reference table == Field's reference table
    // This means the dropdown IS the final selection, not an input to another API call
    const isSimpleSelectionForm = formFields.length === 1 &&
                                  (formFields[0].populationType === 'API_DROPDOWN' ||
                                   formFields[0].populationType === 'FIXED_DROPDOWN') &&
                                  formDefinition?.reference === formFields[0].reference;
    
    console.log(`Is simple selection form: ${isSimpleSelectionForm}`);
    if (isSimpleSelectionForm) {
      console.log(`Form reference: ${formDefinition?.reference}, Field reference: ${formFields[0].reference}`);
    }
    
    // Open the form dialog
    const dialogRef = this.dialog.open(CsvFormDialogComponent, {
      width: formWidth,
      height: 'auto',
      data: {
        formId: item.reference,
        title: formTitle, // Use form title instead of menu label
        isPopupForm: true,
        width: formWidth
      }
    });

    // Handle form submission
    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        console.log('Form dialog closed without result (cancelled)');
        return;
      }
      
      console.log(`Form dialog closed with result:`, result);
      
      // Check if this is a PASSTHROUGH form - if so, extract the value directly
      if (formDefinition && formDefinition.formType === 'PASSTHROUGH') {
        console.log('PASSTHROUGH form detected - extracting value directly from result');
        
        // For PASSTHROUGH forms, the result contains the mapped parameters
        // We need to extract the value using the field's parameterId
        if (formFields.length > 0) {
          const field = formFields[0];
          const value = field.parameterId && result[field.parameterId] !== undefined
                       ? result[field.parameterId]
                       : result[field.id];
          
          console.log(`PASSTHROUGH form - Extracted value: ${value} from parameterId: ${field.parameterId}`);
          
          // For PASSTHROUGH forms with ID type fields, pass both the value and display value
          // Since it's direct entry, the display value is the same as the value
          if (value !== undefined && value !== null && value !== '') {
            this.onValueSelected(value, String(value));
          } else {
            console.warn('No value extracted from PASSTHROUGH form result');
          }
        }
        return;
      }
      
      // If this is a simple selection form, extract the selected value directly
      if (isSimpleSelectionForm && formFields.length > 0) {
        const field = formFields[0];
        
        // For simple selection forms, the result now contains form field values (not API response)
        const selectedId = field.parameterId && result[field.parameterId] !== undefined
                          ? result[field.parameterId]
                          : result[field.id];
        
        console.log(`Simple selection form - Selected ID: ${selectedId}`);
        
        if (selectedId !== undefined && selectedId !== null && selectedId !== '' && field.reference) {
          // Get the display name by making an API call to the reference table
          this.routeConfigParserService.getRouteUrlForTableName(field.reference).subscribe({
            next: (routeUrl) => {
              if (!routeUrl) {
                console.error(`No route URL found for table name: ${field.reference}`);
                this.onValueSelected(selectedId, String(selectedId));
                return;
              }
              
              this.readRouteConfigService.getRouteConfig(routeUrl).subscribe({
                next: (tableConfig) => {
                  if (!tableConfig || !tableConfig.apiEndpoint) {
                    console.error(`No API endpoint found for table: ${field.reference}`);
                    this.onValueSelected(selectedId, String(selectedId));
                    return;
                  }
                  
                  const url = `${environment.dotNetBaseUrl}/${tableConfig.apiEndpoint.replace(/^\//, '')}`;
                  this.http.get(url).subscribe({
                    next: (response: any) => {
                      let data: any[] = [];
                      
                      if (tableConfig.dataField && response[tableConfig.dataField]) {
                        if (Array.isArray(response[tableConfig.dataField]) &&
                            response[tableConfig.dataField].length > 0 &&
                            Array.isArray(response[tableConfig.dataField][0])) {
                          data = response[tableConfig.dataField][0];
                        } else if (Array.isArray(response[tableConfig.dataField])) {
                          data = response[tableConfig.dataField];
                        }
                      }
                      
                      const matchingRecord = data.find(record => this.idAlias && record[this.idAlias] == selectedId);
                      
                      if (matchingRecord && this.nameAlias) {
                        const displayName = matchingRecord[this.nameAlias];
                        console.log(`Found display name: ${displayName} for ID: ${selectedId}`);
                        this.onValueSelected(selectedId, displayName);
                      } else {
                        console.warn(`Could not find matching record for ID: ${selectedId}`);
                        this.onValueSelected(selectedId, String(selectedId));
                      }
                    },
                    error: (error) => {
                      console.error(`Error fetching data to get display name:`, error);
                      this.onValueSelected(selectedId, String(selectedId));
                    }
                  });
                },
                error: (error) => {
                  console.error(`Error getting table config:`, error);
                  this.onValueSelected(selectedId, String(selectedId));
                }
              });
            },
            error: (error) => {
              console.error(`Error getting route URL:`, error);
              this.onValueSelected(selectedId, String(selectedId));
            }
          });
          return;
        } else {
          console.warn('No value selected from dropdown in simple selection form');
          return;
        }
      }
      
      // For LOOKUP_TABLE fields or normal READ forms (dropdown is input to API), open table dialog
      if (formDefinition && formDefinition.reference) {
        // Get the table configuration to properly extract data and get the table title
        this.routeConfigParserService.getRouteUrlForTableName(formDefinition.reference).subscribe({
          next: (routeUrl) => {
            if (!routeUrl) {
              console.error(`No route URL found for table name: ${formDefinition.reference}`);
              return;
            }
            
            this.readRouteConfigService.getRouteConfig(routeUrl).subscribe({
              next: (tableConfig) => {
                if (!tableConfig) {
                  console.error(`Table configuration not found for route URL: ${routeUrl}`);
                  return;
                }
                
                // Extract data from response
                let data: any[] = [];
                
                if (Array.isArray(result)) {
                  data = result;
                } else if (typeof result === 'object' && result !== null) {
                  // Look for arrays in the response
                  for (const key in result) {
                    if (Array.isArray(result[key])) {
                      // Check if it's a nested array structure (array of arrays)
                      if (result[key].length > 0 && Array.isArray(result[key][0])) {
                        data = result[key][0];
                        console.log(`Found data in ${key}[0]:`, data);
                      } else if (result[key].length > 0) {
                        data = result[key];
                        console.log(`Found array data in ${key}:`, data);
                      }
                      break;
                    }
                  }
                }
                
                // Check if we have data to display
                if (data.length > 0) {
                  // Use table displayName from tableConfig, fallback to form title
                  const tableTitle = tableConfig.displayName || formTitle;
                  const dialogTableConfig = tableConfig.tableConfig || {
                    keyColumns: this.idAlias && this.nameAlias ? `${this.idAlias}::${this.nameAlias}` : undefined
                  };
                  this.openTableDialog(tableTitle, data, dialogTableConfig, result);
                } else if (this.idAlias && this.nameAlias && result[this.idAlias] && result[this.nameAlias]) {
                  // Direct value in response, use it
                  this.onValueSelected(result[this.idAlias], result[this.nameAlias]);
                } else {
                  // No data found - show message dialog to user with database response
                  console.log('No records found in response:', result);
                  
                  // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                  this.dialog.open(TransactionResultDialogComponent, {
                    data: {
                      title: 'No Records Found',
                      message: result.transactionMessage,
                      status: result.transactionStatus
                    }
                  });
                }
              },
              error: (error) => {
                console.error(`Error getting table configuration:`, error);
              }
            });
          },
          error: (error) => {
            console.error(`Error getting route URL:`, error);
          }
        });
      }
    });
  }

  /**
   * Open table dialog
   */
  private openTableDialog(title: string, data: any[], tableConfig: any, fullResponse?: any): void {
    // Open the table dialog
    const dialogRef = this.dialog.open(TableDialogComponent, {
      width: '80%',
      height: 'auto',
      data: {
        title,
        data,
        tableConfig,
        idAlias: this.idAlias,
        nameAlias: this.nameAlias,
        fullResponse // Pass the full response for message labels
      }
    });

    // Handle dialog close
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Pass the selected values back to the form
        this.onValueSelected(result.id, result.name);
      }
    });
  }

  /**
   * Hide menu
   */
  hideMenu(): void {
    this.visible = false;
  }

  /**
   * Close menu when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Check if click is outside the menu
    if (this.visible && !this.elementRef.nativeElement.contains(event.target)) {
      this.hideMenu();
    }
  }

  /**
   * Close menu when pressing Escape
   */
  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.visible) {
      this.hideMenu();
    }
  }

  /**
   * Adjust menu position to ensure it stays within viewport
   */
  private adjustMenuPosition(): void {
    if (!this.visible) {
      console.error('Cannot adjust position when menu is not visible');
      return;
    }

    // Use a longer timeout to ensure the DOM has been updated
    setTimeout(() => {
      try {
        // The menu is the component's host element itself, not a child element
        const menu = this.elementRef.nativeElement;
        if (!menu) {
          console.error('Menu element not found');
          return;
        }

        console.log('Menu element found, adjusting position');
        
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Adjust horizontal position if menu would go off-screen
        if (this.position.x + menuRect.width > viewportWidth) {
          this.position = {
            ...this.position,
            x: viewportWidth - menuRect.width - 5
          };
        }

        // Adjust vertical position if menu would go off-screen
        if (this.position.y + menuRect.height > viewportHeight) {
          this.position = {
            ...this.position,
            y: viewportHeight - menuRect.height - 5
          };
        }
        
        console.log('Menu position adjusted to:', this.position);
      } catch (error) {
        console.error('Error adjusting menu position:', error);
      }
    }, 100); // Use a longer timeout (100ms instead of 50ms)
  }
}

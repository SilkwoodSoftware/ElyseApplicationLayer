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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription, Observable, forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CustomViewConfig, CustomViewResponse } from '../../interfaces/custom-view.interface';
import { CustomViewConfigService } from '../../services/custom-view-config.service';
import { ReadRoutesAdapterService } from '../../services/read-routes-adapter.service';
import { MessageLabelService } from '../../services/message-label.service';
import { TableConfig, ColumnConfig } from '../../services/table-config.service';
import { FileDownloadService } from '../../../reading/file-download/file-download.service';
import { FileStorageService } from '../../../editing/upload-file/file-storage.service';
import { TransactionResultDialogComponent } from '../transaction-results/transaction-result-dialog.component';
import { TransactionResultsComponent } from '../transaction-results/transaction-results.component';
import { CsvFormService } from '../../services/csv-form.service';
import { ApplicationMessageService } from '../../services/application-message.service';
import { CsvFormNavigationService } from '../../services/csv-form-navigation.service';
import { CsvFormChainService } from '../../services/csv-form-chain.service';

@Component({
    selector: 'app-custom-view',
    template: `
        <div *ngIf="viewConfig" class="custom-view-container">
            <div class="view-heading">
                {{ viewConfig.title }}
                <span *ngIf="currentDocumentId"> - Document ID: {{ currentDocumentId }}</span>
                <span *ngIf="!currentDocumentId && currentFileId"> - File ID: <a href="#" (click)="downloadFile(currentFileId); $event.preventDefault()">{{ currentFileId }}</a></span>
            </div>
            
            <!-- Application Messages (separate from database messages) -->
            <app-message-display
                [errors]="appErrors"
                [warnings]="appWarnings"
                [info]="appInfo"
                [systemErrors]="systemErrors">
            </app-message-display>
            
            <!-- CSV Form File Upload View -->
            <div *ngIf="isCSVFormFileUploadView" class="csv-form-file-upload-container">
                <app-csv-form
                    [formId]="csvFormId!"
                    [params]="{}"
                    [hideTitle]="true"
                    [isPopupForm]="false"
                    [isInChain]="false"
                    (formSubmitted)="onCSVFormSubmitted($event)"
                    (formCancelled)="onCSVFormCancelled()">
                </app-csv-form>
                
                <!-- File Selection Button -->
                <div class="file-selection-section" *ngIf="csvFormData">
                    <button type="button"
                            (click)="onFileSelect()"
                            [disabled]="isUploading"
                            class="file-select-button">
                        <span *ngIf="!isUploading">Select Files to Upload</span>
                        <span *ngIf="isUploading">Uploading...</span>
                    </button>
                    <div *ngIf="selectedFiles.length > 0" class="selected-files">
                        <div class="selected-files-label">Selected files:</div>
                        <div *ngFor="let file of selectedFiles" class="selected-file">
                            {{ file.name }} ({{ formatFileSize(file.size) }})
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- File Upload View (metadata in background only) -->
            <div *ngIf="isLegacyFileUploadView" class="file-upload-form-container">
                <!-- File Selection Button Only -->
                <div class="file-input-container">
                    <button type="button"
                        (click)="onFileSelect()"
                        [disabled]="isUploading"
                        class="file-select-button">
                        <span *ngIf="!isUploading">Select Files to Upload</span>
                        <span *ngIf="isUploading">Uploading...</span>
                    </button>
                    <div *ngIf="selectedFiles.length > 0" class="selected-files">
                        <div class="selected-files-label">Selected files:</div>
                        <div *ngFor="let file of selectedFiles" class="selected-file">
                            {{ file.name }} ({{ formatFileSize(file.size) }})
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Standard View -->
            <div *ngIf="!isCSVFormFileUploadView && !isLegacyFileUploadView">
                <!-- Thumbnail Image Display -->
                <div class="thumbnail-section" *ngIf="thumbnailImage">
                    <div class="field-label">File Thumbnail</div>
                    <div class="image-container">
                        <img *ngIf="thumbnailImageSrc"
                             [src]="thumbnailImageSrc"
                             alt="File Thumbnail"
                             class="thumbnail-image"
                             (error)="onImageError($event)">
                        <div *ngIf="!thumbnailImageSrc" class="no-thumbnail-message">
                            No thumbnail available
                        </div>
                    </div>
                </div>
                
                <!-- Table Data Display using standard shared table structure -->
                <div *ngIf="tableData && tableData.length > 0" class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th *ngFor="let column of columns">
                                    <div class="column-heading" [matTooltip]="getTooltip(column)" matTooltipPosition="above">
                                        <span class="column-title">{{ column }}</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let row of tableData" (click)="onTableRowSelect(row)">
                                <td *ngFor="let column of columns">
                                    <ng-container *ngIf="column === 'File ID'">
                                        <a href="#" (click)="downloadFile(row[column]); $event.preventDefault()" download>{{ row[column] }}</a>
                                    </ng-container>
                                    <ng-container *ngIf="column !== 'File ID'">
                                        {{ row[column] }}
                                    </ng-container>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- Loading State (only show if no data AND no messages) -->
                <div *ngIf="(!tableData || tableData.length === 0) && (!messageItems || messageItems.length === 0)" class="loading-message">
                    Loading...
                </div>
                
                <!-- Message Labels Display (uses existing messages-container styling) -->
                <div class="messages-container" *ngIf="messageItems && messageItems.length > 0">
                    <span *ngFor="let item of messageItems" class="result-item">
                        {{ item.label }}: <span class="result-value">{{ item.value }}</span>
                    </span>
                </div>
            </div>
        </div>
    `,
    styleUrls: [
        './custom-view.component.scss',
        '../../stylesheets/forms.scss',
        '../../stylesheets/messages.scss',
        '../../stylesheets/tables.scss'
    ]
})
export class CustomViewComponent implements OnInit, OnDestroy {
    private routeChangeSubscription: Subscription | undefined;
    
    viewConfig: CustomViewConfig | undefined;
    tableData: any[] = [];
    tableConfig: TableConfig | undefined;
    columns: string[] = [];
    messageItems: { label: string, value: string }[] = [];
    thumbnailImage: any = null;
    thumbnailImageSrc: string = '';
    cachedRowFields: Map<any, {displayName: string, value: any}[]> = new Map();
    maxHeadingWidth: string = '200px';
    tooltips: {[key: string]: string} = {};
    columnMapping: {[key: string]: string} = {};
    currentFileId: string | null = null;
    currentDocumentId: string | null = null;
    
    // Application messages (separate from database messages)
    appErrors: string[] = [];
    appWarnings: string[] = [];
    appInfo: string[] = [];
    systemErrors: string[] = [];
    
    // File upload form properties
    uploadForm: FormGroup | undefined;
    formFieldDefinitions: any[] = [];
    fixedDropdownOptions: Map<string, any[]> = new Map();
    apiDropdownOptions: Map<string, any[]> = new Map();
    isLegacyFileUploadView: boolean = false;
    isCSVFormFileUploadView: boolean = false;
    csvFormId: string | null = null;
    csvFormData: any = null;
    isUploading: boolean = false;
    selectedFiles: File[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private customViewConfigService: CustomViewConfigService,
        private readRoutesAdapter: ReadRoutesAdapterService<any>,
        private messageLabelService: MessageLabelService,
        private http: HttpClient,
        private fileDownloadService: FileDownloadService,
        private fileStorageService: FileStorageService,
        private formBuilder: FormBuilder,
        private dialog: MatDialog,
        private csvFormService: CsvFormService,
        private applicationMessageService: ApplicationMessageService,
        private csvFormNavigationService: CsvFormNavigationService,
        private csvFormChainService: CsvFormChainService
    ) {}

    ngOnInit() {
        this.loadViewConfig();
    }

    private loadViewConfig() {
        // First check if we have resolved data from the resolver
        const resolvedConfig = this.route.snapshot.data['customViewConfig'];
        
        if (resolvedConfig) {
            this.viewConfig = resolvedConfig;
            this.initializeViewWithConfig();
            return;
        }
        
        // Fallback: Get viewId from route params for backward compatibility
        const viewId = this.route.snapshot.paramMap.get('viewId');
        
        if (!viewId) {
            console.error('No viewId found in route and no resolved config available');
            return;
        }
        // Load custom view config from CSV
        this.customViewConfigService.getViewConfig(viewId).subscribe({
            next: (config) => {
                this.viewConfig = config;
                if (this.viewConfig) {
                    this.initializeViewWithConfig();
                } else {
                    console.error('No custom view configuration found for viewId:', viewId);
                }
            },
            error: (error) => {
                console.error('Error loading custom view config:', error);
            }
        });
    }

    /**
     * Initialize chain if this custom view is the starting point of a chain
     * Checks if the viewId is referenced by any chain
     */
    private async initializeChainIfNeeded(): Promise<void> {
        if (!this.viewConfig || !this.viewConfig.viewId) {
            return;
        }

        const viewId = this.viewConfig.viewId;
        console.log(`CustomViewComponent: Checking if view ${viewId} starts any chains`);

        try {
            // Load all chains
            await this.csvFormChainService.ensureChainsLoaded();
            const allChainIds = await this.csvFormChainService.getAllChainIds();
            
            // Find chains where this view is the first link (with CUSTOM action type)
            for (const chainId of allChainIds) {
                const links = await this.csvFormChainService.getFormChain(chainId);
                
                if (links.length > 0) {
                    const firstLink = links[0];
                    
                    // Check if first link references this view (CUSTOM action type with matching reference)
                    if (firstLink.actionType === 'CUSTOM' && firstLink.reference === viewId) {
                        console.log(`CustomViewComponent: View ${viewId} starts chain: ${chainId}`);
                        
                        // Get context parameters from URL
                        const contextParams = this.getInputParams();
                        
                        // Initialize chain state directly in navigation service
                        const navState = this.csvFormNavigationService.getNavigationState();
                        navState.currentChain = {
                            chainId: chainId,
                            currentLinkId: 1, // Start at second link (first link is this view)
                            data: { ...contextParams }
                        };
                        
                        console.log(`CustomViewComponent: Initialized chain ${chainId} with context:`, contextParams);
                        console.log(`CustomViewComponent: Chain state:`, navState.currentChain);
                        return; // Found and initialized, exit
                    }
                }
            }
            
            console.log(`CustomViewComponent: View ${viewId} does not start any chains`);
        } catch (error) {
            console.error(`CustomViewComponent: Error checking for chains:`, error);
        }
    }

    private initializeViewWithConfig() {
        if (!this.viewConfig) {
            console.error('CustomViewComponent: initializeViewWithConfig: No viewConfig available');
            return;
        }
        
        // Check view type for different upload approaches
        this.isCSVFormFileUploadView = this.viewConfig.viewType === 'FILE_UPLOAD_WITH_CSV_FORM';
        this.isLegacyFileUploadView = this.viewConfig.viewType === 'FILE_UPLOAD';
        
        // Get Document ID and File ID from URL parameters for display in heading
        this.currentDocumentId = this.route.snapshot.queryParamMap.get('documentId');
        this.currentFileId = this.route.snapshot.queryParamMap.get('fileId');
        
        // Fallback: Get File ID from first input parameter if not already set
        if (!this.currentFileId && this.viewConfig.inputParameters && this.viewConfig.inputParameters.length > 0) {
            this.currentFileId = this.route.snapshot.queryParamMap.get(this.viewConfig.inputParameters[0]);
        }
        
        // Initialize chain if this custom view is the starting point of a chain (async)
        this.initializeChainIfNeeded().catch(error => {
            console.error('CustomViewComponent: Error initializing chain:', error);
        });
        
        // Load appropriate configurations based on view type
        if (this.isCSVFormFileUploadView) {
            // For CSV form uploads, get the form ID from templateName
            this.csvFormId = this.viewConfig.templateName || null;
        } else if (this.isLegacyFileUploadView) {
            // New approach - load form fields directly from viewConfig
            this.loadAllFormDependencies();
        } else if (this.viewConfig.viewType === 'FORM_BASED') {
            console.error('CustomViewComponent: FORM_BASED viewType needs implementation. Config:', this.viewConfig);
            // For now, just show a placeholder message
            this.appInfo.push('FORM_BASED view type is not yet implemented. ViewId: ' + this.viewConfig.viewId);
        } else {
            // Standard view - load data
            if (!this.viewConfig.apiEndpoint) {
                console.error('CustomViewComponent: No API endpoint specified for standard view. Config:', this.viewConfig);
                this.appErrors.push('No API endpoint configured for this view');
                return;
            }
            this.loadData();
        }
    }


    private loadAllFormDependencies() {
        // Load all dependencies simultaneously using forkJoin
        const formFieldsRequest = this.http.get('/assets/form-fields.csv', { responseType: 'text' });
        const fixedDropdownsRequest = this.http.get('/assets/fixed-dropdowns.csv', { responseType: 'text' });
        const formFieldLinksRequest = this.http.get('/assets/form-formfield-links.csv', { responseType: 'text' });
        
        forkJoin({
            formFields: formFieldsRequest,
            fixedDropdowns: fixedDropdownsRequest,
            formFieldLinks: formFieldLinksRequest
        }).subscribe({
            next: (responses) => {
                // Parse all CSV files
                const allFormFields = this.parseFormFieldsCsv(responses.formFields);
                const formFieldLinks = this.parseFormFieldLinksCsv(responses.formFieldLinks);
                
                // Use formFields from custom-views.csv to specify which form fields to display
                if (this.viewConfig?.formFields && this.viewConfig.formFields.length > 0) {
                    console.log('Loading form fields from custom-views.csv FormFields column');
                    
                    // Filter to only the form fields specified in the view config
                    this.formFieldDefinitions = allFormFields.filter(field =>
                        this.viewConfig!.formFields!.includes(field.formFieldID)
                    );
                    
                    // Sort by the order they appear in the formFields array
                    this.formFieldDefinitions.sort((a, b) => {
                        const indexA = this.viewConfig!.formFields!.indexOf(a.formFieldID);
                        const indexB = this.viewConfig!.formFields!.indexOf(b.formFieldID);
                        return indexA - indexB;
                    });
                    
                    console.log(`Loaded ${this.formFieldDefinitions.length} form fields`);
                } else {
                    console.error('No form fields specified in custom-views.csv FormFields column for viewId:', this.viewConfig?.viewId);
                    return;
                }
                
                // Parse fixed dropdown options
                this.parseFixedDropdownsCsv(responses.fixedDropdowns);
                
                // Load API dropdown options after form field definitions are loaded
                this.loadApiDropdownOptions();
                
                // Create the form after a short delay to ensure API dropdowns are loading
                setTimeout(() => {
                    this.createUploadForm();
                }, 500);
            },
            error: (error: any) => {
                console.error('Error loading form dependencies:', error);
            }
        });
    }


    private parseFormFieldsCsv(csvData: string): any[] {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
                const values = line.split(',').map(v => v.trim());
                const row = headers.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {} as any);
                
                return {
                    formFieldID: row.FormFieldID,
                    fieldLabel: row.FieldLabel,
                    length: parseInt(row.Length) || 0,
                    dataType: row.DataType,
                    defaultValue: row.DefaultValue,
                    populationType: row.PopulationType,
                    reference: row.Reference,
                    parameterId: row.ParameterId,
                    idAlias: row.IdAlias,
                    nameAlias: row.NameAlias,
                    placeholder: row.Placeholder,
                    helpText: row.HelpText
                };
            });
    }

    private parseFormFieldLinksCsv(csvData: string): Array<{formId: string, formFieldId: string, isMandatory: string, order: number}> {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
                const values = line.split(',').map(v => v.trim());
                const row = headers.reduce((obj: any, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {} as any);
                
                return {
                    formId: row.FormId,
                    formFieldId: row.FormFieldId,
                    isMandatory: row.IsMandatory,
                    order: parseInt(row.Order) || 0
                };
            });
    }

    private parseFixedDropdownsCsv(csvData: string) {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, '')); // Remove BOM if present
        
        const dropdownData: Map<string, any[]> = new Map();
        
        lines.slice(1)
            .filter(line => line.trim())
            .forEach(line => {
                const values = line.split(',').map(v => v.trim());
                const row = headers.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {} as any);
                
                const listId = row.DropdownListID;
                if (!dropdownData.has(listId)) {
                    dropdownData.set(listId, []);
                }
                
                dropdownData.get(listId)!.push({
                    value: row.OptionValue,
                    label: row.OptionValue,
                    order: parseInt(row.Order) || 0
                });
            });
        
        // Sort options by order
        dropdownData.forEach((options, key) => {
            options.sort((a, b) => a.order - b.order);
            this.fixedDropdownOptions.set(key, options);
        });
    }

    private loadApiDropdownOptions() {
        // Find only API_DROPDOWN fields in the current form field definitions
        const apiDropdownFields = this.formFieldDefinitions.filter(def =>
            def.populationType === 'API_DROPDOWN' && def.reference
        );

        if (apiDropdownFields.length === 0) {
            return;
        }

        

        // Use the proper CsvFormService to load dropdown options
        apiDropdownFields.forEach(fieldDef => {
            console.log(`Loading dropdown options for ${fieldDef.formFieldID} using TableName: ${fieldDef.reference}`);
            
            // Pass field aliases to ensure correct column pair is used
            this.csvFormService.fetchDropdownOptions(fieldDef.reference, {}, fieldDef.idAlias, fieldDef.nameAlias)
                .subscribe({
                    next: (options) => {
                        console.log(`✓ ${fieldDef.formFieldID}: Loaded ${options.length} options`);
                        this.apiDropdownOptions.set(fieldDef.formFieldID, options);
                    },
                    error: (error) => {
                        console.error(`✗ ${fieldDef.formFieldID}: Error loading options`, error);
                        this.apiDropdownOptions.set(fieldDef.formFieldID, []);
                    }
                });
        });
    }


    private createUploadForm() {
        const formControls: { [key: string]: FormControl } = {};
        const urlParams = this.getInputParams(); // Get URL parameters for pre-population
        
        console.log('Creating upload form with URL parameters:', urlParams);
        
        // Track which fields came from URL parameters (including empty strings)
        const urlProvidedFields = new Set<string>();
        
        // Create form controls based on form field definitions directly
        this.formFieldDefinitions.forEach(fieldDef => {
            // Check if URL parameter was explicitly provided (even if empty string)
            const hasUrlParam = urlParams.hasOwnProperty(fieldDef.parameterId);
            
            // Use URL parameter value if provided, otherwise use default value
            const initialValue = hasUrlParam ? urlParams[fieldDef.parameterId] : (fieldDef.defaultValue || '');
            formControls[fieldDef.parameterId] = new FormControl(initialValue);
            
            if (hasUrlParam) {
                urlProvidedFields.add(fieldDef.parameterId);
                console.log(`Pre-populating field ${fieldDef.formFieldID} (${fieldDef.parameterId}) with value: "${initialValue}"`);
            }
        });
        
        this.uploadForm = this.formBuilder.group(formControls);
        console.log('Upload form created with pre-populated values:', this.uploadForm.value);
        
        // Auto-populate single-option fixed dropdowns (but don't overwrite URL-provided values)
        this.autoPopulateSingleOptionDropdowns(urlProvidedFields);
    }

    private autoPopulateSingleOptionDropdowns(urlProvidedFields?: Set<string>): void {
        if (!this.uploadForm) {
            return;
        }

        this.formFieldDefinitions.forEach(fieldDef => {
            if (fieldDef.populationType === 'FIXED_DROPDOWN' && fieldDef.reference) {
                // Skip if this field was provided via URL parameters (even if empty)
                if (urlProvidedFields && urlProvidedFields.has(fieldDef.parameterId)) {
                    console.log(`Skipping auto-populate for ${fieldDef.formFieldID} - value came from URL`);
                    return;
                }
                
                const options = this.getFixedDropdownOptions(fieldDef.reference);
                if (options.length === 1) {
                    const singleValue = options[0].value;
                    console.log(`Auto-populating single-option dropdown ${fieldDef.formFieldID} with value: ${singleValue}`);
                    this.uploadForm!.get(fieldDef.parameterId)?.setValue(singleValue);
                }
            }
        });
    }

    onFileSelect(): void {
        // For CSV form uploads, check if we have form data
        if (this.isCSVFormFileUploadView && !this.csvFormData) {
            console.error('No CSV form data available for file upload');
            return;
        }
        
        // For legacy uploads, just check if uploading (no form validation needed since form is hidden)
        if (this.isLegacyFileUploadView && this.isUploading) {
            return;
        }
        
        if (this.isUploading) {
            return;
        }

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = '*/*';
        
        fileInput.onchange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            const files = target.files;
            if (files && files.length > 0) {
                this.selectedFiles = Array.from(files);
                this.uploadFilesWithMetadata(this.selectedFiles);
            }
        };
        
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    private uploadFilesWithMetadata(files: File[]): void {
        this.isUploading = true;
        
        // File size validation - 500MB limit
        const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB in bytes
        const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
        
        if (oversizedFiles.length > 0) {
            this.isUploading = false;
            const oversizedFileNames = oversizedFiles.map(f => `${f.name} (${this.formatFileSize(f.size)})`).join(', ');
            const errorMessage = `File(s) too large: ${oversizedFileNames}. Maximum file size is ${this.formatFileSize(MAX_FILE_SIZE)}.`;
            
            const appError = this.applicationMessageService.createFormError(errorMessage);
            this.appErrors.push(...(appError.appErrors || []));
            return;
        }
        
        const uploadPromises: Promise<any>[] = [];
        
        // Get metadata based on view type
        const metadata = this.isCSVFormFileUploadView ? this.csvFormData : this.getFormMetadata();
        
        // Upload all selected files with metadata
        files.forEach(file => {
            const uploadPromise = new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e: ProgressEvent<FileReader>) => {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    
                    // Use uploadFileWithMetadata if we have metadata, otherwise use basic upload
                    const uploadObservable = metadata && Object.keys(metadata).length > 0
                        ? this.fileStorageService.uploadFileWithMetadata(arrayBuffer, file.name, metadata)
                        : this.fileStorageService.uploadFile(arrayBuffer, file.name);
                    
                    uploadObservable.subscribe({
                        next: (response) => {
                            resolve({
                                response: response,
                                fileName: file.name
                            });
                        },
                        error: (error) => {
                            console.error('Error uploading file:', file.name, error);
                            reject({
                                error: error,
                                fileName: file.name
                            });
                        }
                    });
                };
                
                reader.onerror = () => reject({ error: 'File read error', fileName: file.name });
                reader.readAsArrayBuffer(file);
            });
            
            uploadPromises.push(uploadPromise);
        });
        
        // Wait for all uploads to complete
        Promise.allSettled(uploadPromises).then(results => {
            this.isUploading = false;
            
            const successResults: any[] = [];
            const errorResults: any[] = [];
            
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    successResults.push(result.value);
                } else {
                    errorResults.push(result.reason);
                }
            });
            
            // Show results for all files (both successful and failed)
            const allResults = [
                ...successResults,
                ...errorResults.map(error => {
                    const appError = this.applicationMessageService.createFormError(`Upload failed for ${error.fileName}: ${error.error?.message || 'Unknown error'}`);
                    this.appErrors.push(...(appError.appErrors || []));
                    
                    return {
                        response: {
                            newFileId: null
                        },
                        fileName: error.fileName
                    };
                })
            ];
            
            // Show upload results - chain continuation is handled by the navigation service
            this.showUploadResults(allResults);
            
            this.selectedFiles = []; // Clear selected files after upload
            
            // Clear CSV form data if using CSV forms
            if (this.isCSVFormFileUploadView) {
                this.csvFormData = null;
            }
        });
    }

    private getFormMetadata(): any {
        // For legacy file upload views, get metadata from URL parameters OR chain data
        // The form is hidden but metadata is still passed to the upload API
        
        // First, check if we're in a chain and get chain data
        const navigationState = this.csvFormNavigationService.getNavigationState();
        const chainData = navigationState.currentChain?.data || {};
        
        // Also get URL parameters
        const urlParams = this.getInputParams();
        
        // Merge chain data and URL parameters (URL params take precedence)
        const combinedParams = { ...chainData, ...urlParams };
        
        // Filter out empty values and chain metadata fields
        const metadata: any = {};
        Object.keys(combinedParams).forEach(key => {
            // Skip chain metadata fields
            if (key === 'isChain' || key === 'chainId' || key === 'linkId') {
                return;
            }
            
            const value = combinedParams[key];
            if (value !== undefined && value !== null && value !== '') {
                metadata[key] = value;
            }
        });
        
        return metadata;
    }

    onCSVFormSubmitted(formData: any): void {
        console.log('CSV Form submitted with data:', formData);
        // Store the form data for use with file upload
        this.csvFormData = formData;
    }

    onCSVFormCancelled(): void {
        console.log('CSV Form cancelled');
        this.csvFormData = null;
    }

    private showUploadResults(results: any[]): void {
        const dialogRef = this.dialog.open(TransactionResultsComponent, {
            data: {
                title: 'File Upload Results',
                idColumnName: 'File ID',
                showFileName: true,
                results: results.map(result => ({
                    id: result.response.newFileId,
                    fileName: result.fileName,
                    // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                    transactionMessage: result.response.transactionMessage,
                    transactionStatus: result.response.transactionStatus
                }))
            }
        });

        // Handle chain continuation after dialog closes (following DucRouteComponent pattern)
        dialogRef.afterClosed().subscribe(() => {
            console.log('Upload results dialog closed, checking for chain continuation');
            this.handleChainContinuationAfterUpload(results);
        });
    }

    /**
     * Handle chain continuation after upload completion
     * Simply signals the navigation service - doesn't handle chain logic itself
     */
    private handleChainContinuationAfterUpload(results: any[]): void {
        console.log('CustomViewComponent: Signaling upload completion to navigation service');
        
        // Prepare upload data from successful uploads
        const successfulResults = results.filter(result => result.response.newFileId);
        if (successfulResults.length > 0) {
            const firstSuccess = successfulResults[0];
            const uploadResponse = firstSuccess.response;
            
            // Get context parameters from URL
            const contextParams = this.getInputParams();
            
            // Prepare upload completion data
            const uploadCompletionData = {
                ...contextParams,
                fileId: uploadResponse.fileid || uploadResponse.newFileId,
                newFileId: uploadResponse.fileid || uploadResponse.newFileId,
                // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                transactionStatus: uploadResponse.transactionStatus || 'Good'
            };
            
            console.log('CustomViewComponent: Sending upload completion data:', uploadCompletionData);
            
            // Signal the navigation service - it handles all chain logic
            this.csvFormNavigationService.handleUploadCompletion(uploadCompletionData);
        } else {
            console.log('CustomViewComponent: No successful uploads to signal');
        }
    }



    // Remove showUploadResults - using simple message display instead

    private updateMessageItems(data: any): void {
        this.messageItems = [
            // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
            { label: this.messageLabelService.getLabel('transactionMessage'), value: data.transactionMessage || '' },
            { label: this.messageLabelService.getLabel('transactionStatus'), value: data.transactionStatus || '' },
            { label: this.messageLabelService.getLabel('newFileId'), value: data.newFileId?.toString() || '' }
        ].filter(item => item.value !== ''); // Remove empty items
    }


    getFixedDropdownOptions(reference: string): any[] {
        return this.fixedDropdownOptions.get(reference) || [];
    }

    /**
     * Check if a fixed dropdown field has only one option and should be rendered as a non-editable field
     * @param reference The dropdown reference ID
     * @returns True if the dropdown has only one option, false otherwise
     */
    isSingleOptionFixedDropdown(reference: string): boolean {
        if (!reference) {
            return false;
        }
        
        const options = this.getFixedDropdownOptions(reference);
        return options.length === 1;
    }

    /**
     * Get the display value for a single-option fixed dropdown
     * @param reference The dropdown reference ID
     * @returns The display value for the single option
     */
    getSingleOptionDisplayValue(reference: string): string {
        if (!reference) {
            return '';
        }
        
        const options = this.getFixedDropdownOptions(reference);
        if (options.length === 1) {
            return options[0].label;
        }
        
        return '';
    }

    getApiDropdownOptions(formFieldID: string): any[] {
        return this.apiDropdownOptions.get(formFieldID) || [];
    }


    getFormControl(parameterId: string): FormControl {
        return this.uploadForm?.get(parameterId) as FormControl;
    }

    // Get fields from dynamic data structure - use tooltips with column mapping like standard tables
    getRowFields(row: any): {displayName: string, value: any}[] {
        const fields: {displayName: string, value: any}[] = [];
        
        Object.keys(row).forEach(key => {
            let displayName: string = key; // Default to field key
            
            // Use the same tooltip lookup pattern as standard table components
            const fullKey = this.columnMapping[key];
            if (fullKey && this.tooltips[fullKey]) {
                displayName = this.tooltips[fullKey];
            } else if (this.tooltips[key]) {
                // Direct lookup as fallback
                displayName = this.tooltips[key];
            }
            
            let value = row[key];
            // Handle nested Value structure
            if (typeof value === 'object' && value !== null && value.hasOwnProperty('Value')) {
                value = value.Value;
            }
            
            fields.push({
                displayName: displayName,
                value: value
            });
        });
        
        return fields;
    }

    getCachedRowFields(row: any): {displayName: string, value: any}[] {
        if (!this.cachedRowFields.has(row)) {
            this.cachedRowFields.set(row, this.getRowFields(row));
        }
        return this.cachedRowFields.get(row)!;
    }

    getTableHeaders(): {displayName: string}[] {
        if (!this.tableData || this.tableData.length === 0) {
            return [];
        }
        
        // Get headers from the first row
        const firstRow = this.tableData[0];
        return this.getRowFields(firstRow).map(field => ({
            displayName: field.displayName
        }));
    }


    private calculateMaxHeadingWidth(): void {
        let maxLength = 0;
        this.tableData.forEach(row => {
            const fields = this.getRowFields(row);
            fields.forEach(field => {
                if (field.displayName.length > maxLength) {
                    maxLength = field.displayName.length;
                }
            });
        });
        
        // Estimate width: approximately 8px per character + padding
        const estimatedWidth = Math.max(200, maxLength * 8 + 20);
        this.maxHeadingWidth = `${estimatedWidth}px`;
    }

    private loadData() {
        if (!this.viewConfig) return;

        const tableType = {
            name: this.viewConfig.title,
            endpoint: this.viewConfig.apiEndpoint,
            idType: 'bigint' as 'bigint' | 'string',
            dataField: 'fileDetailsData'    // Use the correct dataField that matches backend response
        };

        // Get input parameters from URL
        const params = this.getInputParams();

        // Load table data using the adapter service
        this.readRoutesAdapter.getTableData(tableType, params).subscribe({
            next: (response: any) => {
                // Handle the tooltips and column mapping from GenericTableService
                if (response.tooltips) {
                    this.tooltips = response.tooltips;
                }
                if (response.columnMapping) {
                    this.columnMapping = response.columnMapping;
                }
                
                // Clear cached row fields so they get regenerated with tooltips
                this.cachedRowFields.clear();
                
                // Handle the table data from GenericTableService
                if (response.data && response.data.length > 0) {
                    this.tableData = response.data;
                    this.columns = Object.keys(this.tableData[0]);
                    this.calculateMaxHeadingWidth();
                } else {
                    this.tableData = [];
                    this.columns = [];
                }
                
                // Extract thumbnail from adapter response if available
                if (response.thumbnail) {
                    this.thumbnailImage = response.thumbnail;
                    
                    if (typeof response.thumbnail === 'string' && response.thumbnail.length > 0) {
                        // Detect image format from base64 signature
                        let mimeType = 'image/jpeg';
                        if (response.thumbnail.startsWith('iVBORw0KGgo')) {
                            mimeType = 'image/png';
                        } else if (response.thumbnail.startsWith('/9j/')) {
                            mimeType = 'image/jpeg';
                        } else if (response.thumbnail.startsWith('R0lGODlh')) {
                            mimeType = 'image/gif';
                        }
                        
                        this.thumbnailImageSrc = `data:${mimeType};base64,${response.thumbnail}`;
                    }
                } else {
                    this.thumbnailImage = 'placeholder';
                    this.thumbnailImageSrc = '';
                }
                
                this.formatOutputMessage(response);
            },
            error: (error) => {
                console.error('Error loading custom view data:', error);
                const errorResponse = this.applicationMessageService.createFromHttpError(error);
                this.appErrors = errorResponse.appErrors || [];
                this.systemErrors = errorResponse.systemErrors || [];
                this.messageItems = [];
                
                this.thumbnailImage = 'placeholder';
                this.thumbnailImageSrc = '';
            }
        });
    }


    private createTableConfig() {
        if (!this.tableData || this.tableData.length === 0) {
            return;
        }

        // Create column configuration from the first row of data
        const firstRow = this.tableData[0];
        const columns: ColumnConfig[] = [];

        Object.keys(firstRow).forEach(key => {
            let displayName: string = key; // Default to field key
            
            // Use the same tooltip lookup pattern as before
            const fullKey = this.columnMapping[key];
            if (fullKey && this.tooltips[fullKey]) {
                displayName = this.tooltips[fullKey];
            } else if (this.tooltips[key]) {
                // Direct lookup as fallback
                displayName = this.tooltips[key];
            }

            columns.push({
                key: key,
                header: displayName,
                sortable: true,
                resizable: true
            });
        });

        this.tableConfig = {
            columns: columns,
            dataSource: this.viewConfig?.apiEndpoint || '',
            actions: []
        };

        console.log('Table config created:', this.tableConfig);
    }

    // Handle table row selection
    onTableRowSelect(row: any) {
        console.log('Table row selected:', row);
        // Add any row selection logic here if needed
    }

    // Get tooltip for column headers
    getTooltip(column: string): string {
        const fullKey = this.columnMapping[column];
        return fullKey ? (this.tooltips[fullKey] || '') : '';
    }

    // Download a file by its ID using the shared FileDownloadService
    downloadFile(fileId: string | number): void {
        if (fileId) {
            const numericFileId = typeof fileId === 'string' ? parseInt(fileId) : fileId;
            this.fileDownloadService.downloadFile(numericFileId);
        }
    }

    private getInputParams(): any {
        if (!this.viewConfig || !this.viewConfig.inputParameters) {
            return {};
        }

        const params: any = {};
        const queryParams = new URLSearchParams(window.location.search);
        
        this.viewConfig.inputParameters.forEach(param => {
            if (queryParams.has(param)) {
                params[param] = queryParams.get(param);
            }
        });
        
        return params;
    }

    private formatOutputMessage(response: any): void {
        this.messageItems = [];
        
        // Handle standard output parameters (like message label service)
        // Exclude 'thumbnail' as it's handled separately in the image section
        if (this.viewConfig && this.viewConfig.outputParameters) {
            this.viewConfig.outputParameters.forEach(param => {
                if (param !== 'thumbnail' && response[param] !== undefined) {
                    this.messageItems.push({
                        label: this.messageLabelService.getLabel(param),
                        value: response[param].toString()
                    });
                }
            });
        }
    }

    getThumbnailImageSrc(): string {
        if (!this.thumbnailImage) return '';
        
        // Handle different image formats
        if (typeof this.thumbnailImage === 'string') {
            // If it's a base64 string, check if it has the data URL prefix
            if (this.thumbnailImage.startsWith('data:image/')) {
                return this.thumbnailImage;
            } else if (this.thumbnailImage.match(/^[A-Za-z0-9+/=]+$/)) {
                // Looks like base64, add the data URL prefix
                return `data:image/jpeg;base64,${this.thumbnailImage}`;
            } else {
                // Assume it's a URL
                return this.thumbnailImage;
            }
        }
        
        return '';
    }

    onImageError(event: any): void {
        console.warn('Image failed to load:', event.target.src);
        event.target.style.display = 'none';
    }

    formatDate(value: any): string {
        if (!value) return '';
        try {
            const date = new Date(value);
            return date.toLocaleDateString();
        } catch {
            return value.toString();
        }
    }

    formatNumber(value: any): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        return value.toString();
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }


    // TrackBy functions to prevent infinite change detection cycles
    trackByIndex(index: number, item: any): any {
        return index;
    }

    trackByField(index: number, field: any): any {
        return field.displayName;
    }

    ngOnDestroy(): void {
        if (this.routeChangeSubscription) {
            this.routeChangeSubscription.unsubscribe();
        }
    }
}

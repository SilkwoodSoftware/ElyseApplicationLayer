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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DucRouteConfig, FieldMapping } from '../../interfaces/duc-route.interface';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ParameterMappingService } from '../../services/parameter-mapping.service';
import { TableSelectionExtensionService } from '../../services/table-selection-extension.service';
import { MatDialog } from '@angular/material/dialog';
import { TransactionResultDialogComponent } from '../transaction-results/transaction-result-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { TransactionResultsComponent } from '../transaction-results/transaction-results.component';
import { environment } from '../../../../environments/environment';
import { CsvFormNavigationService } from '../../services/csv-form-navigation.service';
import { CsvFormChainService } from '../../services/csv-form-chain.service';
import { DialogCompletionService } from '../../services/dialog-completion.service';
import { ApplicationMessageService } from '../../services/application-message.service';

@Component({
    selector: 'app-duc-route',
    template: `
        <div *ngIf="routeConfig" class="duc-container">
            <h2 class="hidden-title">{{ routeConfig.displayName }}</h2>
            <div class="processing-message" *ngIf="processing">
                Processing request...
            </div>
        </div>
    `,
    styles: [`
        .duc-container {
            padding: 20px;
        }
        .hidden-title {
            display: none; /* Hide the title as it's shown in the dialog */
        }
        .processing-message {
            margin: 20px 0;
            font-style: italic;
        }
        .messages-container {
            margin-top: 20px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        .result-item {
            display: block;
            margin-bottom: 5px;
        }
        .result-value {
            font-weight: bold;
        }
    `]
})
export class DucRouteComponent implements OnInit {
    routeConfig: DucRouteConfig | undefined;
    processing = false;
    messageItems: { label: string, value: string }[] = [];
    
    // Chain navigation properties
    isPartOfChain = false;
    chainId: string | null = null;
    linkId: number | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private parameterMappingService: ParameterMappingService,
        private tableSelectionExtensionService: TableSelectionExtensionService,
        private dialog: MatDialog,
        private navigationService: CsvFormNavigationService,
        private chainService: CsvFormChainService,
        private dialogCompletionService: DialogCompletionService,
        private applicationMessageService: ApplicationMessageService
    ) {}

    ngOnInit() {
        // Get config from route data
        console.log('DUC Route - Full route snapshot data:', this.route.snapshot.data);
        console.log('DUC Route - URL:', this.route.snapshot.url);
        console.log('DUC Route - Full URL from router state:', window.location.pathname);
        
        this.routeConfig = this.route.snapshot.data['ducRouteConfig'];
        console.log('DUC Route config loaded:', this.routeConfig?.routeId);
        
        if (!this.routeConfig) {
            console.error('❌ No DUC route configuration found');
            console.error('Available route data keys:', Object.keys(this.route.snapshot.data));
            console.error('Current URL:', window.location.pathname);
            console.error('Route params:', this.route.snapshot.params);
            console.error('Query params:', this.route.snapshot.queryParams);
            
            // Show an error message in the UI instead of blank screen
            this.messageItems = [{
                label: 'Error',
                value: `No DUC route configuration found for URL: ${window.location.pathname}`
            }];
            return;
        }
        
        // Check if this component is part of a chain
        this.route.queryParams.subscribe(params => {
            // Log raw query parameters
            console.log('DUC Route raw query parameters:', params);
            
            // Check if isChain parameter exists and is 'true'
            this.isPartOfChain = params['isChain'] === 'true';
            
            // Get chainId and linkId
            this.chainId = params['chainId'];
            this.linkId = params['linkId'] ? parseInt(params['linkId'], 10) : null;
            
            console.log('DUC Route chain info after processing:', {
                isPartOfChain: this.isPartOfChain,
                chainId: this.chainId,
                linkId: this.linkId
            });
            
            // Check for chain trigger field in the route config
            const triggerField = this.routeConfig?.chainTriggerField || 'newDocId';
            
            // If we have the trigger field in the URL, set chain information
            if (params[triggerField] && !this.isPartOfChain) {
                console.log(`Found chain trigger field ${triggerField} in URL, setting chain information`);
                this.isPartOfChain = true;
                this.chainId = this.routeConfig?.defaultChainId || 'new-document';
                this.linkId = this.routeConfig?.defaultLinkId || 1;
            }
        });

        // Check if this is a multi-row delete operation
        const queryParams = new URLSearchParams(window.location.search);
        const fileIds = queryParams.get('fileId');
        
        // If fileId contains commas, it's a multi-row operation
        if (fileIds && fileIds.includes(',') && this.routeConfig?.routeId === 'rid-del-file') {
            this.processMultiRowDelete(fileIds.split(','));
        } else {
            // Process the DUC operation normally
            this.processDucOperation();
        }
    }

    private processDucOperation() {
        if (!this.routeConfig) return;

        this.processing = true;
        
        // Get input parameters from URL
        const params = this.getInputParams();
        
        // Construct the API URL with proper slash handling
        const apiUrl = `${environment.dotNetBaseUrl}/${this.routeConfig.apiEndpoint.replace(/^\//, '')}`;
        
        // All DUC routes use POST method with JSON body (standardized approach)
        // This handles both DELETE and CREATE/UPDATE operations consistently
        let apiCall: Observable<any> = this.http.post(apiUrl, params, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Executing DUC operation API call to:', apiUrl);
        
        // Execute the API call
        apiCall.subscribe(
            (response: any) => {
                this.processing = false;
                console.log('DUC operation API response received:', response);
                
                // We don't need to format the output message for display on the page
                // since it will be shown in the dialog
                
                // Get the results title from the route config, falling back to displayName if not available
                const resultsTitle = this.routeConfig?.resultsTitle || 'Operation Result';
                
                console.log('Opening transaction result dialog with title:', resultsTitle);
                
                // Use setTimeout to ensure the dialog is opened after Angular's change detection cycle
                setTimeout(() => {
                    // Show a dialog with the transaction result
                    console.log('About to open dialog');
                    // Log chain information before opening dialog
                    console.log('Chain information before opening dialog:', {
                        isPartOfChain: this.isPartOfChain,
                        chainId: this.chainId,
                        linkId: this.linkId
                    });
                    
                    // Check if we have an application error (not database error)
                    let dialogData: any;
                    if (response.applicationError) {
                        // Application error - use separate display format with custom labels
                        dialogData = {
                            title: 'Application Error',
                            message: response.applicationError.errorMessage || 'An application error occurred',
                            status: response.applicationError.errorType || 'Error',
                            messageLabel: 'Error Description',
                            statusLabel: 'Error Type',
                            // Pass chain information to the dialog
                            chainId: this.chainId,
                            linkId: this.linkId,
                            isPartOfChain: this.isPartOfChain
                        };
                        console.log('Displaying application error:', dialogData);
                    } else {
                        // Database transaction result - use transaction parameters with standard labels
                        dialogData = {
                            title: resultsTitle,
                            // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                            message: response.transactionMessage,
                            status: response.transactionStatus,
                            // Don't set custom labels - will use default 'Message' and 'Transaction Status'
                            // Pass chain information to the dialog
                            chainId: this.chainId,
                            linkId: this.linkId,
                            isPartOfChain: this.isPartOfChain
                        };
                        console.log('Displaying database transaction result:', dialogData);
                    }
                    
                    const dialogRef = this.dialog.open(TransactionResultDialogComponent, {
                        width: '400px',
                        disableClose: false,
                        data: dialogData
                    });
                    
                    console.log('Dialog opened, dialogRef:', dialogRef);
                
                    // Wait for the dialog to close before continuing the chain
                    dialogRef.afterClosed().subscribe(() => {
                        console.log('Dialog closed, now continuing chain');
                        
                        // GENERIC BRUTE FORCE: Always continue the chain, regardless of chain information
                        // This ensures the chain continues even if the chain information is not properly set
                        
                        // Get the navigation state
                        const navigationState = this.navigationService.getNavigationState();
                        
                        // If we have a current chain, use it
                        if (navigationState.currentChain) {
                            console.log('Found current chain in navigation state:', navigationState.currentChain);
                            
                            // Update the chain data with the response
                            navigationState.currentChain.data = {
                                ...navigationState.currentChain.data,
                                ...response
                            };
                            
                            // Get the next link in the chain
                            this.chainService.getNextLink(
                                navigationState.currentChain.chainId,
                                navigationState.currentChain.currentLinkId
                            ).then(nextLink => {
                                if (nextLink) {
                                    // Execute the next link
                                    this.navigationService['executeChainLink'](nextLink);
                                } else {
                                    // Chain is complete, handle completion
                                    console.log('Chain complete, handling completion');
                                    this.navigationService['handleChainCompletion']();
                                }
                            });
                        }
                        // If we don't have a current chain but we have chain information, create one
                        else if (this.isPartOfChain && this.chainId && this.linkId !== null) {
                            console.log('Using chain information from component:', { chainId: this.chainId, linkId: this.linkId });
                            
                            // Continue the chain
                            this.continueChain(response);
                        }
                        // Otherwise, try to find a chain that starts with this route
                        else {
                            console.log('No chain information available, trying to find a chain');
                            
                            // This is a generic approach that will work for any chain
                            // It doesn't rely on specific chain IDs or link IDs
                            this.continueChain(response);
                            
                            // If no chain is found, handle completion to return to original table
                            // Give the chain detection some time, then fallback to completion handling
                            setTimeout(() => {
                                const updatedNavigationState = this.navigationService.getNavigationState();
                                if (!updatedNavigationState.currentChain) {
                                    console.log('No chain detected after timeout, handling completion');
                                    this.navigationService['handleChainCompletion']();
                                }
                            }, 1000); // Wait 1 second for chain detection
                        }
                    });
                }, 100); // Small delay to ensure Angular's change detection has completed
            },
            (error: any) => {
                this.processing = false;
                console.error('❌ Error executing DUC operation:', error);
                console.error('❌ Error status:', error.status);
                console.error('❌ Error message:', error.message);
                console.error('❌ Error response body:', error.error);
                
                // Extract detailed error information
                let errorTitle = 'API Error';
                let errorMessage = 'An error occurred while processing the request';
                let errorStatus = 'Error';
                
                if (error.error) {
                    // If the backend returns structured error data
                    errorTitle = error.error.title || `HTTP ${error.status} Error`;
                    // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                    errorMessage = error.error.transactionMessage || error.error.message || error.message || errorMessage;
                    errorStatus = error.error.transactionStatus || `HTTP ${error.status}`;
                } else {
                    // Fallback for generic HTTP errors
                    errorTitle = `HTTP ${error.status} Error`;
                    errorMessage = error.message || `${error.status} ${error.statusText}`;
                    errorStatus = error.statusText;
                }
                
                console.log('📋 Showing error dialog:', { title: errorTitle, message: errorMessage, status: errorStatus });
                
                // Use setTimeout to ensure the dialog is opened after Angular's change detection cycle
                setTimeout(() => {
                    // Show error dialog
                    const errorDialogRef = this.dialog.open(TransactionResultDialogComponent, {
                        width: '400px',
                        disableClose: false,
                        data: {
                            title: errorTitle,
                            message: errorMessage,
                            status: errorStatus,
                            // Pass chain information to the dialog
                            chainId: this.chainId,
                            linkId: this.linkId,
                            isPartOfChain: this.isPartOfChain
                        }
                    });
                
                    // If this is part of a chain, continue the chain immediately
                    if (this.isPartOfChain && this.chainId && this.linkId !== null) {
                        // Create application error response without hijacking database parameters
                        const applicationError = this.applicationMessageService.createFromHttpError(error);
                        
                        // Create chain continuation data with application messages (no database parameter hijacking)
                        const chainContinuationData: Record<string, any> = {
                            // Add application layer messages
                            applicationMessages: applicationError,
                            // Add a simple status flag for chain logic (not database parameters)
                            operationStatus: 'Failed'
                        };
                        
                        console.log('Created application error response for chain continuation:', chainContinuationData);
                        
                        // Continue the chain immediately without waiting for dialog to close
                        this.continueChain(chainContinuationData);
                    }
                }, 100); // Small delay to ensure Angular's change detection has completed
            }
        );
    }

    private getInputParams(): any {
        if (!this.routeConfig) {
            return {};
        }

        const params: any = {};
        
        // Get parameters from the URL query params
        const queryParams = new URLSearchParams(window.location.search);
        
        // If this is part of a chain, include all query parameters
        // This is a generic approach that doesn't hardcode specific parameter names
        if (this.isPartOfChain) {
            // Get all query parameters
            queryParams.forEach((value, key) => {
                // Skip chain control parameters
                if (key !== 'isChain' && key !== 'chainId' && key !== 'linkId') {
                    // Convert empty strings to null for numeric parameters
                    params[key] = this.normalizeParameterValue(key, value);
                    console.log(`Found chain parameter ${key}: ${value}`);
                }
            });
        }
        
        // Extract parameters defined in the route config
        if (this.routeConfig.inputParameters) {
            this.routeConfig.inputParameters.forEach(paramDef => {
                // Check if the parameter has a hardcoded value (contains '=')
                if (paramDef.includes('=')) {
                    // For parameters with '=', use the hardcoded value
                    const [paramName, hardcodedValue] = paramDef.split('=', 2);
                    params[paramName] = hardcodedValue;
                    console.log(`Using hardcoded value for ${paramName}: ${hardcodedValue}`);
                } else {
                    // For parameters without '=', look in query params and route params
                    const paramName = paramDef;
                    
                    // Check query params first
                    if (queryParams.has(paramName)) {
                        const rawValue = queryParams.get(paramName);
                        // Convert empty strings to null for numeric parameters
                        params[paramName] = this.normalizeParameterValue(paramName, rawValue);
                        console.log(`Found parameter ${paramName} in query params: ${params[paramName]}`);
                    }
                    // Then check route params
                    else {
                        const routeParam = this.route.snapshot.paramMap.get(paramName);
                        if (routeParam) {
                            // Convert empty strings to null for numeric parameters
                            params[paramName] = this.normalizeParameterValue(paramName, routeParam);
                            console.log(`Found parameter ${paramName} in route params: ${params[paramName]}`);
                        } else {
                            console.log(`Parameter ${paramName} not found in query or route params`);
                        }
                    }
                }
            });
        }
        
        console.log('DUC operation input parameters:', params);
        return params;
    }

    /**
     * Normalize parameter value - convert empty strings to null for numeric parameters
     * This matches the behavior in csv-form.service.ts
     */
    private normalizeParameterValue(paramName: string, value: string | null): any {
        // If value is null or undefined, return null
        if (value === null || value === undefined) {
            return null;
        }
        
        // If value is empty string, check if this is a numeric parameter
        if (value === '') {
            // Check if this parameter is defined as NUMBER type in input-id-parameter-mapping.csv
            // For now, we'll use a simple heuristic: parameters ending with 'Id' are numeric
            // This matches the pattern used throughout the application
            if (paramName.endsWith('Id') || paramName.endsWith('ID')) {
                console.log(`Converting empty string to null for numeric parameter: ${paramName}`);
                return null;
            }
        }
        
        return value;
    }

    private formatOutputMessage(response: any): void {
        this.messageItems = [];
        
        // Only display output parameters listed in the OutputParameters column of duc-routes.csv
        if (this.routeConfig && this.routeConfig.outputParameters) {
            // Process each output parameter defined in the route config
            this.routeConfig.outputParameters.forEach(param => {
                if (response[param] !== undefined) {
                    this.messageItems.push({
                        label: param,
                        value: response[param].toString()
                    });
                }
            });
        }
    }
    /**
     * Continue the chain execution
     * @param result The result to pass to the next link in the chain
     */
    /**
     * Continue the chain execution
     * @param result The result to pass to the next link in the chain
     */
    private continueChain(result: any): void {
        if (!this.isPartOfChain || !this.chainId || this.linkId === null) return;
        
        // Get the navigation state
        const navigationState = this.navigationService.getNavigationState();
        
        // Get query parameters from URL
        const queryParams = new URLSearchParams(window.location.search);
        
        // Apply field mappings if available in route config
        if (this.routeConfig?.fieldMappings && this.routeConfig.fieldMappings.length > 0) {
            console.log('Applying field mappings from route config');
            
            // Apply each mapping
            this.routeConfig.fieldMappings.forEach((mapping: FieldMapping) => {
                // Check if the source field exists in the result
                if (result[mapping.source] !== undefined) {
                    result[mapping.target] = result[mapping.source];
                    console.log(`Applied mapping: ${mapping.source} -> ${mapping.target}`);
                }
                // Check if the source field exists in the query params
                else if (queryParams.has(mapping.source)) {
                    result[mapping.target] = queryParams.get(mapping.source);
                    console.log(`Applied mapping from query params: ${mapping.source} -> ${mapping.target}`);
                }
            });
        } else {
            // Default behavior - copy all query parameters to the result
            // This is a generic approach that doesn't hardcode specific parameter names
            queryParams.forEach((value, key) => {
                // Skip chain control parameters
                if (key !== 'isChain' && key !== 'chainId' && key !== 'linkId') {
                    result[key] = value;
                    console.log(`Added parameter from query params to chain data: ${key}=${value}`);
                }
            });
            
            // Look for ID fields in the result that might need to be copied
            // This is a generic approach that looks for common patterns
            Object.keys(result).forEach(key => {
                if (key.endsWith('Id') && key.startsWith('new')) {
                    // Extract the base name (e.g., 'newDocId' -> 'Doc')
                    const baseName = key.substring(3, key.length - 2);
                    // Create the target field name (e.g., 'Doc' -> 'documentId')
                    const targetField = baseName.toLowerCase() + 'umentId';
                    
                    // Only copy if the target field doesn't already exist
                    if (result[targetField] === undefined) {
                        result[targetField] = result[key];
                        console.log(`Copied ID field: ${key} -> ${targetField}`);
                    }
                }
            });
        }
        
        // Set up the chain data
        if (!navigationState.currentChain) {
            navigationState.currentChain = {
                chainId: this.chainId,
                currentLinkId: this.linkId,
                data: result
            };
        } else {
            // Update the chain data
            navigationState.currentChain.data = {
                ...navigationState.currentChain.data,
                ...result
            };
        }
        
        console.log('Updated chain data:', navigationState.currentChain.data);
        
        // Get the next link in the chain
        this.chainService.getNextLink(this.chainId, this.linkId).then(nextLink => {
            if (nextLink) {
                // Execute the next link
                this.navigationService['executeChainLink'](nextLink);
            } else {
                console.log('Chain execution complete');
                this.router.navigate(['/']);
            }
        }).catch(error => {
            console.error('Error getting next chain link:', error);
            this.router.navigate(['/']);
        });
    }

    /**
     * Process multi-row delete operation with confirmation and results display
     */
    private processMultiRowDelete(fileIds: string[]): void {
        if (!this.routeConfig) return;

        // Get the confirmation title and message from route config (or use defaults)
        const entityName = this.routeConfig?.entityDisplayName || 'Files';
        const confirmTitle = `Delete ${entityName}`;
        const confirmMessage = this.routeConfig?.confirmationMessage || `Delete the following ${entityName.toLowerCase()}`;
        
        // Show confirmation dialog with list of files
        const idColumnLabel = this.routeConfig?.idColumnName || 'File ID';
        const filesInfo = fileIds.map((id, index) => `   ${idColumnLabel}: ${id}`).join('\n');
        const confirmationMessage = `${confirmMessage}?\n\n${filesInfo}`;

        const confirmationDialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: false,
            autoFocus: true,
            panelClass: 'standard-dialog',
            data: {
                title: confirmTitle,
                message: confirmationMessage,
                confirmText: 'Delete Files',
                cancelText: 'Cancel'
            }
        });

        confirmationDialogRef.afterClosed().subscribe(confirmed => {
            if (!confirmed) {
                console.log('User cancelled multi-row delete operation');
                // Navigate back to the previous page
                this.navigationService['handleChainCompletion']();
                return;
            }

            // User confirmed - proceed with deletion
            console.log('User confirmed deletion, proceeding with', fileIds.length, 'files');
            this.processing = true;
            const apiUrl = `${environment.dotNetBaseUrl}/${this.routeConfig!.apiEndpoint.replace(/^\//, '')}`;
            console.log('API URL:', apiUrl);
            
            // Handle empty array case
            if (fileIds.length === 0) {
                console.error('No file IDs to delete');
                this.processing = false;
                this.navigationService['handleChainCompletion']();
                return;
            }
            
            // Create an array to store all API call observables
            const deleteOperations: Observable<any>[] = fileIds.map(fileId => {
                const params = { fileId: fileId.trim() };
                console.log('Creating delete operation for fileId:', fileId.trim(), 'with params:', params);
                return this.http.post(apiUrl, params, {
                    headers: { 'Content-Type': 'application/json' }
                }).pipe(
                    map((response: any) => {
                        console.log('Delete successful for file', fileId, ':', response);
                        return {
                            fileId: fileId.trim(),
                            success: true,
                            status: response.transactionStatus,
                            message: response.transactionMessage
                        };
                    }),
                    catchError((error: any) => {
                        console.error(`Error deleting file ${fileId}:`, error);
                        return of({
                            fileId: fileId.trim(),
                            success: false,
                            status: error.error?.transactionStatus || `HTTP ${error.status}`,
                            message: error.error?.transactionMessage || error.message || 'Failed to delete file'
                        });
                    })
                );
            });

            console.log('Starting forkJoin with', deleteOperations.length, 'operations');
            
            // Execute all delete operations
            forkJoin(deleteOperations).subscribe({
                next: (results: any[]) => {
                    this.processing = false;
                    console.log('All delete operations completed:', results);

                    // Get the results title from route config
                    const resultsTitle = this.routeConfig?.resultsTitle || 'Delete Results';

                    // Show results dialog
                    const dialogData: any = {
                        title: resultsTitle,
                        results: results.map(result => ({
                            id: result.fileId,
                            displayName: `File ${result.fileId}`,
                            transactionMessage: result.message,
                            transactionStatus: result.status
                        }))
                    };
                    
                    // Only add idColumnName if it's defined in the route config
                    if (this.routeConfig?.idColumnName) {
                        dialogData.idColumnName = this.routeConfig.idColumnName;
                    }
                    
                    const dialogRef = this.dialog.open(TransactionResultsComponent, {
                        disableClose: false,
                        autoFocus: true,
                        panelClass: 'standard-dialog',
                        data: dialogData
                    });

                    dialogRef.afterClosed().subscribe(() => {
                        console.log('Results dialog closed');
                        // Navigate back to the previous page
                        this.navigationService['handleChainCompletion']();
                    });
                },
                error: (error: any) => {
                    this.processing = false;
                    console.error('Error in forkJoin:', error);
                    
                    // Show error dialog
                    const errorDialogRef = this.dialog.open(TransactionResultDialogComponent, {
                        width: '400px',
                        disableClose: false,
                        data: {
                            title: 'Delete Error',
                            message: error.message || 'An error occurred during the delete operation',
                            status: 'Error'
                        }
                    });

                    errorDialogRef.afterClosed().subscribe(() => {
                        // Navigate back to the previous page
                        this.navigationService['handleChainCompletion']();
                    });
                },
                complete: () => {
                    console.log('forkJoin completed');
                }
            });
        });
    }
}

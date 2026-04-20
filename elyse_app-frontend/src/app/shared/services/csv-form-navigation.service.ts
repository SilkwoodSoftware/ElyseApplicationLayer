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
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, Subject } from 'rxjs';
import { CsvFormService, CsvFormDefinition, CsvFormField } from './csv-form.service';
import { CsvFormDialogComponent, CsvFormDialogData } from '../components/csv-form-dialog/csv-form-dialog.component';
import { CsvFormDialogService } from './csv-form-dialog.service';
import { CsvFormChainService, CsvFormChainLink } from './csv-form-chain.service';
import { ReadRouteConfigService } from './read-route-config.service';
import { DucRouteConfigService } from './duc-route-config.service';
import { CustomViewConfigService } from './custom-view-config.service';
import { Router } from '@angular/router';
import { ContextAwareRoutingService } from './context-aware-routing.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DialogCompletionService } from './dialog-completion.service';

/**
 * Interface for form navigation state
 */
export interface FormNavigationState {
  /** Stack of forms being navigated */
  formStack: {
    formId: string;
    params: Record<string, any>;
    result?: any;
  }[];
  /** Current data being passed between forms */
  currentData: Record<string, any>;
  /** Current chain being executed, if any */
  currentChain?: {
    chainId: string;
    currentLinkId: number;
    data: Record<string, any>;
  };
}

/**
 * Service for handling CSV form navigation
 * This is completely independent of the existing form functionality
 */
@Injectable({
  providedIn: 'root'
})
export class CsvFormNavigationService {
  /** Service instance ID for debugging */
  private instanceId = Math.random().toString(36).substr(2, 9);
  
  /** Current navigation state */
  private navigationState: FormNavigationState = {
    formStack: [],
    currentData: {}
  };

  /** Subject for form navigation events */
  private navigationEvents = new Subject<string>();

  /** Observable for form navigation events */
  navigationEvents$ = this.navigationEvents.asObservable();

  constructor(
    private dialog: MatDialog,
    private csvFormService: CsvFormService,
    private csvFormDialogService: CsvFormDialogService,
    private csvFormChainService: CsvFormChainService,
    private readRouteConfigService: ReadRouteConfigService,
    private router: Router,
    private ducRouteConfigService: DucRouteConfigService,
    private customViewConfigService: CustomViewConfigService,
    private http: HttpClient,
    private dialogCompletionService: DialogCompletionService,
    private contextAwareRouting: ContextAwareRoutingService
  ) {
    // Subscribe to dialog completion events
    this.dialogCompletionService.pendingDialogs$.subscribe(
      ({ chainId, linkId, result }) => {
        this.continueChainAfterDialog(chainId, linkId, result);
      }
    );
  }

  /**
   * Open a form
   * @param formId The ID of the form to open
   * @param params Optional parameters to pass to the form
   * @param isSubForm Whether this is a sub-form in a progressive data selection
   * @returns An Observable that resolves to the form result when the dialog is closed
   */
  openForm(formId: string, params: Record<string, any> = {}, isSubForm: boolean = false): Observable<any> {
    // Get the form definition
    const formDefinition = this.csvFormService.getForm(formId);
    if (!formDefinition) {
      console.error(`Form not found: ${formId}`);
      return of(null);
    }

    // Check if the form has only one field with PopulationType = LOOKUP_TABLE
    const formFields = this.csvFormService.getFormFields(formId);
    if (formFields.length === 1 && formFields[0].populationType === 'LOOKUP_TABLE') {
      // Check if the lookup field is already pre-populated
      const field = formFields[0];
      const isPrePopulated = params[field.id] !== undefined && params[field.id] !== null && params[field.id] !== '';
      
      if (!isPrePopulated) {
        // Field is not pre-populated - skip the form and directly open the lookup table
        console.log(`Form ${formId} has single LOOKUP_TABLE field that is not pre-populated, opening lookup directly`);
        return this.openLookupTable(field, params);
      } else {
        // Field is already pre-populated - show the form normally for confirmation/submission
        console.log(`Form ${formId} has single LOOKUP_TABLE field that IS pre-populated (${field.id}=${params[field.id]}), showing form normally`);
      }
    }

    // If this is a sub-form in a progressive data selection, add it to the stack
    if (isSubForm) {
      this.navigationState.formStack.push({
        formId,
        params
      });
    } else {
      // If there's an active chain, don't create a new navigation state object
      // This preserves the reference that other services may be holding
      if (this.navigationState.currentChain) {
        // Just update the properties without creating a new object
        this.navigationState.formStack = [{
          formId,
          params
        }];
        this.navigationState.currentData = {};
        // currentChain is preserved automatically since we're not creating a new object
      } else {
        // No active chain, safe to create a new navigation state object
        this.navigationState = {
          formStack: [{
            formId,
            params
          }],
          currentData: {}
        };
      }
    }

    // Check if this form is part of a chain
    const isInChain = params['_isInChain'] === true;
    
    // Remove the _isInChain flag from params to avoid passing it to the form
    if (params['_isInChain'] !== undefined) {
      const paramsCopy = { ...params };
      delete paramsCopy['_isInChain'];
      params = paramsCopy;
    }
    
    
    // Use CsvFormDialogService to handle CUSTOM forms correctly
    const dialogResult = this.csvFormDialogService.openFormDialog(formId, params);
    
    // For non-CUSTOM forms, handle chain detection when dialog closes
    if (formDefinition.formType !== 'CUSTOM') {
      return new Observable<any>(observer => {
        dialogResult.subscribe(result => {
          if (result) {
            // Store the result in the current form's state
            const currentForm = this.navigationState.formStack[this.navigationState.formStack.length - 1];
            if (currentForm) {
              currentForm.result = result;
            }

            // If this is a sub-form, return to the parent form
            if (isSubForm) {
              this.navigationState.formStack.pop();
              if (this.navigationState.formStack.length > 0) {
                // Pass the result back to the parent form
                this.navigationState.currentData = { ...this.navigationState.currentData, ...result };
              }
            }

            // Check if there's a chain to execute - for all form types, not just DUC
            if (!isSubForm) {
              console.log(`[${this.instanceId}] Form completed, checking for chains. FormId: ${formId}, Result:`, result);
              // Execute chain asynchronously - don't block the form completion
              this.checkAndExecuteChain(formId, result).catch(error => {
                console.error(`[${this.instanceId}] Error executing form chain:`, error);
              });
            } else {
              console.log(`[${this.instanceId}] Skipping chain check for sub-form: ${formId}`);
            }

            // Emit navigation event
            this.navigationEvents.next('form_completed');
          } else {
            // If the form was cancelled, remove it from the stack
            if (isSubForm) {
              this.navigationState.formStack.pop();
            }

            // Emit navigation event
            this.navigationEvents.next('form_cancelled');
          }

          // Complete the observable
          observer.next(result);
          observer.complete();
        });
      });
    }
    
    // For CUSTOM forms, just return the dialog result as-is (which will be null)
    return dialogResult;
  }

  /**
   * Legacy method for backward compatibility - delegates to openForm
   */
  private openFormLegacy(formId: string, params: Record<string, any> = {}, isSubForm: boolean = false): Observable<any> {
    // Get the form definition
    const formDefinition = this.csvFormService.getForm(formId);
    if (!formDefinition) {
      console.error(`Form not found: ${formId}`);
      return of(null);
    }

    // Check if the form has only one field with PopulationType = LOOKUP_TABLE
    const formFields = this.csvFormService.getFormFields(formId);
    if (formFields.length === 1 && formFields[0].populationType === 'LOOKUP_TABLE') {
      // If so, skip the form and directly open the lookup table
      return this.openLookupTable(formFields[0], params);
    }

    // If this is a sub-form in a progressive data selection, add it to the stack
    if (isSubForm) {
      this.navigationState.formStack.push({
        formId,
        params
      });
    } else {
      // Otherwise, reset the navigation state
      this.navigationState = {
        formStack: [{
          formId,
          params
        }],
        currentData: {}
      };
    }

    // Check if this form is part of a chain
    const isInChain = params['_isInChain'] === true;
    
    // Remove the _isInChain flag from params to avoid passing it to the form
    if (params['_isInChain'] !== undefined) {
      const paramsCopy = { ...params };
      delete paramsCopy['_isInChain'];
      params = paramsCopy;
    }
    
    // Open the form dialog
    const dialogRef = this.dialog.open(CsvFormDialogComponent, {
      width: '80%', // Use a large width to allow the component to control its own width
      data: {
        formId,
        params,
        title: formDefinition.title,
        width: formDefinition.width,
        isInChain: isInChain
      } as CsvFormDialogData,
      disableClose: true,
      panelClass: 'custom-dialog-container'
    });

    // Handle dialog close
    return new Observable<any>(observer => {
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Store the result in the current form's state
          const currentForm = this.navigationState.formStack[this.navigationState.formStack.length - 1];
          if (currentForm) {
            currentForm.result = result;
          }

          // If this is a sub-form, return to the parent form
          if (isSubForm) {
            this.navigationState.formStack.pop();
            if (this.navigationState.formStack.length > 0) {
              // Pass the result back to the parent form
              this.navigationState.currentData = { ...this.navigationState.currentData, ...result };
            }
          }

          // Check if there's a chain to execute - for all form types, not just DUC
          if (!isSubForm) {
            console.log(`[${this.instanceId}] Form completed, checking for chains. FormId: ${formId}, Result:`, result);
            // Execute chain asynchronously - don't block the form completion
            this.checkAndExecuteChain(formId, result).catch(error => {
              console.error(`[${this.instanceId}] Error executing form chain:`, error);
            });
          } else {
            console.log(`[${this.instanceId}] Skipping chain check for sub-form: ${formId}`);
          }

          // Emit navigation event
          this.navigationEvents.next('form_completed');
        } else {
          // If the form was cancelled, remove it from the stack
          if (isSubForm) {
            this.navigationState.formStack.pop();
          }

          // Emit navigation event
          this.navigationEvents.next('form_cancelled');
        }

        // Complete the observable
        observer.next(result);
        observer.complete();
      });
    });
  }

  /**
   * Open a lookup table
   * @param field The form field that requires lookup
   * @param params Parameters to pass to the lookup
   * @returns An Observable that resolves to the selected record(s)
   */
  openLookupTable(field: CsvFormField, params: Record<string, any>): Observable<any> {
    if (!field.reference) {
      console.error(`No reference specified for lookup table field: ${field.id}`);
      return of(null);
    }

    // Get the table configuration
    const tableConfig = this.readRouteConfigService.getRouteConfig(field.reference);
    if (!tableConfig) {
      console.error(`Table not found: ${field.reference}`);
      return of(null);
    }

    // Get current URL and strip any existing returnRoute parameter to prevent recursion
    const currentUrl = this.router.url;
    const cleanReturnRoute = this.stripReturnRoute(currentUrl);

    // Navigate to the table
    const queryParams: Record<string, string> = {
      ...params,
      isLookup: 'true',
      lookupField: field.id,
      returnRoute: cleanReturnRoute
    };

    this.router.navigate(['/reading', field.reference], { queryParams });

    // Return an observable that will be completed when the lookup is done
    // This is handled by the table component, which will call the completeLookup method
    return new Observable<any>(observer => {
      const subscription = this.navigationEvents$.subscribe(event => {
        if (event === 'lookup_completed') {
          observer.next(this.navigationState.currentData);
          observer.complete();
          subscription.unsubscribe();
        } else if (event === 'lookup_cancelled') {
          observer.next(null);
          observer.complete();
          subscription.unsubscribe();
        }
      });
    });
  }

  /**
   * Complete a lookup operation
   * @param data The data selected from the lookup table
   */
  completeLookup(data: any): void {
    this.navigationState.currentData = data;
    this.navigationEvents.next('lookup_completed');

    // Return to the previous route
    const returnRoute = this.getQueryParam('returnRoute');
    if (returnRoute) {
      this.router.navigateByUrl(returnRoute);
    }
  }

  /**
   * Cancel a lookup operation
   */
  cancelLookup(): void {
    this.navigationEvents.next('lookup_cancelled');

    // Return to the previous route
    const returnRoute = this.getQueryParam('returnRoute');
    if (returnRoute) {
      this.router.navigateByUrl(returnRoute);
    }
  }

  /**
   * Get a query parameter from the current URL
   * @param param The parameter to get
   * @returns The parameter value, or undefined if not found
   */
  private getQueryParam(param: string): string | undefined {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param) || undefined;
  }

  /**
   * Check if there's a chain to execute and execute it
   * @param formId The ID of the form that was completed
   * @param result The result of the form
   */
  private async checkAndExecuteChain(formId: string, result: any): Promise<void> {
    try {
      // Check if there's an active chain
      if (this.navigationState.currentChain) {
        // Get the next link in the chain
        const nextLink = await this.csvFormChainService.getNextLink(
          this.navigationState.currentChain.chainId,
          this.navigationState.currentChain.currentLinkId
        );

        const conditionMet = this.csvFormChainService.isConditionMet(nextLink?.condition, result);

        if (nextLink) {
          // Update the chain data
          // Pass form reference if this is a FORM action to enable field label mapping
          const formReference = nextLink.actionType === 'FORM' ? nextLink.reference : undefined;
          this.navigationState.currentChain.data = {
            ...this.navigationState.currentChain.data,
            ...this.csvFormChainService.extractOutputParameters(nextLink.outputParameters, result, formReference)
          };

          // Execute the next link
          await this.executeChainLink(nextLink);
        } else {
          // Chain is complete or condition not met
          console.log('Clearing chain state - no next link or condition not met');
          this.navigationState.currentChain = undefined;
        }
      } else {
        // Dynamically discover chains from CSV - no hardcoding!
        // Get all available chains and check if any start with this form
        console.log(`[${this.instanceId}] Looking for chains that start with form: ${formId}`);
        
        // Load all chains and get their IDs
        await this.csvFormChainService.ensureChainsLoaded();
        const allChainIds = await this.csvFormChainService.getAllChainIds();
        
        // Check each chain to see if it starts with this form
        for (const chainId of allChainIds) {
          // Get the chain
          const links = await this.csvFormChainService.getFormChain(chainId);
          
          // Check if the chain has at least one link
          if (links.length > 0) {
            // Check if the first link is a FORM action with the specified reference
            const firstLink = links[0];
            
            if (firstLink.actionType === 'FORM' && firstLink.reference === formId) {
              console.log(`[${this.instanceId}] Found chain ${chainId} starting with form ${formId}`);
              console.log(`[${this.instanceId}] Form result:`, result);
              console.log(`[${this.instanceId}] Chain links:`, links);
              
              // Check if this is a document creation form that returns an ID
              // We need to ensure the API response is fully received before proceeding
              // Look for common ID fields in the result
              const idFields = ['newDocId', 'documentId', 'id', 'fileId'];
              const foundIdField = idFields.find(field => result && result[field]);
              
              if (foundIdField) {
                  console.log(`[${this.instanceId}] Found ID field in result: ${foundIdField}=${result[foundIdField]}`);
                
                // Start the chain
                // Extract output parameters from the first link
                // Pass form reference if this is a FORM action to enable field label mapping
                const formReference = firstLink.actionType === 'FORM' ? firstLink.reference : undefined;
                const extractedParams = this.csvFormChainService.extractOutputParameters(firstLink.outputParameters, result, formReference);
                
                this.navigationState.currentChain = {
                  chainId: chainId,
                  currentLinkId: 1, // Start with the second link (index 1)
                  data: { ...result, ...extractedParams }
                };
                console.log(`[${this.instanceId}] Chain state set with ID detection:`, this.navigationState.currentChain);

                // Get the second link in the chain
                if (links.length > 1) {
                  const secondLink = links[1];
                  console.log(`[${this.instanceId}] Executing second link:`, secondLink);
                  await this.executeChainLink(secondLink);
                }
              } else {
                console.log(`[${this.instanceId}] No ID field found, setting up chain for dialog completion`);
                
                // For forms that don't immediately return IDs (like CUSTOM forms)
                // Start the chain and let the completion mechanism handle continuation
                
                this.navigationState.currentChain = {
                  chainId: chainId,
                  currentLinkId: 1, // Start with the second link (index 1)
                  data: { ...result } // Just store the current result without trying to extract parameters yet
                };
                console.log(`[${this.instanceId}] Chain state set for completion handling:`, this.navigationState.currentChain);
                
                // Check if the second link is a CUSTOM action - if so, execute it
                if (links.length > 1) {
                  const secondLink = links[1];
                  console.log(`[${this.instanceId}] Second link details:`, secondLink);
                  
                  if (secondLink.actionType === 'CUSTOM') {
                    console.log(`[${this.instanceId}] Second link is CUSTOM, executing now`);
                    await this.executeChainLink(secondLink);
                  } else {
                    console.log(`[${this.instanceId}] Second link is ${secondLink.actionType}, waiting for completion signal`);
                    // The dialog completion service will trigger continueChainAfterDialog when the dialog is closed
                  }
                }
              }
              
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error executing form chain:', error);
      // Reset chain state on error
      console.log('Clearing chain state due to error:', error);
      this.navigationState.currentChain = undefined;
    }
  }

  /**
   * Execute a chain link
   * @param link The chain link to execute
   */
  private executeChainLink(link: CsvFormChainLink): Promise<void> {
    if (!this.navigationState.currentChain) return Promise.resolve();

    // Update the current link ID
    this.navigationState.currentChain.currentLinkId = link.linkId;

    // Map input parameters
    console.log(`🔍 Executing chain link ${link.linkId} of type ${link.actionType} with reference ${link.reference}`);
    console.log(`🔍 Input parameters mapping: "${link.inputParameters}"`);
    console.log(`🔍 Chain data before mapping:`, this.navigationState.currentChain.data);
    
    const params = this.csvFormChainService.mapInputParameters(
      link.inputParameters,
      this.navigationState.currentChain.data
    );
    
    console.log(`🔍 Mapped parameters result:`, params);

    return new Promise<void>((resolve) => {
      // Execute the link based on action type
      if (link.actionType === 'FORM') {
        // Check if this is a CUSTOM form - if so, navigate directly instead of opening dialog
        const formDefinition = this.csvFormService.getForm(link.reference);
        
        if (formDefinition && formDefinition.formType === 'CUSTOM') {
          console.log(`Chain link is CUSTOM form, navigating directly to: ${formDefinition.reference}`);
          
          // Navigate directly to the custom route
          if (formDefinition.reference) {
            // Convert params to query params for navigation
            const navigationParams: Record<string, string> = {};
            Object.keys(params).forEach(key => {
              if (params[key] !== undefined && params[key] !== null) {
                navigationParams[key] = String(params[key]);
              }
            });
            
            this.router.navigate([`/${formDefinition.reference}`], { queryParams: navigationParams });
          }
          
          // For CUSTOM forms, we can't wait for a dialog result, so we resolve immediately
          // The custom view will handle chain continuation through its own mechanisms
          resolve();
        } else {
          // For non-CUSTOM forms, open dialog as usual
          // For forms in chains, we need to set isInChain to true
          // Modify the params to include a special flag that indicates this form is part of a chain
          params['_isInChain'] = true;
          
          this.openForm(link.reference, params, false).subscribe(async result => {
          if (result) {
            // Update the chain data
            // Pass form reference for FORM actions to enable field label mapping
            const formReference = link.actionType === 'FORM' ? link.reference : undefined;
            this.navigationState.currentChain!.data = {
              ...this.navigationState.currentChain!.data,
              ...this.csvFormChainService.extractOutputParameters(link.outputParameters, result, formReference)
            };

            try {
              // Check for next link
              const nextLink = await this.csvFormChainService.getNextLink(
                this.navigationState.currentChain!.chainId,
                this.navigationState.currentChain!.currentLinkId
              );

              if (nextLink && this.csvFormChainService.isConditionMet(nextLink.condition, result)) {
                // Execute the next link
                await this.executeChainLink(nextLink);
              } else {
                // Chain is complete or condition not met
                console.log('Clearing chain state - complete or condition not met');
                this.navigationState.currentChain = undefined;
              }
            } catch (error) {
              console.error('Error getting next chain link:', error);
              this.navigationState.currentChain = undefined;
            }
          } else {
            // Chain was cancelled
            console.log('Clearing chain state - chain cancelled');
            this.navigationState.currentChain = undefined;
          }
            resolve();
          });
        }
      } else if (link.actionType === 'READ') {
        // Get the route configuration to determine the proper URL
        this.readRouteConfigService.getRouteConfig(link.reference).subscribe(routeConfig => {
          // Add chain information to query parameters if a chain is active
          // Start with a copy of the mapped parameters
          const chainParams = { ...params };
          
          if (this.navigationState.currentChain) {
            // Include chain metadata
            chainParams['isChain'] = 'true';
            chainParams['chainId'] = this.navigationState.currentChain.chainId;
            chainParams['linkId'] = String(this.navigationState.currentChain.currentLinkId);
            
            // Include chain data in the query parameters, but don't overwrite mapped parameters
            // This ensures that data is passed to the next step while respecting parameter mappings
            if (this.navigationState.currentChain.data) {
              Object.keys(this.navigationState.currentChain.data).forEach(key => {
                // Only add chain data if it's not already in the params (from mapping)
                // and if it's not undefined
                if (this.navigationState.currentChain!.data[key] !== undefined &&
                    chainParams[key] === undefined) {
                  chainParams[key] = this.navigationState.currentChain!.data[key];
                }
              });
            }
          }

          if (routeConfig) {
            // Use the route configuration to navigate
            const url = routeConfig.routeUrl;
            this.router.navigate(['/reading', url], { queryParams: chainParams });
          } else {
            // Fallback to direct navigation if route config not found
            console.warn(`Route configuration not found for ${link.reference}, using direct navigation`);
            this.router.navigate(['/reading', link.reference], { queryParams: chainParams });
          }
          // Chain continues when the user returns to the form
          // This is handled by the table component
          resolve();
        });
      } else if (link.actionType === 'DUC') {
        // Handle DUC action type
        this.ducRouteConfigService.getRouteConfig(link.reference).subscribe(routeConfig => {
          if (!routeConfig) {
            console.warn(`DUC route configuration not found for ${link.reference}`);
            resolve();
            return;
          }
          
          // Add chain information to query parameters if a chain is active
          // Start with a copy of the mapped parameters
          const chainParams = { ...params };
          
          if (this.navigationState.currentChain) {
            // Include chain metadata
            chainParams['isChain'] = 'true';
            chainParams['chainId'] = this.navigationState.currentChain.chainId;
            chainParams['linkId'] = String(this.navigationState.currentChain.currentLinkId);
            
            // Include chain data in the query parameters, but don't overwrite mapped parameters
            // This ensures that data is passed to the next step while respecting parameter mappings
            if (this.navigationState.currentChain.data) {
              Object.keys(this.navigationState.currentChain.data).forEach(key => {
                // Only add chain data if it's not already in the params (from mapping)
                // and if it's not undefined
                if (this.navigationState.currentChain!.data[key] !== undefined &&
                    chainParams[key] === undefined) {
                  chainParams[key] = this.navigationState.currentChain!.data[key];
                }
              });
            }
            
            // Log the chain data for debugging
            console.log('Chain data for DUC route:', this.navigationState.currentChain.data);
            console.log('Mapped parameters for DUC route:', chainParams);
            
            console.log('Handling DUC route in chain');
            
            this.router.navigate(['/'], { skipLocationChange: true }).then(() => {
              console.log(`Navigating to DUC route: /${routeConfig.routeUrl} with params:`, chainParams);
              this.router.navigate(['/' + routeConfig.routeUrl], { queryParams: chainParams });
              resolve();
            });
            
          } else {
            // For regular DUC routes (not in chains), use navigation
            const url = routeConfig.routeUrl;
            console.log(`Navigating to DUC route: /${url} with params:`, chainParams);
            this.router.navigate(['/' + url], { queryParams: chainParams });
            resolve();
          }
        });
      } else if (link.actionType === 'CUSTOM') {
        // Handle CUSTOM action type - lookup in custom-views.csv
        console.log(`Handling CUSTOM view: ${link.reference}`);
        
        this.customViewConfigService.getViewConfig(link.reference).subscribe(viewConfig => {
          if (!viewConfig) {
            console.warn(`Custom view configuration not found for ${link.reference}`);
            resolve();
            return;
          }
          
          // Add chain information to query parameters if a chain is active
          const chainParams = { ...params };
          
          if (this.navigationState.currentChain) {
            // Include chain metadata
            chainParams['isChain'] = 'true';
            chainParams['chainId'] = this.navigationState.currentChain.chainId;
            chainParams['linkId'] = String(this.navigationState.currentChain.currentLinkId);
            
            // Include chain data in the query parameters
            if (this.navigationState.currentChain.data) {
              Object.keys(this.navigationState.currentChain.data).forEach(key => {
                if (this.navigationState.currentChain!.data[key] !== undefined &&
                    chainParams[key] === undefined) {
                  chainParams[key] = this.navigationState.currentChain!.data[key];
                }
              });
            }
          }
          
          // Navigate to the RouteUrl from the custom view config using context-aware routing
          const url = viewConfig.routeUrl;
          console.log(`Navigating to custom view URL: ${url} with params:`, chainParams);
          
          // Build URL with query parameters
          const queryString = new URLSearchParams();
          Object.keys(chainParams).forEach(key => {
            if (chainParams[key] !== undefined && chainParams[key] !== null) {
              queryString.set(key, String(chainParams[key]));
            }
          });
          const fullUrl = queryString.toString() ? `${url}?${queryString.toString()}` : url;
          
          // Use context-aware routing for CUSTOM action
          this.contextAwareRouting.navigateWithContext({
            actionType: 'CUSTOM',
            routeUrl: fullUrl,
            reference: link.reference
          });
          
          // Don't reset chain state for CUSTOM actions - let the custom view handle continuation
          // The chain will be cleared when it completes or if an error occurs
          console.log('CUSTOM action navigated, preserving chain state for potential continuation');
          resolve();
        });
      } else {
        // Unknown action type
        console.error(`Unknown chain link action type: ${link.actionType}`);
        console.log('Clearing chain state - unknown action type');
        this.navigationState.currentChain = undefined;
        resolve();
      }
    });
  }

  /**
   * Get the current navigation state
   * @returns The current navigation state
   */
  getNavigationState(): FormNavigationState {
    return this.navigationState;
  }

  /**
   * Reset the navigation state
   */
  resetNavigationState(): void {
    console.log(`[${this.instanceId}] Explicitly resetting navigation state`);
    this.navigationState = {
      formStack: [],
      currentData: {}
    };
  }

  /**
   * Continue a chain after a dialog has been closed
   * This is called by the DialogCompletionService when a dialog is closed
   * @param chainId The ID of the chain
   * @param linkId The ID of the link in the chain
   * @param result The result to pass to the next link in the chain
   */
  private continueChainAfterDialog(chainId: string, linkId: number, result: any): void {
    console.log(`Continuing chain ${chainId} after dialog closed for link ${linkId}`);
    console.log('Current navigation state:', this.navigationState);
    
    // Only continue if this is the current chain
    if (this.navigationState.currentChain?.chainId === chainId) {
      
      // Get the chain to extract output parameters
      this.csvFormChainService.getFormChain(chainId).then(links => {
        if (links.length > 0) {
          // Find the current link
          const currentLink = links.find(link => link.linkId === linkId);
          
          if (currentLink) {
            console.log('Found current link in chain:', currentLink);
            
            // Extract output parameters from the current link
            // Pass form reference if this is a FORM action to enable field label mapping
            const formReference = currentLink.actionType === 'FORM' ? currentLink.reference : undefined;
            const extractedParams = this.csvFormChainService.extractOutputParameters(
              currentLink.outputParameters,
              result,
              formReference
            );
            
            // Update chain data with result and extracted parameters
            if (this.navigationState.currentChain) {
              this.navigationState.currentChain.data = {
                ...this.navigationState.currentChain.data,
                ...result,
                ...extractedParams
              };
              
            }
            
            // Get the next link and continue the chain
            this.csvFormChainService.getNextLink(chainId, linkId).then(nextLink => {
              if (nextLink) {
                console.log(`Found next link ${nextLink.linkId}, executing`);
                this.executeChainLink(nextLink);
              } else {
                console.log('No next link found, chain is complete');
                // Chain is complete - check if we need to navigate back to the original table
                this.handleChainCompletion();
              }
            }).catch(error => {
              console.error('Error getting next chain link:', error);
              // On error, also try to navigate back
              this.handleChainCompletion();
            });
          } else {
            console.error(`Link ${linkId} not found in chain ${chainId}`);
            // If link not found, try to navigate back
            this.handleChainCompletion();
          }
        } else {
          console.error(`Chain ${chainId} has no links`);
          // If no links, try to navigate back
          this.handleChainCompletion();
        }
      }).catch(error => {
        console.error('Error getting form chain:', error);
        // On error, try to navigate back
        this.handleChainCompletion();
      });
    } else {
      console.log('Chain state does not match, not continuing chain');
      // If chain state doesn't match, still try to handle completion
      this.handleChainCompletion();
    }
  }
  
  /**
   * Handle chain completion - navigate back to original table if needed
   */
  public handleChainCompletion(): void {
    console.log('Handling chain completion');
    
    // Clear chain state
    if (this.navigationState.currentChain) {
      console.log('Clearing completed chain state');
      this.navigationState.currentChain = undefined;
    }
    
    // Check if there's a return route stored (for table refresh after context menu actions)
    const returnRoute = this.getStoredReturnRoute();
    if (returnRoute) {
      console.log(`Navigating back to original table: ${returnRoute}`);
      // Clear the stored return route
      this.clearStoredReturnRoute();
      // Navigate back to refresh the table
      window.location.href = returnRoute;
    } else {
      console.log('No return route stored, staying on current page');
    }
  }
  
  /**
   * Store the current route as a return route for later navigation
   * This should be called before performing context menu actions
   */
  public storeReturnRoute(): void {
    const currentRoute = window.location.pathname + window.location.search;
    // Strip any existing returnRoute parameter to prevent recursion
    const cleanRoute = this.stripReturnRoute(currentRoute);
    localStorage.setItem('elyseReturnRoute', cleanRoute);
    console.log(`Stored return route: ${cleanRoute}`);
  }
  
  /**
   * Get the stored return route
   */
  private getStoredReturnRoute(): string | null {
    return localStorage.getItem('elyseReturnRoute');
  }
  
  /**
   * Clear the stored return route
   */
  private clearStoredReturnRoute(): void {
    localStorage.removeItem('elyseReturnRoute');
  }

  /**
   * Handle upload completion from custom views
   * This allows custom views to trigger chain continuation after successful uploads
   * @param uploadData The data from successful file uploads
   */
  public handleUploadCompletion(uploadData: any): void {
    console.log(`[${this.instanceId}] CsvFormNavigationService: Handling upload completion`, uploadData);
    console.log(`[${this.instanceId}] CsvFormNavigationService: Current navigation state:`, this.navigationState);
    
    // Check if we have an active chain
    if (!this.navigationState.currentChain) {
      console.log(`[${this.instanceId}] CsvFormNavigationService: No active chain, ignoring upload completion`);
      return;
    }

    console.log('CsvFormNavigationService: Active chain found, continuing chain', this.navigationState.currentChain);
    
    // Update chain data with upload results
    this.navigationState.currentChain.data = {
      ...this.navigationState.currentChain.data,
      ...uploadData
    };

    // Get the next link in the current chain
    this.csvFormChainService.getNextLink(
      this.navigationState.currentChain.chainId,
      this.navigationState.currentChain.currentLinkId
    ).then(nextLink => {
      if (nextLink && this.csvFormChainService.isConditionMet(nextLink.condition, uploadData)) {
        console.log('CsvFormNavigationService: Executing next chain link', nextLink);
        this.executeChainLink(nextLink);
      } else {
        console.log('CsvFormNavigationService: No valid next link found, chain complete');
        console.log('Clearing chain state - upload completion chain complete');
        this.navigationState.currentChain = undefined;
      }
    }).catch(error => {
      console.error('CsvFormNavigationService: Error getting next chain link:', error);
      console.log('Clearing chain state - error in upload completion');
      this.navigationState.currentChain = undefined;
    });
  }

  /**
   * Strip returnRoute parameter from a URL to prevent recursive nesting
   * @param url The URL to clean
   * @returns The URL without returnRoute parameter
   */
  private stripReturnRoute(url: string): string {
    // Split URL into path and query string
    const urlParts = url.split('?');
    if (urlParts.length < 2) {
      // No query string, return as-is
      return url;
    }

    const path = urlParts[0];
    const queryString = urlParts[1];

    // Parse query parameters
    const params = new URLSearchParams(queryString);
    
    // Remove returnRoute parameter if it exists
    params.delete('returnRoute');

    // Reconstruct URL
    const newQueryString = params.toString();
    return newQueryString ? `${path}?${newQueryString}` : path;
  }

}

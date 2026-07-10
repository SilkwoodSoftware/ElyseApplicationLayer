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
import { Router } from '@angular/router';
import { CsvFormDialogService } from './csv-form-dialog.service';
import { CsvFormNavigationService } from './csv-form-navigation.service';
import { CsvFormChainService } from './csv-form-chain.service';
import { CsvFormService } from './csv-form.service';
import { ApplicationMessageService } from './application-message.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Service for integrating CSV forms with the menu system
 * This is completely independent of the existing form functionality
 */
@Injectable({
  providedIn: 'root'
})
export class CsvFormMenuIntegrationService {
  constructor(
    private router: Router,
    private csvFormDialogService: CsvFormDialogService,
    private csvFormNavigationService: CsvFormNavigationService,
    private csvFormChainService: CsvFormChainService,
    private csvFormService: CsvFormService,
    private applicationMessageService: ApplicationMessageService
  ) {}

  /**
   * Handle a main menu item action
   * @param actionType The type of action (FORM, CHAIN)
   * @param reference The reference to the form or chain
   * @param params Optional parameters to pass to the form
   * @returns An Observable that resolves to the result of the action
   */
  handleMainMenuAction(actionType: string, reference: string, params: Record<string, any> = {}): Observable<any> {
    if (actionType === 'FORM') {
      return this.openForm(reference, params);
    } else if (actionType === 'CHAIN') {
      // Convert the Promise-based executeChain to an Observable
      return new Observable<any>(observer => {
        this.executeChain(reference, params)
          .then(result => {
            observer.next(result);
            observer.complete();
          })
          .catch(error => {
            console.error('Error executing chain:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            observer.next(this.applicationMessageService.createFormError(`Error executing chain: ${errorMessage}`));
            observer.complete();
          });
      });
    }
    
    return of(this.applicationMessageService.createFormError(`Unsupported action type: ${actionType}`));
  }

  /**
   * Handle a context menu item action
   * @param actionType The type of action (FORM, CHAIN)
   * @param reference The reference to the form or chain
   * @param selectedRow The selected row data
   * @param params Optional additional parameters to pass to the form
   * @returns An Observable that resolves to the result of the action
   */
  handleContextMenuAction(actionType: string, reference: string, selectedRow: any, params: Record<string, any> = {}): Observable<any> {
    // Combine the selected row data with any additional params
    const combinedParams = { ...selectedRow, ...params };
    
    if (actionType === 'FORM') {
      return this.openForm(reference, combinedParams);
    } else if (actionType === 'CHAIN') {
      // Convert the Promise-based executeChain to an Observable
      return new Observable<any>(observer => {
        this.executeChain(reference, combinedParams)
          .then(result => {
            observer.next(result);
            observer.complete();
          })
          .catch(error => {
            console.error('Error executing chain:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            observer.next(this.applicationMessageService.createFormError(`Error executing chain: ${errorMessage}`));
            observer.complete();
          });
      });
    }
    
    return of(this.applicationMessageService.createFormError(`Unsupported action type: ${actionType}`));
  }

  /**
   * Open a form
   * @param formId The ID of the form to open
   * @param params Parameters to pass to the form
   * @returns An Observable that resolves to the form result
   */
  private openForm(formId: string, params: Record<string, any> = {}): Observable<any> {
    // Use the router to navigate to the form
    const queryParams: Record<string, string> = {};
    
    // Convert params to string values for query params
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams[key] = String(params[key]);
        }
      });
    }
    
    // Navigate to the form
    this.router.navigate(['/csv-form/form', formId], { queryParams });
    
    // Return an observable that will be completed when the form is submitted
    // This is a placeholder since we can't easily get the result when using router navigation
    return of(this.applicationMessageService.createInfo('Form opened in new page'));
  }

  /**
   * Execute a form chain
   * @param chainId The ID of the chain to execute
   * @param params Parameters to pass to the first form in the chain
   * @returns An Observable that resolves to the result of the chain
   */
  private async executeChain(chainId: string, params: Record<string, any> = {}): Promise<any> {
    try {
      // Check if chain exists
      const hasChain = await this.csvFormChainService.hasChain(chainId);
      if (!hasChain) {
        return this.applicationMessageService.createFormError(`Chain not found: ${chainId}`);
      }
      
      // Get first link
      const firstLink = await this.csvFormChainService.getFirstLink(chainId);
      if (!firstLink) {
        return this.applicationMessageService.createFormError(`Chain is empty: ${chainId}`);
      }
      
      // Map input parameters for the first link
      const mappedParams = this.csvFormChainService.mapInputParameters(firstLink.inputParameters, params);
      
      // Use the CsvFormNavigationService to execute the entire chain
      if (firstLink.actionType === 'FORM') {
        // For FORM action type, set up the chain state first, then use the openForm method
        const navigationState = this.csvFormNavigationService.getNavigationState();
        navigationState.currentChain = {
          chainId,
          currentLinkId: firstLink.linkId,
          data: params
        };
        
        return new Promise<any>((resolve, reject) => {
          this.csvFormNavigationService.openForm(firstLink.reference, mappedParams, false)
            .subscribe(
              async result => {
                if (result) {
                  // Extract output parameters from the first link
                  const formReference = firstLink.actionType === 'FORM' ? firstLink.reference : undefined;
                  const extractedParams = this.csvFormChainService.extractOutputParameters(
                    firstLink.outputParameters,
                    result,
                    formReference
                  );
                  
                  // Get the navigation state AGAIN after openForm, in case it was recreated
                  const currentNavigationState = this.csvFormNavigationService.getNavigationState();
                  
                  // Update chain data
                  if (currentNavigationState.currentChain) {
                    currentNavigationState.currentChain.data = {
                      ...currentNavigationState.currentChain.data,
                      ...extractedParams
                    };
                    
                    // Get the next link
                    const nextLink = await this.csvFormChainService.getNextLink(chainId, firstLink.linkId);
                    
                    if (nextLink && this.csvFormChainService.isConditionMet(nextLink.condition, result)) {
                      // Continue the chain by executing the next link
                      await this.csvFormNavigationService['executeChainLink'](nextLink);
                    } else {
                      navigationState.currentChain = undefined;
                    }
                  }
                }
                
                resolve(result);
              },
              error => {
                reject(error);
              }
            );
        });
      } else if (firstLink.actionType === 'DUC') {
        // For DUC action type, use the executeChainLink method of CsvFormNavigationService
        // First, set up the navigation state with the chain data
        const navigationState = this.csvFormNavigationService.getNavigationState();
        navigationState.currentChain = {
          chainId,
          currentLinkId: firstLink.linkId,
          data: params
        };
        
        // Then execute the chain link
        await this.csvFormNavigationService['executeChainLink'](firstLink);
        
        return this.applicationMessageService.createInfo('Chain execution started');
      } else if (firstLink.actionType === 'READ') {
        // For READ action type, use the executeChainLink method of CsvFormNavigationService
        // First, set up the navigation state with the chain data
        const navigationState = this.csvFormNavigationService.getNavigationState();
        navigationState.currentChain = {
          chainId,
          currentLinkId: firstLink.linkId,
          data: params
        };
        
        // Then execute the chain link
        await this.csvFormNavigationService['executeChainLink'](firstLink);
        
        return this.applicationMessageService.createInfo('Chain execution started');
      } else {
        return this.applicationMessageService.createFormError(`Unsupported action type for first link: ${firstLink.actionType}`);
      }
    } catch (error) {
      console.error('Error executing chain:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.applicationMessageService.createFormError(`Error executing chain: ${errorMessage}`);
    }
  }
}

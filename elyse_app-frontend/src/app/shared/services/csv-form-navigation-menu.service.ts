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
import { CsvFormService } from './csv-form.service';

/**
 * Service for integrating CSV forms with the navigation menu
 * This is completely independent of the existing form functionality
 */
@Injectable({
  providedIn: 'root'
})
export class CsvFormNavigationMenuService {
  constructor(
    private router: Router,
    private csvFormService: CsvFormService
  ) {}

  /**
   * Handle a navigation menu item action
   * @param actionType The type of action (FORM, CHAIN)
   * @param reference The reference to the form or chain
   * @param params Optional parameters to pass to the form
   */
  handleNavigationMenuAction(actionType: string, reference: string, params: Record<string, any> = {}): void {
    if (actionType === 'FORM') {
      this.navigateToForm(reference, params);
    } else if (actionType === 'CHAIN') {
      this.navigateToChain(reference, params);
    } else {
      console.error(`Unsupported action type: ${actionType}`);
    }
  }

  /**
   * Navigate to a form
   * @param formId The ID of the form to navigate to
   * @param params Parameters to pass to the form
   */
  private navigateToForm(formId: string, params: Record<string, any> = {}): void {
    // Check if the form exists
    const formDefinition = this.csvFormService.getForm(formId);
    if (!formDefinition) {
      console.error(`Form not found: ${formId}`);
      return;
    }

    // Convert params to string values for query params
    const queryParams: Record<string, string> = {};
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams[key] = String(params[key]);
        }
      });
    }

    // Navigate to the form
    this.router.navigate(['/csv-form/form', formId], { queryParams });
  }

  /**
   * Navigate to a chain
   * @param chainId The ID of the chain to navigate to
   * @param params Parameters to pass to the chain
   */
  private navigateToChain(chainId: string, params: Record<string, any> = {}): void {
    // For now, just navigate to the first form in the chain
    // In the future, this could be enhanced to handle chains more intelligently
    this.navigateToForm(chainId, params);
  }
}

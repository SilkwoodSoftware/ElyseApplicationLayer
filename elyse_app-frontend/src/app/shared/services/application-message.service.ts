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
import { LayeredResponse, ApplicationMessage } from '../interfaces/layered-response.interface';

/**
 * Service for creating and managing application layer messages
 * 
 * This service helps create properly formatted application messages that are
 * completely separate from database messaging (transactionStatus/transactionMessage)
 */
@Injectable({
  providedIn: 'root'
})
export class ApplicationMessageService {

  /**
   * Create a validation error message
   */
  createValidationError(message: string): Partial<LayeredResponse> {
    return {
      appErrors: [message]
    };
  }

  /**
   * Create a routing error message
   */
  createRouteError(message: string): Partial<LayeredResponse> {
    return {
      appErrors: [`Route Error: ${message}`]
    };
  }

  /**
   * Create a form error message
   */
  createFormError(message: string): Partial<LayeredResponse> {
    return {
      appErrors: [`Form Error: ${message}`]
    };
  }

  /**
   * Create a configuration error message
   */
  createConfigError(message: string): Partial<LayeredResponse> {
    return {
      appErrors: [`Configuration Error: ${message}`]
    };
  }

  /**
   * Create a warning message
   */
  createWarning(message: string): Partial<LayeredResponse> {
    return {
      appWarnings: [message]
    };
  }

  /**
   * Create an info message
   */
  createInfo(message: string): Partial<LayeredResponse> {
    return {
      appInfo: [message]
    };
  }

  /**
   * Create a system error message
   */
  createSystemError(message: string, httpStatus?: number): Partial<LayeredResponse> {
    const systemMessage = httpStatus ? `${message} (HTTP ${httpStatus})` : message;
    return {
      systemErrors: [systemMessage]
    };
  }

  /**
   * Create network error message
   */
  createNetworkError(): Partial<LayeredResponse> {
    return {
      systemErrors: ['Network connection error. ']
    };
  }

  /**
   * Create server error message
   */
  createServerError(): Partial<LayeredResponse> {
    return {
      systemErrors: ['Application layer application server error occurred.']
    };
  }

  /**
   * Convert HTTP error to appropriate system message
   */
  createFromHttpError(error: any): Partial<LayeredResponse> {
    if (error.status === 0) {
      return this.createNetworkError();
    } else if (error.status >= 500) {
      return this.createServerError();
    } else if (error.status === 404) {
      return this.createSystemError('Resource not found', error.status);
    } else if (error.status === 403) {
      return this.createSystemError('Access denied', error.status);
    } else if (error.status === 401) {
      return this.createSystemError('Authentication required', error.status);
    } else {
      return this.createSystemError(
        error.error?.message || error.message || 'An unexpected error occurred',
        error.status
      );
    }
  }

  /**
   * Merge multiple LayeredResponse objects
   */
  mergeResponses(...responses: Partial<LayeredResponse>[]): Partial<LayeredResponse> {
    const merged: Partial<LayeredResponse> = {
      appErrors: [],
      appWarnings: [],
      appInfo: [],
      systemErrors: []
    };

    responses.forEach(response => {
      if (response.appErrors) merged.appErrors!.push(...response.appErrors);
      if (response.appWarnings) merged.appWarnings!.push(...response.appWarnings);
      if (response.appInfo) merged.appInfo!.push(...response.appInfo);
      if (response.systemErrors) merged.systemErrors!.push(...response.systemErrors);
      
      // Preserve database parameters
      // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
      if (response.transactionStatus) merged.transactionStatus = response.transactionStatus;
      if (response.transactionMessage) merged.transactionMessage = response.transactionMessage;
      
      // Preserve other properties
      Object.keys(response).forEach(key => {
        if (!['appErrors', 'appWarnings', 'appInfo', 'systemErrors', 'transactionStatus', 'transactionMessage'].includes(key)) {
          merged[key] = response[key];
        }
      });
    });

    return merged;
  }
}

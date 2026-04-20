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

/**
 * Interface for responses that separate database messages from application messages
 * 
 * This interface ensures strict separation between:
 * - Database layer messages (handled by MessageLabelService)
 * - Application layer messages (handled by separate display system)
 */
export interface LayeredResponse {
  // DATABASE LAYER - RESERVED FOR DATABASE RESPONSES ONLY
  // These are displayed by the existing MessageLabelService system
  
  // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
  transactionStatus?: string;      // From database only - never set by frontend
  transactionMessage?: string;     // From database only - never set by frontend
  
  // APPLICATION LAYER - FRONTEND VALIDATION/ROUTING/BUSINESS LOGIC MESSAGES
  // These are displayed by the new ApplicationMessageDisplayComponent
  appErrors?: string[];           // Frontend validation errors, routing errors, etc.
  appWarnings?: string[];         // Frontend warnings
  appInfo?: string[];            // Frontend informational messages
  
  // SYSTEM LAYER - INFRASTRUCTURE/HTTP/NETWORK ISSUES
  systemErrors?: string[];       // Network errors, HTTP errors, service unavailable, etc.
  
  // DATA PAYLOAD
  [key: string]: any;
}

/**
 * Helper interface for individual application messages
 */
export interface ApplicationMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  timestamp?: Date;
}

/**
 * Helper interface for system messages
 */
export interface SystemMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
  httpStatus?: number;
  timestamp?: Date;
}

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

import { BaseRouteConfig } from './route-base.interface';

/**
 * Interface for field mapping configuration
 * Used to map fields between different parts of the application
 */
export interface FieldMapping {
    /** Source field name */
    source: string;
    /** Target field name */
    target: string;
    /** Optional condition for when this mapping should be applied */
    condition?: string;
    /** Optional description of what this mapping does */
    description?: string;
}

export interface DucRouteConfig extends BaseRouteConfig {
    // DUC routes don't need table configuration like READ routes
    // They are used for Data Update/Create operations
    storedProcedure: string;
    description?: string;
    routeId: string; // Added to store the RouteId from duc-routes.csv
    // New fields for generic text
    entityDisplayName?: string;
    confirmationMessage?: string;
    resultsTitle?: string;
    idColumnName?: string;
    
    // Field mappings for chain navigation
    // These define how fields should be mapped between different parts of the application
    fieldMappings?: FieldMapping[];
    
    // Chain configuration
    defaultChainId?: string; // Default chain ID to use if not specified
    defaultLinkId?: number;  // Default link ID to use if not specified
    
    // Trigger field that indicates this route should be part of a chain
    chainTriggerField?: string; // Field that triggers chain navigation
    
    // Error handling configuration
    defaultErrorStatus?: string; // Default status to use for error responses in chains
    defaultErrorMessage?: string; // Default message to use for error responses in chains
    
    // Common chain parameters to include in requests
    commonChainParameters?: string[]; // Parameters to include in chain requests
}

export interface DucRouteData {
    [key: string]: any;
}

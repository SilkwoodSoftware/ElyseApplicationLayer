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
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CsvFormService } from './csv-form.service';

/**
 * Interface for CSV form chain
 * Represents a chain link loaded from form-chains.csv
 */
export interface CsvFormChainLink {
  /** Chain ID this link belongs to */
  chainId: string;
  /** Link ID (sequence number) */
  linkId: number;
  /** Type of action (READ, FORM) */
  actionType: string;
  /** Reference to a form or table */
  reference: string;
  /** Optional condition for chaining */
  condition?: string;
  /** Input parameters mapping */
  inputParameters?: string;
  /** Output parameters to store */
  outputParameters?: string;
  /** Chain type (AUTO, DIALOG_CLOSE) */
  chainType: string;
}

/**
 * Service for handling CSV form chains
 * This is completely independent of the existing form functionality
 */
@Injectable({
  providedIn: 'root'
})
export class CsvFormChainService {
  /** Map of form chains indexed by chain ID */
  private formChains = new Map<string, CsvFormChainLink[]>();
  
  /** Flag to track if chains have been loaded */
  private chainsLoaded = false;
  
  /** Flag to track if chains are currently being loaded */
  private chainsLoading = false;

  constructor(
    private http: HttpClient,
    private csvFormService: CsvFormService
  ) {
    // Don't load chains in constructor - will load on demand
  }

  /**
   * Load form chains from CSV file
   * @returns Promise that resolves when chains are loaded
   */
  private loadFormChains(): Promise<void> {
    // If chains are already loaded, return resolved promise
    if (this.chainsLoaded) {
      return Promise.resolve();
    }
    
    // If chains are currently being loaded, wait for them to finish
    if (this.chainsLoading) {
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (this.chainsLoaded) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    
    // Set loading flag
    this.chainsLoading = true;
    
    // Return promise that resolves when chains are loaded
    return new Promise((resolve, reject) => {
      this.http.get('/assets/form-chains.csv', { responseType: 'text' })
        .pipe(
          map(csv => this.parseFormChainsCsv(csv)),
          catchError(error => {
            console.error('Error loading form chains:', error);
            // Just return empty array instead of failing
            return of([]);
          })
        )
        .subscribe(chains => {
          // Group chains by chainId and sort by linkId
          chains.forEach(chain => {
            if (!this.formChains.has(chain.chainId)) {
              this.formChains.set(chain.chainId, []);
            }
            this.formChains.get(chain.chainId)!.push(chain);
          });
          
          // Sort each chain by linkId
          this.formChains.forEach(links => {
            links.sort((a, b) => a.linkId - b.linkId);
          });
          
          console.log('Loaded CSV form chains:', this.formChains);
          
          // Set loaded flag and clear loading flag
          this.chainsLoaded = true;
          this.chainsLoading = false;
          
          // Resolve the promise
          resolve();
        });
    });
  }

  /**
   * Get form chain links for a specific chain
   * @param chainId The ID of the chain to get links for
   * @returns An array of form chain links for the specified chain
   */
  /**
   * Get form chain links for a specific chain
   * @param chainId The ID of the chain to get links for
   * @returns An array of form chain links for the specified chain
   */
  async getFormChain(chainId: string): Promise<CsvFormChainLink[]> {
    await this.loadFormChains();
    return this.formChains.get(chainId) || [];
  }

  /**
   * Check if a chain exists
   * @param chainId The ID of the chain to check
   * @returns True if the chain exists, false otherwise
   */
  async hasChain(chainId: string): Promise<boolean> {
    await this.loadFormChains();
    return this.formChains.has(chainId);
  }

  /**
   * Get all chain IDs from the loaded form chains
   * @returns An array of all chain IDs
   */
  async getAllChainIds(): Promise<string[]> {
    await this.loadFormChains();
    return Array.from(this.formChains.keys());
  }

  /**
   * Public method to load form chains
   * @returns Promise that resolves when chains are loaded
   */
  async ensureChainsLoaded(): Promise<void> {
    return this.loadFormChains();
  }

  /**
   * Get the next link in a chain
   * @param chainId The ID of the chain
   * @param currentLinkId The current link ID
   * @returns The next link in the chain, or undefined if there is no next link
   */
  async getNextLink(chainId: string, currentLinkId: number): Promise<CsvFormChainLink | undefined> {
    await this.loadFormChains();
    const chain = this.formChains.get(chainId);
    if (!chain) return undefined;
    
    const currentIndex = chain.findIndex(link => link.linkId === currentLinkId);
    if (currentIndex === -1 || currentIndex === chain.length - 1) return undefined;
    
    return chain[currentIndex + 1];
  }

  /**
   * Get the first link in a chain
   * @param chainId The ID of the chain
   * @returns The first link in the chain, or undefined if the chain is empty
   */
  async getFirstLink(chainId: string): Promise<CsvFormChainLink | undefined> {
    await this.loadFormChains();
    const chain = this.formChains.get(chainId);
    if (!chain || chain.length === 0) return undefined;
    
    return chain[0];
  }

  /**
   * Check if a condition is met
   * @param condition The condition to check
   * @param data The data to check against
   * @returns True if the condition is met, false otherwise
   */
  /**
   * Check if a condition is met
   * @param condition The condition to check
   * @param data The data to check against
   * @returns True if the condition is met, false otherwise
   */
  isConditionMet(condition: string | undefined, data: any): boolean {
      // If no condition is specified, it's always met
      if (!condition) return true;
      
      // Parse the condition
      const [param, value] = condition.split('=');
      if (!param || value === undefined) return true;
      
      const trimmedParam = param.trim();
      const trimmedValue = value.trim();
      
      console.log(`Checking condition: ${trimmedParam} === ${trimmedValue}`);
      console.log(`Actual value: ${data[trimmedParam]}`);
      
      // Check if the parameter exists in the data
      if (data[trimmedParam] === undefined) {
          console.log(`Parameter ${trimmedParam} not found in data, condition not met`);
          return false;
      }
      
      // Convert both values to strings for comparison
      const dataValue = String(data[trimmedParam]);
      
      // Check if the condition is met
      const conditionMet = dataValue === trimmedValue;
      console.log(`Condition ${conditionMet ? 'met' : 'not met'}: ${dataValue} === ${trimmedValue}`);
      
      return conditionMet;
  }

  /**
   * Map input parameters
   * @param inputParameters The input parameters mapping
   * @param data The data to map from
   * @returns The mapped parameters
   */
  mapInputParameters(inputParameters: string | undefined, data: any): Record<string, any> {
    if (!inputParameters) return {};
    
    const result: Record<string, any> = {};
    const mappings = inputParameters.split(';');
    
    mappings.forEach(mapping => {
      const [from, to] = mapping.split(':');
      const fromParam = from ? from.trim() : '';
      
      // If 'from' exists in the data
      if (fromParam && data[fromParam] !== undefined) {
        // If 'to' is specified, use it as the destination parameter name
        // Otherwise, use 'from' as both source and destination
        const toParam = to ? to.trim() : fromParam;
        result[toParam] = data[fromParam];
      }
    });
    
    return result;
  }

  /**
   * Extract output parameters from data, using form field definitions to translate labels to parameter IDs
   * @param outputParameters The output parameters to extract (semicolon-separated parameter IDs)
   * @param data The data to extract from (may be keyed by field labels or parameter IDs)
   * @param formReference Optional form ID - if provided, enables translation from field labels to parameter IDs
   * @returns The extracted parameters keyed by parameter IDs
   */
  extractOutputParameters(outputParameters: string | undefined, data: any, formReference?: string): Record<string, any> {
    if (!outputParameters) return {};
    
    // First, translate data from field ID-keyed to parameterId-keyed if formReference is provided
    let normalizedData: Record<string, any> = { ...data };
    
    if (formReference) {
      const formFields = this.csvFormService.getFormFields(formReference);
      
      // Build field ID → parameterId mapping from form field definitions
      // The form result data is keyed by field.id (e.g., "DocIDByMenu"), not field.label
      formFields.forEach(field => {
        if (field.id && field.parameterId) {
          // If data has this field's ID, copy it to the parameter ID
          if (data[field.id] !== undefined) {
            normalizedData[field.parameterId] = data[field.id];
          }
        }
      });
    }
    
    // Now extract the requested output parameters from normalized data
    const result: Record<string, any> = {};
    const params = outputParameters.split(';');
    
    params.forEach(param => {
      const trimmedParam = param.trim();
      if (trimmedParam && normalizedData[trimmedParam] !== undefined) {
        result[trimmedParam] = normalizedData[trimmedParam];
      }
    });
    
    return result;
  }

  /**
   * Parse the form chains CSV into form chain link objects
   * @param csv The CSV string to parse
   * @returns An array of form chain link objects
   */
  private parseFormChainsCsv(csv: string): CsvFormChainLink[] {
    const chains: CsvFormChainLink[] = [];
    const lines = csv.split('\n');
    
    // Get header row to validate column positions
    if (lines.length < 2) {
      console.error('Form chains CSV file is empty or missing header row');
      return [];
    }
    
    const headerLine = lines[0].trim();
    const headers = this.parseCSVLine(headerLine);
    
    // Get column indices
    const chainIdIndex = headers.indexOf('ChainId');
    const linkIdIndex = headers.indexOf('LinkId');
    const actionTypeIndex = headers.indexOf('ActionType');
    const referenceIndex = headers.indexOf('Reference');
    const conditionIndex = headers.indexOf('Condition');
    const inputParametersIndex = headers.indexOf('InputParameters');
    const outputParametersIndex = headers.indexOf('OutputParameters');
    const chainTypeIndex = headers.indexOf('ChainType');
    
    // Validate required columns exist
    if (chainIdIndex === -1 || linkIdIndex === -1 || actionTypeIndex === -1 || 
        referenceIndex === -1 || chainTypeIndex === -1) {
      console.error('Form chains CSV is missing required columns');
      return [];
    }
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = this.parseCSVLine(line);
      
      // Skip lines with insufficient values
      if (values.length <= Math.max(chainIdIndex, linkIdIndex, actionTypeIndex, 
                                   referenceIndex, chainTypeIndex)) {
        console.warn(`Line ${i+1} in form-chains.csv has insufficient values`);
        continue;
      }
      
      const chain: CsvFormChainLink = {
        chainId: values[chainIdIndex],
        linkId: parseInt(values[linkIdIndex]) || 0,
        actionType: values[actionTypeIndex],
        reference: values[referenceIndex],
        condition: conditionIndex >= 0 && conditionIndex < values.length ? values[conditionIndex] : undefined,
        inputParameters: inputParametersIndex >= 0 && inputParametersIndex < values.length ? 
                        values[inputParametersIndex] : undefined,
        outputParameters: outputParametersIndex >= 0 && outputParametersIndex < values.length ? 
                         values[outputParametersIndex] : undefined,
        chainType: values[chainTypeIndex]
      };
      
      chains.push(chain);
    }
    
    return chains;
  }

  /**
   * Helper method to parse CSV line with proper handling of quoted values
   * @param line The CSV line to parse
   * @returns An array of values from the CSV line
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue);
    
    return values;
  }
}

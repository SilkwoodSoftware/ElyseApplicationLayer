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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GenericTableService, TableType } from './generic-table.service';
import { environment } from '../../../environments/environment';

interface ReadRouteResponse {
    resultSets: Array<Array<Record<string, any>>>;
    // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
    transactionMessage: string;
    transactionStatus: string;
}

interface TableRow {
    [key: string]: string | number | null | undefined;
}

@Injectable({
    providedIn: 'root'
})
export class ReadRoutesAdapterService<T extends { [key: string]: any }> {
    private readonly apiUrl = environment.dotNetBaseUrl;
    
    constructor(private genericTableService: GenericTableService<T>) {}

    getTableData(tableType: TableType, params: any = {}): Observable<any> {
        // Construct the URL using HttpParams for query parameters
        const url = `${this.apiUrl}/${tableType.endpoint}`;
        
        // Use GET method for all read operations
        return this.genericTableService.http.get<any>(url, { params }).pipe(
            map(response => {
                // Check if we should use the transformData method from GenericTableService
                if ((tableType as any).useTransform) {
                    // Log the raw response for debugging
                    console.log('Raw response for ' + tableType.endpoint + ':', response);
                    console.log('Data field:', tableType.dataField);
                    
                    // Use the transformData method from GenericTableService
                    const transformedData = this.genericTableService.transformData(response, tableType.dataField);
                    
                    // Ensure tooltips and columnMapping are properly extracted
                    // This is critical for the ReadRouteComponent to display tooltips correctly
                    const tooltips = response.tooltips || transformedData.tooltips || {};
                    const columnMapping = response.columnMapping || transformedData.columnMapping || {};
                    
                    // Create a base response object with a flexible type
                    const baseResponse: { [key: string]: any } = {
                        data: transformedData.tableData,
                        numberOfRows: transformedData.tableData.length,
                        tooltips: tooltips,
                        columnMapping: columnMapping
                    };
                    
                    // Only include database transaction parameters if they actually exist
                    // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
                    if (response.transactionMessage) {
                        baseResponse['transactionMessage'] = response.transactionMessage;
                    }
                    if (response.transactionStatus) {
                        baseResponse['transactionStatus'] = response.transactionStatus;
                    }
                    
                    // Log the transformed response for debugging
                    console.log('Transformed response:', baseResponse);
                    
                    // Copy all output parameters from the response
                    // This ensures all parameters are available for display
                    // regardless of their names
                    Object.keys(response).forEach(key => {
                        // Skip parameters we've already handled
                        if (key !== 'data' &&
                            key !== tableType.dataField &&
                            key !== 'tooltips' &&
                            key !== 'columnMapping' &&
                            key !== 'transactionMessage' &&
                            key !== 'transactionStatus') {
                            baseResponse[key] = response[key];
                        }
                    });
                    
                    return baseResponse;
                }
                // First check if the response has the dataField property from the tableType
                else if (response[tableType.dataField]) {
                    // Use the dataField from the tableType to extract data
                    let rawData = response[tableType.dataField];
                    
                    // If the dataField is an array of arrays, we need to handle it differently
                    // because it's an array of arrays, not an array of objects
                    if (Array.isArray(rawData) &&
                        Array.isArray(rawData[0]) &&
                        rawData.length > 0) {
                        rawData = rawData[0];
                    }
                    
                    // Ensure rawData is an array
                    const dataArray = Array.isArray(rawData) ? rawData : [rawData];
                    
                    // For documentData and fileData, we need to build a columnMapping to map from the extracted column names to the original keys
                    // This is needed for tooltips to work correctly
                    const columnMapping: {[key: string]: string} = {};
                    
                    const data = dataArray.map((row: Record<string, any>) => {
                        const newRow: TableRow = {};
                        for (const key in row) {
                            // Special handling for fields which have nested objects with 'Column Name' and 'Value' properties
                            // This applies to documentData, fileData, and ResultSets when they use the transformed format
                            if (typeof row[key] === 'object' &&
                                row[key] !== null &&
                                'Column Name' in row[key] &&
                                'Value' in row[key]) {
                                // Extract the column name and value
                                const columnName = row[key]['Column Name'];
                                newRow[columnName] = row[key]['Value'] === null ? '' : row[key]['Value'];
                                
                                // Add to columnMapping to map from the extracted column name to the original key
                                // This is needed for tooltips to work correctly
                                columnMapping[columnName] = key;
                            } else {
                                newRow[key] = row[key] === null || row[key] === undefined ||
                                            (typeof row[key] === 'object' && row[key] !== null) ? '' : row[key];
                            }
                        }
                        return newRow;
                    });

                    // Create a base response object with a flexible type
                    const baseResponse: { [key: string]: any } = {
                        data,
                        numberOfRows: rawData.length,
                        tooltips: response.tooltips || {},
                        // Use the built columnMapping if we extracted any nested structures, otherwise use response columnMapping
                        columnMapping: Object.keys(columnMapping).length > 0 ? columnMapping : (response.columnMapping || {})
                    };
                    
                    // Only include database transaction parameters if they actually exist
                    if (response.transactionMessage) {
                        baseResponse['transactionMessage'] = response.transactionMessage;
                    }
                    if (response.transactionStatus) {
                        baseResponse['transactionStatus'] = response.transactionStatus;
                    }
                    
                    // Copy all output parameters from the response
                    // This ensures all parameters are available for display
                    // regardless of their names
                    Object.keys(response).forEach(key => {
                        // Skip parameters we've already handled
                        if (key !== 'data' &&
                            key !== tableType.dataField &&
                            key !== 'tooltips' &&
                            key !== 'columnMapping' &&
                            key !== 'transactionMessage' &&
                            key !== 'transactionStatus') {
                            baseResponse[key] = response[key];
                        }
                    });
                    
                    return baseResponse;
                } else if (response.data) {
                    // Handle response format with data property
                    // Ensure data is properly formatted
                    const baseResponse: { [key: string]: any } = {
                        data: Array.isArray(response.data) ? response.data : [response.data],
                        numberOfRows: Array.isArray(response.data) ? response.data.length : 1,
                        tooltips: response.tooltips || {},
                        columnMapping: response.columnMapping || {}
                    };
                    
                    // Only include database transaction parameters if they actually exist
                    if (response.transactionMessage) {
                        baseResponse['transactionMessage'] = response.transactionMessage;
                    }
                    if (response.transactionStatus) {
                        baseResponse['transactionStatus'] = response.transactionStatus;
                    }
                    
                    // Copy all output parameters from the response
                    // This ensures all parameters are available for display
                    // regardless of their names
                    Object.keys(response).forEach(key => {
                        // Skip parameters we've already handled
                        if (key !== 'data' &&
                            key !== 'tooltips' &&
                            key !== 'columnMapping' &&
                            key !== 'message' &&
                            key !== 'status' &&
                            key !== 'transactionMessage' &&
                            key !== 'transactionStatus') {
                            baseResponse[key] = response[key];
                        }
                    });
                    
                    return baseResponse;
                } else {
                    // Handle other response formats
                    // Create a standardized response format
                    let data: any[] = [];
                    
                    if (Array.isArray(response)) {
                        data = response;
                    } else if (response.data) {
                        data = Array.isArray(response.data) ? response.data : [response.data];
                    } else if (response.fileData) {
                        data = Array.isArray(response.fileData) ? response.fileData : [response.fileData];
                    } else if (response.documentData) {
                        data = Array.isArray(response.documentData) ? response.documentData : [response.documentData];
                    } else if (response.items) {
                        data = Array.isArray(response.items) ? response.items : [response.items];
                    } else if (response[tableType.dataField] &&
                               Array.isArray(response[tableType.dataField]) &&
                               response[tableType.dataField].length > 0) {
                        // Use the dataField from tableType instead of hardcoding specific field names
                        const dataFieldValue = response[tableType.dataField];
                        data = Array.isArray(dataFieldValue[0]) ? dataFieldValue[0] : [dataFieldValue[0]];
                    }
                    
                    // Create a base response object with a flexible type
                    const baseResponse: { [key: string]: any } = {
                        data: data,
                        numberOfRows: data.length,
                        tooltips: response.tooltips || {},
                        columnMapping: response.columnMapping || {}
                    };
                    
                    // Only include database transaction parameters if they actually exist
                    if (response.transactionMessage) {
                        baseResponse['transactionMessage'] = response.transactionMessage;
                    }
                    if (response.transactionStatus) {
                        baseResponse['transactionStatus'] = response.transactionStatus;
                    }
                    
                    // Copy all output parameters from the response
                    // This ensures all parameters are available for display
                    // regardless of their names
                    Object.keys(response).forEach(key => {
                        // Skip parameters we've already handled
                        if (key !== 'data' &&
                            key !== 'fileData' &&
                            key !== 'documentData' &&
                            key !== 'items' &&
                            key !== tableType.dataField &&
                            key !== 'tooltips' &&
                            key !== 'columnMapping' &&
                            key !== 'message' &&
                            key !== 'status' &&
                            key !== 'transactionMessage' &&
                            key !== 'transactionStatus') {
                            baseResponse[key] = response[key];
                        }
                    });
                    
                    return baseResponse;
                }
            })
        );
    }
}

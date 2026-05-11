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

export type CustomViewType = 'FILE_DETAIL' | 'FILE_UPLOAD' | 'FILE_UPLOAD_WITH_CSV_FORM' | 'FORM_BASED';
export type CustomFieldType = 'IMAGE' | 'TEXT' | 'DATE' | 'NUMBER' | 'ACTION_BUTTON';

export interface CustomViewConfig extends BaseRouteConfig {
    viewId: string;
    storedProcedure: string;
    viewType: CustomViewType;
    templateName: string;
    title: string;
    width?: string;
    height?: string;
    description: string;
    chainId?: string;
    formFields?: string[];
}

export interface CustomViewResponse {
    fileData: any[]; // The transformed file data from backend
    thumbnail?: any; // The thumbnail image data (binary/base64)
    // The parameters transactionStatus and transactionMessage are for SQL database use only. Do not write to these parameters.
    transactionMessage?: string;
    transactionStatus?: string;
    [key: string]: any;
}

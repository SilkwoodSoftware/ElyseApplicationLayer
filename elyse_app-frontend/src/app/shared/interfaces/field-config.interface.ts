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


export interface FieldConfig {
  name: string; // Unique internal identifier
  displayName?: string; // User-friendly display name
  value: any;
  originalValue: any;
  fieldType: string;
  nameId: string | number;
  recordNameId: number;
  attributeId: string | number | null;
  units?: string;
  position: number;
  mandatory: boolean;
  fieldLength: number;
  characterLimit?: number;
  attribute1?: string;
  attribute2?: string;
  attribute3?: string;
  isDropdown?: boolean;
  dropdownOptions?: Array<{Name: string, Id: string | number}>;
  tabIndex?: number;
  error?: string;
  existsInDatabase: boolean;
  originalAttributeId: string | number | null;
  fieldCategory: 'Document' | 'File';
  dateFormat?: string;
  dateFormatString?: string;
  dateFormatStyle: number;
  displayValue?: string;
  
  // Multi-select specific properties
  isMultiSelect?: boolean;
  selectedItems?: Array<{id: string | number, name: string}>;
  originalSelectedItems?: Array<{id: string | number, name: string}>;
}
    

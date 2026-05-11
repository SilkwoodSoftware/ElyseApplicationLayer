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
 * CSV schema types and definitions for all CSV files in the Elyse frontend.
 *
 * This module contains:
 * 1. Type definitions describing the schema structure
 * 2. Schema definitions for each of the 17 CSV files in src/assets/
 *
 * Enum values and constraints are derived from the actual data.
 * No Angular dependencies. Pure types and data definitions.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema for a single CSV column.
 */
export interface CsvColumnSchema {
  /** Column header name as it appears in the CSV file */
  name: string;

  /** Must this column exist in the header row? */
  required: boolean;

  /** Is this column a primary key (must be unique across rows)? */
  primaryKey?: boolean;

  /** Can data rows have empty values in this column? Defaults to true. */
  allowEmpty?: boolean;

  /** Expected data type for validation */
  dataType?: 'string' | 'number' | 'boolean_yn';

  /** If set, the value must be one of these strings (case-sensitive) */
  enumValues?: string[];
}

/**
 * Schema for an entire CSV file.
 */
export interface CsvSchema {
  /** The CSV filename (for error messages) */
  fileName: string;

  /** Column definitions */
  columns: CsvColumnSchema[];

  /** Column names forming a composite primary key (if applicable) */
  compositeKey?: string[];
}

/**
 * A single validation error found during CSV parsing/validation.
 */
export interface CsvValidationError {
  /** The CSV filename where the error was found */
  fileName: string;

  /** 'file' for structural errors (missing headers), 'row' for data errors */
  severity: 'file' | 'row';

  /** 1-based line number (header = line 1, first data row = line 2) */
  lineNumber?: number;

  /** The column name where the error was found */
  columnName?: string;

  /** Human-readable error description */
  message: string;

  /** The actual value that caused the error */
  value?: string;
}

/**
 * Result of validating a CSV file against its schema.
 */
export interface CsvValidationResult {
  /** True if no errors were found */
  valid: boolean;

  /** All validation errors found */
  errors: CsvValidationError[];

  /** Only the rows that passed all validation checks */
  validRows: Record<string, string>[];

  /** Number of rows that failed validation and were excluded */
  rejectedRowCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Schema Definitions
// ═══════════════════════════════════════════════════════════════════════════

// ─── read-routes.csv ────────────────────────────────────────────────────────

export const READ_ROUTES_SCHEMA: CsvSchema = {
  fileName: 'read-routes.csv',
  columns: [
    { name: 'TableName', required: true, primaryKey: true, allowEmpty: false },
    { name: 'StoredProcedure', required: true },
    { name: 'DataField', required: true },
    { name: 'RouteUrl', required: true, allowEmpty: false },
    { name: 'ApiEndpoint', required: true },
    { name: 'KeyColumns', required: true },
    { name: 'HiddenColumns', required: true },
    { name: 'DisplayName', required: true },
    { name: 'DefaultSort', required: true },
    { name: 'Role', required: true },
    { name: 'InputParameters', required: true },
    { name: 'OutputParameters', required: true },
    { name: 'DisplayParameters', required: true },
    { name: 'Description', required: true },
    { name: 'UseTransform', required: true },
  ],
};

// ─── forms.csv ──────────────────────────────────────────────────────────────

export const FORMS_SCHEMA: CsvSchema = {
  fileName: 'forms.csv',
  columns: [
    { name: 'FormId', required: true, primaryKey: true, allowEmpty: false },
    { name: 'FormType', required: true, allowEmpty: false, enumValues: ['CUSTOM', 'DUC', 'PASSTHROUGH', 'READ'] },
    { name: 'Reference', required: true },
    { name: 'Title', required: true, allowEmpty: false },
    { name: 'TitleData', required: true },
    { name: 'Instructions', required: true },
    { name: 'Width', required: true },
    { name: 'Height', required: true },
  ],
};

// ─── form-fields.csv ────────────────────────────────────────────────────────

export const FORM_FIELDS_SCHEMA: CsvSchema = {
  fileName: 'form-fields.csv',
  columns: [
    { name: 'FormFieldID', required: true, primaryKey: true, allowEmpty: false },
    { name: 'FieldLabel', required: true, allowEmpty: false },
    { name: 'Length', required: true },
    { name: 'CharacterLimit', required: true },
    { name: 'DataType', required: true, allowEmpty: false, enumValues: ['DATE', 'ID', 'NUMBER', 'TEXT'] },
    { name: 'DefaultValue', required: true },
    { name: 'PopulationType', required: true, allowEmpty: false, enumValues: ['API_DROPDOWN', 'CALENDAR', 'DIRECT_ENTRY', 'FIXED_DROPDOWN', 'LOOKUP_FORM', 'LOOKUP_TABLE', 'MENU'] },
    { name: 'Reference', required: true },
    { name: 'ParameterId', required: true },
    { name: 'IdAlias', required: true },
    { name: 'NameAlias', required: true },
    { name: 'Placeholder', required: true },
    { name: 'HelpText', required: true },
  ],
};

// ─── form-formfield-links.csv ───────────────────────────────────────────────

export const FORM_FORMFIELD_LINKS_SCHEMA: CsvSchema = {
  fileName: 'form-formfield-links.csv',
  compositeKey: ['FormId', 'FormFieldId'],
  columns: [
    { name: 'FormId', required: true, allowEmpty: false },
    { name: 'FormFieldId', required: true, allowEmpty: false },
    { name: 'IsMandatory', required: true, allowEmpty: false, dataType: 'boolean_yn' },
    { name: 'Order', required: true, allowEmpty: false, dataType: 'number' },
  ],
};

// ─── form-field-menus.csv ───────────────────────────────────────────────────

export const FORM_FIELD_MENUS_SCHEMA: CsvSchema = {
  fileName: 'form-field-menus.csv',
  columns: [
    { name: 'FormFieldMenuID', required: true, allowEmpty: false },
    { name: 'MenuLabel', required: true, allowEmpty: false },
    { name: 'Type', required: true, allowEmpty: false, enumValues: ['FORM', 'TABLE'] },
    { name: 'Reference', required: true, allowEmpty: false },
    { name: 'Description', required: true },
    { name: 'Order', required: true, allowEmpty: false, dataType: 'number' },
    { name: 'Icon', required: true },
  ],
};

// ─── input-id-parameter-mapping.csv ─────────────────────────────────────────

export const INPUT_ID_PARAMETER_MAPPING_SCHEMA: CsvSchema = {
  fileName: 'input-id-parameter-mapping.csv',
  columns: [
    { name: 'InputParameter', required: true, primaryKey: true, allowEmpty: false },
    { name: 'IDNameAlias', required: true, allowEmpty: false },
    { name: 'NameFieldAlias', required: true, allowEmpty: false },
    { name: 'Description', required: true },
    { name: 'IdDataType', required: true, allowEmpty: false, enumValues: ['NUMBER', 'TEXT'] },
  ],
};

// ─── output-parameter-labels.csv ────────────────────────────────────────────

export const OUTPUT_PARAMETER_LABELS_SCHEMA: CsvSchema = {
  fileName: 'output-parameter-labels.csv',
  columns: [
    { name: 'OutputParameterName', required: true, primaryKey: true, allowEmpty: false },
    { name: 'MessageLabel', required: true, allowEmpty: false },
  ],
};

// ─── navigation-bar.csv ─────────────────────────────────────────────────────

export const NAVIGATION_BAR_SCHEMA: CsvSchema = {
  fileName: 'navigation-bar.csv',
  columns: [
    { name: 'MenuItemId', required: true, primaryKey: true, allowEmpty: false },
    { name: 'Label', required: true, allowEmpty: false },
    { name: 'ParentMenu', required: true },
    { name: 'Roles', required: true },
    { name: 'ActionType', required: true, enumValues: ['CHAIN', 'CUSTOM', 'DUC', 'FORM', 'READ'] },
    { name: 'Reference', required: true },
    { name: 'Shortcut', required: true },
    { name: 'Order', required: true },
    { name: 'Description', required: true },
    { name: 'Icon', required: true },
  ],
};

// ─── help/help-directory.csv ────────────────────────────────────────────────

export const HELP_DIRECTORY_SCHEMA: CsvSchema = {
  fileName: 'help/help-directory.csv',
  columns: [
    { name: 'HelpId', required: true, primaryKey: true, allowEmpty: false },
    { name: 'Title', required: true, allowEmpty: false },
    { name: 'ParentHelpId', required: true },
    { name: 'ContentFile', required: true },
    { name: 'Role', required: true },
    { name: 'Order', required: true, allowEmpty: false, dataType: 'number' },
    { name: 'LastUpdated', required: true },
    { name: 'Description', required: true },
  ],
};

// ─── metadata-field-loading.csv ─────────────────────────────────────────────

export const METADATA_FIELD_LOADING_SCHEMA: CsvSchema = {
  fileName: 'metadata-field-loading.csv',
  columns: [
    { name: 'FieldType', required: true, allowEmpty: false },
    { name: 'ReadRoute', required: true, allowEmpty: false },
    { name: 'FieldKeys', required: true, allowEmpty: false },
  ],
};

// ─── command-palette.csv ────────────────────────────────────────────────────

export const COMMAND_PALETTE_SCHEMA: CsvSchema = {
  fileName: 'command-palette.csv',
  columns: [
    { name: 'CommandId', required: true, primaryKey: true, allowEmpty: false },
    { name: 'Label', required: true, allowEmpty: false },
    { name: 'Roles', required: true },
    { name: 'ActionType', required: true, allowEmpty: false, enumValues: ['CHAIN', 'CUSTOM', 'DUC', 'FORM', 'READ'] },
    { name: 'Reference', required: true, allowEmpty: false },
    { name: 'Shortcut', required: true },
    { name: 'Description', required: true },
    { name: 'Icon', required: true },
    { name: 'Actions', required: true },
    { name: 'Objects', required: true },
    { name: 'Fields', required: true },
    { name: 'Weight', required: true },
  ],
};

// ─── context-menus.csv ──────────────────────────────────────────────────────

export const CONTEXT_MENUS_SCHEMA: CsvSchema = {
  fileName: 'context-menus.csv',
  columns: [
    { name: 'TableName', required: true, allowEmpty: false },
    { name: 'MenuItemId', required: true, allowEmpty: false },
    { name: 'Label', required: true, allowEmpty: false },
    { name: 'ParentMenu', required: true },
    { name: 'Roles', required: true },
    { name: 'VisibilityConstraint', required: true, enumValues: ['ANY_ROWS', 'SINGLE_ROW'] },
    { name: 'ActionType', required: true, enumValues: ['CHAIN', 'CUSTOM', 'DUC', 'FORM', 'READ'] },
    { name: 'Reference', required: true },
    { name: 'Shortcut', required: true },
    { name: 'Order', required: true, dataType: 'number' },
    { name: 'Description', required: true },
    { name: 'Icon', required: true },
  ],
};

// ─── custom-views.csv ───────────────────────────────────────────────────────

export const CUSTOM_VIEWS_SCHEMA: CsvSchema = {
  fileName: 'custom-views.csv',
  columns: [
    { name: 'ViewId', required: true, primaryKey: true, allowEmpty: false },
    { name: 'StoredProcedure', required: true },
    { name: 'RouteUrl', required: true, allowEmpty: false },
    { name: 'ApiEndpoint', required: true },
    { name: 'ViewType', required: true, allowEmpty: false, enumValues: ['FILE_DETAIL', 'FILE_UPLOAD', 'FORM_BASED'] },
    { name: 'TemplateName', required: true },
    { name: 'InputParameters', required: true },
    { name: 'OutputParameters', required: true },
    { name: 'Title', required: true, allowEmpty: false },
    { name: 'Width', required: true },
    { name: 'Height', required: true },
    { name: 'Description', required: true },
    { name: 'FormFields', required: true },
  ],
};

// ─── doc-file-form-field-routing.csv ────────────────────────────────────────

export const DOC_FILE_FORM_FIELD_ROUTING_SCHEMA: CsvSchema = {
  fileName: 'doc-file-form-field-routing.csv',
  columns: [
    { name: 'Field Type', required: true, allowEmpty: false },
    { name: 'ID Type', required: true, allowEmpty: false, enumValues: ['Document', 'File'] },
    { name: 'Data Type', required: true, allowEmpty: false, enumValues: ['Date', 'Integer', 'List', 'MultiSelectList', 'Real', 'Text', 'Value'] },
    { name: 'Name ID Parameter', required: true },
    { name: 'Attribute Parameter ID', required: true },
    { name: 'Attribute Value', required: true },
    { name: 'Create', required: true },
    { name: 'Read', required: true },
    { name: 'Update', required: true },
    { name: 'Delete', required: true },
  ],
};

// ─── duc-routes.csv ─────────────────────────────────────────────────────────

export const DUC_ROUTES_SCHEMA: CsvSchema = {
  fileName: 'duc-routes.csv',
  columns: [
    { name: 'RouteId', required: true, primaryKey: true, allowEmpty: false },
    { name: 'StoredProcedure', required: true, allowEmpty: false },
    { name: 'RouteUrl', required: true, allowEmpty: false },
    { name: 'ApiEndpoint', required: true, allowEmpty: false },
    { name: 'InputParameters', required: true },
    { name: 'OutputParameters', required: true },
    { name: 'Description', required: true },
    { name: 'EntityDisplayName', required: true },
    { name: 'ConfirmationMessage', required: true },
    { name: 'ResultsTitle', required: true },
    { name: 'IdColumnName', required: true },
  ],
};

// ─── fixed-dropdowns.csv ────────────────────────────────────────────────────

export const FIXED_DROPDOWNS_SCHEMA: CsvSchema = {
  fileName: 'fixed-dropdowns.csv',
  columns: [
    { name: 'DropdownListID', required: true, allowEmpty: false },
    { name: 'OptionValue', required: true },
    { name: 'Order', required: true, allowEmpty: false, dataType: 'number' },
  ],
};

// ─── form-chains.csv ────────────────────────────────────────────────────────

export const FORM_CHAINS_SCHEMA: CsvSchema = {
  fileName: 'form-chains.csv',
  compositeKey: ['ChainId', 'LinkId'],
  columns: [
    { name: 'ChainId', required: true, allowEmpty: false },
    { name: 'LinkId', required: true, allowEmpty: false, dataType: 'number' },
    { name: 'ActionType', required: true, allowEmpty: false, enumValues: ['CUSTOM', 'FORM', 'READ'] },
    { name: 'Reference', required: true, allowEmpty: false },
    { name: 'Condition', required: true },
    { name: 'InputParameters', required: true },
    { name: 'OutputParameters', required: true },
    { name: 'ChainType', required: true, allowEmpty: false, enumValues: ['DIALOG_CLOSE'] },
  ],
};

// ─── All schemas indexed by filename ────────────────────────────────────────

export const ALL_CSV_SCHEMAS: Record<string, CsvSchema> = {
  'read-routes.csv': READ_ROUTES_SCHEMA,
  'forms.csv': FORMS_SCHEMA,
  'form-fields.csv': FORM_FIELDS_SCHEMA,
  'form-formfield-links.csv': FORM_FORMFIELD_LINKS_SCHEMA,
  'form-field-menus.csv': FORM_FIELD_MENUS_SCHEMA,
  'input-id-parameter-mapping.csv': INPUT_ID_PARAMETER_MAPPING_SCHEMA,
  'output-parameter-labels.csv': OUTPUT_PARAMETER_LABELS_SCHEMA,
  'navigation-bar.csv': NAVIGATION_BAR_SCHEMA,
  'help/help-directory.csv': HELP_DIRECTORY_SCHEMA,
  'metadata-field-loading.csv': METADATA_FIELD_LOADING_SCHEMA,
  'command-palette.csv': COMMAND_PALETTE_SCHEMA,
  'context-menus.csv': CONTEXT_MENUS_SCHEMA,
  'custom-views.csv': CUSTOM_VIEWS_SCHEMA,
  'doc-file-form-field-routing.csv': DOC_FILE_FORM_FIELD_ROUTING_SCHEMA,
  'duc-routes.csv': DUC_ROUTES_SCHEMA,
  'fixed-dropdowns.csv': FIXED_DROPDOWNS_SCHEMA,
  'form-chains.csv': FORM_CHAINS_SCHEMA,
};

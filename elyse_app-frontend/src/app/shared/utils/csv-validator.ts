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
 * Pure validation functions for CSV data against schema definitions.
 *
 * These functions have no Angular dependencies and no side effects.
 * They implement the "Never Guess" principle: invalid values cause
 * the row to be rejected, never substituted with defaults.
 */

import { parseCsv } from './csv-parser';
import {
  CsvSchema,
  CsvColumnSchema,
  CsvValidationError,
  CsvValidationResult,
} from './csv-schemas';

/**
 * Validate that all required columns exist in the CSV headers.
 *
 * @param headers The parsed header names from the CSV file
 * @param schema The schema to validate against
 * @returns Array of file-level errors for missing required columns
 */
export function validateCsvHeaders(
  headers: string[],
  schema: CsvSchema
): CsvValidationError[] {
  const errors: CsvValidationError[] = [];
  const trimmedHeaders = headers.map(h => h.trim());
  const headerSet = new Set(trimmedHeaders);

  for (const col of schema.columns) {
    if (col.required && !headerSet.has(col.name)) {
      errors.push({
        fileName: schema.fileName,
        severity: 'file',
        columnName: col.name,
        message: `Required column "${col.name}" is missing from headers`,
      });
    }
  }

  return errors;
}

/**
 * Validate a single data row against the schema.
 *
 * @param row The row as a header-keyed object
 * @param schema The schema to validate against
 * @param lineNumber 1-based line number in the CSV file (header = 1)
 * @param seenPrimaryKeys Set of previously seen primary key values (mutated)
 * @param seenCompositeKeys Set of previously seen composite key values (mutated)
 * @returns Array of row-level errors
 */
export function validateCsvRow(
  row: Record<string, string>,
  schema: CsvSchema,
  lineNumber: number,
  seenPrimaryKeys: Map<string, Set<string>>,
  seenCompositeKeys: Set<string>
): CsvValidationError[] {
  const errors: CsvValidationError[] = [];

  for (const col of schema.columns) {
    const value = row[col.name];

    // Skip validation for columns not present in the row
    // (missing headers are caught by validateCsvHeaders)
    if (value === undefined) {
      continue;
    }

    const trimmedValue = value.trim();

    // Check allowEmpty
    if (col.allowEmpty === false && trimmedValue.length === 0) {
      errors.push({
        fileName: schema.fileName,
        severity: 'row',
        lineNumber,
        columnName: col.name,
        message: `Column "${col.name}" must not be empty`,
        value,
      });
      continue; // No point checking further constraints on an empty value
    }

    // Skip further validation if value is empty and empty is allowed
    if (trimmedValue.length === 0) {
      continue;
    }

    // Check dataType
    if (col.dataType === 'number') {
      if (isNaN(Number(trimmedValue))) {
        errors.push({
          fileName: schema.fileName,
          severity: 'row',
          lineNumber,
          columnName: col.name,
          message: `Column "${col.name}" must be a number, got "${trimmedValue}"`,
          value,
        });
      }
    } else if (col.dataType === 'boolean_yn') {
      if (trimmedValue !== 'Y' && trimmedValue !== 'N') {
        errors.push({
          fileName: schema.fileName,
          severity: 'row',
          lineNumber,
          columnName: col.name,
          message: `Column "${col.name}" must be "Y" or "N", got "${trimmedValue}"`,
          value,
        });
      }
    }

    // Check enumValues
    if (col.enumValues && col.enumValues.length > 0) {
      if (!col.enumValues.includes(trimmedValue)) {
        errors.push({
          fileName: schema.fileName,
          severity: 'row',
          lineNumber,
          columnName: col.name,
          message: `Column "${col.name}" must be one of [${col.enumValues.join(', ')}], got "${trimmedValue}"`,
          value,
        });
      }
    }

    // Check primary key uniqueness
    if (col.primaryKey) {
      if (!seenPrimaryKeys.has(col.name)) {
        seenPrimaryKeys.set(col.name, new Set());
      }
      const seen = seenPrimaryKeys.get(col.name)!;
      if (seen.has(trimmedValue)) {
        errors.push({
          fileName: schema.fileName,
          severity: 'row',
          lineNumber,
          columnName: col.name,
          message: `Duplicate primary key in column "${col.name}": "${trimmedValue}"`,
          value,
        });
      } else {
        seen.add(trimmedValue);
      }
    }
  }

  // Check composite key uniqueness
  if (schema.compositeKey && schema.compositeKey.length > 0) {
    const keyParts = schema.compositeKey.map(colName => (row[colName] || '').trim());
    const compositeKeyValue = keyParts.join('|');

    if (seenCompositeKeys.has(compositeKeyValue)) {
      errors.push({
        fileName: schema.fileName,
        severity: 'row',
        lineNumber,
        columnName: schema.compositeKey.join('+'),
        message: `Duplicate composite key [${schema.compositeKey.join(', ')}]: "${compositeKeyValue}"`,
        value: compositeKeyValue,
      });
    } else {
      seenCompositeKeys.add(compositeKeyValue);
    }
  }

  return errors;
}

/**
 * Validate an entire CSV file against its schema.
 *
 * Parses the content, validates headers, then validates each row.
 * Invalid rows are excluded from the result — they are NEVER patched
 * or defaulted (the "Never Guess" principle).
 *
 * @param content The raw CSV file content
 * @param schema The schema to validate against
 * @returns Validation result with valid rows and any errors
 */
export function validateCsv(
  content: string,
  schema: CsvSchema
): CsvValidationResult {
  const parsed = parseCsv(content);
  // Trim header names so trailing spaces in CSV don't break column lookups
  const headers = parsed.headers.map(h => h.trim());
  const rows = parsed.rows;
  const allErrors: CsvValidationError[] = [];

  // Validate headers first
  const headerErrors = validateCsvHeaders(headers, schema);
  allErrors.push(...headerErrors);

  // If required headers are missing, we cannot reliably validate rows
  if (headerErrors.length > 0) {
    return {
      valid: false,
      errors: allErrors,
      validRows: [],
      rejectedRowCount: rows.length,
    };
  }

  // Convert rows to objects and validate each
  const validRows: Record<string, string>[] = [];
  const seenPrimaryKeys = new Map<string, Set<string>>();
  const seenCompositeKeys = new Set<string>();
  let rejectedRowCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNumber = i + 2; // +2 because line 1 is headers, data starts at line 2

    // Convert row array to object using headers
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = j < row.length ? row[j] : '';
    }

    const rowErrors = validateCsvRow(obj, schema, lineNumber, seenPrimaryKeys, seenCompositeKeys);

    if (rowErrors.length > 0) {
      allErrors.push(...rowErrors);
      rejectedRowCount++;
    } else {
      validRows.push(obj);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    validRows,
    rejectedRowCount,
  };
}

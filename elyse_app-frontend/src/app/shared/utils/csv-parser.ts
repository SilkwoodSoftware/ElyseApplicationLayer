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
 * Shared CSV parser for the Elyse frontend application.
 *
 * This module provides pure functions for parsing CSV content. It has no
 * Angular dependencies and no side effects, making it trivially testable.
 *
 * The parser handles:
 * - Quoted values containing commas
 * - Quote characters within quoted fields (toggle behaviour matching existing parsers)
 * - UTF-8 BOM stripping on the first line
 * - Carriage return handling (Windows \r\n vs Unix \n)
 * - Empty line filtering
 *
 * IMPORTANT: The parser returns raw values — it does NOT trim whitespace.
 * Services that need trimming must do it themselves. This preserves backward
 * compatibility with existing parsers that have different trimming behaviour.
 */

/**
 * Parse a single CSV line into an array of field values.
 *
 * Handles quoted values containing commas. Quote characters toggle an
 * "in quotes" flag and are stripped from the output. This matches the
 * behaviour of the existing parseCSVLine/parseCSVRow implementations
 * across the codebase.
 *
 * @param line A single CSV line (should not contain newlines)
 * @returns Array of field values as strings
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else if (char === '\r') {
      // Strip carriage returns (handles Windows \r\n line endings
      // when the line was split on \n only)
      continue;
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Parse full CSV content into headers and rows.
 *
 * - Strips UTF-8 BOM (\uFEFF) from the first character if present
 * - Splits on \n (carriage returns are stripped by parseCsvLine)
 * - Filters empty lines
 * - First non-empty line is treated as the header row
 *
 * @param content The full CSV file content as a string
 * @returns Object with headers array and rows (array of arrays)
 */
export function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  if (!content || content.trim().length === 0) {
    return { headers: [], rows: [] };
  }

  // Strip UTF-8 BOM if present
  let cleaned = content;
  if (cleaned.charCodeAt(0) === 0xFEFF) {
    cleaned = cleaned.substring(1);
  }

  // Split on newlines and filter empty lines
  const lines = cleaned.split('\n').filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(line => parseCsvLine(line));

  return { headers, rows };
}

/**
 * Parse CSV content into an array of header-keyed objects.
 *
 * Each row becomes a Record<string, string> where keys are the header
 * column names and values are the corresponding field values.
 *
 * - If a row has fewer values than headers, missing keys get empty string
 * - If a row has more values than headers, extra values are silently dropped
 *
 * @param content The full CSV file content as a string
 * @returns Array of objects, one per data row
 */
export function parseCsvToObjects(content: string): Record<string, string>[] {
  const { headers, rows } = parseCsv(content);

  if (headers.length === 0) {
    return [];
  }

  return rows.map(row => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = i < row.length ? row[i] : '';
    }
    return obj;
  });
}

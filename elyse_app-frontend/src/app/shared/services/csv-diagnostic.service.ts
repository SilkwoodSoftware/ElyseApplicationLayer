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
import { CsvValidationError } from '../utils/csv-schemas';

/**
 * Summary of validation results for a single CSV file.
 */
export interface CsvFileReport {
  /** The CSV filename */
  fileName: string;
  /** Number of rows that passed validation */
  validRowCount: number;
  /** Number of rows that were rejected */
  rejectedRowCount: number;
  /** All validation errors for this file */
  errors: CsvValidationError[];
  /** Timestamp when the report was received */
  reportedAt: number;
}

/**
 * Centralized diagnostic service for CSV validation reporting.
 *
 * All CSV-loading services report their validation results here.
 * After a settling period (to allow all CSVs to load), the service
 * logs a consolidated summary to the browser console.
 *
 * This service runs in both development and production modes because
 * CSV files are updated at runtime without recompiling. Validation
 * errors in production are genuine configuration problems that need
 * to be visible.
 */
@Injectable({
  providedIn: 'root'
})
export class CsvDiagnosticService {
  /** All file reports received so far */
  private reports: CsvFileReport[] = [];

  /** Timer handle for the summary log debounce */
  private summaryTimer: ReturnType<typeof setTimeout> | null = null;

  /** How long to wait after the last report before logging the summary (ms) */
  private readonly SETTLE_DELAY_MS = 3000;

  /** Whether the summary has already been logged */
  private summaryLogged = false;

  /**
   * Report validation results for a CSV file.
   *
   * Called by each CSV-loading service after running validateCsv().
   * Individual errors are logged immediately. A consolidated summary
   * is logged after all CSV files have settled.
   *
   * @param fileName - The CSV filename (e.g. 'forms.csv')
   * @param errors - Validation errors from validateCsv()
   * @param validRowCount - Number of rows that passed validation
   * @param rejectedRowCount - Number of rows that were rejected
   */
  reportErrors(
    fileName: string,
    errors: CsvValidationError[],
    validRowCount: number,
    rejectedRowCount: number
  ): void {
    this.reports.push({
      fileName,
      validRowCount,
      rejectedRowCount,
      errors: [...errors],
      reportedAt: Date.now()
    });

    // Log individual errors immediately
    if (errors.length > 0) {
      errors.forEach(err => {
        const location = err.lineNumber ? ` line ${err.lineNumber}` : '';
        const column = err.columnName ? ` column '${err.columnName}'` : '';
        const value = err.value !== undefined ? ` value="${err.value}"` : '';
        console.warn(
          `[CSV VALIDATION] ${err.fileName}${location}${column}: ${err.message}${value} — row ${err.severity === 'row' ? 'rejected' : 'file error'}`
        );
      });
    }

    // Reset the summary timer — wait for all CSVs to finish loading
    this.scheduleSummary();
  }

  /**
   * Schedule (or reschedule) the consolidated summary log.
   * Each new report resets the timer so the summary only fires
   * after all CSV loading has settled.
   */
  private scheduleSummary(): void {
    if (this.summaryTimer !== null) {
      clearTimeout(this.summaryTimer);
    }

    this.summaryTimer = setTimeout(() => {
      this.logSummary();
    }, this.SETTLE_DELAY_MS);
  }

  /**
   * Log the consolidated summary of all CSV validation results.
   */
  private logSummary(): void {
    if (this.summaryLogged) {
      return;
    }
    this.summaryLogged = true;

    const totalFiles = this.reports.length;
    const totalErrors = this.reports.reduce((sum, r) => sum + r.errors.length, 0);
    const totalRejected = this.reports.reduce((sum, r) => sum + r.rejectedRowCount, 0);
    const totalValid = this.reports.reduce((sum, r) => sum + r.validRowCount, 0);
    const filesWithErrors = this.reports.filter(r => r.errors.length > 0);

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                  CSV VALIDATION SUMMARY                     ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');

    if (totalErrors === 0) {
      console.log(`║  ✓ ${totalFiles} CSV files loaded, ${totalValid} rows validated, 0 errors     ║`);
    } else {
      console.log(`║  ⚠ ${totalFiles} CSV files loaded, ${totalRejected} rows rejected, ${totalErrors} errors  ║`);
      console.log('╠══════════════════════════════════════════════════════════════╣');

      filesWithErrors.forEach(report => {
        const fileErrors = report.errors.filter(e => e.severity === 'file');
        const rowErrors = report.errors.filter(e => e.severity === 'row');

        console.log(`║  ${report.fileName}`);
        if (fileErrors.length > 0) {
          console.log(`║    File errors: ${fileErrors.length}`);
          fileErrors.forEach(err => {
            console.log(`║      - ${err.message}`);
          });
        }
        if (rowErrors.length > 0) {
          console.log(`║    Row errors: ${rowErrors.length} (${report.rejectedRowCount} rows rejected)`);
        }
      });
    }

    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
  }

  /**
   * Get all reports (for testing or programmatic access).
   */
  getReports(): ReadonlyArray<CsvFileReport> {
    return this.reports;
  }

  /**
   * Get the total number of errors across all files.
   */
  getTotalErrorCount(): number {
    return this.reports.reduce((sum, r) => sum + r.errors.length, 0);
  }

  /**
   * Get the total number of rejected rows across all files.
   */
  getTotalRejectedRowCount(): number {
    return this.reports.reduce((sum, r) => sum + r.rejectedRowCount, 0);
  }

  /**
   * Check if all reported files had clean validation (no errors).
   */
  isClean(): boolean {
    return this.reports.every(r => r.errors.length === 0);
  }
}

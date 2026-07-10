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

import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-fixed-dropdown-test',
  template: `
    <div>
      <h2>Fixed Dropdown Test</h2>
      <div *ngIf="loading">Loading...</div>
      <div *ngIf="error">Error: {{ error }}</div>
      <div *ngIf="!loading && !error">
        <h3>Raw CSV Content:</h3>
        <pre>{{ rawCsv }}</pre>
        
        <h3>Parsed Options:</h3>
        <div *ngFor="let group of parsedOptions | keyvalue">
          <h4>{{ group.key }}</h4>
          <ul>
            <li *ngFor="let option of group.value">
              {{ option.optionValue }} (Order: {{ option.order }})
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class FixedDropdownTestComponent implements OnInit {
  loading = true;
  error = '';
  rawCsv = '';
  parsedOptions = new Map<string, any[]>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadFixedDropdowns();
  }

  private loadFixedDropdowns(): void {
    // Try different paths to find the CSV file
    const paths = [
      'assets/fixed-dropdowns.csv',
      '/assets/fixed-dropdowns.csv',
      '../assets/fixed-dropdowns.csv',
      '../../assets/fixed-dropdowns.csv',
      '../../../assets/fixed-dropdowns.csv'
    ];

    let pathIndex = 0;
    const tryNextPath = () => {
      if (pathIndex >= paths.length) {
        this.loading = false;
        this.error = 'Failed to load CSV file from any path';
        return;
      }

      const path = paths[pathIndex];
      console.log(`Trying to load CSV from: ${path}`);

      this.http.get(path, { responseType: 'text' })
        .subscribe({
          next: (csv) => {
            this.rawCsv = csv;
            this.parseFixedDropdownsCsv(csv);
            this.loading = false;
          },
          error: (err) => {
            console.error(`Error loading from ${path}:`, err);
            pathIndex++;
            tryNextPath();
          }
        });
    };

    tryNextPath();
  }

  private parseFixedDropdownsCsv(csv: string): void {
    const lines = csv.split('\n');
    const options: any[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV parsing with potential quoted values containing commas
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

      // Skip lines with insufficient values
      if (values.length < 3) continue;

      options.push({
        dropdownListId: values[0].trim(),
        optionValue: values[1].trim(),
        order: parseInt(values[2].trim()) || 0
      });
    }

    // Group options by DropdownListID
    options.forEach(option => {
      if (!this.parsedOptions.has(option.dropdownListId)) {
        this.parsedOptions.set(option.dropdownListId, []);
      }
      this.parsedOptions.get(option.dropdownListId)!.push(option);
    });

    // Sort options by order
    this.parsedOptions.forEach(options => {
      options.sort((a, b) => a.order - b.order);
    });
  }
}

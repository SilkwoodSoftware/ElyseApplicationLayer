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

@Injectable({
  providedIn: 'root'
})
export class TableScrollService {
  private scrollPositions: { [tableName: string]: number } = {};

  setScrollPosition(tableName: string, position: number): void {
    this.scrollPositions[tableName] = position;
  }

  getScrollPosition(tableName: string): number {
    return this.scrollPositions[tableName] || 0;
  }

  clearScrollPosition(tableName: string): void {
    delete this.scrollPositions[tableName];
  }

  hasScrollPosition(tableName: string): boolean {
    return tableName in this.scrollPositions;
  }
}
    

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
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  apiUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig | null = null;
  private static instance: ConfigService | null = null;

  constructor(private http: HttpClient) {
    ConfigService.instance = this;
  }

  /**
   * Get the singleton instance of ConfigService
   * Used by environment files to access runtime configuration
   */
  static getInstance(): ConfigService | null {
    return ConfigService.instance;
  }

  /**
   * Load configuration from assets/config.json
   * This is called during app initialization before any components are loaded
   */
  async loadConfig(): Promise<void> {
    try {
      this.config = await firstValueFrom(
        this.http.get<AppConfig>('/assets/config.json')
      );
      console.log('Configuration loaded:', this.config);
    } catch (error) {
      console.error('Failed to load configuration from /assets/config.json', error);
      // Fallback to localhost if config file is missing
      this.config = { apiUrl: 'http://localhost:5000/api' };
      console.warn('Using fallback configuration:', this.config);
    }
  }

  /**
   * Get the backend API URL
   * @returns The configured API base URL
   */
  getApiUrl(): string {
    if (!this.config) {
      throw new Error('Configuration not loaded. Ensure ConfigService.loadConfig() is called during app initialization.');
    }
    return this.config.apiUrl;
  }

  /**
   * Get the full configuration object
   * @returns The complete configuration
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Ensure ConfigService.loadConfig() is called during app initialization.');
    }
    return this.config;
  }
}

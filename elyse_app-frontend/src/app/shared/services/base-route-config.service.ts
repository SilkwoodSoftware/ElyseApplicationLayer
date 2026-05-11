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
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseRouteConfig } from '../interfaces/route-base.interface';

@Injectable()
export abstract class BaseRouteConfigService<T extends BaseRouteConfig> {
    protected routes: Map<string, T> = new Map();
    protected abstract csvPath: string;

    constructor(protected http: HttpClient) {}

    protected loadRouteConfigs(): Observable<void> {
        return this.http.get(this.csvPath, { responseType: 'text' }).pipe(
            map(csvData => {
                const configs = this.parseCsvData(csvData);
                configs.forEach(config => {
                    if (this.validateConfig(config)) {
                        // Store with and without leading slash for more flexible matching
                        this.routes.set(config.routeUrl, config);
                        this.routes.set(config.routeUrl.replace(/^\//, ''), config);
                    }
                });
            }),
            catchError(error => {
                console.error('Error loading route configurations:', error);
                return of(void 0);
            })
        );
    }

    protected abstract parseCsvData(csvData: string): T[];
    protected abstract validateConfig(config: T): boolean;

    getRouteConfig(routeUrl: string): Observable<T | undefined> {
        return of(this.routes.get(routeUrl));
    }

    getAllRoutes(): T[] {
        return Array.from(this.routes.values());
    }

    protected parseParameters(paramString: string): string[] {
        if (!paramString) return [];
        return paramString.split(';').map(p => p.trim()).filter(p => p);
    }
}

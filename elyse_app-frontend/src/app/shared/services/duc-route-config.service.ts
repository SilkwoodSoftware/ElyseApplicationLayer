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
import { BaseRouteConfigService } from './base-route-config.service';
import { DucRouteConfig } from '../interfaces/duc-route.interface';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { filter, map, catchError } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class DucRouteConfigService extends BaseRouteConfigService<DucRouteConfig> {
    protected csvPath = '/assets/duc-routes.csv';
    private initialized$ = new BehaviorSubject<boolean>(false);
    protected override routes: Map<string, DucRouteConfig> = new Map(); // Override to store by RouteId instead of URL

    constructor(http: HttpClient) {
        super(http);
        this.loadRouteConfigs().subscribe(() => {
            this.initialized$.next(true);
        });
    }

    override getRouteConfig(routeId: string): Observable<DucRouteConfig | undefined> {
        return this.initialized$.pipe(
            filter(initialized => initialized),
            map(() => this.routes.get(routeId))
        );
    }

    /**
     * Get route config by RouteUrl instead of RouteId
     * Used by UniversalRouteGuard to check if a URL path exists
     */
    getRouteConfigByUrl(routeUrl: string): Observable<DucRouteConfig | undefined> {
        return this.initialized$.pipe(
            filter(initialized => initialized),
            map(() => {
                // Remove leading slash and find by RouteUrl
                const normalizedUrl = routeUrl.replace(/^\//, '');
                return Array.from(this.routes.values()).find(config =>
                    config.routeUrl === normalizedUrl
                );
            })
        );
    }
    
    /**
     * Get all available DUC routes
     * This is used by the DucRouteDataResolver to find matching routes
     */
    override getAllRoutes(): DucRouteConfig[] {
        return Array.from(this.routes.values());
    }

    protected parseCsvData(csvData: string): DucRouteConfig[] {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
                const values = line.split(',').map(v => v.trim());
                const row = headers.reduce((obj, header, index) => {
                    obj[header] = values[index] || '';
                    return obj;
                }, {} as any);

                const config: DucRouteConfig = {
                    routeUrl: row.RouteUrl,
                    apiEndpoint: row.ApiEndpoint,
                    storedProcedure: row.StoredProcedure,
                    displayName: row.RouteId || row.ApiEndpoint, // Use RouteId as display name if available
                    role: 'editor', // Default role for DUC operations
                    inputParameters: this.parseParameters(row.InputParameters),
                    outputParameters: this.parseParameters(row.OutputParameters),
                    description: row.Description,
                    routeId: row.RouteId, // Store the RouteId for reference
                    // Parse new fields for generic text
                    entityDisplayName: row.EntityDisplayName,
                    confirmationMessage: row.ConfirmationMessage,
                    resultsTitle: row.ResultsTitle,
                    idColumnName: row.IdColumnName
                };
                
                return config;
            });
    }

    protected validateConfig(config: DucRouteConfig): boolean {
        return !!(
            config.routeUrl &&
            config.apiEndpoint &&
            config.routeId
        );
    }
    
    // Override the loadRouteConfigs method to store routes by RouteId instead of URL
    protected override loadRouteConfigs(): Observable<void> {
        return this.http.get(this.csvPath, { responseType: 'text' }).pipe(
            map(csvData => {
                const configs = this.parseCsvData(csvData);
                configs.forEach(config => {
                    if (this.validateConfig(config)) {
                        // Store by RouteId instead of URL
                        this.routes.set(config.routeId, config);
                    }
                });
            }),
            catchError(error => {
                console.error('Error loading DUC route configurations:', error);
                return of(void 0);
            })
        );
    }
}

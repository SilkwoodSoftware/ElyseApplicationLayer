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
import { validateCsv } from '../utils/csv-validator';
import { DUC_ROUTES_SCHEMA } from '../utils/csv-schemas';
import { CsvDiagnosticService } from './csv-diagnostic.service';

@Injectable({
    providedIn: 'root'
})
export class DucRouteConfigService extends BaseRouteConfigService<DucRouteConfig> {
    protected csvPath = '/assets/duc-routes.csv';
    private initialized$ = new BehaviorSubject<boolean>(false);
    protected override routes: Map<string, DucRouteConfig> = new Map(); // Override to store by RouteId instead of URL

    constructor(http: HttpClient, private csvDiagnosticService: CsvDiagnosticService) {
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
        const result = validateCsv(csvData, DUC_ROUTES_SCHEMA);

        this.csvDiagnosticService.reportErrors(
            DUC_ROUTES_SCHEMA.fileName, result.errors, result.validRows.length, result.rejectedRowCount
        );

        return result.validRows.map(row => {
            const config: DucRouteConfig = {
                routeUrl: row['RouteUrl'].trim(),
                apiEndpoint: row['ApiEndpoint'].trim(),
                storedProcedure: row['StoredProcedure'].trim(),
                displayName: (row['RouteId'] || row['ApiEndpoint']).trim(),
                role: 'editor',
                inputParameters: this.parseParameters(row['InputParameters']),
                outputParameters: this.parseParameters(row['OutputParameters']),
                description: row['Description'].trim(),
                routeId: row['RouteId'].trim(),
                entityDisplayName: row['EntityDisplayName'].trim(),
                confirmationMessage: row['ConfirmationMessage'].trim(),
                resultsTitle: row['ResultsTitle'].trim(),
                idColumnName: row['IdColumnName'].trim(),
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

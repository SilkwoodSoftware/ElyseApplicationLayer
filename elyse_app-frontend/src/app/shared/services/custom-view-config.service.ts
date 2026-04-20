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
import { CustomViewConfig, CustomViewType } from '../interfaces/custom-view.interface';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class CustomViewConfigService extends BaseRouteConfigService<CustomViewConfig> {
    protected csvPath = '/assets/custom-views.csv';
    private initialized$ = new BehaviorSubject<boolean>(false);
    private viewsById: Map<string, CustomViewConfig> = new Map();

    constructor(http: HttpClient) {
        super(http);
        this.loadCustomViewConfigs().subscribe(() => {
            this.initialized$.next(true);
        });
    }

    override getRouteConfig(routeUrl: string): Observable<CustomViewConfig | undefined> {
        console.log('🔍 CustomViewConfigService: getRouteConfig called for:', routeUrl);
        return this.initialized$.pipe(
            filter(initialized => {
                console.log('🔍 CustomViewConfigService: Initialized status:', initialized);
                return initialized;
            }),
            map(() => {
                // Extract just the path portion (remove query parameters)
                const pathOnly = routeUrl.split('?')[0];
                console.log('🔍 CustomViewConfigService: Extracting path from', routeUrl, '→', pathOnly);
                
                // Debug: Show all available routes
                console.log('🔍 CustomViewConfigService: Available routes:', Array.from(this.routes.keys()));
                
                const config = this.routes.get(pathOnly);
                console.log('🔍 CustomViewConfigService: Route lookup result for', pathOnly, ':', config);
                
                if (config) {
                    console.log('🔍 CustomViewConfigService: ✅ MATCH FOUND - ViewId:', config.viewId, 'ViewType:', config.viewType);
                } else {
                    console.log('🔍 CustomViewConfigService: ❌ NO MATCH for path:', pathOnly);
                }
                
                return config;
            })
        );
    }

    getViewConfig(viewId: string): Observable<CustomViewConfig | undefined> {
        return this.initialized$.pipe(
            filter(initialized => initialized),
            map(() => this.viewsById.get(viewId))
        );
    }

    get isInitialized$(): Observable<boolean> {
        return this.initialized$.asObservable();
    }

    private loadCustomViewConfigs(): Observable<void> {
        console.log('CustomViewConfigService: Loading configurations from', this.csvPath);
        return this.http.get(this.csvPath, { responseType: 'text' }).pipe(
            map((csvData) => {
                console.log('CustomViewConfigService: Received CSV data:', csvData.substring(0, 200) + '...');
                const viewConfigs = this.parseCsvData(csvData);
                console.log('CustomViewConfigService: Parsed configs:', viewConfigs);
                
                viewConfigs.forEach(config => {
                    if (this.validateConfig(config)) {
                        console.log('CustomViewConfigService: Adding route mapping:', config.routeUrl, '→', config.viewId);
                        this.routes.set(config.routeUrl, config);
                        this.routes.set(config.routeUrl.replace(/^\//, ''), config);
                        this.viewsById.set(config.viewId, config);
                    } else {
                        console.warn('CustomViewConfigService: Invalid config:', config);
                    }
                });
                
                console.log('CustomViewConfigService: Final routes map:', Array.from(this.routes.keys()));
                console.log('CustomViewConfigService: Final viewsById map:', Array.from(this.viewsById.keys()));
            })
        );
    }

    protected parseCsvData(csvData: string): CustomViewConfig[] {
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

                return {
                    viewId: row.ViewId,
                    storedProcedure: row.StoredProcedure,
                    routeUrl: row.RouteUrl, // Use CSV RouteUrl directly, no fallback pattern
                    apiEndpoint: row.ApiEndpoint,
                    viewType: row.ViewType as CustomViewType,
                    templateName: row.TemplateName || '',
                    displayName: row.Title,
                    title: row.Title,
                    width: row.Width,
                    height: row.Height,
                    description: row.Description,
                    role: '', // Custom views don't have roles in the current spec
                    inputParameters: this.parseParameters(row.InputParameters),
                    outputParameters: this.parseParameters(row.OutputParameters),
                    chainId: row.ChainId || undefined,
                    formFields: this.parseFormFields(row.FormFields)
                };
            });
    }

    private parseFormFields(formFields: string): string[] {
        if (!formFields || formFields.trim() === '') {
            return [];
        }
        return formFields.split(';').map(field => field.trim()).filter(field => field);
    }

    protected validateConfig(config: CustomViewConfig): boolean {
        const hasViewId = !!(config.viewId && config.viewId.trim() !== '');
        const hasViewType = !!(config.viewType && config.viewType.trim() !== '');
        const hasApiEndpoint = !!(config.apiEndpoint && config.apiEndpoint.trim() !== '');
        
        // For FORM_BASED views, API endpoint is optional (they use existing components)
        if (config.viewType === 'FORM_BASED') {
            return hasViewId && hasViewType;
        }
        
        // For all other view types, API endpoint is required
        return hasViewId && hasViewType && hasApiEndpoint;
    }
}

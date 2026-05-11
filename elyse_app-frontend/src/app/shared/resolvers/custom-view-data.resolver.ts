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
import { Resolve, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { CustomViewConfig } from '../interfaces/custom-view.interface';
import { CustomViewConfigService } from '../services/custom-view-config.service';
import { ContextAwareRoutingService } from '../services/context-aware-routing.service';

@Injectable({ providedIn: 'root' })
export class CustomViewDataResolver implements Resolve<CustomViewConfig> {
    constructor(
        private configService: CustomViewConfigService,
        private router: Router,
        private contextService: ContextAwareRoutingService
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<CustomViewConfig> {
        // Get the intended path - prioritize route data, but be more careful about fallback
        let targetUrl = route.data?.['originalUrl'];
        
        // If no originalUrl in route data, construct from URL segments or use router.url
        if (!targetUrl) {
            // Try to construct from route segments if available
            if (route.url && route.url.length > 0) {
                targetUrl = '/' + route.url.map(segment => segment.path).join('/');
                // Add query params if they exist
                if (route.queryParams && Object.keys(route.queryParams).length > 0) {
                    const queryString = new URLSearchParams(route.queryParams).toString();
                    targetUrl += '?' + queryString;
                }
            } else {
                // Fallback to router.url
                targetUrl = this.router.url;
            }
        }
        
        console.log('🔍 CustomViewDataResolver: Resolving for URL:', targetUrl);
        console.log('🔍 CustomViewDataResolver: Route segments (may be empty due to **):', route.url);
        console.log('🔍 CustomViewDataResolver: Route data:', route.data);
        console.log('🔍 CustomViewDataResolver: Original URL from route data:', route.data?.['originalUrl']);
        console.log('🔍 CustomViewDataResolver: Router URL:', this.router.url);
        console.log('🔍 CustomViewDataResolver: Query params:', route.queryParams);
        
        // Debug: Check for root path issue
        if (targetUrl === '/' || targetUrl === '') {
            console.error('CustomViewDataResolver: ROOT PATH ISSUE - This resolver should not handle root path');
            console.error('CustomViewDataResolver: Current router URL:', this.router.url);
            console.error('CustomViewDataResolver: Target URL:', targetUrl);
            console.error('CustomViewDataResolver: Route data:', route.data);
            throw new Error('Root path should not be handled by CustomViewsModule');
        }
        
        // First, try to find custom view by URL path (supports direct CSV URL mapping)
        return this.configService.getRouteConfig(targetUrl).pipe(
            switchMap(config => {
                console.log('CustomViewDataResolver: Route config result:', config);
                
                if (config) {
                    // Found config by URL path
                    return [config];
                }
                
                // Fallback: try old viewId extraction for backward compatibility
                // Route pattern: /reading/custom-view/{viewId}
                const segments = route.url;
                let viewId = '';
                
                // Find the custom-view segment and get the next segment as viewId
                for (let i = 0; i < segments.length - 1; i++) {
                    if (segments[i].path === 'custom-view') {
                        viewId = segments[i + 1].path;
                        break;
                    }
                }
                
                if (!viewId) {
                    console.error('CustomViewDataResolver: No viewId found and no route config found for:', targetUrl);
                    throw new Error(`No custom view configuration found for URL: ${targetUrl}`);
                }

                console.log('CustomViewDataResolver: Trying viewId lookup:', viewId);
                // Try viewId-based lookup
                return this.configService.getViewConfig(viewId);
            }),
            map(config => {
                if (!config) {
                    console.error('CustomViewDataResolver: Final config is null for:', targetUrl);
                    throw new Error(`No custom view configuration found for URL: ${targetUrl}`);
                }
                console.log('CustomViewDataResolver: Successfully resolved config:', config);
                return config;
            })
        );
    }
}

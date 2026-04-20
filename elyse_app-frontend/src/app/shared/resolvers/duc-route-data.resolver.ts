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
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { DucRouteConfig } from '../interfaces/duc-route.interface';
import { DucRouteConfigService } from '../services/duc-route-config.service';

@Injectable({ providedIn: 'root' })
export class DucRouteDataResolver implements Resolve<DucRouteConfig> {
    constructor(private configService: DucRouteConfigService) {}

    resolve(route: ActivatedRouteSnapshot): Observable<DucRouteConfig> {
        // Get the full path from the route
        // When using wildcard routes, route.url might be empty
        // So we need to get the full URL from the router state
        let fullPath = '';
        
        // Try to get the URL from the route's parent if available
        if (route.parent) {
            const parentUrl = route.parent.url.join('/');
            const childUrl = route.url.join('/');
            fullPath = parentUrl ? (childUrl ? `${parentUrl}/${childUrl}` : parentUrl) : childUrl;
        } else {
            fullPath = route.url.join('/');
        }
        
        // If fullPath is still empty, try to get it from the routerState.url
        if (!fullPath && route.routeConfig && route.routeConfig.path === '**') {
            // For wildcard routes, use the current URL from window location
            fullPath = window.location.pathname.substring(1); // Remove leading slash
        }
        
        // Only log in development mode or when specifically debugging
        const debugMode = false; // Change to true when debugging routing issues
        
        if (debugMode) {
            console.log('🔍 DUC Route full path:', fullPath);
        }
        
        // Get all routes and find the one that matches the URL path
        const allRoutes = this.configService.getAllRoutes();
        
        if (debugMode) {
            console.log('🔍 Total DUC routes loaded:', allRoutes.length);
            console.log('🔍 Sample DUC routes:', allRoutes.slice(0, 3).map(r => ({ routeId: r.routeId, routeUrl: r.routeUrl })));
        }
        
        // Find the route with a matching routeUrl
        const matchingRoute = allRoutes.find(ducRoute => {
            // Normalize the route URL for comparison (remove leading slash)
            const normalizedRouteUrl = ducRoute.routeUrl.replace(/^\//, '');
            const normalizedPath = fullPath.replace(/^\//, '');
            
            // Only log comparisons when debugging is enabled
            if (debugMode) {
                console.log(`🔍 Comparing "${normalizedPath}" with "${normalizedRouteUrl}" from route ${ducRoute.routeId}`);
            }
            
            // Check if the normalized path matches the route URL
            return normalizedRouteUrl === normalizedPath;
        });
        
        if (debugMode) {
            console.log('🔍 Looking specifically for "doc-attr/doc-rblist-names/create"');
            const targetRoute = allRoutes.find(r => r.routeUrl.includes('doc-rblist-names/create'));
            if (targetRoute) {
                console.log('🔍 Found target route:', { routeId: targetRoute.routeId, routeUrl: targetRoute.routeUrl });
            } else {
                console.log('🔍 Target route not found in loaded routes');
            }
        }
        
        if (!matchingRoute) {
            console.error('❌ No DUC configuration found for path:', fullPath);
            console.error('Available DUC routes:', allRoutes.map(r => ({ routeId: r.routeId, routeUrl: r.routeUrl })));
            throw new Error(`No DUC configuration found for path: ${fullPath}`);
        }
        
        if (debugMode) {
            console.log('✅ Found matching route:', { routeId: matchingRoute.routeId, routeUrl: matchingRoute.routeUrl });
        }
        return of(matchingRoute);
    }
}

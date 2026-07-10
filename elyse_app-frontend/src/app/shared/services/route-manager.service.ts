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
import { Observable, map, of, switchMap, timeout, catchError } from 'rxjs';
import { BaseRouteConfig } from '../interfaces/route-base.interface';
import { ReadRouteConfig } from '../interfaces/read-route.interface';
import { ReadRouteConfigService } from './read-route-config.service';
import { DucRouteConfig } from '../interfaces/duc-route.interface';
import { DucRouteConfigService } from './duc-route-config.service';
import { CustomViewConfigService } from './custom-view-config.service';

@Injectable({
    providedIn: 'root'
})
export class RouteManagerService {
    constructor(
        private readRoutes: ReadRouteConfigService,
        private ducRoutes: DucRouteConfigService,
        private customViewRoutes: CustomViewConfigService
    ) {}

    getRouteConfig(routeUrl: string): Observable<BaseRouteConfig | undefined> {
        // NO FALLBACKS - The caller should explicitly specify which type of route they want
        // This method is kept for backward compatibility but should be avoided
        // Use getReadRouteConfig or getDucRouteConfig instead
        console.warn('getRouteConfig is deprecated. Use getReadRouteConfig or getDucRouteConfig instead.');
        
        // Check read routes only
        return this.readRoutes.getRouteConfig(routeUrl);
    }

    isReadRoute(routeUrl: string): Observable<boolean> {
        console.log(`🔍 RouteManager: Checking if ${routeUrl} is a read route`);
        return this.readRoutes.getRouteConfig(routeUrl).pipe(
            map(config => {
                const exists = !!config;
                console.log(`🔍 RouteManager: ${routeUrl} is read route: ${exists}`);
                return exists;
            }),
            catchError((error: any) => {
                console.error(`🔍 RouteManager: Error checking read route ${routeUrl}:`, error);
                return of(false);
            })
        );
    }

    isDucRoute(routeUrl: string): Observable<boolean> {
        console.log(`🔍 RouteManager: Checking if ${routeUrl} is a DUC route`);
        return this.ducRoutes.getRouteConfigByUrl(routeUrl).pipe(
            map(config => {
                const exists = !!config;
                console.log(`🔍 RouteManager: ${routeUrl} is DUC route: ${exists}`);
                return exists;
            }),
            catchError((error: any) => {
                console.error(`🔍 RouteManager: Error checking DUC route ${routeUrl}:`, error);
                return of(false);
            })
        );
    }

    isCustomViewRoute(routeUrl: string): Observable<boolean> {
        console.log(`🔍 RouteManager: Checking if ${routeUrl} is a custom view route`);
        return this.customViewRoutes.getRouteConfig(routeUrl).pipe(
            map(config => {
                const exists = !!config;
                console.log(`🔍 RouteManager: ${routeUrl} is custom view route: ${exists}`, config ? `(found: ${config.viewId})` : '(not found)');
                return exists;
            }),
            catchError((error: any) => {
                console.error(`🔍 RouteManager: Error checking custom view route ${routeUrl}:`, error);
                return of(false);
            })
        );
    }

    getReadRouteConfig(routeUrl: string): Observable<ReadRouteConfig | undefined> {
        return this.readRoutes.getRouteConfig(routeUrl);
    }

    getDucRouteConfig(routeId: string): Observable<DucRouteConfig | undefined> {
        // Pass the RouteId directly to the DucRouteConfigService
        return this.ducRoutes.getRouteConfig(routeId);
    }
}

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
import { Router } from '@angular/router';
import { ReadRouteConfigService } from './read-route-config.service';
import { ReadRouteComponent } from '../components/read-route/read-route.component';

@Injectable({
    providedIn: 'root'
})
export class ReadRoutesInitializerService {
    constructor(
        private router: Router,
        private readRouteConfig: ReadRouteConfigService
    ) {
        this.initializeReadRoutes();
    }

    private initializeReadRoutes() {
        // Get existing routes
        const existingRoutes = this.router.config;
        
        // Get read-routes from CSV
        const readRoutes = this.readRouteConfig.getAllRoutes();
        
        // Create routes for read-routes.csv entries
        const newRoutes = readRoutes.map(config => ({
            path: config.routeUrl.replace(/^\//, ''),
            component: ReadRouteComponent,
            data: { readRouteConfig: config }
        }));

        // Add new routes while preserving existing ones
        this.router.resetConfig([...existingRoutes, ...newRoutes]);
    }
}

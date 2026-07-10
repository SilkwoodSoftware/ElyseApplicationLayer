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
import { CustomViewConfigService } from './custom-view-config.service';
import { CustomViewComponent } from '../components/custom-view/custom-view.component';
import { CustomViewConfig } from '../interfaces/custom-view.interface';
import { filter } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class CustomViewRoutesInitializerService {
    constructor(
        private router: Router,
        private customViewConfig: CustomViewConfigService
    ) {
        this.initializeCustomViewRoutes();
    }

    private initializeCustomViewRoutes() {
        // Wait for custom view config to be loaded using the public isInitialized$ property
        this.customViewConfig.isInitialized$.pipe(
            filter((initialized: boolean) => initialized)
        ).subscribe(() => {
            // Get existing routes
            const existingRoutes = this.router.config;
            
            // Get custom views from CSV using inherited getAllRoutes method
            const customViewConfigs: CustomViewConfig[] = this.customViewConfig.getAllRoutes();
            
            // Create routes for custom-views.csv entries
            const newRoutes = customViewConfigs.map((config: CustomViewConfig) => ({
                path: config.routeUrl.replace(/^\//, ''),
                component: CustomViewComponent,
                data: { customViewConfig: config }
            }));

            // Add new routes while preserving existing ones
            this.router.resetConfig([...existingRoutes, ...newRoutes]);
            
            console.log('Custom view routes initialized:', newRoutes.map((r: any) => r.path));
        });
    }
}

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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ReadRouteConfig } from '../interfaces/read-route.interface';
import { ReadRouteConfigService } from '../services/read-route-config.service';

@Injectable({ providedIn: 'root' })
export class ReadRouteDataResolver implements Resolve<ReadRouteConfig> {
    constructor(private configService: ReadRouteConfigService) {}

    resolve(route: ActivatedRouteSnapshot): Observable<ReadRouteConfig> {
        const fullPath = `/${route.url.join('/')}`;
        return this.configService.getRouteConfig(fullPath).pipe(
            map(config => {
                if (!config) {
                    throw new Error(`No configuration found for route: ${fullPath}`);
                }
                return config;
            })
        );
    }
}

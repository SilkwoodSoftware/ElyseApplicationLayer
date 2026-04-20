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
import { CanMatch, Route, UrlSegment, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { RouteManagerService } from '../services/route-manager.service';

@Injectable({
  providedIn: 'root'
})
export class RouteModuleGuard implements CanMatch {
  constructor(
    private routeManager: RouteManagerService,
    private router: Router
  ) {}

  canMatch(route: Route, segments: UrlSegment[]): Observable<boolean> {
    const fullPath = segments.join('/');
    
    // Check if this is a DUC route
    return this.routeManager.isDucRoute(fullPath).pipe(
      map(isDuc => {
        if (isDuc && route.loadChildren?.toString().includes('duc.module')) {
          // This is a DUC route and we're checking the DUC module - allow
          return true;
        } else if (!isDuc && route.loadChildren?.toString().includes('reading.module')) {
          // This is not a DUC route and we're checking the Reading module - allow
          return true;
        } else {
          // Route doesn't match this module
          return false;
        }
      }),
      catchError(() => of(false))
    );
  }
}

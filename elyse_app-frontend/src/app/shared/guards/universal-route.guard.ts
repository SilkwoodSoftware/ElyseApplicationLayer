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
import { CanMatch, Route, UrlSegment } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { RouteManagerService } from '../services/route-manager.service';
import { ContextAwareRoutingService } from '../services/context-aware-routing.service';

@Injectable({
  providedIn: 'root'
})
export class UniversalRouteGuard implements CanMatch {
  constructor(
    private routeManager: RouteManagerService,
    private contextRouting: ContextAwareRoutingService
  ) {}

  canMatch(route: Route, segments: UrlSegment[]): Observable<boolean> {
    const fullPath = segments.length === 0 ? '/' : `/${segments.join('/')}`;
    
    // DEBUG: Always log that we're in the guard
    console.log(`🛡️ UniversalRouteGuard: STARTING canMatch for Path=${fullPath}`);
    
    // Get the context from menu navigation
    const context = this.contextRouting.getCurrentContext();
    
    // Determine which module this guard is protecting
    const loadChildrenStr = route.loadChildren?.toString() || '';
    const isDucModule = loadChildrenStr.includes('duc.module') || loadChildrenStr.includes('DucModule');
    const isReadingModule = loadChildrenStr.includes('reading.module') || loadChildrenStr.includes('ReadingModule');
    const isCustomViewsModule = loadChildrenStr.includes('custom-views.module') || loadChildrenStr.includes('CustomViewsModule');
    
    // DEBUG: Log what's happening
    console.log(`🛡️ UniversalRouteGuard: Path=${fullPath}, Module=${isCustomViewsModule ? 'CustomViews' : isDucModule ? 'DUC' : isReadingModule ? 'Reading' : 'Unknown'}`);
    console.log(`🛡️ UniversalRouteGuard: Context=`, context);
    console.log(`🛡️ UniversalRouteGuard: LoadChildren=`, loadChildrenStr);
    
    if (context) {
      console.log(`🛡️ UniversalRouteGuard: Context found - ActionType: ${context.actionType}, Expected URL: ${fullPath}, Context URL: ${context.routeUrl}`);
      
      // Check if context is stale (context URL doesn't match current navigation)
      // Compare only the path portions, ignoring query parameters
      const contextPath = context.routeUrl.split('?')[0];
      const isContextStale = contextPath !== fullPath;
      if (isContextStale) {
        console.log(`🛡️ UniversalRouteGuard: ⚠️ STALE CONTEXT DETECTED! Context has ${context.routeUrl} but navigating to ${fullPath}`);
        console.log(`🛡️ UniversalRouteGuard: Clearing stale context and falling back to CSV checking`);
        this.contextRouting.clearContext();
        // Continue with CSV checking logic below
      } else {
        // Use ActionType from menu context as a hint, but ALWAYS verify in CSV
        // Context tells us which CSV to check, but we must verify the route exists
        if (isDucModule && context.actionType === 'DUC') {
          // Verify route exists in DUC CSV
          console.log(`🛡️ UniversalRouteGuard: Context suggests DUC, verifying in CSV: ${fullPath}`);
          return this.routeManager.isDucRoute(fullPath).pipe(
            map(exists => {
              if (exists) {
                console.log(`🛡️ UniversalRouteGuard: ✅ DUC route verified in CSV`);
                this.contextRouting.clearContext();
              } else {
                console.log(`🛡️ UniversalRouteGuard: ❌ DUC route NOT found in CSV, context was invalid`);
                this.contextRouting.clearContext();
              }
              return exists;
            })
          );
        } else if (isReadingModule && context.actionType === 'READ') {
          // Verify route is not a DUC or CustomView route
          console.log(`🛡️ UniversalRouteGuard: Context suggests READ, verifying in CSV: ${fullPath}`);
          return this.routeManager.isDucRoute(fullPath).pipe(
            switchMap(isDuc => {
              if (isDuc) {
                console.log(`🛡️ UniversalRouteGuard: ❌ Route is actually a DUC route, not READ`);
                this.contextRouting.clearContext();
                return [false];
              }
              return this.routeManager.isCustomViewRoute(fullPath).pipe(
                map(isCustomView => {
                  if (isCustomView) {
                    console.log(`🛡️ UniversalRouteGuard: ❌ Route is actually a CustomView route, not READ`);
                    this.contextRouting.clearContext();
                    return false;
                  }
                  console.log(`🛡️ UniversalRouteGuard: ✅ READ route verified (not in DUC or CustomView CSV)`);
                  this.contextRouting.clearContext();
                  return true;
                })
              );
            })
          );
        } else if (isCustomViewsModule && context.actionType === 'CUSTOM') {
          // Verify route exists in CustomView CSV
          console.log(`🛡️ UniversalRouteGuard: Context suggests CUSTOM, verifying in CSV: ${fullPath}`);
          return this.routeManager.isCustomViewRoute(fullPath).pipe(
            map(exists => {
              if (exists) {
                console.log(`🛡️ UniversalRouteGuard: ✅ CustomView route verified in CSV`);
                // Pass the route URL to the resolver via route data
                if (route.data) {
                  route.data['originalUrl'] = context.routeUrl;
                } else {
                  route.data = { originalUrl: context.routeUrl };
                }
                this.contextRouting.clearContext();
              } else {
                console.log(`🛡️ UniversalRouteGuard: ❌ CustomView route NOT found in CSV, context was invalid`);
                this.contextRouting.clearContext();
              }
              return exists;
            })
          );
        } else {
          // ActionType doesn't match module
          console.log(`🛡️ UniversalRouteGuard: ❌ ActionType ${context.actionType} doesn't match module`);
          return new Observable<boolean>(observer => {
            observer.next(false);
            observer.complete();
          });
        }
      }
    }
    
    // No context or stale context - fallback to CSV checking
      
      // Special handling for root path - default to Reading module unless it's a DUC route
      if (fullPath === '/' || segments.length === 0) {
        console.log(`🛡️ UniversalRouteGuard: Handling ROOT PATH (/) for module: ${isCustomViewsModule ? 'CustomViews' : isDucModule ? 'DUC' : isReadingModule ? 'Reading' : 'Unknown'}`);
        if (isDucModule) {
          console.log(`🛡️ UniversalRouteGuard: ❌ REJECTING DucModule for root path`);
          return new Observable<boolean>(observer => {
            observer.next(false);
            observer.complete();
          });
        } else if (isCustomViewsModule) {
          // CustomViewsModule should NEVER handle root path
          console.log(`🛡️ UniversalRouteGuard: ❌ REJECTING CustomViewsModule for root path`);
          return new Observable<boolean>(observer => {
            observer.next(false);
            observer.complete();
          });
        } else if (isReadingModule) {
          console.log(`🛡️ UniversalRouteGuard: ✅ ALLOWING ReadingModule for root path`);
          return new Observable<boolean>(observer => {
            observer.next(true);
            observer.complete();
          });
        }
      }
      
      if (isDucModule) {
        return this.routeManager.isDucRoute(fullPath).pipe(
          map(exists => exists)
        );
      } else if (isCustomViewsModule) {
        // CustomViewsModule should only handle routes that are configured in custom-views.csv
        // Wait for the service to initialize before checking
        console.log(`🛡️ UniversalRouteGuard: Checking if CustomViewsModule should handle ${fullPath}`);
        
        // CRITICAL: Explicitly reject reading module paths
        if (fullPath.startsWith('/reading/')) {
          console.log(`🛡️ UniversalRouteGuard: ❌ EXPLICIT REJECTION - CustomViewsModule should not handle reading paths: ${fullPath}`);
          return new Observable<boolean>(observer => {
            observer.next(false);
            observer.complete();
          });
        }
        
        return this.routeManager.isCustomViewRoute(fullPath).pipe(
          map(exists => {
            console.log(`🛡️ UniversalRouteGuard: CustomView route check for ${fullPath}: ${exists}`);
            if (exists) {
              console.log(`🛡️ UniversalRouteGuard: ✅ ALLOWING CustomViewsModule to handle ${fullPath}`);
            } else {
              console.log(`🛡️ UniversalRouteGuard: ❌ REJECTING CustomViewsModule for ${fullPath}`);
            }
            return exists;
          })
        );
      } else if (isReadingModule) {
        // ReadingModule should only handle routes that are explicitly reading routes
        // First check if it's NOT a DUC route, then check if it's NOT a custom view route
        return this.routeManager.isDucRoute(fullPath).pipe(
          switchMap(isDuc => {
            if (isDuc) {
              return [false]; // DUC routes go to DucModule
            }
            // Check if it's a custom view route
            return this.routeManager.isCustomViewRoute(fullPath).pipe(
              map(isCustomView => {
                console.log(`🛡️ ReadingModule: ${fullPath} isCustomView: ${isCustomView}`);
                return !isCustomView; // Only accept if it's NOT a custom view route
              })
            );
          })
        );
      }
      
      // Unknown module type
      return new Observable<boolean>(observer => {
        observer.next(false);
        observer.complete();
      });
    }
  }


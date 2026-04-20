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
import { BehaviorSubject } from 'rxjs';

export interface NavigationContext {
  actionType: 'READ' | 'DUC' | 'FORM' | 'CHAIN' | 'CUSTOM';
  reference: string;
  routeUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContextAwareRoutingService {
  private currentContext$ = new BehaviorSubject<NavigationContext | null>(null);

  constructor(private router: Router) {}

  /**
   * Navigate with full context from menu system
   */
  navigateWithContext(context: NavigationContext): void {
    console.log(`📍 ContextAwareRouting: Navigating with ActionType: ${context.actionType} to ${context.routeUrl}`);
    
    // Store the context for the guard to access
    this.currentContext$.next(context);
    
    // Navigate to the URL
    this.router.navigateByUrl(context.routeUrl);
  }

  /**
   * Get the current navigation context
   * Used by UniversalRouteGuard to make routing decisions
   */
  getCurrentContext(): NavigationContext | null {
    return this.currentContext$.value;
  }

  /**
   * Clear the context after routing is complete
   */
  clearContext(): void {
    this.currentContext$.next(null);
  }

  /**
   * Check if the current context matches the expected ActionType
   */
  isCurrentActionType(actionType: 'READ' | 'DUC'): boolean {
    const context = this.getCurrentContext();
    return context?.actionType === actionType;
  }
}

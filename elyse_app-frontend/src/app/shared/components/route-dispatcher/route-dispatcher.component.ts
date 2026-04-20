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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContextAwareRoutingService } from '../../services/context-aware-routing.service';

@Component({
  selector: 'app-route-dispatcher',
  template: `<div>Loading...</div>`
})
export class RouteDispatcherComponent implements OnInit {

  constructor(
    private contextRouting: ContextAwareRoutingService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const context = this.contextRouting.getCurrentContext();
    
    if (context && context.actionType === 'CUSTOM') {
      console.log('RouteDispatcher: Detected CUSTOM context, redirecting to CustomViewComponent');
      
      // Get the viewId from the context reference
      const viewId = context.reference;
      
      // Clear context after decision is made
      this.contextRouting.clearContext();
      
      // Navigate to the explicit custom view route
      this.router.navigate(['/reading/custom-view', viewId], {
        queryParamsHandling: 'preserve'
      });
    } else {
      console.log('RouteDispatcher: No CUSTOM context found, should not reach here');
      
      // This shouldn't happen, but fallback to home
      this.router.navigate(['/']);
    }
  }
}

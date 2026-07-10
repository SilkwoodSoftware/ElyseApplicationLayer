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
import { InitialRolesService } from './initial-roles.service';
import { ContextMenuService } from '../../shared/services/context-menu.service';

@Component({
  selector: 'app-initial-roles',
  template: '',
})
export class InitialRolesComponent implements OnInit {
  constructor(
    private initialRolesService: InitialRolesService,
    private contextMenuService: ContextMenuService
  ) {
    console.log('InitialRolesComponent constructor called');
  }


  ngOnInit(): void {
    try {
      const initialRolesStored = localStorage.getItem('initialRolesStored');

      if (!initialRolesStored) {
        this.initialRolesService.getInitialRoles().subscribe(
          (roles) => {
            console.log('Initial roles stored successfully');
            try {
              localStorage.setItem('initialRolesStored', 'true');
            } catch (error) {
              console.error('Error saving initialRolesStored flag to localStorage:', error);
              // Continue anyway - roles are already stored by the service
            }
            
            // Refresh the selected roles in the context menu service
            this.contextMenuService.refreshSelectedRoles();
            
            // No need to reload the page, as the context menu service will update automatically
          },
          (error) => {
            console.error('Error storing initial roles:', error);
          }
        );
      }
    } catch (error) {
      console.error('Error accessing localStorage in InitialRolesComponent:', error);
      // If localStorage is unavailable (e.g., Safari private browsing), try to load roles anyway
      this.initialRolesService.getInitialRoles().subscribe(
        (roles) => {
          console.log('Initial roles loaded (localStorage unavailable)');
          this.contextMenuService.refreshSelectedRoles();
        },
        (error) => {
          console.error('Error loading initial roles:', error);
        }
      );
    }
  }

  private storeSelectedRoles(roles: any[]): void {
    try {
      localStorage.setItem('selectedRoles', JSON.stringify(roles));
      
      // Refresh the selected roles in the context menu service
      this.contextMenuService.refreshSelectedRoles();
    } catch (error) {
      console.error('Error storing selected roles to localStorage:', error);
      // If localStorage is unavailable, roles will only persist in memory
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('localStorage quota exceeded, roles will not persist across sessions');
      }
    }
  }
}

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

// This function gets the authorised roles for the connected user
// from the server and then stores them in the browser local data. 
// This means that all the role functions are visible when the application
// is initially launched.  The user can then later use the rolesComponent
// to change which roles they want to have visible.    
 
 import { Injectable } from '@angular/core';
 import { HttpClient } from '@angular/common/http';
 import { Observable, throwError } from 'rxjs';
 import { tap, map, catchError } from 'rxjs/operators';
 import { environment } from '../../../../src/environments/environment';

 @Injectable({
   providedIn: 'root',
 })
 export class InitialRolesService {
   private get apiUrl(): string {
     return environment.dotNetBaseUrl;
   }
   private get rolesUrl(): string {
     return `${this.apiUrl}/user-roles`;
   }
   private readonly selectedRolesKey = 'selectedRoles';

   constructor(private http: HttpClient) {}
   getInitialRoles(): Observable<any[]> {
    return this.http.get<any>(this.rolesUrl).pipe(
      map((response) => {
        // Extract the roles array from the response
        const roles = Array.isArray(response) ? response : response.userRoles;
        return roles;
      }),
      tap((roles) => {
        this.storeSelectedRoles(roles);
      }),
      catchError((error) => {
        console.error('Error fetching initial roles:', error);
        return throwError(error);
      })
    );
  }

   getStoredSelectedRoles(): any[] {
     const storedRoles = localStorage.getItem(this.selectedRolesKey);
     return storedRoles ? JSON.parse(storedRoles) : [];
   }

   private storeSelectedRoles(roles: any[]): void {
     localStorage.setItem(this.selectedRolesKey, JSON.stringify(roles));
   }
 }

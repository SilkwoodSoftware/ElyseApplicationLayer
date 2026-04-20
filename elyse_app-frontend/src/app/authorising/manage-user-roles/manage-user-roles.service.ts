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
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManageUserRolesService {
  private readonly apiUrl = environment.dotNetBaseUrl;

  constructor(private http: HttpClient) { }

  authoriseUserRole(userId: number, role: string): Observable<any> {
    const url = `${this.apiUrl}/authorise-user`;
    const body = { userId, roleName: role };
    return this.http.post(url, body);
  }

  deleteUserRole(userId: number, role: string): Observable<any> {
    console.log('Deleting role for user ID:', userId);
    const url = `${this.apiUrl}/user-role/delete`;
    const body = { userId, roleToDelete: role };
    return this.http.post(url, body);
  }
}
    

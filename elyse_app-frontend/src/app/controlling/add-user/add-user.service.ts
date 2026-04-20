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

 // Add a user by entering a Windows username or Windows group name
 // as opposed to entering the SID.
 // Note that Windows Group names are not readily converted to binary SID in SQL.
 // See ReadWindowsUsersAndGroupsService.  
 // THE ReadWindowsUsersAndGroupsService CODE WILL NEED TO BE UPDATED FOR PRODUCTION
 // TO SEND A FULLY QUALIFIED NAME USING ACTIVE DIRECTORY
 // THE STORED PROCEDURE APPLIES THE PARAMETER AS:
 // SET @sid_binary = SUSER_SID(@windows_name);
 import { Injectable } from '@angular/core';
 import { HttpClient } from '@angular/common/http';
 import { Observable } from 'rxjs';
 import { environment } from '../../../../src/environments/environment';

 @Injectable({
   providedIn: 'root'
 })
 export class AddUserService {
  private readonly apiUrl = environment.dotNetBaseUrl;   

   constructor(private http: HttpClient) { }

   addUser(windowsName: string, sidDescription: string, sidIsGroup: string): Observable<any> {     
    const payload = { windowsName, sidDescription, sidIsGroup };
    return this.http.post(`${this.apiUrl}/sid-list/add-windows-user`, payload); 
   }
   
   // Method to fetch Windows Users
   getWindowsUsers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/windows-accounts/users`);
  }

  // Method to fetch Windows User Groups
  getWindowsGroups(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/windows-accounts/groups`);
  }
}

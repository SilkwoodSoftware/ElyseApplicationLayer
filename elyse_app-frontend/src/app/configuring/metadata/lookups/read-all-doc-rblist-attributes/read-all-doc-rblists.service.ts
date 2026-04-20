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
import { map } from 'rxjs/operators';
import { environment } from '../../../../../../src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReadAllDocRblistsService {
  private readonly apiUrl = environment.dotNetBaseUrl;   

  constructor(private http: HttpClient) { }

  getAllDocRblists(): Observable<any> {
    const cacheBuster = `?_=${Date.now()}`;    
    return this.http.get(`${this.apiUrl}/doc-attr/all-doc-rblist-attributes${cacheBuster}`).pipe(
      map(response => this.mapResponseData(response))
    );
  }
  private mapResponseData(response: any): any {
    return {
      allDocRblistAttributes: response.allDocRblistAttributes.map((item: any) => ({
        ID: item['List ID'],
        ListName: item['List Name'], 
        NameListPosition: item['Name List Position'],
        Mnemonic: item.Mnemonic,
        Name: item.Name,
        AttributeId: item['Attribute ID'],
        Description: item.Description,
        FilterGroupName: item['Filter Group Name'], 
        filterGroupId: item['Filter Group ID'],
        ListPosition: item['List Position']
        
      })),
      transactionMessage: response.transactionMessage,
      transactionStatus: response.transactionStatus
    };

  }
}

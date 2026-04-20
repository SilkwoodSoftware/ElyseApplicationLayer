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
export class ReadDocRblistNamesService {
  private readonly apiUrl = environment.dotNetBaseUrl;  

  constructor(private http: HttpClient) { }

  getAllDocRblistNames(): Observable<any> {
    const cacheBuster = `?_=${Date.now()}`;
    return this.http.get(`${this.apiUrl}/doc-attr/doc-rblist-names/read${cacheBuster}`).pipe(
      map(response => this.mapResponseData(response))
    );
  }

  private mapResponseData(response: any): any {
    return {
      docRblistNames: response.docRblistNames.map((item: any) => ({
        ID: item.ID,
        Mnemonic: item.Mnemonic,
        Name: item.Name,
        Description: item.Description,
        ListPosition: item['List Position']
      })),
      transactionMessage: response.transactionMessage,
      transactionStatus: response.transactionStatus
    };
  }
}

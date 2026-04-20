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
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EditDocFileDataService {
  private apiUrl = `${environment.dotNetBaseUrl}/forms`;

  constructor(private http: HttpClient) {}

  getDocFileFormValues(documentId: string | null, fileId: number | null, formId?: number | null): Observable<any> {
    let url = `${this.apiUrl}/doc-file-form-values`;
    let params = new HttpParams();
    
    if (documentId) {
      params = params.set('documentId', documentId);
    }
    if (fileId) {
      params = params.set('fileId', fileId.toString());
    }
    if (formId) {
      params = params.set('formId', formId.toString());
    }
    
    return this.http.get(url, { params });
  }
  
  getFieldData(documentId: string | null, fileId: number | null, nameId: string, formId?: number | null): Observable<any> {
    let url = `${this.apiUrl}/field-data`;
    let params = new HttpParams();
    
    if (documentId) {
      params = params.set('documentId', documentId);
    }
    if (fileId) {
      params = params.set('fileId', fileId.toString());
    }
    params = params.set('nameId', nameId);
    if (formId) {
      params = params.set('formId', formId.toString());
    }
    
    return this.http.get(url, { params });
  }
  
  getDefaultDateFormat(): Observable<any> {
    return this.http.get(`${environment.dotNetBaseUrl}/defaults/read-date-format`);
  }
}
    

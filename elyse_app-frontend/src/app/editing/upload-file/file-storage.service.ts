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
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FileStorageService {
  private readonly apiUrl = environment.dotNetBaseUrl;
  private baseUrl = `${this.apiUrl}/file`;

  constructor(private http: HttpClient) {}

  uploadFile(fileContent: ArrayBuffer, fileName: string, documentId?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', new Blob([fileContent]), fileName);
    formData.append('storedFilename', fileName);
    if (documentId) {
      formData.append('documentId', documentId);
    }
    return this.http.post(`${this.baseUrl}/upload`, formData);
  }

  deleteFile(fileId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/delete?fileId=${fileId}`, null);
  }

  getAllFiles(): Observable<any> {
    return this.http.get(`${this.baseUrl}/list`);
  }

  searchFiles(paramName: string, paramValue: string): Observable<any> {
    let params = new HttpParams().set(paramName, paramValue);
    return this.http.get(`${this.baseUrl}/search`, { params });
  }

  getFileData(endpoint: string, params: any): Observable<any> {
    let url = `${this.baseUrl}/${endpoint}`;
    
    let httpParams = new HttpParams();
    for (const key in params) {
      if (params.hasOwnProperty(key) && params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.append(key, params[key].toString());
      }
    }
  
    return this.http.get(url, { params: httpParams });
  }
  
  uploadFileAndLink(fileContent: ArrayBuffer, fileName: string, documentId: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', new Blob([fileContent]), fileName);
    formData.append('storedFilename', fileName);
    formData.append('documentId', documentId);
    return this.http.post(`${this.baseUrl}/file/upload`, formData);
  }

  uploadFileWithMetadata(fileContent: ArrayBuffer, fileName: string, metadata: any): Observable<any> {
    const formData = new FormData();
    formData.append('file', new Blob([fileContent]), fileName);
    formData.append('storedFilename', fileName);
    
    // Add all metadata fields to form data
    for (const key in metadata) {
      if (metadata.hasOwnProperty(key) && metadata[key] !== null && metadata[key] !== undefined && metadata[key] !== '') {
        formData.append(key, metadata[key].toString());
      }
    }
    
    return this.http.post(`${this.baseUrl}/upload`, formData);
  }
}

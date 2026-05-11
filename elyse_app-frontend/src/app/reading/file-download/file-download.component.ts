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

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../src/environments/environment';

@Component({
  selector: 'app-file-download',
  templateUrl: './file-download.component.html',
  styleUrls: ['./file-download.component.css']
})
export class FileDownloadComponent {
  private readonly apiUrl = environment.dotNetBaseUrl; 
  fileId: number = 0; // Initialize fileId property

  constructor(private http: HttpClient) {}

  downloadFile() {
    const url = `${this.apiUrl}/file/download?id=${this.fileId}`;
    this.http.get(url, { responseType: 'json' }).subscribe({
      next: (blob) => {
        // Handle the response blob and trigger the download
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob as Blob); // Cast the blob object to Blob type
        link.download = 'downloaded_file'; // A default filename
        document.body.appendChild(link); // For Firefox
        link.click();
        window.URL.revokeObjectURL(link.href);
        document.body.removeChild(link); // Clean up for Firefox
      },
      error: (error) => {
        console.error('Error downloading file:', error);
      },
      complete: () => {
        console.log('File download completed');
      }
    });
  }
}

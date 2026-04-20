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

// Download a file
import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FileDownloadService {
  private readonly apiUrl = environment.dotNetBaseUrl; 
  constructor(private http: HttpClient) {}

  downloadFile(fileId: number): void {
    const url = `${this.apiUrl}/file/download?id=${fileId}`;
    this.http.get(url, { responseType: 'json' }).subscribe({
      next: (response: any) => {
        if (!response.FileContent) {
          console.error('File content is empty');
          return;
        }

        const filename = response.fileName;
        const fileContent = this.base64ToArrayBuffer(response.FileContent);
        const message = response.Message;
        const transactionStatus = response.TransactionStatus;

        const blob = new Blob([fileContent], { type: 'application/octet-stream' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      },
      error: (error) => {
        console.error('Error downloading file:', error);
      }
    });
  }

  async saveAsFilesToFolder(files: Array<{id: number, displayName: string}>): Promise<Array<{id: string, fileName: string, transactionStatus?: string, transactionMessage?: string, applicationError?: string}>> {
    try {
      // Check if File System Access API is supported
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API not supported in this browser. Please use Chrome 86+ or Edge 86+');
      }

      // Show directory picker for batch save (without readwrite mode to avoid permission prompt)
      const directoryHandle = await (window as any).showDirectoryPicker();

      const results: Array<{id: string, fileName: string, transactionStatus?: string, transactionMessage?: string, applicationError?: string}> = [];

      // Process each file
      for (const file of files) {
        try {
          const url = `${this.apiUrl}/file/download?id=${file.id}`;
          
          // Fetch file data
          const response = await firstValueFrom(this.http.get<any>(url));
          
          if (!response || !response.FileContent) {
            results.push({
              id: file.displayName,
              fileName: '',
              transactionStatus: response?.TransactionStatus || 'Error',
              transactionMessage: response?.Message || 'File content is empty'
            });
            continue;
          }

          const fileName = response.fileName || `file_${file.id}`;
          const fileContent = this.base64ToArrayBuffer(response.FileContent);

          // Create file in the selected directory with unique name handling
          const uniqueFileName = await this.getUniqueFileName(directoryHandle, fileName);
          const fileHandle = await directoryHandle.getFileHandle(uniqueFileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(fileContent);
          await writable.close();

          // Return database messages, not file manager status
          results.push({
            id: file.displayName,
            fileName: uniqueFileName,
            transactionStatus: response.TransactionStatus || 'Success',
            transactionMessage: response.Message || 'File downloaded successfully'
          });

        } catch (error: any) {
          // Application-layer error (File System API, network, etc.)
          // DO NOT hijack transactionStatus and transactionMessage - these are for database errors only
          results.push({
            id: file.displayName,
            fileName: '',
            transactionStatus: undefined,
            transactionMessage: undefined,
            applicationError: error.message || 'Failed to save file'
          });
        }
      }

      return results;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Save operation was cancelled by user');
      } else {
        throw error;
      }
    }
  }

  async saveAsFile(fileId: number, displayName?: string): Promise<{id: string, fileName: string, transactionStatus?: string, transactionMessage?: string, applicationError?: string}> {
    try {
      // Check if File System Access API is supported
      if (!('showSaveFilePicker' in window)) {
        throw new Error('File System Access API not supported in this browser. Please use Chrome 86+ or Edge 86+');
      }

      const url = `${this.apiUrl}/file/download?id=${fileId}`;
      
      // Fetch file data
      const response = await firstValueFrom(this.http.get<any>(url));
      
      if (!response || !response.FileContent) {
        return {
          id: displayName || `File ${fileId}`,
          fileName: '',
          transactionStatus: response?.TransactionStatus || 'Error',
          transactionMessage: response?.Message || 'File content is empty'
        };
      }

      const filename = response.fileName || `file_${fileId}`;
      const fileContent = this.base64ToArrayBuffer(response.FileContent);

      // Show save file picker
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'All Files',
          accept: { '*/*': [] }
        }]
      });

      // Create writable stream and write file content
      const writable = await fileHandle.createWritable();
      await writable.write(fileContent);
      await writable.close();

      // Return database messages, not file manager status
      return {
        id: displayName || filename,
        fileName: filename,
        transactionStatus: response.TransactionStatus || 'Success',
        transactionMessage: response.Message || 'File downloaded successfully'
      };
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Save operation was cancelled by user');
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate a unique filename if there's a collision in the target directory
   */
  private async getUniqueFileName(directoryHandle: any, originalFileName: string): Promise<string> {
    let fileName = originalFileName;
    let counter = 1;
    
    // Keep trying until we find a unique filename
    while (true) {
      try {
        // Try to get the file handle - this will throw if file doesn't exist
        await directoryHandle.getFileHandle(fileName);
        
        // If we get here, file exists - generate a new name
        const lastDotIndex = originalFileName.lastIndexOf('.');
        if (lastDotIndex === -1) {
          // No extension
          fileName = `${originalFileName} (${counter})`;
        } else {
          // Has extension - insert counter before extension
          const nameWithoutExt = originalFileName.substring(0, lastDotIndex);
          const extension = originalFileName.substring(lastDotIndex);
          fileName = `${nameWithoutExt} (${counter})${extension}`;
        }
        counter++;
      } catch (error) {
        // File doesn't exist - this name is unique
        return fileName;
      }
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

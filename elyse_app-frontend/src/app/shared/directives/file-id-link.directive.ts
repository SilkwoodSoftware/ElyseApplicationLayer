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

import { Directive, ElementRef, Input, OnInit, Renderer2, HostListener } from '@angular/core';
import { FileDownloadService } from '../../reading/file-download/file-download.service';

@Directive({
  selector: '[appFileIdLink]'
})
export class FileIdLinkDirective implements OnInit {
  @Input() columnName: string = '';
  @Input() dataField: string = '';
  @Input() value: any;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private fileDownloadService: FileDownloadService
  ) {}

  ngOnInit() {
    // Apply to all File ID columns regardless of data source
    if (this.columnName === 'File ID' && this.value) {
      // Make the text look like a link
      this.renderer.setStyle(this.el.nativeElement, 'color', 'blue');
      this.renderer.setStyle(this.el.nativeElement, 'text-decoration', 'underline');
      this.renderer.setStyle(this.el.nativeElement, 'cursor', 'pointer');
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    // Handle clicks on all File ID columns
    if (this.columnName === 'File ID' && this.value) {
      event.preventDefault();
      event.stopPropagation();
      this.fileDownloadService.downloadFile(Number(this.value));
    }
  }
}

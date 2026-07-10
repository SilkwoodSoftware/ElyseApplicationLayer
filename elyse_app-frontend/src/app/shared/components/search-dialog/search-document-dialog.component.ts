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


import { Component, ElementRef, ViewChild, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-document-dialog',
  templateUrl: 'search-document-dialog.component.html',
  styleUrls: ['../../stylesheets/dialogs.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class SearchDocumentDialogComponent {
  searchForm: FormGroup;
  @ViewChild('dialogContainer') dialogContainer!: ElementRef;

  private isDragging = false;
  private mouseOffset = { x: 0, y: 0 };

  constructor(
    private formBuilder: FormBuilder,
    private dialogRef: MatDialogRef<SearchDocumentDialogComponent>,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) public data: { endpoint: string }
  ) {
    this.searchForm = this.formBuilder.group({
      documentId: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.searchForm.valid) {
      const documentId = this.searchForm.get('documentId')?.value;
      this.dialogRef.close();
      this.router.navigate([`/document/${this.data.endpoint}`], { queryParams: { documentId: encodeURIComponent(documentId) } });   
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    const dialogRect = this.dialogContainer.nativeElement.getBoundingClientRect();
    this.mouseOffset = {
      x: event.clientX - dialogRect.left,
      y: event.clientY - dialogRect.top
    };
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const dialogElement = this.dialogContainer.nativeElement;
      dialogElement.style.left = `${event.clientX - this.mouseOffset.x}px`;
      dialogElement.style.top = `${event.clientY - this.mouseOffset.y}px`;
    }
  }

  onMouseUp() {
    this.isDragging = false;
  }
}
    

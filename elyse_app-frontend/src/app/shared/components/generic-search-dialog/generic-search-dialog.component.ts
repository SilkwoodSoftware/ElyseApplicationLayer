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
import { MatDialogModule } from '@angular/material/dialog';

export interface GenericSearchDialogData {
  title: string;
  placeholder: string;
  searchType: string;
}

@Component({
  selector: 'app-generic-search-dialog',
  templateUrl: './generic-search-dialog.component.html',
  styleUrls: ['../../stylesheets/dialogs.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule]
})



export class GenericSearchDialogComponent {
  searchForm: FormGroup;
  
  

  constructor(
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<GenericSearchDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GenericSearchDialogData,
    private router: Router
) {
  this.searchForm = this.formBuilder.group({
    searchString: ['', Validators.required]
  });
}

@ViewChild('dialogContainer') dialogContainer!: ElementRef;

private isDragging = false;
private mouseOffset = { x: 0, y: 0 };

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



onSubmit(): void {
  if (this.searchForm.valid) {
    const searchTerm = this.searchForm.get('searchString')?.value;
    this.dialogRef.close(searchTerm);

    if (this.data.searchType === 'file') {
      this.router.navigate(['/file/search-results'], { queryParams: { searchTerm: searchTerm } });
    }
    
  }
}

  onCancel(): void {
    this.dialogRef.close();
  }
}

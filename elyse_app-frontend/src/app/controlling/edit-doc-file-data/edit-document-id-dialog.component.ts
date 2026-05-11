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

import { Component, Inject } from '@angular/core';
 import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
 import { FormBuilder, FormGroup, Validators } from '@angular/forms';
 import { MatDialogModule } from '@angular/material/dialog';
 import { MatFormFieldModule } from '@angular/material/form-field';
 import { MatInputModule } from '@angular/material/input';
 import { MatButtonModule } from '@angular/material/button';
 import { ReactiveFormsModule } from '@angular/forms';

 @Component({
   selector: 'app-edit-document-id-dialog',
   templateUrl: './edit-document-id-dialog.component.html',
   standalone: true,
   imports: [
     MatDialogModule,
     MatFormFieldModule,
     MatInputModule,
     MatButtonModule,
     ReactiveFormsModule
   ]
 })
 export class EditDocumentIdDialogComponent {
   form: FormGroup;

   constructor(
     private fb: FormBuilder,
     public dialogRef: MatDialogRef<EditDocumentIdDialogComponent>,
     @Inject(MAT_DIALOG_DATA) public data: { currentDocumentId: string }
   ) {
     this.form = this.fb.group({
       newDocumentId: ['', Validators.required]
     });
   }

   onCancel(): void {
     this.dialogRef.close();
   }

   onSubmit(): void {
     if (this.form.valid) {
       this.dialogRef.close(this.form.value.newDocumentId);
     }
   }
 }

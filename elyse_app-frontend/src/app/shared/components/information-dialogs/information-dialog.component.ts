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

import { Component, Inject, ElementRef, ViewChild } from '@angular/core';
 import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

 @Component({
   selector: 'app-information-dialog',
   templateUrl: './information-dialog.component.html',
   styleUrls: ['./information-dialog.component.scss']
 })
 export class InformationDialogComponent {
   @ViewChild('dialogContainer') dialogContainer!: ElementRef;

   private isDragging = false;
   private mouseOffset = { x: 0, y: 0 };

   constructor(
     public dialogRef: MatDialogRef<InformationDialogComponent>,
     @Inject(MAT_DIALOG_DATA) public data: {
       title: string;
       message1: string;
       message2: string;
       message3: string;
       message4: string;
     }
   ) {}

   closeDialog(): void {
     this.dialogRef.close();
   }
   onNoClick(): void {
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

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
 import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
 import { DeleteDocRblistService } from './delete-doc-rblist.service';
 import { SelectedIdsService } from '../../../../shared/services/selected-ids.service';
 import { DocRblistRefreshService } from '../read-doc-rblist-names/doc-rblist-refresh.service';

 @Component({
   selector: 'app-delete-doc-rblist',
   templateUrl: './delete-doc-rblist.component.html',
   styleUrls:  ['./delete-doc-rblist.component.scss']
 })
 export class DeleteDocRblistComponent {
   @ViewChild('dialogContainer') dialogContainer!: ElementRef;

   private isDragging = false;
   private mouseOffset = { x: 0, y: 0 };

   constructor(
     public dialogRef: MatDialogRef<DeleteDocRblistComponent>,
     @Inject(MAT_DIALOG_DATA) public data: {
       docRblists: any[];
       selectedIds: number[];
       selectedNames: string[];
     },
     private deleteDocRblistService: DeleteDocRblistService,
     private selectedIdsService: SelectedIdsService,
     private docRblistRefreshService: DocRblistRefreshService
    ) {
      // Call the delete method when the component is initialized
      this.onDelete();
    }

   onDelete(): void {
    this.deleteDocRblistService.deleteDocRblists(this.data.selectedIds, this.data.selectedNames);
    this.dialogRef.close();
   }

   closeDialog(): void {
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

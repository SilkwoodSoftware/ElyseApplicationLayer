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

 import { Component, ElementRef, ViewChild } from '@angular/core';
 import { FormBuilder, FormGroup, Validators } from '@angular/forms';
 import { AddDocRblistService } from './add-doc-rblist.service';
 import { MatDialogRef, MatDialog } from '@angular/material/dialog';
 import { SelectedIdsService } from '../../../../shared/services/selected-ids.service';
 import { TransactionResultDialogComponent } from '../../../../shared/components/transaction-results/transaction-result-dialog.component';
 

 interface AddDocRblistRequest {
   Mnemonic: string;
   AttributeName: string;
   Description: string;
   ListPosition: number | null;
 }

 @Component({
   selector: 'app-add-doc-rblist',
   templateUrl: './add-doc-rblist.component.html',
   styleUrls: [ './add-doc-rblist.component.scss']
 })
 export class AddDocRblistComponent {
   addDocRblistForm: FormGroup;
   @ViewChild('dialogContainer') dialogContainer!: ElementRef;

   private isDragging = false;
   private mouseOffset = { x: 0, y: 0 };

   constructor(
     private formBuilder: FormBuilder,
     private addDocRblistService: AddDocRblistService,
     private dialogRef: MatDialogRef<AddDocRblistComponent>,
     private selectedIdsService: SelectedIdsService,
     private dialog: MatDialog
   ) {
     this.addDocRblistForm = this.formBuilder.group({
       mnemonic: [''],
       attributeName: ['', Validators.required],
       description: [''],
       position: [Number]
     });
   }

   onSubmit() {    
     if (this.addDocRblistForm.valid) {      
       const addDocRblistRequest: AddDocRblistRequest = {
        Mnemonic: this.addDocRblistForm.value.mnemonic,
        AttributeName: this.addDocRblistForm.value.attributeName,
        Description: this.addDocRblistForm.value.description,
        ListPosition: this.addDocRblistForm.value.position || null 
      };     

       console.log(addDocRblistRequest);
       this.addDocRblistService.addDocRblist(addDocRblistRequest).subscribe(
         (response) => {
           // Open the transaction result dialog
           const dialogRef = this.dialog.open(TransactionResultDialogComponent, {
             data: {
               title: 'Add Document Radio Button List Transaction Outcome',
               message: response.transactionMessage,
               status: response.transactionStatus
             }
           });
           dialogRef.afterClosed().subscribe(() => {
             // Notify ReadDocRblistNamesComponent to refresh the table
             this.selectedIdsService.notifyDocRblistAdded();
             // Close the add doc rblist dialog
             this.dialogRef.close();
           });
         },
         (error) => {
           console.error('Error adding document radio button list:', error);
           // Handle error, e.g., show an error message
         }
       );
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

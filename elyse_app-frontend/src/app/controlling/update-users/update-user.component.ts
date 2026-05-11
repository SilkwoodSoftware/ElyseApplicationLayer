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
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { SelectedIdsService } from '../../shared/services/selected-ids.service';
import { TransactionResultDialogComponent } from '../../shared/components/transaction-results/transaction-result-dialog.component';
import { UpdateUserService } from './update-user.service';

@Component({
  selector: 'app-update-user',
  templateUrl: './update-user.component.html',
  styleUrls: ['./update-user.component.scss']
})
export class UpdateUserComponent {
  updateUserForm: FormGroup;
  @ViewChild('dialogContainer') dialogContainer!: ElementRef;

  private isDragging = false;
  private mouseOffset = { x: 0, y: 0 };

  constructor(
    private formBuilder: FormBuilder,
    private updateUserService: UpdateUserService,
    private dialogRef: MatDialogRef<UpdateUserComponent>,
    private selectedIdsService: SelectedIdsService,
    private dialog: MatDialog
  ) {
    this.updateUserForm = this.formBuilder.group({
      sidRecordId: [''],
      sidName: ['', Validators.required],
      sidDescription: [''],
      sidUsername: [''],
      sidIsGroup: [''] 
    });
  }

  ngOnInit(): void {
    this.selectedIdsService.selectedUserData$.subscribe(userData => {
      if (userData) {
        this.updateUserForm.patchValue({
          sidRecordId: userData.id,
          sidName: userData.name,
          sidDescription: userData.description,
          sidUsername: userData.username,
          sidIsGroup: userData.isGroup
        });
      }
    });
  }

  onSubmit() {
    if (this.updateUserForm.valid) {
      const updateUserRequest = this.updateUserForm.value;
      this.updateUserService.updateUser(updateUserRequest).subscribe(
        (response) => {
          // Open the transaction result dialog
          const dialogRef = this.dialog.open(TransactionResultDialogComponent, {
            data: {
              title: 'Update User Transaction Outcome',
              message: response.transactionMessage,
              status: response.transactionStatus
            }
          });
          dialogRef.afterClosed().subscribe(() => {
            // Notify ListUsersComponent to refresh the table
            this.selectedIdsService.notifyUserUpdated();
            // Close the update user dialog
            this.dialogRef.close();
          });
        },
        (error) => {
          console.error('Error updating user:', error);
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
    

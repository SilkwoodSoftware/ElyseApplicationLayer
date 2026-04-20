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
import { AddSidStringService } from './add-sid-string.service';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { SelectedIdsService } from '../../shared/services/selected-ids.service';
import { TransactionResultDialogComponent } from '../../shared/components/transaction-results/transaction-result-dialog.component';
import { InformationDialogComponent } from '../../shared/components/information-dialogs/information-dialog.component';

interface AddSidRequest {
  sidString: string;
  sidName?: string;
  sidDescription?: string;
  sidIsGroup: string;
}

@Component({
  selector: 'app-add-sid-string',
  templateUrl: './add-sid-string.component.html',
  styleUrls: [ './add-sid-string.component.scss']
})
export class AddSidStringComponent {
  addSidForm: FormGroup;
  @ViewChild('dialogContainer') dialogContainer!: ElementRef;

  private isDragging = false;
  private mouseOffset = { x: 0, y: 0 };

  constructor(
    private formBuilder: FormBuilder,
    private addSidStringService: AddSidStringService,
    private dialogRef: MatDialogRef<AddSidStringComponent>,
    private selectedIdsService: SelectedIdsService,
    private dialog: MatDialog
  ) {
    this.addSidForm = this.formBuilder.group({
      sidString: ['', Validators.required],
      sidName: [''],
      sidDescription: [''],
      sidIsGroup: ['']
    });
  }

  onSubmit() {
    if (this.addSidForm.valid) {
      const addSidRequest: AddSidRequest = this.addSidForm.value;
      this.addSidStringService.addSidString(addSidRequest).subscribe(
        (response) => {
          // Open the transaction result dialog
          const dialogRef = this.dialog.open(TransactionResultDialogComponent, {
            data: {
              title: 'Add User Transaction Outcome',
              message: response.transactionMessage,
              status: response.transactionStatus
            }
          });
          dialogRef.afterClosed().subscribe(() => {
            // Notify ListUsersComponent to refresh the table
            this.selectedIdsService.notifyUserAdded();
            // Close the add user dialog
            this.dialogRef.close();
          });
        },
        (error) => {
          console.error('Error adding SID:', error);
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
  openInformationDialog(): void {
    const dialogRef = this.dialog.open(InformationDialogComponent, {
      data: {
        title: 'Copying a SID String',
        message1: 'Open PowerShell as admin and execute one of the following:',
        message2: 'Get-WmiObject Win32_UserAccount | Select-Object Name, SID',
        message3: 'Get-LocalGroup | ForEach-Object { $_.Name + ": " + $_.SID.Value }',
        message4: 'Get-ADGroup -Filter * | ForEach-Object { $_.Name + ": " + $_.SID.Value }'
      }
    });
  }

}

    

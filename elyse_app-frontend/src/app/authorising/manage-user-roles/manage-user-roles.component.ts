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
import { ManageUserRolesService } from './manage-user-roles.service';
import { forkJoin } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { RolesTransactionResultComponent } from '../../shared/components/transaction-results/roles-transaction-result.component';
import { ApplicationErrorDialogComponent } from '../../shared/components/application-error-dialog/application-error-dialog.component';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-manage-user-roles',
  templateUrl: './manage-user-roles.component.html',
  styleUrls: ['./manage-user-roles.component.scss']
})
export class ManageUserRolesComponent {
  @ViewChild('dialogContainer') dialogContainer!: ElementRef;

  private isDragging = false;
  private mouseOffset = { x: 0, y: 0 };

  allRoles: string[] = ['Configurator', 'Controller', 'Editor', 'Reviewer', 'Reader'];
  rolesToChange: { [key: string]: 'Authorize' | 'Remove' } = {};
  isLoading = false; 

  constructor(
    public dialogRef: MatDialogRef<ManageUserRolesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      userId: number;
      username: string;
      roles: string[];
    },
    private manageUserRolesService: ManageUserRolesService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    console.log('Initial user roles:', this.data.roles);
  }

  isRoleAuthorised(role: string): boolean {
    return this.data.roles.includes(role);
  }

  onActionChange(role: string): void {
    if (this.rolesToChange[role]) {
      delete this.rolesToChange[role];
    } else {
      this.rolesToChange[role] = this.isRoleAuthorised(role) ? 'Remove' : 'Authorize';
    }
    console.log('Roles to change:', this.rolesToChange);
  }

  onSubmit(): void {
    this.isLoading = true; 

    const requests: any[] = [];

    for (const role in this.rolesToChange) {
      if (this.rolesToChange[role] === 'Authorize') {
        console.log(`Authorizing role ${role} for user ${this.data.userId}`);
        requests.push(this.manageUserRolesService.authoriseUserRole(this.data.userId, role).pipe(
          map((response: any) => ({...response, role}))
        ));
      } else if (this.rolesToChange[role] === 'Remove') {
        console.log(`Deleting role ${role} for user ${this.data.userId}`);
        requests.push(this.manageUserRolesService.deleteUserRole(this.data.userId, role).pipe(
          map((response: any) => ({...response, role}))
        ));
      }
    }

    console.log('Requests:', requests);

    if (requests.length === 0) {
      console.log('No changes made, closing dialog');
      this.isLoading = false;
      this.dialogRef.close();
      return;
    }

    forkJoin(requests).subscribe(
      (results) => {
        console.log('API responses:', results);
        this.isLoading = false;
        const transactionResults = results.map((result: any) => ({
          action: this.rolesToChange[result.role],
          role: result.role,
           transactionMessage: result.transactionMessage,
           transactionStatus: result.transactionStatus
        }));
        console.log('Transaction Results:', transactionResults); 

        const dialogRef = this.dialog.open(RolesTransactionResultComponent, {
          data: {
            title: `Manage User Roles Transaction Results for ${this.data.username}`,
            transactionResults: transactionResults
          }
        });

        dialogRef.afterClosed().subscribe(() => {
          this.dialogRef.close(transactionResults);
        });
      },
      (error) => {
        console.error('Error managing user roles:', error);
        this.isLoading = false;
        this.dialog.open(ApplicationErrorDialogComponent, {
          data: {
            title: 'Application Error',
            message: 'An error occurred while managing user roles.',
            status: 'Application layer error'
          }
        });
      }
    );
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
    

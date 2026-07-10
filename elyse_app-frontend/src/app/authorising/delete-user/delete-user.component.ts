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

import { Component } from '@angular/core';
import { DeleteUserService } from './delete-user.service';
import { ApplicationMessageService } from '../../shared/services/application-message.service';

@Component({
  selector: 'app-delete-user',
  templateUrl: './delete-user.component.html',
  styleUrls:  ['./delete-user.component.scss']
})
export class DeleteUserComponent {
  // Database response properties (read-only, handled by MessageLabelService)
  databaseResponse?: any;
  
  // Application layer properties
  operationStatus?: string;
  applicationMessages?: any;

  constructor(
    private deleteUserService: DeleteUserService,
    private applicationMessageService: ApplicationMessageService
  ) {}

  deleteUser(userId: number) {
    this.deleteUserService.deleteUser(userId).subscribe({
      next: (response) => {
        if (response) {
          // Store database response for MessageLabelService (read-only)
          this.databaseResponse = response;
          
          // Set application layer status based on database response
          this.operationStatus = response.transactionStatus === 'Good' ? 'Success' : 'Failed';
          
          if (response.transactionStatus !== 'Good') {
            this.applicationMessages = this.applicationMessageService.createValidationError(
              'Delete operation was not successful'
            );
          } else {
            this.applicationMessages = this.applicationMessageService.createInfo(
              'User deleted successfully'
            );
          }
        } else {
          this.operationStatus = 'Failed';
          this.applicationMessages = this.applicationMessageService.createValidationError(
            'No response received from server'
          );
        }
      },
      error: (error) => {
        // Set application error message without hijacking database parameters
        this.operationStatus = 'Failed';
        this.applicationMessages = this.applicationMessageService.createFromHttpError(error);
        console.error('Error deleting user:', error);
      }
    });
  }
}

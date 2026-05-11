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

import { Component, OnInit } from '@angular/core';
import { AddUserService } from './add-user.service';
import { MessageLabelService } from '../../shared/services/message-label.service';

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit {
  users: string[] = []; // Array to store the fetched Windows users
  groups: string[] = []; // Array to store the fetched Windows groups
  selectedWindowsName: string = '';
  sidDescription: string = '';
  result: any;
  selectedType: 'user' | 'group' = 'user'; 
  userInput: string = '';
  description: string = '';
  messageItems: { label: string, value: string }[] = [];

  constructor(private addUserService: AddUserService,
    private messageLabelService: MessageLabelService
  ) { }

  ngOnInit(): void {
    this.fetchWindowsUsers(); // No longer calls on init but retained for reference
    this.fetchWindowsGroups(); // No longer calls on init but retained for reference
    this.fetchOptions();
  }
  onTypeChange(selection: 'user' | 'group'): void {
    this.selectedType = selection;
    this.fetchOptions();
  }
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.userInput = target.value;
  }

  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedWindowsName = target.value;
    this.userInput = target.value; // Update userInput with the selected value
  }

  fetchWindowsUsers(): void {
    this.addUserService.getWindowsUsers().subscribe({
      next: (users) => this.users = users,
      error: (error) => console.error('Error fetching Windows Users:', error)
    });
    }

  fetchWindowsGroups(): void {
    this.addUserService.getWindowsGroups().subscribe({
      next: (groups) => this.groups = groups,
      error: (error) => console.error('Error fetching Windows Groups:', error)
    });
  
  }
  fetchOptions(): void {
    if (this.selectedType === 'user') {
      this.fetchWindowsUsers();
    } else {
      this.fetchWindowsGroups();
    }
  }
  onSubmit(): void {
    this.addUserService.addUser(this.userInput, this.description, this.selectedType === 'group' ? 'Yes' : 'No').subscribe({
      next: (result) => {
        this.result = result;
        this.updateMessageItems(result);
        console.log('Add User Success:', result);
      },
      error: (error) => console.error('Add User Error:', error)
    });
  }
  
  private updateMessageItems(data: any): void {
    this.messageItems = [
      { label: this.messageLabelService.getLabel('transactionMessage'), value: data.transactionMessage || '' },
      { label: this.messageLabelService.getLabel('transactionStatus'), value: data.transactionStatus || '' },
      { label: this.messageLabelService.getLabel('newUserId'), value: data.newUserId?.toString() || '' }
    ];
  }
}
  

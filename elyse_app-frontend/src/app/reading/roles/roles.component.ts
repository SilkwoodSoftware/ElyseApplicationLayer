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

import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { RolesService } from './roles.service';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { ContextMenuService } from '../../shared/services/context-menu.service';
import { CommandPaletteService } from '../../shared/services/command-palette.service';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class RolesComponent implements OnInit {
  @ViewChild('dialogContainer') dialogContainer!: ElementRef;

  roles: any[] = [];
  selectedRoles: any[] = [];
  private isDragging = false;
  private mouseOffset = { x: 0, y: 0 };

  constructor(
    private rolesService: RolesService,
    private router: Router,
    private dialogRef: MatDialogRef<RolesComponent>,
    private contextMenuService: ContextMenuService,
    private commandPaletteService: CommandPaletteService
  ) { }

  ngOnInit(): void {
    this.rolesService.getRoles().subscribe({
      next: (data) => {
        // Define the desired order of roles
        const roleOrder = ['Authorizer', 'Configurator', 'Controller', 'Editor', 'Reviewer', 'Reader'];
        
        // Sort roles according to the defined order
        this.roles = data.userRoles.sort((a: any, b: any) => {
          const aIndex = roleOrder.indexOf(a['Role Name']);
          const bIndex = roleOrder.indexOf(b['Role Name']);
          return aIndex - bIndex;
        });
        
        this.getSelectedRoles();
      },
      error: (error) => console.error('Error fetching roles:', error),
    });
  }

  onRoleChange(role: any, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      if (!this.isRoleSelected(role)) { 
        this.selectedRoles.push(role);
      }
    } else {
      const index = this.selectedRoles.findIndex(selectedRole => selectedRole['Role Name']?.toLowerCase() === role['Role Name']?.toLowerCase());
      if (index !== -1) {
        this.selectedRoles.splice(index, 1);
      }
    }
  }

  onSubmit(): void {
    localStorage.setItem('selectedRoles', JSON.stringify(this.selectedRoles));
    
    // Clear command palette cache since roles have changed
    // This prevents stale commands from appearing for old roles
    console.log('Roles changed, clearing command palette cache');
    this.commandPaletteService.clearCache();
    
    // Refresh the selected roles in the context menu service
    this.contextMenuService.refreshSelectedRoles();
    
    // Close the dialog
    this.dialogRef.close();
    
    // Refresh the page to reflect the changes in the UI
    window.location.reload();
  }

  getSelectedRoles(): void {
    const storedRoles = localStorage.getItem('selectedRoles');
    if (storedRoles) {
      this.selectedRoles = JSON.parse(storedRoles);
    }
  }
 
  isRoleSelected(role: any): boolean {
    return this.selectedRoles.some(selectedRole => selectedRole['Role Name']?.toLowerCase() === role['Role Name']?.toLowerCase());
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

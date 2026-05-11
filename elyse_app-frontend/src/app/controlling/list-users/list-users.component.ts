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


import { Component, OnInit, HostListener, 
         ElementRef, ViewChild, Output, EventEmitter, 
         Input, ChangeDetectorRef  } from '@angular/core';
import { ListUsersService } from './list-users.service';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { SelectedIdsService } from '../../shared/services/selected-ids.service';
import { Subscription } from 'rxjs';
import { TableActionsService } from '../../shared/components/table-actions/table-actions.service';
import { MessageLabelService } from '../../shared/services/message-label.service';
import { TableSelectionExtensionService } from '../../shared/services/table-selection-extension.service';
import { ReadRouteConfigService } from '../../shared/services/read-route-config.service';

@Component({
  selector: 'app-list-users',
  templateUrl: './list-users.component.html',
  styleUrls: ['./../../shared/stylesheets/tables.scss', 
              './../../shared/stylesheets/messages.scss']
})
export class ListUsersComponent implements OnInit {
    sidList: any[] = [];
    selectedRows: any[] = [];
    sortColumn: string = '';
    sortOrder: 'asc' | 'desc' = 'asc';
    result: any; 
    selectedIds: number[] = [];
    selectedUsernames: string[] = []; // Array to store selected usernames
    messageItems: { label: string, value: string }[] = [];
    tableColumns: string[] = []; // Array to store column names for the table
    visibleColumns: string[] = []; // Array to store visible column names for the table
    isListAllUsersRoute: boolean = false; // Flag to track if we're on the list-all-users route
    routeConfig: any; // Configuration from read-routes.csv
    @Input() userDeleted: EventEmitter<void> = new EventEmitter<void>();
    @Output() selectedIdsChange = new EventEmitter<number[]>();
    @ViewChild('tableContainer', { static: false }) tableContainerElement!: ElementRef<HTMLElement>;

 
    private resizingColumn: HTMLElement | null = null;
    private startX: number = 0;
    private startWidth: number = 0;
    private scrollPosition: number = 0;
    private getAllSidListSubscription: Subscription | null = null;
    private isDragging: boolean = false;
    private mouseDownPosition: { x: number, y: number } | null = null;
    private dragStartPosition: { x: number, y: number } | null = null;
    private userAddedSubscription: Subscription | null = null;
    private userUpdatedSubscription: Subscription | null = null; // NEW: Subscription for user update events

    constructor(
      private listUsersService: ListUsersService,
      private matIconRegistry: MatIconRegistry,
      private domSanitizer: DomSanitizer,
      private router: Router,
      private elementRef: ElementRef,
      private selectedIdsService: SelectedIdsService,
      private cdr: ChangeDetectorRef,
      private tableActionsService: TableActionsService,
      private messageLabelService: MessageLabelService,
      private tableSelectionExtensionService: TableSelectionExtensionService,
      private readRouteConfigService: ReadRouteConfigService
    ) { }
 
    ngOnInit(): void {
      // Check if we're on the list-all-users route
      const currentUrl = this.router.url;
      this.isListAllUsersRoute = currentUrl.includes('list-all-users');
      console.log('Current route:', currentUrl, 'isListAllUsersRoute:', this.isListAllUsersRoute);
      
      // Get route configuration for either route
      const routes = this.readRouteConfigService.getAllRoutes();
      
      if (this.isListAllUsersRoute) {
        // For list-all-users route
        this.routeConfig = routes.find(route =>
          route.routeUrl === '/list-all-users' ||
          route.routeUrl === 'list-all-users'
        );
      } else {
        // For list-users route
        this.routeConfig = routes.find(route =>
          route.routeUrl === '/list-users' ||
          route.routeUrl === 'list-users'
        );
      }
      
      console.log('Route config:', this.routeConfig);
      
      // If we didn't find a route config, log an error
      if (!this.routeConfig) {
        console.error('No route configuration found for current route. Available routes:',
          routes.map(r => r.routeUrl));
      }
      
      // Log the hidden columns if they exist
      if (this.routeConfig?.tableConfig?.hiddenColumns) {
        console.log('Hidden columns from config:', this.routeConfig.tableConfig.hiddenColumns);
      } else {
        console.error('No hidden columns found in route configuration');
      }
      
      this.fetchSidList();
      this.selectedIdsService.userDeleted$.subscribe(() => {
        console.log('Received userDeleted event, refreshing table.');
        this.refreshTable(); // Calls the method to refresh the table
      });
      // Subscribe to userAdded$ observable
      this.userAddedSubscription = this.selectedIdsService.userAdded$.subscribe(() => {
        console.log('Received userAdded event, refreshing table.');
        this.refreshTable();
      });
           // Subscribe to userUpdated$ observable
         this.userUpdatedSubscription = this.selectedIdsService.userUpdated$.subscribe(() => {
          console.log('Received userUpdated event, refreshing table.');
          this.refreshTable();
         });
    }
    refreshTable(): void {
      console.log('Refreshing user list table.');
    // Unsubscribe from the previous subscription if it exists
    if (this.getAllSidListSubscription) {
      this.getAllSidListSubscription.unsubscribe();
    }
    this.fetchSidList(); // Fetch the latest data
  }
    
    onUserDeleted(): void {
      this.tableActionsService.onDeleteUser(this.selectedIds, this.selectedUsernames);
    }
 
    fetchSidList(): void {
      console.log('Making HTTP request to fetch updated SID list.');
      // Assign the subscription to the property
      this.getAllSidListSubscription = this.listUsersService.getAllSidList().subscribe(
        (response) => {
          console.log('Response received:', response);
          
          // Check if response has sidList property
          if (response && response.sidList && Array.isArray(response.sidList)) {
            this.sidList = response.sidList;
          } else if (response && Array.isArray(response)) {
            // If response is an array, use it directly
            this.sidList = response;
          } else if (response && response.data && Array.isArray(response.data)) {
            // If response has a data property that is an array, use it
            this.sidList = response.data;
          } else {
            // Default to empty array if no valid data found
            console.error('No valid data found in response:', response);
            this.sidList = [];
          }
          
          // Extract column names from the first row of data
          if (this.sidList.length > 0) {
            this.tableColumns = Object.keys(this.sidList[0]);
            console.log('Table columns:', this.tableColumns);
            
            // If we're on the list-all-users route and have a route config with hidden columns
            if (this.isListAllUsersRoute && this.routeConfig?.tableConfig?.hiddenColumns) {
              const hiddenColumns = this.routeConfig.tableConfig.hiddenColumns;
              console.log('Applying hidden columns:', hiddenColumns);
              
              // Filter out hidden columns
              this.visibleColumns = this.tableColumns.filter(column => {
                const isHidden = hiddenColumns.some((hiddenCol: string) =>
                  column.includes(hiddenCol) || hiddenCol.includes(column)
                );
                return !isHidden;
              });
              
              console.log('Visible columns after filtering:', this.visibleColumns);
            } else {
              // If not on list-all-users route or no hidden columns, show all columns
              this.visibleColumns = [...this.tableColumns];
              console.log('No hidden columns applied, showing all columns:', this.visibleColumns);
            }
          }
          
          this.result = {
            numberOfRows: response.numberOfRows || (this.sidList ? this.sidList.length : 0)
          };
          
          // Only include database transaction parameters if they actually exist
          if (response.transactionMessage) {
            this.result.transactionMessage = response.transactionMessage;
          }
          if (response.transactionStatus) {
            this.result.transactionStatus = response.transactionStatus;
          }
          
          console.log('SID list fetched, updating sidList property. Length:', this.sidList.length);
          this.cdr.detectChanges(); // Trigger change detection

          // Clear selected IDs and usernames after table refresh
          this.selectedRows = [];
          this.selectedIds = [];
          this.selectedUsernames = [];
          this.selectedIdsService.setSelectedIdsAndUsernames([], []);
          this.updateMessageItems(response);
        },
        (error) => {
          console.error('Error fetching SID list:', error);
        }
      );
    }
    
    private updateMessageItems(data: any): void {
      this.messageItems = [];
      
      // Add transaction message if available
      if (data.transactionMessage) {
        this.messageItems.push({
          label: this.messageLabelService.getLabel('transactionMessage'),
          value: data.transactionMessage
        });
      }
      
      // Add transaction status if available
      if (data.transactionStatus) {
        this.messageItems.push({
          label: this.messageLabelService.getLabel('transactionStatus'),
          value: data.transactionStatus
        });
      }
      
      // Add number of rows if available
      const numberOfRows = data.numberOfRows || (this.sidList ? this.sidList.length : 0);
      this.messageItems.push({
        label: this.messageLabelService.getLabel('numberOfRows'),
        value: numberOfRows.toString()
      });
      
      // Log the message items for debugging
      console.log('Message items:', this.messageItems);
    }
    onRowSelect(row: any): void {
      if (!this.isDragging) { 
      this.selectedRows = [row];
      }
    }

    onRowMultiSelect(event: any, row: any): void {
      if (!this.isDragging) {
      if (event.ctrlKey || event.metaKey) {
        // Multi-select with Ctrl/Cmd key
        const index = this.selectedRows.findIndex(selectedRow => selectedRow === row);
        if (index > -1) {
          this.selectedRows.splice(index, 1);
          this.selectedIds.splice(this.selectedIds.indexOf(row.ID), 1);
          this.selectedUsernames.splice(index, 1); // Remove username from selectedUsernames array
        } else {
          this.selectedRows.push(row);
          this.selectedIds.push(row.ID);
          this.selectedUsernames.push(row.Username); // Add username to selectedUsernames array
        }
      } else if (event.shiftKey && this.selectedRows.length > 0) {
        // Multi-select with Shift key
        const lastSelectedIndex = this.sidList.findIndex(user => user === this.selectedRows[this.selectedRows.length - 1]);
        const currentSelectedIndex = this.sidList.findIndex(user => user === row);
        const startIndex = Math.min(lastSelectedIndex, currentSelectedIndex);
        const endIndex = Math.max(lastSelectedIndex, currentSelectedIndex);
    
        this.selectedRows = this.sidList.slice(startIndex, endIndex + 1);
        this.selectedIds = this.selectedRows.map(selectedRow => selectedRow.ID);
        this.selectedUsernames = this.selectedRows.map(selectedRow => selectedRow.Username); // Update selectedUsernames array
      } else {
        // Single select
        if (this.selectedRows.length === 1 && this.selectedRows[0] === row) {
          // Deselect the row if it's the only selected row
          this.selectedRows = [];
          this.selectedIds = [];
          this.selectedUsernames = [];
        } else {
        this.selectedRows = [row];
        this.selectedIds = [row.ID];
        this.selectedUsernames = [row.Username]; // Update selectedUsernames array
       }
      }
      // For list-users route, we need to map the data back to the original format
      if (!this.isListAllUsersRoute) {
        // Find the User ID and System Username fields
        const userIdField = this.tableColumns.find(col => col.includes('User ID'));
        const usernameField = this.tableColumns.find(col => col.includes('System Username'));
        
        // Map the selected rows to IDs and usernames
        if (userIdField && usernameField) {
          this.selectedIds = this.selectedRows.map(row => row[userIdField]);
          this.selectedUsernames = this.selectedRows.map(row => row[usernameField]);
          
          console.log('Selected IDs:', this.selectedIds);
          console.log('Selected Usernames:', this.selectedUsernames);
          
          // Update the SelectedIdsService
          this.selectedIdsService.setSelectedIdsAndUsernames(this.selectedIds, this.selectedUsernames);
        }
      } else {
        // For list-all-users route, use the TableSelectionExtensionService
        console.log('Using TableSelectionExtensionService for list-all-users route');
        const tableName = this.routeConfig?.TableName || 'all-users';
        console.log('Using table name from route config:', tableName);
        this.tableSelectionExtensionService.processSelectedRows(tableName, this.selectedRows);
      }
      // NEW: Set selected user data when a single row is selected
      if (this.selectedRows.length === 1) {
        // Find the relevant fields
        const userIdField = this.tableColumns.find(col => col.includes('User ID'));
        const nameField = this.tableColumns.find(col => col.includes('Database Username'));
        const descriptionField = this.tableColumns.find(col => col.includes('Description'));
        const usernameField = this.tableColumns.find(col => col.includes('System Username'));
        
        this.selectedIdsService.setSelectedUserData({
          id: userIdField ? row[userIdField] : '',
          name: nameField ? row[nameField] : '',
          description: descriptionField ? row[descriptionField] : '',
          username: usernameField ? row[usernameField] : ''
        });
      } else {
        this.selectedIdsService.setSelectedUserData(null);
      }
    }
    }

    onColumnSelect(column: string): void {
      if (this.sortColumn === column) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortColumn = column;
        this.sortOrder = 'asc';
      }
      this.sortSidList();
    }

    sortSidList(): void {
      this.sidList.sort((a, b) => {
        const valueA = a[this.sortColumn];
        const valueB = b[this.sortColumn];
        if (valueA < valueB) {
          return this.sortOrder === 'asc' ? -1 : 1;
        } else if (valueA > valueB) {
          return this.sortOrder === 'asc' ? 1 : -1;
        } else {
          return 0;
        }
      });
    }
   

    private registerCustomIcon(): void {
      this.matIconRegistry.addSvgIcon(
        'column-resize',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../../../assets/icons/column-resize.svg')
      );
    }

    onResizeStart(event: MouseEvent, column: HTMLElement): void {
      this.resizingColumn = column;
      this.startX = event.clientX;
      this.startWidth = column.offsetWidth;
    }
  
    @HostListener('document:mousemove', ['$event'])
    onResize(event: MouseEvent): void {
      if (this.resizingColumn) {
        const deltaX = event.clientX - this.startX;
        const newWidth = this.startWidth + deltaX;
        this.resizingColumn.style.width = '${newWidth}px';
      }
    }
  
    @HostListener('document:mouseup')
    onResizeEnd(): void {
      this.resizingColumn = null;
    }
    private restoreScrollPosition(): void { 
      if (this.tableContainerElement) {
        this.tableContainerElement.nativeElement.scrollTop = this.scrollPosition;
      }
    }
  
    private saveScrollPosition(): void { 
      if (this.tableContainerElement) {
        this.scrollPosition = this.tableContainerElement.nativeElement.scrollTop;
      }
    }
    ngOnDestroy(): void {
      // Clean up the subscription when the component is destroyed
      if (this.getAllSidListSubscription) {
        this.getAllSidListSubscription.unsubscribe();
        this.getAllSidListSubscription = null; // Set to null to clean the reference
      }
      // Unsubscribe from userAdded$ observable
      if (this.userAddedSubscription) {
        this.userAddedSubscription.unsubscribe();
        this.userAddedSubscription = null;
      }
      if (this.userUpdatedSubscription) {
        this.userUpdatedSubscription.unsubscribe();
        this.userUpdatedSubscription = null;
      }
    }
    
    @HostListener('mousedown', ['$event']) //  Listen for mousedown event
    onMouseDown(event: MouseEvent): void {
      this.isDragging = false;
      this.dragStartPosition = { x: event.clientX, y: event.clientY };
    }
    @HostListener('mousemove', ['$event']) // NEW: Listen for mousemove event
    onMouseMove(event: MouseEvent): void {
      if (this.dragStartPosition) {
        const dragDistance = Math.sqrt(
          Math.pow(event.clientX - this.dragStartPosition.x, 2) +
          Math.pow(event.clientY - this.dragStartPosition.y, 2)
        );
        if (dragDistance > 5) {
          this.isDragging = true;
        }
      }
    }
    @HostListener('mouseup', ['$event']) // Listen for mouseup event
    onMouseUp(event: MouseEvent): void {
      if (this.mouseDownPosition &&
        this.mouseDownPosition.x === event.clientX &&
        this.mouseDownPosition.y === event.clientY) {
      // If mouseup position is the same as mousedown position, consider it a click without drag
      this.onRowSelect(event.target as any);
    }
    
    this.mouseDownPosition = null; // Reset mousedown position
  }

  }
    

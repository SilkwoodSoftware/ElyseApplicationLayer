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

import { Component, OnInit, HostListener, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ReadAllDocRblistsService } from './read-all-doc-rblists.service';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { SelectedIdsService } from '../../../../shared/services/selected-ids.service';
import { Subscription } from 'rxjs';
import { TableActionsService } from '../../../../shared/components/table-actions/table-actions.service';
import { MessageLabelService } from '../../../../shared/services/message-label.service';

@Component({
  selector: 'app-read-all-doc-rblists',
  templateUrl: './read-all-doc-rblists.component.html',
  styleUrls: ['./read-all-doc-rblists.component.scss']
})
export class ReadAllDocRblistsComponent implements OnInit {
  docRblists: any[] = [];
  selectedRows: any[] = [];
  sortColumn: string = 'ListName';
  sortOrder: 'asc' | 'desc' = 'asc';
  result: any;
  selectedIds: number[] = [];
  selectedNames: string[] = [];
  messageItems: { label: string, value: string }[] = [];
  @ViewChild('tableContainer', { static: false }) tableContainerElement!: ElementRef<HTMLElement>;

  private resizingColumn: HTMLElement | null = null;
  private startX: number = 0;
  private startWidth: number = 0;
  private scrollPosition: number = 0;
  private getAllDocRblistsSubscription: Subscription | null = null;
  private isDragging: boolean = false;
  private mouseDownPosition: { x: number, y: number } | null = null;
  private dragStartPosition: { x: number, y: number } | null = null;

  constructor(
    private readAllDocRblistsService: ReadAllDocRblistsService,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
    private selectedIdsService: SelectedIdsService,
    private cdr: ChangeDetectorRef,
    private tableActionsService: TableActionsService,
    private messageLabelService: MessageLabelService
  ) { }

  ngOnInit(): void {
    this.fetchAllDocRblists();
  }

  fetchAllDocRblists(): void {
    console.log('Making HTTP request to fetch all document radio button lists.');
    this.getAllDocRblistsSubscription = this.readAllDocRblistsService.getAllDocRblists().subscribe(
      (response) => {
        this.docRblists = [...response.allDocRblistAttributes];
        this.result = {
          numberOfRows: response.allDocRblistAttributes.length,
          transactionMessage: response.transactionMessage,
          transactionStatus: response.transactionStatus,
        };
        console.log('Document radio button lists fetched, updating docRblists property.');
        this.cdr.detectChanges();

        this.selectedRows = [];
        this.selectedIds = [];
        this.selectedNames = [];
        this.selectedIdsService.setSelectedIdsAndNames([], []);
        this.updateMessageItems(response);
      },
      (error) => {
        console.error('Error fetching document radio button lists:', error);
      }
    );
  }

  private updateMessageItems(data: any): void {
    this.messageItems = [
      { label: this.messageLabelService.getLabel('transactionMessage'), value: data.transactionMessage || '' },
      { label: this.messageLabelService.getLabel('transactionStatus'), value: data.transactionStatus || '' }
    ];
  }

  onRowSelect(row: any): void {
    if (!this.isDragging) {
      this.selectedRows = [row];
      this.selectedIds = [row.ID];
      this.selectedNames = [row.ListName];
      this.selectedIdsService.setSelectedIdsAndNames(this.selectedIds, this.selectedNames);
    }
  }

  onRowMultiSelect(event: any, row: any): void {
    if (!this.isDragging) {
      if (event.ctrlKey || event.metaKey) {
        const index = this.selectedRows.findIndex(selectedRow => selectedRow === row);
        if (index > -1) {
          this.selectedRows.splice(index, 1);
          this.selectedIds.splice(this.selectedIds.indexOf(row.ID), 1);
          this.selectedNames.splice(index, 1);
        } else {
          this.selectedRows.push(row);
          this.selectedIds.push(row.ID);
          this.selectedNames.push(row.ListName);
        }
      } else if (event.shiftKey && this.selectedRows.length > 0) {
        const lastSelectedIndex = this.docRblists.findIndex(docRblist => docRblist === this.selectedRows[this.selectedRows.length - 1]);
        const currentSelectedIndex = this.docRblists.findIndex(docRblist => docRblist === row);
        const startIndex = Math.min(lastSelectedIndex, currentSelectedIndex);
        const endIndex = Math.max(lastSelectedIndex, currentSelectedIndex);

        this.selectedRows = this.docRblists.slice(startIndex, endIndex + 1);
        this.selectedIds = this.selectedRows.map(selectedRow => selectedRow.ID);
        this.selectedNames = this.selectedRows.map(selectedRow => selectedRow.ListName);
      } else {
        if (this.selectedRows.length === 1 && this.selectedRows[0] === row) {
          this.selectedRows = [];
          this.selectedIds = [];
          this.selectedNames = [];
        } else {
          this.selectedRows = [row];
          this.selectedIds = [row.ID];
          this.selectedNames = [row.ListName];
        }
      }
      this.selectedIdsService.setSelectedIdsAndNames(this.selectedIds, this.selectedNames);
      console.log('Selected IDs:', this.selectedIds);
      console.log('Selected Names:', this.selectedNames);
    }
  }

  onColumnSelect(column: string): void {
    if (this.sortColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortOrder = 'asc';
    }
    this.sortDocRblists();
  }

  sortDocRblists(): void {
    this.docRblists.sort((a, b) => {
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
    if (this.getAllDocRblistsSubscription) {
      this.getAllDocRblistsSubscription.unsubscribe();
      this.getAllDocRblistsSubscription = null;
    }
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.isDragging = false;
    this.dragStartPosition = { x: event.clientX, y: event.clientY };
  }

  @HostListener('mousemove', ['$event'])
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

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (this.mouseDownPosition &&
      this.mouseDownPosition.x === event.clientX &&
      this.mouseDownPosition.y === event.clientY) {
      this.onRowSelect(event.target as any);
    }

    this.mouseDownPosition = null;
  }

}

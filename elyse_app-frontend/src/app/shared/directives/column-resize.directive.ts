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

import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appColumnResize]'
})
export class ColumnResizeDirective implements OnInit {
  // @Input() initialWidth: string = '';
  @Input() initialWidth: string = 'auto';
  private startX: number = 0;
  private startWidth: number = 0;
  private column!: HTMLElement;
  private table!: HTMLElement;
  private isResizing: boolean = false;
  private resizedWidth: number = 0;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    // Initialize these in ngOnInit instead of constructor
  }

  ngOnInit() {
    // Initialize column and table elements
    this.column = this.el.nativeElement.closest('th') || this.el.nativeElement.parentElement;
    const tableElement = this.column.closest('table');
    if (tableElement) {
      this.table = tableElement;
    } else {
      // Fallback to find the table
      this.table = this.column.parentElement?.parentElement as HTMLElement;
    }
    
    this.renderer.listen(this.el.nativeElement, 'mousedown', this.onMouseDown.bind(this));

    if (this.initialWidth) {
      this.renderer.setStyle(this.column, 'width', this.initialWidth);
    }

    if (this.resizedWidth > 0) {
      this.renderer.setStyle(this.column, 'width', `${this.resizedWidth}px`);
    }
  }

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    
    // Make sure column and table are defined
    if (!this.column || !this.table) {
      console.error('Column or table element not found');
      return;
    }
    
    this.startX = event.pageX;
    this.startWidth = this.column.offsetWidth;
    this.isResizing = true;
    this.renderer.setStyle(document.body, 'cursor', 'col-resize');
    this.renderer.setStyle(document.body, 'user-select', 'none');
    
    // Only add the class if the table element exists and has classList
    if (this.table && this.table.classList) {
      this.renderer.addClass(this.table, 'resizing');
    }
    
    this.renderer.listen(document, 'mousemove', this.onMouseMove.bind(this));
    this.renderer.listen(document, 'mouseup', this.onMouseUp.bind(this));
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isResizing || !this.column) {
      return;
    }

    const deltaX = event.pageX - this.startX;
    const newWidth = Math.max(0, this.startWidth + deltaX);
    this.renderer.setStyle(this.column, 'width', `${newWidth}px`);
    this.resizedWidth = newWidth;
  }

  onMouseUp() {
    if (!this.isResizing) {
      return;
    }

    this.isResizing = false;
    this.startX = 0;
    this.startWidth = 0;
    this.renderer.removeStyle(document.body, 'cursor');
    this.renderer.removeStyle(document.body, 'user-select');
    
    // Only remove the class if the table element exists and has classList
    if (this.table && this.table.classList) {
      this.renderer.removeClass(this.table, 'resizing');
    }
  }
}

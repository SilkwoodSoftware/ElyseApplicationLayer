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

import { Directive, HostListener } from '@angular/core';

/**
 * Directive to disable the default browser context menu
 * 
 * Usage:
 * <div appDisableContextMenu>Content where browser context menu should be disabled</div>
 */
@Directive({
  selector: '[appDisableContextMenu]'
})
export class DisableContextMenuDirective {
  /**
   * Prevents the default browser context menu from appearing
   * when right-clicking on the element
   */
  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }
}

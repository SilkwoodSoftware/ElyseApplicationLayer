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

import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-thinking-indicator',
  templateUrl: './thinking-indicator.component.html',
  styleUrls: ['./thinking-indicator.component.scss']
})
export class ThinkingIndicatorComponent {
  /**
   * Size of the indicator in pixels. Defaults to 40.
   */
  @Input() size: number = 40;

  /**
   * Whether to show the component inline (false) or as an overlay (true)
   */
  @Input() overlay: boolean = false;
}

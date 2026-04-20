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

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Service for handling dialog completion events in chains
 * This service allows components to signal when a dialog has been closed
 * and provides an observable for other components to listen for these events
 */
@Injectable({
  providedIn: 'root'
})
export class DialogCompletionService {
  /**
   * Subject for dialog completion events
   * Components can subscribe to this to be notified when a dialog is closed
   */
  private pendingDialogs = new Subject<{
    chainId: string;
    linkId: number;
    result: any;
  }>();

  /**
   * Observable for dialog completion events
   */
  pendingDialogs$ = this.pendingDialogs.asObservable();

  /**
   * Signal that a dialog has been closed
   * @param chainId The ID of the chain
   * @param linkId The ID of the link in the chain
   * @param result The result to pass to the next link in the chain
   */
  dialogClosed(chainId: string, linkId: number, result: any): void {
    console.log(`Dialog closed for chain ${chainId}, link ${linkId}`);
    this.pendingDialogs.next({ chainId, linkId, result });
  }
}

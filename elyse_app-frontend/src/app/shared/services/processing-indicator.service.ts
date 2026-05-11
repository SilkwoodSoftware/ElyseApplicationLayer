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
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProcessingIndicatorService {
  private processing = new BehaviorSubject<boolean>(false);
  public processing$ = this.processing.asObservable();

  /**
   * Show the processing indicator
   */
  show(): void {
    this.processing.next(true);
  }

  /**
   * Hide the processing indicator
   */
  hide(): void {
    this.processing.next(false);
  }

  /**
   * Get the current processing state
   */
  isProcessing(): boolean {
    return this.processing.getValue();
  }

  /**
   * Wrap an observable to show/hide processing indicator automatically
   */
  wrap<T>(observable: Observable<T>): Observable<T> {
    this.show();
    return new Observable(observer => {
      const subscription = observable.subscribe({
        next: (value) => {
          observer.next(value);
        },
        error: (error) => {
          this.hide();
          observer.error(error);
        },
        complete: () => {
          this.hide();
          observer.complete();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  }
}

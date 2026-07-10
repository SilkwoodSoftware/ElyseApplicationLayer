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

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

export interface Token {
  id: string;
  displayName: string;
  value: any;
}

@Component({
  selector: 'app-token-input',
  templateUrl: './token-input.component.html',
  styleUrls: ['./token-input.component.scss']
})
export class TokenInputComponent implements OnInit, OnDestroy {
  @Input() placeholder: string = 'Type to search...';
  @Input() searchFunction!: (query: string) => any[];
  @Input() displayProperty: string = 'name';
  @Input() maxSuggestions: number = 10;
  @Input() minCharsForSuggestions: number = 2;
  
  @Output() tokensChange = new EventEmitter<Token[]>();
  @Output() inputChange = new EventEmitter<string>();
  
  @ViewChild('inputElement', { static: true }) inputElement!: ElementRef<HTMLInputElement>;
  
  tokens: Token[] = [];
  inputValue: string = '';
  suggestions: any[] = [];
  showSuggestions: boolean = false;
  selectedSuggestionIndex: number = -1;
  selectedTokenIndex: number = -1;
  invalidText: string = '';
  
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  ngOnInit(): void {
    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performSearch(query);
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Handle input changes
   */
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inputValue = target.value;
    this.invalidText = '';
    this.selectedTokenIndex = -1;
    
    this.inputChange.emit(this.inputValue);
    
    if (this.inputValue.length >= this.minCharsForSuggestions) {
      this.searchSubject.next(this.inputValue);
    } else {
      this.suggestions = [];
      this.showSuggestions = false;
    }
  }
  
  /**
   * Perform search using provided search function
   */
  private performSearch(query: string): void {
    if (!this.searchFunction) {
      this.suggestions = [];
      this.showSuggestions = false;
      return;
    }
    
    const results = this.searchFunction(query);
    this.suggestions = results.slice(0, this.maxSuggestions);
    this.showSuggestions = this.suggestions.length > 0;
    this.selectedSuggestionIndex = -1;
  }
  
  /**
   * Handle keyboard events
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.commitToken();
        break;
        
      case 'Tab':
        // Only prevent default if there are suggestions showing and one is selected
        // This allows Tab to move between fields when no suggestion is selected
        if (this.showSuggestions && this.selectedSuggestionIndex >= 0) {
          event.preventDefault();
          this.commitToken();
        }
        // Otherwise, let Tab work normally to move to next field
        break;
        
      case ',':
      case ';':
        event.preventDefault();
        this.commitToken();
        break;
        
      case 'ArrowDown':
        if (this.showSuggestions) {
          event.preventDefault();
          this.selectedSuggestionIndex = Math.min(
            this.selectedSuggestionIndex + 1,
            this.suggestions.length - 1
          );
        }
        break;
        
      case 'ArrowUp':
        if (this.showSuggestions) {
          event.preventDefault();
          this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
        }
        break;
        
      case 'Escape':
        this.suggestions = [];
        this.showSuggestions = false;
        this.selectedSuggestionIndex = -1;
        break;
        
      case 'Backspace':
        if (this.inputValue === '') {
          event.preventDefault();
          // If there's invalid text, clear it first
          if (this.invalidText) {
            this.invalidText = '';
          } else if (this.tokens.length > 0) {
            // Handle token deletion
            if (this.selectedTokenIndex === -1) {
              // First backspace: select last token
              this.selectedTokenIndex = this.tokens.length - 1;
            } else {
              // Second backspace: delete selected token
              this.removeToken(this.selectedTokenIndex);
              this.selectedTokenIndex = -1;
            }
          }
        } else {
          this.selectedTokenIndex = -1;
        }
        break;
        
      default:
        this.selectedTokenIndex = -1;
    }
  }
  
  /**
   * Commit current input as token
   */
  private commitToken(): void {
    if (this.showSuggestions && this.selectedSuggestionIndex >= 0) {
      // Select highlighted suggestion
      this.selectSuggestion(this.suggestions[this.selectedSuggestionIndex]);
    } else if (this.inputValue.trim()) {
      // Try to match input
      this.attemptMatch(this.inputValue.trim());
    }
  }
  
  /**
   * Attempt to match input text to a valid option
   */
  private attemptMatch(text: string): void {
    if (!this.searchFunction) {
      this.invalidText = text;
      this.inputValue = '';
      return;
    }
    
    const results = this.searchFunction(text);
    
    if (results.length > 0) {
      // Exact or close match found
      const match = results[0];
      this.createToken(match);
      this.inputValue = '';
      this.invalidText = '';
    } else {
      // No match found
      this.invalidText = text;
      this.inputValue = '';
    }
    
    this.suggestions = [];
    this.showSuggestions = false;
  }
  
  /**
   * Select a suggestion from dropdown
   */
  selectSuggestion(item: any): void {
    this.createToken(item);
    this.inputValue = '';
    this.invalidText = '';
    this.suggestions = [];
    this.showSuggestions = false;
    this.selectedSuggestionIndex = -1;
    this.inputElement.nativeElement.focus();
  }
  
  /**
   * Create a token from an item
   */
  private createToken(item: any): void {
    const displayName = typeof item === 'string' ? item : item[this.displayProperty];
    const id = typeof item === 'string' ? item : (item.id || item.FieldID || displayName);
    
    // Check if token already exists
    if (this.tokens.some(t => t.id === id)) {
      return;
    }
    
    const token: Token = {
      id,
      displayName,
      value: item
    };
    
    this.tokens.push(token);
    this.tokensChange.emit(this.tokens);
  }
  
  /**
   * Remove a token
   */
  removeToken(index: number): void {
    this.tokens.splice(index, 1);
    this.tokensChange.emit(this.tokens);
    this.selectedTokenIndex = -1;
    this.inputElement.nativeElement.focus();
  }
  
  /**
   * Handle token click
   */
  onTokenClick(index: number): void {
    this.selectedTokenIndex = index;
  }
  
  /**
   * Handle token delete key
   */
  onTokenKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.removeToken(index);
    }
  }
  
  /**
   * Handle input blur
   */
  onInputBlur(): void {
    // Delay to allow suggestion click to register
    setTimeout(() => {
      if (this.inputValue.trim()) {
        this.commitToken();
      }
      this.suggestions = [];
      this.showSuggestions = false;
    }, 200);
  }
  
  /**
   * Handle input focus
   */
  onInputFocus(): void {
    this.selectedTokenIndex = -1;
    if (this.inputValue.length >= this.minCharsForSuggestions) {
      this.searchSubject.next(this.inputValue);
    }
  }
  
  /**
   * Clear invalid text
   */
  clearInvalidText(): void {
    this.invalidText = '';
  }
  
  /**
   * Clear all tokens
   */
  clearAll(): void {
    this.tokens = [];
    this.inputValue = '';
    this.invalidText = '';
    this.tokensChange.emit(this.tokens);
  }
  
  /**
   * Get display text for suggestion
   */
  getSuggestionDisplay(item: any): string {
    return typeof item === 'string' ? item : item[this.displayProperty];
  }
}

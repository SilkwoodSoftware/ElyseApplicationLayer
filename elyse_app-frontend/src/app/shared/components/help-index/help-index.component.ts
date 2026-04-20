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

import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HelpMenuService, HelpMenuItem } from '../../services/help-menu.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MarkdownService } from 'ngx-markdown';
import { marked } from 'marked';

interface SearchResult extends HelpMenuItem {
  matchedContent?: string;
  matchType?: 'title' | 'description' | 'content';
}

@Component({
  selector: 'app-help-index',
  template: `
    <div class="help-window">
      <!-- Resizable Left Sidebar with Help Menu -->
      <div class="help-sidebar" #sidebar>
        <!-- Search Box -->
        <div class="search-box">
          <input type="text"
                 [(ngModel)]="searchQuery"
                 (keyup.enter)="performSearch()"
                 placeholder="Search help topics..."
                 class="search-input">
          <button *ngIf="searchResults.length > 0" (click)="clearSearch()" class="clear-btn">×</button>
        </div>
        
        <!-- Show either search results OR normal menu -->
        <div class="help-menu-list" *ngIf="searchResults.length === 0">
          <ng-container *ngFor="let item of helpItems">
            <ng-container *ngTemplateOutlet="helpMenuTemplate; context: { item: item, level: 0 }"></ng-container>
          </ng-container>
          <div *ngIf="helpItems.length === 0" class="no-help-items">
            No help topics available
          </div>
        </div>
        
        <div class="search-results-list" *ngIf="searchResults.length > 0">
          <div class="search-header">
            Found {{ searchResults.length }} result(s) for "{{ lastSearchQuery }}"
          </div>
          <div *ngFor="let result of searchResults"
               (click)="selectHelpItem(result)"
               class="search-result-item"
               [class.active]="selectedItem?.helpId === result.helpId">
            <div class="result-title">{{ result.title }}</div>
            <div class="result-match-type" *ngIf="result.matchType">
              <span class="match-badge">{{ result.matchType }}</span>
            </div>
            <div class="result-description" *ngIf="!result.matchedContent">{{ result.description }}</div>
            <div class="result-matched-content" *ngIf="result.matchedContent">{{ result.matchedContent }}</div>
          </div>
        </div>
        
        <div class="resize-handle" (mousedown)="startResize($event)"></div>
      </div>
      
      <!-- Main Content Area -->
      <div class="help-content-area">
        <div class="help-content-header">
          <h2>{{ selectedTitle || 'Select a Help Topic' }}</h2>
        </div>
        <div class="help-content">
          <div *ngIf="!selectedContent$" class="welcome-message">
            <h3>Welcome to the Help System</h3>
            <p>Select a topic from the menu on the left to view help content.</p>
          </div>
          <div *ngIf="selectedContent$" [innerHTML]="selectedContent$ | async"></div>
          
          <!-- Sub-topics section rendered with Angular template -->
          <div *ngIf="selectedItem && selectedItem.children && selectedItem.children.length > 0" class="sub-topics-section">
            <h2>Sub-Topics</h2>
            <ul class="sub-topics-list">
              <li *ngFor="let child of selectedItem.children">
                <a href="javascript:void(0)" class="sub-topic-link" (click)="selectHelpItem(child); $event.preventDefault()">
                  <strong>{{ child.title }}</strong>
                  <div *ngIf="child.description" class="sub-topic-description">{{ child.description }}</div>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Recursive template for help menu items -->
    <ng-template #helpMenuTemplate let-item="item" let-level="level">
      <div class="help-menu-item" [style.padding-left.px]="(level * 15) + 8">
        
        <!-- Parent with children: clickable + expandable with arrow on right -->
        <div *ngIf="item.children && item.children.length > 0" class="help-menu-parent">
          <div class="parent-header">
            <!-- Clickable parent title -->
            <a (click)="selectHelpItem(item)"
               class="help-menu-link"
               [class.active]="selectedItem?.helpId === item.helpId">
              {{ item.title }}
            </a>
            <!-- Expand/collapse icon on the right -->
            <span class="expand-icon" (click)="toggleExpand(item); $event.stopPropagation()">
              {{ item.expanded ? '▼' : '▶' }}
            </span>
          </div>
          <!-- Children (shown when expanded) -->
          <div *ngIf="item.expanded" class="children-container">
            <ng-container *ngFor="let child of item.children">
              <ng-container *ngTemplateOutlet="helpMenuTemplate; context: { item: child, level: level + 1 }"></ng-container>
            </ng-container>
          </div>
        </div>
        
        <!-- Leaf item without children: just clickable -->
        <a *ngIf="!item.children || item.children.length === 0"
           (click)="selectHelpItem(item)"
           class="help-menu-link"
           [class.active]="selectedItem?.helpId === item.helpId">
          {{ item.title }}
        </a>
      </div>
    </ng-template>
  `,
  styles: [`
    .help-window {
      display: flex;
      height: 100vh;
      width: 100vw;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }

    .help-sidebar {
      width: 220px;
      min-width: 180px;
      max-width: 400px;
      background-color: #f8f9fa;
      border-right: 1px solid #dee2e6;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      padding-right: 45px;
    }

    .help-menu-list {
      flex: 1;
      overflow-y: auto;
      padding: 5px 0;
    }

    .help-menu-item {
      border-bottom: 1px solid #e9ecef;
      margin: 0;
    }

    .help-menu-link {
      display: block;
      padding: 6px 6px;
      color: #495057;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 10px;
      line-height: 1.3;
    }

    .help-menu-link:hover {
      background-color: #e9ecef;
      color: #007bff;
    }

    .help-menu-link.active {
      background-color: #007bff;
      color: white;
      font-weight: 500;
    }

    .help-menu-parent {
      margin: 0;
    }

    .parent-header {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 0;
    }

    .expand-icon {
      cursor: pointer;
      font-size: 10px;
      color: #666;
      width: 15px;
      padding: 5px;
      user-select: none;
      flex-shrink: 0;
      order: 2;
    }

    .expand-icon:hover {
      color: #007bff;
    }

    .parent-header .help-menu-link {
      flex: 1;
      order: 1;
    }

    .children-container {
      margin-left: 0;
    }

    .search-box {
      padding: 10px;
      border-bottom: 1px solid #dee2e6;
      background-color: white;
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 8px 30px 8px 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 13px;
    }

    .search-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .clear-btn {
      position: absolute;
      right: 15px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 20px;
      height: 20px;
    }

    .clear-btn:hover {
      color: #333;
    }

    .search-results-list {
      flex: 1;
      overflow-y: auto;
      padding: 0;
    }

    .search-header {
      padding: 10px 15px;
      background-color: #f8f9fa;
      border-bottom: 2px solid #dee2e6;
      font-size: 12px;
      font-weight: 600;
      color: #666;
    }

    .search-result-item {
      padding: 10px 15px;
      border-bottom: 1px solid #e9ecef;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .search-result-item:hover {
      background-color: #f8f9fa;
    }

    .search-result-item.active {
      background-color: #007bff;
      color: white;
    }

    .search-result-item.active .result-description {
      color: rgba(255, 255, 255, 0.8);
    }

    .result-title {
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .result-description {
      font-size: 12px;
      color: #666;
      line-height: 1.3;
    }

    .result-match-type {
      margin-top: 4px;
      margin-bottom: 4px;
    }

    .match-badge {
      display: inline-block;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: 3px;
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .search-result-item.active .match-badge {
      background-color: rgba(255, 255, 255, 0.3);
      color: white;
    }

    .result-matched-content {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
      font-style: italic;
      margin-top: 4px;
    }

    .search-result-item.active .result-matched-content {
      color: rgba(255, 255, 255, 0.9);
    }

    .resize-handle {
      position: absolute;
      top: 0;
      right: 0;
      width: 5px;
      height: 100%;
      cursor: col-resize;
      background-color: transparent;
    }

    .resize-handle:hover {
      background-color: #007bff;
      opacity: 0.5;
    }

    .no-help-items {
      padding: 15px 10px;
      color: #6c757d;
      font-style: italic;
      text-align: center;
      font-size: 12px;
    }

    .help-content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .help-content-header {
      padding: 10px 20px;
      border-bottom: 1px solid #dee2e6;
      background-color: white;
    }

    .help-content-header h2 {
      margin: 0;
      color: #333;
      font-size: 18px;
      font-weight: 600;
    }

    .help-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      background-color: white;
      line-height: 1.6;
    }

    .welcome-message {
      text-align: center;
      color: #6c757d;
      margin-top: 50px;
    }

    .welcome-message h3 {
      color: #495057;
      margin-bottom: 10px;
    }

    /* Note: Styles for dynamically inserted innerHTML content (p, h1-h3, ul, ol, li, code) */
    /* are in global styles.scss because component encapsulation doesn't apply to innerHTML */

    .sub-topics-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
    }

    .sub-topics-section h2 {
      color: #333;
      font-size: 1.3rem;
      margin-bottom: 15px;
    }

    .sub-topics-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .sub-topics-list li {
      margin-bottom: 12px;
      padding: 12px 15px;
      background-color: #f8f9fa;
      border-left: 3px solid #007bff;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .sub-topics-list li:hover {
      background-color: #e9ecef;
      border-left-color: #0056b3;
    }

    .sub-topic-link {
      color: #007bff;
      text-decoration: none;
      display: block;
      cursor: pointer;
    }

    .sub-topic-link:hover {
      color: #0056b3;
    }

    .sub-topic-link strong {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .sub-topic-description {
      color: #666;
      font-size: 13px;
    }
  `]
})
export class HelpIndexComponent implements OnInit, AfterViewInit, OnDestroy {
  helpItems: HelpMenuItem[] = [];
  selectedItem: HelpMenuItem | null = null;
  selectedContent$: Observable<string> | null = null;
  selectedTitle: string = '';
  
  searchQuery: string = '';
  lastSearchQuery: string = '';
  searchResults: SearchResult[] = [];

  private isResizing = false;
  private clickListener: ((e: Event) => void) | null = null;

  constructor(
    private helpMenuService: HelpMenuService,
    private router: Router,
    private markdownService: MarkdownService
  ) {
    console.log('HelpIndex: Constructor called - component is loading');
  }

  ngOnInit(): void {
    console.log('HelpIndex: ngOnInit called');
    
    // Set the window title from within the component (safe for all browsers including Edge)
    document.title = 'Help System';
    
    // Load help items with role filtering
    this.helpMenuService.helpItems$.subscribe(items => {
      console.log('HelpIndex: helpItems$ subscription fired, items:', items);
      
      // Get user roles from localStorage (same as navigation system)
      const selectedRoles = this.getUserRoles();
      const userRoleNames = selectedRoles.map(role => role['Role Name']);
      
      console.log('HelpIndex: User roles:', userRoleNames);
      
      // Filter help items by user roles
      this.helpItems = this.helpMenuService.getFilteredHelpItems(userRoleNames);
      
      // Initialize all items as expanded by default
      this.initializeExpandedState(this.helpItems);
      
      console.log('HelpIndex: Filtered help items:', this.helpItems);
      
      // Auto-select first item if available
      if (this.helpItems.length > 0 && !this.selectedItem) {
        this.selectFirstAvailableItem(this.helpItems);
      }
    });
  }

  ngAfterViewInit(): void {
    // Not needed
  }

  ngOnDestroy(): void {
    // Not needed
  }

  /**
   * Initialize expanded state for all items (default to collapsed)
   */
  private initializeExpandedState(items: HelpMenuItem[]): void {
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        item.expanded = false; // Default to collapsed
        this.initializeExpandedState(item.children);
      }
    });
  }

  /**
   * Toggle expand/collapse state of a parent item
   */
  toggleExpand(item: HelpMenuItem): void {
    item.expanded = !item.expanded;
  }

  /**
   * Perform search when user presses Enter
   */
  performSearch(): void {
    const query = this.searchQuery.trim();
    
    if (!query || query.length < 2) {
      alert('Please enter at least 2 characters to search');
      return;
    }
    
    this.lastSearchQuery = query;
    const lowerQuery = query.toLowerCase();
    
    // Search through all help items and their content
    this.searchHelpItemsWithContent(this.helpItems, lowerQuery).subscribe((results: SearchResult[]) => {
      this.searchResults = results;
      
      if (this.searchResults.length === 0) {
        alert(`No results found for "${query}"`);
      }
    });
  }

  /**
   * Clear search and return to normal menu
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.lastSearchQuery = '';
    this.searchResults = [];
  }

  /**
   * Recursively search through help items by title, description, and content
   */
  private searchHelpItemsWithContent(items: HelpMenuItem[], query: string): Observable<SearchResult[]> {
    const searchObservables: Observable<SearchResult[]>[] = [];
    
    items.forEach(item => {
      // Create an observable for each item that checks title, description, and content
      const itemSearch = this.helpMenuService.getHelpContent(item.contentFile).pipe(
        map(content => {
          const results: SearchResult[] = [];
          
          // Check title match
          const titleMatch = item.title.toLowerCase().includes(query);
          // Check description match
          const descMatch = item.description.toLowerCase().includes(query);
          // Check content match (strip markdown for better searching)
          const plainContent = this.stripMarkdown(content);
          const contentMatch = plainContent.toLowerCase().includes(query);
          
          if (titleMatch || descMatch || contentMatch) {
            const result: SearchResult = {
              ...item,
              matchType: titleMatch ? 'title' : (descMatch ? 'description' : 'content')
            };
            
            // If matched in content, extract a snippet around the match
            if (contentMatch && !titleMatch && !descMatch) {
              result.matchedContent = this.extractMatchSnippet(plainContent, query);
            }
            
            results.push(result);
          }
          
          return results;
        }),
        catchError(error => {
          console.error(`Error searching content for ${item.contentFile}:`, error);
          // Still check title and description even if content fails to load
          const results: SearchResult[] = [];
          const titleMatch = item.title.toLowerCase().includes(query);
          const descMatch = item.description.toLowerCase().includes(query);
          
          if (titleMatch || descMatch) {
            results.push({
              ...item,
              matchType: titleMatch ? 'title' : 'description'
            });
          }
          
          return of(results);
        })
      );
      
      searchObservables.push(itemSearch);
      
      // Recursively search children
      if (item.children && item.children.length > 0) {
        searchObservables.push(this.searchHelpItemsWithContent(item.children, query));
      }
    });
    
    // Combine all search results
    if (searchObservables.length === 0) {
      return of([]);
    }
    
    return forkJoin(searchObservables).pipe(
      map(resultArrays => {
        // Flatten the array of arrays
        return resultArrays.reduce((acc, curr) => acc.concat(curr), []);
      })
    );
  }
  
  /**
   * Strip markdown formatting to get plain text for searching
   */
  private stripMarkdown(markdown: string): string {
    return markdown
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`]+`/g, '')
      // Remove headers
      .replace(/^#+\s+/gm, '')
      // Remove bold/italic
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove list markers
      .replace(/^[\*\-\+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Extract a snippet of text around the matched query
   */
  private extractMatchSnippet(content: string, query: string, contextLength: number = 100): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);
    
    if (matchIndex === -1) {
      return content.substring(0, contextLength) + '...';
    }
    
    // Calculate start and end positions for the snippet
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(content.length, matchIndex + query.length + contextLength);
    
    let snippet = content.substring(start, end);
    
    // Add ellipsis if we're not at the start/end
    if (start > 0) {
      snippet = '...' + snippet;
    }
    if (end < content.length) {
      snippet = snippet + '...';
    }
    
    return snippet;
  }

  /**
   * Get user roles from localStorage (same method as navigation component)
   */
  private getUserRoles(): any[] {
    const storedRoles = localStorage.getItem('selectedRoles');
    if (storedRoles) {
      return JSON.parse(storedRoles);
    }
    return [];
  }

  private selectFirstAvailableItem(items: HelpMenuItem[]): void {
    // Select the first item regardless of whether it has children
    if (items.length > 0) {
      this.selectHelpItem(items[0]);
    }
  }

  selectHelpItem(item: HelpMenuItem): void {
    this.selectedItem = item;
    this.selectedTitle = item.title;
    this.selectedContent$ = this.helpMenuService.getHelpContent(item.contentFile).pipe(
      map(content => this.convertMarkdownToHtml(content))
    );
  }

  private convertMarkdownToHtml(markdown: string): string {
    // Use marked library (configured by ngx-markdown) for professional markdown parsing
    try {
      const result = marked.parse(markdown, { async: false });
      return typeof result === 'string' ? result : '';
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return '<p>Error rendering help content</p>';
    }
  }

  closeWindow(): void {
    if (window.opener) {
      window.close();
    }
  }

  startResize(event: MouseEvent): void {
    this.isResizing = true;
    event.preventDefault();
    
    const mouseMoveHandler = (e: MouseEvent) => {
      if (this.isResizing) {
        const sidebar = document.querySelector('.help-sidebar') as HTMLElement;
        if (sidebar) {
          const newWidth = e.clientX;
          if (newWidth >= 180 && newWidth <= 400) {
            sidebar.style.width = newWidth + 'px';
          }
        }
      }
    };

    const mouseUpHandler = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }
}

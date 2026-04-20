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
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface HelpMenuItem {
  helpId: string;
  title: string;
  parentHelpId?: string;
  contentFile: string;
  role?: string;
  order: number;
  lastUpdated: string;
  description: string;
  children?: HelpMenuItem[];
  expanded?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HelpMenuService {
  private helpItemsSubject = new BehaviorSubject<HelpMenuItem[]>([]);
  public helpItems$ = this.helpItemsSubject.asObservable();

  private helpDirectoryPath = '/assets/help/help-directory.csv';
  private helpContentBasePath = '/assets/help/content/';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    console.log('HelpMenuService: Service initialized, loading help directory');
    this.loadHelpDirectory();
  }

  /**
   * Load help directory structure from CSV
   */
  private loadHelpDirectory(): void {
    console.log('HelpMenuService: Loading help directory from:', this.helpDirectoryPath);
    this.http.get(this.helpDirectoryPath, { responseType: 'text' }).pipe(
      map(csvContent => {
        console.log('HelpMenuService: CSV content received:', csvContent);
        return this.parseHelpDirectory(csvContent);
      }),
      catchError(error => {
        console.error('HelpMenuService: Error loading help directory:', error);
        return of([]);
      })
    ).subscribe(items => {
      console.log('HelpMenuService: Parsed items:', items);
      const hierarchicalItems = this.buildHierarchy(items);
      console.log('HelpMenuService: Hierarchical items built:', hierarchicalItems);
      this.helpItemsSubject.next(hierarchicalItems);
    });
  }

  /**
   * Parse CSV content into HelpMenuItem array
   */
  private parseHelpDirectory(csvContent: string): HelpMenuItem[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const items: HelpMenuItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line || line.length === 0) {
        continue;
      }
      
      const values = this.parseCsvLine(line);
      
      // Need at least 8 fields (indices 0-7) for a valid help item
      // HelpId, Title, ParentHelpId, ContentFile, Role, Order, LastUpdated, Description
      if (values.length >= 8 && values[0] && values[1] && values[3]) {
        items.push({
          helpId: values[0].trim(),
          title: values[1].trim(),
          parentHelpId: values[2] ? values[2].trim() : undefined,
          contentFile: values[3].trim(),
          role: values[4] ? values[4].trim() : undefined,
          order: parseInt(values[5]) || 0,
          lastUpdated: values[6].trim(),
          description: values[7] ? values[7].trim() : ''
        });
      }
    }

    return items;
  }

  /**
   * Build hierarchical structure from flat items array
   */
  private buildHierarchy(items: HelpMenuItem[]): HelpMenuItem[] {
    const itemsMap = new Map<string, HelpMenuItem>();
    const rootItems: HelpMenuItem[] = [];

    // First pass: create map and initialize children arrays
    items.forEach(item => {
      item.children = [];
      itemsMap.set(item.helpId, item);
    });

    // Second pass: build hierarchy
    items.forEach(item => {
      if (item.parentHelpId) {
        const parent = itemsMap.get(item.parentHelpId);
        if (parent) {
          parent.children!.push(item);
        }
      } else {
        rootItems.push(item);
      }
    });

    // Sort by order recursively
    const sortByOrder = (items: HelpMenuItem[]) => {
      items.sort((a, b) => a.order - b.order);
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortByOrder(item.children);
        }
      });
    };

    sortByOrder(rootItems);
    return rootItems;
  }

  /**
   * Filter help items by user roles
   */
  public getFilteredHelpItems(userRoles: string[]): HelpMenuItem[] {
    const allItems = this.helpItemsSubject.getValue();
    console.log('HelpMenuService: Filtering help items for roles:', userRoles);
    console.log('HelpMenuService: All items before filtering:', allItems);
    const filteredItems = this.filterItemsByRole(allItems, userRoles);
    console.log('HelpMenuService: Filtered items:', filteredItems);
    return filteredItems;
  }

  /**
   * Filter items recursively by role (supports semicolon-separated roles like navigation system)
   */
  private filterItemsByRole(items: HelpMenuItem[], userRoles: string[]): HelpMenuItem[] {
    return items.filter(item => {
      // If no role specified, item is visible to everyone
      if (!item.role || item.role === '') {
        return true;
      }

      // Split semicolon-separated roles (like navigation system)
      const itemRoles = item.role.split(';').map(role => role.trim());
      
      // Filter out null/undefined user roles and check if user has any of the required roles
      const validUserRoles = userRoles.filter(role => role != null);
      const hasRole = itemRoles.some(itemRole =>
        validUserRoles.some(userRole =>
          userRole.toLowerCase() === itemRole.toLowerCase()
        )
      );

      console.log(`HelpMenuService: Item '${item.title}' requires roles: [${itemRoles.join(', ')}], user has: [${validUserRoles.join(', ')}], hasRole: ${hasRole}`);

      return hasRole;
    }).map(item => {
      // Recursively filter children
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: this.filterItemsByRole(item.children, userRoles)
        };
      }
      return item;
    });
  }

  /**
   * Get all help items without role filtering (for help popup window)
   */
  public getAllHelpItems(): HelpMenuItem[] {
    return this.helpItemsSubject.getValue();
  }

  /**
   * Open the main help window with navigation menu
   */
  public openHelpWindow(): void {
    console.log('HelpMenuService: Opening main help window');
    
    // Open help index page in a clean popup window
    const helpRoute = `/help-index`;
    const fullUrl = `${window.location.origin}${helpRoute}`;
    
    console.log('HelpMenuService: Opening popup with URL:', fullUrl);
    
    // Calculate 70% screen size
    const windowWidth = Math.floor(screen.width * 0.7);
    const windowHeight = Math.floor(screen.height * 0.7);
    
    // Center the window on screen
    const left = Math.floor((screen.width - windowWidth) / 2);
    const top = Math.floor((screen.height - windowHeight) / 2);
    
    const popup = window.open(
      fullUrl,
      'helpWindow',
      `width=${windowWidth},height=${windowHeight},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no,directories=no,addressbar=no,personalbar=no,copyhistory=no`
    );
    
    console.log('HelpMenuService: Popup window object:', popup);
    
    if (popup) {
      popup.focus();
      // Note: Do NOT access popup.document here - in Edge, accessing popup.document
      // while the Angular app is bootstrapping can blank the page. The title is set
      // from within the HelpIndexComponent itself via document.title.
    } else {
      console.error('HelpMenuService: Failed to open help window - popup blocked?');
      // Fallback to same-window navigation if popup is blocked
      this.router.navigate([helpRoute]);
    }
  }

  /**
   * Open help content in a clean popup window without browser chrome
   */
  public openHelpContent(contentFile: string): void {
    console.log('HelpMenuService: Opening help content for file:', contentFile);
    // Create a route to view markdown content
    const helpRoute = `/help/${contentFile.replace('.md', '')}`;
    console.log('HelpMenuService: Opening clean popup window for route:', helpRoute);
    
    // Open in a clean popup window without URL bar and browser chrome
    const popup = window.open(
      helpRoute,
      'helpWindow',
      'width=900,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no,directories=no,addressbar=no,personalbar=no,copyhistory=no'
    );
    
    if (popup) {
      // Bring the popup to front and focus
      popup.focus();
      // Note: Do NOT access popup.document here - in Edge, accessing popup.document
      // while the Angular app is bootstrapping can blank the page. The title is set
      // from within the HelpContentViewerComponent itself via document.title.
    } else {
      console.error('HelpMenuService: Failed to open popup window - popup blocked?');
      // Fallback to same-window navigation if popup is blocked
      this.router.navigate([helpRoute]);
    }
  }

  /**
   * Get help content for direct display
   */
  public getHelpContent(contentFile: string): Observable<string> {
    const contentPath = `${this.helpContentBasePath}${contentFile}`;
    return this.http.get(contentPath, { responseType: 'text' }).pipe(
      catchError(error => {
        console.error(`Error loading help content: ${contentFile}`, error);
        return of('# Content Not Available\n\nThe requested help content could not be loaded.');
      })
    );
  }

  /**
   * Helper method to parse CSV line with proper handling of quoted values
   */
  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last value
    values.push(current.trim());

    return values;
  }
}

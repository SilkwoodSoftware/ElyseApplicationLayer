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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HelpMenuService } from '../../services/help-menu.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help-content-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="help-content-container">
      <div class="help-header">
        <button class="back-button" (click)="goBack()">← Back</button>
        <h2>{{ title }}</h2>
      </div>
      <div class="help-content" [innerHTML]="content$ | async">
      </div>
    </div>
  `,
  styles: [`
    .help-content-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .help-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      gap: 20px;
    }
    
    .back-button {
      background: #f0f0f0;
      border: 1px solid #ccc;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .back-button:hover {
      background: #e0e0e0;
    }
    
    .help-content {
      line-height: 1.6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .help-content h1 {
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
    }
    
    .help-content h2 {
      color: #555;
      margin-top: 30px;
    }
    
    .help-content p {
      margin-bottom: 16px;
    }
    
    .help-content ul, .help-content ol {
      margin-bottom: 16px;
      padding-left: 30px;
    }
    
    .help-content li {
      margin-bottom: 8px;
    }
    
    .help-content code {
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
  `]
})
export class HelpContentViewerComponent implements OnInit {
  content$!: Observable<string>;
  title: string = 'Help';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private helpMenuService: HelpMenuService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const contentFile = `${params['topic']}.md`;
      this.content$ = this.helpMenuService.getHelpContent(contentFile);
      
      // Set title based on topic
      this.title = params['topic'].replace(/-/g, ' ')
        .replace(/\b\w/g, (char: string) => char.toUpperCase());
      
      // Set the window title from within the component (safe for all browsers including Edge)
      document.title = `Help - ${this.title}`;
    });
  }

  goBack(): void {
    // Navigate back to the previous page or home
    window.history.back();
  }
}

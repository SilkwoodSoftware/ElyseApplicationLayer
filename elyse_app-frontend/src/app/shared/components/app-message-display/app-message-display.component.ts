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
import { CommonModule } from '@angular/common';

/**
 * Component for displaying application-layer messages separately from database messages
 * 
 * This component handles frontend validation errors, routing errors, and business logic messages
 * that should NOT interfere with the database messaging system (MessageLabelService)
 */
@Component({
  selector: 'app-message-display',
  template: `
    <div class="app-messages-container" *ngIf="hasMessages()">
      
      <!-- Application Errors -->
      <div class="app-error-section" *ngIf="errors && errors.length > 0">
        <div class="app-message-header app-error-header">
          <i class="fa fa-exclamation-triangle app-header-icon"></i>
          Application Errors
        </div>
        <div *ngFor="let error of errors" class="app-message app-error">
          <i class="fa fa-times-circle app-message-icon"></i>
          <span class="app-message-text">{{ error }}</span>
        </div>
      </div>
      
      <!-- Application Warnings -->
      <div class="app-warning-section" *ngIf="warnings && warnings.length > 0">
        <div class="app-message-header app-warning-header">
          <i class="fa fa-exclamation-circle app-header-icon"></i>
          Application Warnings
        </div>
        <div *ngFor="let warning of warnings" class="app-message app-warning">
          <i class="fa fa-exclamation-triangle app-message-icon"></i>
          <span class="app-message-text">{{ warning }}</span>
        </div>
      </div>
      
      <!-- Application Information -->
      <div class="app-info-section" *ngIf="info && info.length > 0">
        <div class="app-message-header app-info-header">
          <i class="fa fa-info-circle app-header-icon"></i>
          Application Information
        </div>
        <div *ngFor="let infoMsg of info" class="app-message app-info">
          <i class="fa fa-info-circle app-message-icon"></i>
          <span class="app-message-text">{{ infoMsg }}</span>
        </div>
      </div>
      
      <!-- System Errors -->
      <div class="app-system-section" *ngIf="systemErrors && systemErrors.length > 0">
        <div class="app-message-header app-system-header">
          <i class="fa fa-cog app-header-icon"></i>
          System Errors
        </div>
        <div *ngFor="let sysError of systemErrors" class="app-message app-system">
          <i class="fa fa-exclamation-triangle app-message-icon"></i>
          <span class="app-message-text">{{ sysError }}</span>
        </div>
      </div>
      
    </div>
  `,
  styles: [`
    .app-messages-container {
      margin-bottom: 16px;
      font-family: Arial, sans-serif;
    }
    
    .app-message-header {
      font-weight: bold;
      font-size: 14px;
      padding: 8px 12px;
      margin-bottom: 4px;
      border-radius: 4px 4px 0 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .app-header-icon {
      font-size: 14px;
    }
    
    .app-message {
      padding: 8px 12px;
      margin-bottom: 2px;
      border-radius: 0 0 4px 4px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .app-message:last-child {
      border-radius: 0 0 4px 4px;
    }
    
    .app-message-icon {
      font-size: 12px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    
    .app-message-text {
      flex: 1;
    }
    
    /* Error styling */
    .app-error-header {
      background-color: #f5c6cb;
      color: #721c24;
      border: 1px solid #f1b0b7;
    }
    
    .app-error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f1b0b7;
      border-top: none;
    }
    
    /* Warning styling */
    .app-warning-header {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }
    
    .app-warning {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
      border-top: none;
    }
    
    /* Info styling */
    .app-info-header {
      background-color: #d1ecf1;
      color: #0c5460;
      border: 1px solid #b8daff;
    }
    
    .app-info {
      background-color: #d1ecf1;
      color: #0c5460;
      border: 1px solid #b8daff;
      border-top: none;
    }
    
    /* System error styling */
    .app-system-header {
      background-color: #e2e3e5;
      color: #383d41;
      border: 1px solid #d6d8db;
    }
    
    .app-system {
      background-color: #f8f9fa;
      color: #383d41;
      border: 1px solid #d6d8db;
      border-top: none;
    }
    
    /* Ensure proper spacing between sections */
    .app-messages-container > div + div {
      margin-top: 12px;
    }
  `]
})
export class AppMessageDisplayComponent {
  @Input() errors: string[] = [];
  @Input() warnings: string[] = [];
  @Input() info: string[] = [];
  @Input() systemErrors: string[] = [];
  
  /**
   * Check if there are any messages to display
   */
  hasMessages(): boolean {
    return (this.errors?.length > 0) || 
           (this.warnings?.length > 0) || 
           (this.info?.length > 0) ||
           (this.systemErrors?.length > 0);
  }
}

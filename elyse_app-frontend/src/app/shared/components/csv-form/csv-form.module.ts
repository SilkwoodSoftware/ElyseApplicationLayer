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

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { CsvFormComponent } from './csv-form.component';
import { CsvFormDialogComponent } from '../csv-form-dialog/csv-form-dialog.component';
import { CsvFormService } from '../../services/csv-form.service';
import { CsvFormDialogService } from '../../services/csv-form-dialog.service';
import { FormFieldMenuModule } from '../form-field-menu/form-field-menu.module';
import { ThinkingIndicatorModule } from '../thinking-indicator/thinking-indicator.component.module';

@NgModule({
  declarations: [
    CsvFormComponent,
    CsvFormDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatIconModule,
    FormFieldMenuModule,
    ThinkingIndicatorModule
  ],
  exports: [
    CsvFormComponent,
    CsvFormDialogComponent
  ],
  providers: [
    CsvFormService,
    CsvFormDialogService
  ]
})
export class CsvFormModule { }

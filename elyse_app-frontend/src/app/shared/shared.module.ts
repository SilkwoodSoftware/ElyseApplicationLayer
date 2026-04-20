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
import { GenericTableService } from './services/generic-table.service';
import { TableStateService } from './services/table-state.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { TransactionResultDialogComponent } from './components/transaction-results/transaction-result-dialog.component';
import { DeleteRecordTransactionComponent } from './components/transaction-results/delete-record-transaction.component';
import { TableActionsService } from './services/table-actions.service';
import { LinkFileToDocDialogComponent } from '../controlling/link-file-to-document/link-file-to-doc-dialog.component';
import { TransactionResultsComponent } from './components/transaction-results/transaction-results.component';
import { ReadRouteComponent } from './components/read-route/read-route.component';
import { DucRouteComponent } from './components/duc-route/duc-route.component';
import { ReadRouteConfigService } from './services/read-route-config.service';
import { DucRouteConfigService } from './services/duc-route-config.service';
import { RouteManagerService } from './services/route-manager.service';
import { GenericTableComponent } from './components/generic-table/generic-table.component';
import { DisplayValuePipe } from './pipes/display-value.pipe';
import { MenuService } from './services/menu.service';
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { GlobalContextMenuDirective } from './directives/global-context-menu.directive';
import { ContextMenuService } from './services/context-menu.service';
import { ParameterMappingService } from './services/parameter-mapping.service';
import { CsvFormModule } from './components/csv-form/csv-form.module';
import { ChainNavigationModule } from './components/chain-navigation/chain-navigation.module';
import { FormFieldMenuModule } from './components/form-field-menu/form-field-menu.module';
import { CustomViewComponent } from './components/custom-view/custom-view.component';
import { CustomViewConfigService } from './services/custom-view-config.service';
import { AppMessageDisplayComponent } from './components/app-message-display/app-message-display.component';
import { HelpIndexComponent } from './components/help-index/help-index.component';
import { FrontendVersionComponent } from './components/frontend-version/frontend-version.component';
import { MarkdownModule } from 'ngx-markdown';

@NgModule({
  declarations: [
    ConfirmationDialogComponent,
    TransactionResultDialogComponent,
    DeleteRecordTransactionComponent,
    LinkFileToDocDialogComponent,
    TransactionResultsComponent,
    ReadRouteComponent,
    GenericTableComponent,
    DisplayValuePipe,
    ContextMenuComponent,
    GlobalContextMenuDirective,
    DucRouteComponent,
    CustomViewComponent,
    AppMessageDisplayComponent,
    HelpIndexComponent,
    FrontendVersionComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    CsvFormModule,
    ChainNavigationModule,
    FormFieldMenuModule,
    MarkdownModule.forChild(),
  ],
  providers: [
    GenericTableService,
    TableStateService,
    TableActionsService,
    ReadRouteConfigService,
    DucRouteConfigService,
    RouteManagerService,
    MenuService,
    ContextMenuService,
    CustomViewConfigService,
    // ParameterMappingService is already provided at the root level
  ],

  exports: [
    ConfirmationDialogComponent,
    TransactionResultDialogComponent,
    DeleteRecordTransactionComponent,
    LinkFileToDocDialogComponent,
    TransactionResultsComponent,
    ReadRouteComponent,
    GenericTableComponent,
    MatDialogModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    DisplayValuePipe,
    ContextMenuComponent,
    GlobalContextMenuDirective,
    DucRouteComponent,
    CustomViewComponent,
    AppMessageDisplayComponent,
    HelpIndexComponent,
    FrontendVersionComponent,
    CsvFormModule,
    ChainNavigationModule,
    FormFieldMenuModule,
    FormsModule,
  ],
})
export class SharedModule {}

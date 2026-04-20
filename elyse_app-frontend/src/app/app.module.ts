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

import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfigService } from './config.service';
import { ReadRoutesInitializerService } from './shared/services/read-routes-initializer.service';
import { TableSelectionExtensionService } from './shared/services/table-selection-extension.service';
import { ColumnWidthPersistenceService } from './shared/services/column-width-persistence.service';
import { CreateDocumentIdComponent } from './controlling/create-document-id/create-document-id.component';
import { AppComponent } from './app.component';
import { NavigationComponent } from './shared/components/navigation/navigation.component';
import { UploadFileComponent } from './editing/upload-file/upload-file.component';
import { FilesTableComponent } from './reading/files-table/files-table.component';
import { FileDeleteComponent } from './controlling/delete-file/delete-file.component';
import { AddUserComponent } from './controlling/add-user/add-user.component';
import { AddUserService } from './controlling/add-user/add-user.service';
import { RolesComponent } from './reading/roles/roles.component';
import { RolesService } from './reading/roles/roles.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { RouterModule } from '@angular/router';
import { AddSidStringComponent } from './controlling/add-user/add-sid-string.component';
import { AddSidStringService } from './controlling/add-user/add-sid-string.service';
import { ListUsersComponent } from './controlling/list-users/list-users.component';
import { ColumnResizeDirective } from './shared/directives/column-resize.directive';
import { MatIconModule } from '@angular/material/icon';
import { DeleteUserService } from './authorising/delete-user/delete-user.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SharedModule } from './shared/shared.module';
import { UpdateUserComponent } from './controlling/update-users/update-user.component';
import { ReadRolesByUserComponent } from './authorising/read-roles-by-user/read-roles-by-user.component';
import { ManageUserRolesModule } from './authorising/manage-user-roles/manage-user-roles.module';
import { MatDialogModule } from '@angular/material/dialog';
import { ReadAllUsersRolesComponent } from './authorising/read-all-users-roles/read-all-users-roles.component';
import { ReadDocRblistNamesComponent } from './configuring/metadata/lookups/read-doc-rblist-names/read-doc-rblist-names.component';
import { LoadFilesAndLinkModule } from './controlling/load-files-and-link/load-files-and-link.module';
import { LoadFilesModule } from './controlling/load-files/load-files.module';
import { ReadAllDocRblistsComponent } from './configuring/metadata/lookups/read-all-doc-rblist-attributes/read-all-doc-rblists.component';
import { AddDocRblistComponent } from './configuring/metadata/lookups/add-doc-rblist/add-doc-rblist.component';
import { InitialRolesComponent } from './reading/roles/initial-roles.component';
import { DeleteDocRblistComponent } from './configuring/metadata/lookups/delete-doc-rblist-name/delete-doc-rblist.component';
import { ReadDocRblistNamesService } from './configuring/metadata/lookups/read-doc-rblist-names/read-doc-rblist-names.service';
import { EditDocFileDataComponent } from './controlling/edit-doc-file-data/edit-doc-file-data.component';
import { DynamicFormComponent } from './shared/components/dynamic-form/dynamic-form.component';
import { ApplicationErrorDialogComponent } from './shared/components/application-error-dialog/application-error-dialog.component';
import { MessageLabelService } from './shared/services/message-label.service';
import { CreateDocumentIdDialogComponent } from './controlling/create-document-id/create-document-id-dialog.component';
import { AppMessageDisplayComponent } from './shared/components/app-message-display/app-message-display.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormFieldRoutingService } from './shared/services/form-field-routing.service';
import { DocumentValidationService } from './reading/documents/document-validation.service';
import { FormConfirmationDialogComponent } from './shared/components/form-confirmation-dialog/form-confirmation-dialog.component';
import { FilesSearchService } from './shared/services/files-search.service';
import { GenericSearchDialogComponent } from './shared/components/generic-search-dialog/generic-search-dialog.component';
import { FileSearchResultsComponent } from './reading/file-search-results/file-search-results.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ReadingModule } from './reading/reading.module';
import { MenuComponent } from './shared/components/menu/menu.component';
import { ThinkingIndicatorModule } from './shared/components/thinking-indicator/thinking-indicator.component.module';
import { CommandPaletteModule } from './shared/components/command-palette/command-palette.module';
import { CommandPaletteService } from './shared/services/command-palette.service';
import { InitialRolesService } from './reading/roles/initial-roles.service';
import { MarkdownModule } from 'ngx-markdown';

@NgModule({
  declarations: [
    AppComponent,
    NavigationComponent,
    UploadFileComponent,
    FilesTableComponent,
    FileDeleteComponent,
    CreateDocumentIdComponent,
    AddUserComponent,
    RolesComponent,
    AddSidStringComponent,
    ListUsersComponent,
    ColumnResizeDirective,
    UpdateUserComponent,
    ReadRolesByUserComponent,
    ReadAllUsersRolesComponent,
    ReadDocRblistNamesComponent,
    ReadAllDocRblistsComponent,
    AddDocRblistComponent,
    InitialRolesComponent,
    DeleteDocRblistComponent,
    EditDocFileDataComponent,
    DynamicFormComponent,
    ApplicationErrorDialogComponent,
    FormConfirmationDialogComponent,
    FilesTableComponent,
  ],
  imports: [
    BrowserModule,
    SharedModule,
    HttpClientModule,
    ReactiveFormsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    ManageUserRolesModule,
    MatDialogModule,
    CreateDocumentIdDialogComponent,
    MatTooltipModule,
    BrowserAnimationsModule,
    GenericSearchDialogComponent,
    FileSearchResultsComponent,
    MatFormFieldModule,
    MatSelectModule,
    ReadingModule,
    MenuComponent,
    LoadFilesAndLinkModule,
    LoadFilesModule,
    ThinkingIndicatorModule,
    CommandPaletteModule,
    MarkdownModule.forRoot(),
  ],
  providers: [
    AddUserService,
    RolesService,
    AddSidStringService,
    DeleteUserService,
    ReadDocRblistNamesService,
    MessageLabelService,
    FormFieldRoutingService,
    DocumentValidationService,
    FilesSearchService,
    CommandPaletteService,
    provideAnimationsAsync(),
    // Load runtime configuration before app starts
    {
      provide: APP_INITIALIZER,
      useFactory: (configService: ConfigService, http: HttpClient) => () => configService.loadConfig(),
      deps: [ConfigService, HttpClient],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (readRoutesInit: ReadRoutesInitializerService) => () => {},
      deps: [ReadRoutesInitializerService],
      multi: true
    },
    // Add our new services for ID/Name pairs
    {
      provide: APP_INITIALIZER,
      useFactory: (tableSelectionExtension: TableSelectionExtensionService) => () => {},
      deps: [TableSelectionExtensionService],
      multi: true
    },
    // Add column width persistence service
    {
      provide: APP_INITIALIZER,
      useFactory: (columnWidthPersistence: ColumnWidthPersistenceService) => () => {},
      deps: [ColumnWidthPersistenceService],
      multi: true
    },
    // Initialize command palette service
    {
      provide: APP_INITIALIZER,
      useFactory: (commandPalette: CommandPaletteService, initialRoles: InitialRolesService) => () => {
        const roles = initialRoles.getStoredSelectedRoles();
        // Extract role names from role objects
        const roleNames = roles.map((role: any) =>
          typeof role === 'string' ? role : role['Role Name']
        ).filter((name: string) => name);
        
        console.log('APP_INITIALIZER: Initializing command palette with roles:', roleNames);
        return commandPalette.initialize(roleNames).toPromise();
      },
      deps: [CommandPaletteService, InitialRolesService],
      multi: true
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

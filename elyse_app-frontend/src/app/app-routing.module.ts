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
import { Routes, RouterModule } from '@angular/router';
import { FilesTableComponent } from './reading/files-table/files-table.component';
import { UploadFileComponent } from './editing/upload-file/upload-file.component';
import { FileDeleteComponent } from './controlling/delete-file/delete-file.component';
import { CreateDocumentIdComponent } from './controlling/create-document-id/create-document-id.component';
import { NavigationComponent } from './shared/components/navigation/navigation.component';
import { AddUserComponent } from './controlling/add-user/add-user.component';
import { RolesComponent } from '../app/reading/roles/roles.component';
import { AddSidStringComponent } from './controlling/add-user/add-sid-string.component';
import { ListUsersComponent } from './controlling/list-users/list-users.component';
import { ReadAllUsersRolesComponent } from './authorising/read-all-users-roles/read-all-users-roles.component';
import { ReadDocRblistNamesComponent } from './configuring/metadata/lookups/read-doc-rblist-names/read-doc-rblist-names.component';
import { ReadAllDocRblistsComponent } from './configuring/metadata/lookups/read-all-doc-rblist-attributes/read-all-doc-rblists.component';
import { DocumentsTableComponent } from './reading/documents/documents-table.component';
import { EditDocFileDataComponent } from './controlling/edit-doc-file-data/edit-doc-file-data.component';
import { FileSearchResultsComponent } from './reading/file-search-results/file-search-results.component';
import { LoadFilesAndLinkComponent } from './controlling/load-files-and-link/load-files-and-link.component';
import { LoadFilesComponent } from './controlling/load-files/load-files.component';
import { UniversalRouteGuard } from './shared/guards/universal-route.guard';
import { HelpContentViewerComponent } from './shared/components/help-content-viewer/help-content-viewer.component';
import { HelpIndexComponent } from './shared/components/help-index/help-index.component';
import { FrontendVersionComponent } from './shared/components/frontend-version/frontend-version.component';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';

const routes: Routes = [
  // Command palette route (must be first and specific)
  {
    path: 'command-palette',
    component: CommandPaletteComponent,
    data: { hideNavigation: true }
  },
  // Help system routes (must be first and specific)
  {
    path: 'help-index',
    component: HelpIndexComponent,
    data: { hideNavigation: true }
  },
  {
    path: 'help/:topic',
    component: HelpContentViewerComponent,
    data: { hideNavigation: true }
  },
  // Frontend version route
  {
    path: 'reading/frontend-nameplate',
    component: FrontendVersionComponent
  },
  // Direct route to EditDocFileDataComponent (must be before wildcard routes)
  {
    path: 'edit-doc-file-data',
    component: EditDocFileDataComponent
  },
  // Handle root route - send to Reading module
  {
    path: '',
    canMatch: [UniversalRouteGuard],
    loadChildren: () => import('./reading/reading.module').then(m => m.ReadingModule)
  },
  // Custom view routes (most specific - should be checked first)
  {
    path: '**',
    canMatch: [UniversalRouteGuard],
    loadChildren: () => import('./custom-views/custom-views.module').then(m => m.CustomViewsModule)
  },
  // DUC routes
  {
    path: '**',
    canMatch: [UniversalRouteGuard],
    loadChildren: () => import('./duc/duc.module').then(m => m.DucModule)
  },
  // Reading routes (fallback for everything else)
  {
    path: '**',
    canMatch: [UniversalRouteGuard],
    loadChildren: () => import('./reading/reading.module').then(m => m.ReadingModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { enableTracing: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }

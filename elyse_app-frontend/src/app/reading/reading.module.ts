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
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { ReadRouteComponent } from '../shared/components/read-route/read-route.component';
import { ReadRouteDataResolver } from '../shared/resolvers/read-route-data.resolver';
import { CustomViewComponent } from '../shared/components/custom-view/custom-view.component';
import { CustomViewDataResolver } from '../shared/resolvers/custom-view-data.resolver';
import { FilesTableComponent } from './files-table/files-table.component';

const routes: Routes = [
  {
    path: 'reading',
    children: [
      {
        path: 'document/radio-button/attribute/read',
        loadChildren: () => import('./document/radiobutton-attributes/radiobutton-attributes.module')
          .then(m => m.RadiobuttonAttributesModule)
      },
      // Legacy routes (hardcoded components, bypass CSV)
      {
        path: 'legacy/forms/fields',
        loadChildren: () => import('./forms/fields/form-fields.module')
          .then(m => m.FormFieldsModule)
      },
      {
        path: 'legacy/duty-functions',
        loadChildren: () => import('./duty-functions/duty-functions.module')
          .then(m => m.DutyFunctionsModule)
      },
      // Legacy route - uses hardcoded FilesTableComponent (bypasses CSV)
      {
        path: 'legacy/all-files',
        component: FilesTableComponent
      },
      {
        path: 'custom-view/:viewId',
        component: CustomViewComponent,
        resolve: {
          customViewConfig: CustomViewDataResolver
        }
      }
    ]
  },
  // Handle CSV-defined READ routes at root level
  {
    path: '**',
    component: ReadRouteComponent,
    resolve: {
      readRouteConfig: ReadRouteDataResolver
    }
  }
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class ReadingModule { }

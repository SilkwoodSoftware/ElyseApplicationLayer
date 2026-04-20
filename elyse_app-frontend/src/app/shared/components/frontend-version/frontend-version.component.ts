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
import { VersionService } from '../../services/version.service';

@Component({
  selector: 'app-frontend-version',
  templateUrl: './frontend-version.component.html',
  styleUrls: ['./frontend-version.component.scss']
})
export class FrontendVersionComponent implements OnInit {
  versionData: Array<{name: string, value: string}> = [];

  constructor(private versionService: VersionService) {}

  ngOnInit(): void {
    const info = this.versionService.getVersionInfo();
    
    this.versionData = [
      { name: 'Product Name', value: info.name },
      { name: 'Version', value: info.version },
      { name: 'Build ID', value: info.buildId },
      { name: 'License', value: info.license }
    ];
  }
}

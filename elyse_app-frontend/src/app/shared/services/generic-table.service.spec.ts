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

import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { GenericTableService, TableType } from './generic-table.service';
import { environment } from '../../../environments/environment';

// Using xdescribe to skip these tests
xdescribe('GenericTableService', () => {
  let service: GenericTableService<any>;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GenericTableService],
    });

    service = TestBed.inject(GenericTableService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch table data', () => {
    const tableType: TableType = {
      name: 'Users',
      endpoint: 'list-users',
      idType: 'string',
      dataField: 'users',
    };

    const mockData = [
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' },
    ];

    service.getTableData(tableType).subscribe((data) => {
      expect(data).toEqual(mockData);
    });

    const req = httpTestingController.expectOne(
      `${environment.dotNetBaseUrl}/${tableType.endpoint}`
    );
    expect(req.request.method).toEqual('GET');
    req.flush(mockData);
  });

  it('should create a record', () => {
    const tableType: TableType = {
      name: 'Users',
      endpoint: 'list-users',
      idType: 'string',
      dataField: 'users',
    };

    const newRecord = { name: 'New User' };
    const createdRecord = { id: 3, name: 'New User' };

    service.createRecord(tableType, newRecord).subscribe((data) => {
      expect(data).toEqual(createdRecord);
    });

    const req = httpTestingController.expectOne(
      `${environment.dotNetBaseUrl}/${tableType.endpoint}`
    );
    expect(req.request.method).toEqual('POST');
    req.flush(createdRecord);
  });

  // Add more tests for update and delete operations
});

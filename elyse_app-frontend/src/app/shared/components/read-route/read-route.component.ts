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

import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { RouteConfigParserService } from '../../services/route-config-parser.service';
import { ReadRouteConfig } from '../../interfaces/read-route.interface';
import { RouteManagerService } from '../../services/route-manager.service';
import { ReadRoutesAdapterService } from '../../services/read-routes-adapter.service';
import { TableConfigService } from '../../services/table-config.service';
import { SelectedIdsService } from '../../services/selected-ids.service';
import { MessageLabelService } from '../../services/message-label.service';
import { TableSelectionExtensionService } from '../../services/table-selection-extension.service';
import { TableStateService } from '../../services/table-state.service';
import { FileDownloadService } from '../../../reading/file-download/file-download.service';
import { ApplicationMessageService } from '../../services/application-message.service';

@Component({
    selector: 'app-read-route',
    template: `
        <div *ngIf="routeConfig">
            <div class="table-heading">{{ displayName }}<span *ngFor="let dp of displayParameterItems">&nbsp;&nbsp;{{ dp.text }} <ng-container *ngIf="dp.paramName === 'fileId'"><a href="#" (click)="downloadFile(dp.value); $event.preventDefault()">{{ dp.value }}</a></ng-container><ng-container *ngIf="dp.paramName === 'documentId'"><a href="#" (click)="navigateToFilesForOneDocument(dp.value, $event)">{{ dp.value }}</a></ng-container><ng-container *ngIf="dp.paramName !== 'fileId' && dp.paramName !== 'documentId'">{{ dp.value }}</ng-container></span><br><br></div>
            
            <!-- Application Messages (separate from database messages) -->
            <app-message-display
                [errors]="appErrors"
                [warnings]="appWarnings"
                [info]="appInfo"
                [systemErrors]="systemErrors">
            </app-message-display>
            
            <app-chain-navigation [getData]="getChainData.bind(this)"></app-chain-navigation>
            <div class="table-container" #tableContainer>
                <table>
                    <thead>
                        <tr>
                            <th *ngFor="let column of visibleColumns; let i = index">
                                <div class="column-heading"
                                     [matTooltip]="getTooltip(column)"
                                     matTooltipPosition="above">
                                    <span class="column-title" (click)="onColumnSelect(column.key)">{{ column.header }}</span>
                                    <span class="sort-icon" *ngIf="sortColumn === column.key">{{sortOrder === 'asc' ? '▲' : '▼'}}</span>
                                </div>
                                <div class="resize-handle" (mousedown)="onColumnResize($event, i)"></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let row of tableData"
                            [class.selected]="selectedRows.includes(row)"
                            (click)="onRowMultiSelect($event, row)">
                            <td *ngFor="let column of visibleColumns">
                                <ng-container *ngIf="isFileIdColumn(column.key)">
                                    <a href="#" (click)="downloadFile(row[column.key]); $event.preventDefault()" download>{{ formatDisplayValue(row[column.key]) }}</a>
                                </ng-container>
                                <ng-container *ngIf="isDocumentIdColumn(column.key)">
                                    <a href="#" (click)="navigateToFilesForOneDocument(row[column.key], $event)">{{ formatDisplayValue(row[column.key]) }}</a>
                                </ng-container>
                                <ng-container *ngIf="!isFileIdColumn(column.key) && !isDocumentIdColumn(column.key)">
                                    {{ formatDisplayValue(row[column.key]) }}
                                </ng-container>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="messages-container">
                <span *ngFor="let item of messageItems" class="result-item">
                    {{ item.label }}: <span class="result-value">{{ item.value }}</span>
                </span>
            </div>
        </div>
    `,
    styleUrls: ['../../stylesheets/tables.scss', '../../stylesheets/messages.scss']
})
export class ReadRouteComponent implements OnInit, AfterViewInit, OnDestroy {
    private routeChangeSubscription: Subscription | undefined;
    @ViewChild('tableContainer') tableContainer!: ElementRef;
    private isDragging: boolean = false;
    private dragStartPosition: { x: number, y: number } | null = null;
    routeConfig: ReadRouteConfig | undefined;
    displayName: string = '';
    tableConfig: any;
    tableData: any[] = [];
    messageItems: { label: string, value: string }[] = [];
    sortColumn: string = '';
    sortOrder: 'asc' | 'desc' = 'asc';
    selectedRows: any[] = [];
    tooltips: {[key: string]: string} = {};
    columnMapping: {[key: string]: string} = {};
    // Flag to determine if this is a fileData route
    isFileDataRoute: boolean = false;
    // Display parameter items for the heading (supports hyperlinks for fileId)
    displayParameterItems: { text: string, paramName: string, value: string }[] = [];
    
    // Application messages (separate from database messages)
    appErrors: string[] = [];
    appWarnings: string[] = [];
    appInfo: string[] = [];
    systemErrors: string[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private routeManager: RouteManagerService,
        private readRoutesAdapter: ReadRoutesAdapterService<any>,
        private tableConfigService: TableConfigService,
        private messageLabelService: MessageLabelService,
        private selectedIdsService: SelectedIdsService,
        private tableSelectionExtensionService: TableSelectionExtensionService,
        private tableStateService: TableStateService,
        private fileDownloadService: FileDownloadService,
        private routeConfigParserService: RouteConfigParserService,
        private applicationMessageService: ApplicationMessageService
    ) {}

    ngOnInit() {
        // Initial load of route config
        this.loadRouteConfig();
        
        // Subscribe to route changes
        this.routeChangeSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            console.log('Route changed, reloading config');
            this.loadRouteConfig();
        });
    }
    
    private loadRouteConfig() {
        // Get config from route data
        this.routeConfig = this.route.snapshot.data['readRouteConfig'];
        console.log('Route config loaded:', this.routeConfig?.routeUrl);
        
        if (!this.routeConfig) {
            console.error('No route configuration found');
            return;
        }

        // Initialize local display name from route config
        this.displayName = this.routeConfig.displayName || '';

        // Check if this is a fileData route
        this.isFileDataRoute = this.routeConfig.dataField === 'fileData';
        console.log('Is fileData route:', this.isFileDataRoute);

        // Process display parameters if present
        this.processDisplayParameters();

        this.setupTable();
        this.loadData();
    }

    /**
     * Process display parameters to enhance the table heading with parameter values.
     * Format in CSV: "Text1|ParameterName1;Text2|ParameterName2,..."
     * Parameters with paramName 'fileId' are rendered as download hyperlinks in the template.
     */
    private processDisplayParameters(): void {
        this.displayParameterItems = [];
        
        if (!this.routeConfig || !this.routeConfig.displayParameters) {
            return;
        }

        const displayParams = this.routeConfig.displayParameters.split(';');
        const queryParams = new URLSearchParams(window.location.search);

        for (const param of displayParams) {
            const [text, paramName] = param.split('|').map(p => p.trim());
            
            if (paramName && queryParams.has(paramName)) {
                const paramValue = queryParams.get(paramName);
                if (paramValue) {
                    this.displayParameterItems.push({
                        text: text,
                        paramName: paramName,
                        value: paramValue
                    });
                }
            }
        }
    }
    
    ngAfterViewInit(): void {
        this.initializeColumnWidths();
    }

    private setupTable() {
        if (!this.routeConfig) return;

        const tableConfig = {
            columns: [], // Will be populated from API response
            dataSource: this.routeConfig.apiEndpoint,
            actions: [],
            defaultSort: this.routeConfig.tableConfig.defaultSort
        };

        this.tableConfigService.setTableConfig(this.routeConfig.routeUrl, tableConfig);
        this.tableConfig = tableConfig;
    }

    get visibleColumns() {
        if (!this.tableConfig?.columns) return [];
        return this.tableConfig.columns.filter((col: any) => 
            !this.routeConfig?.tableConfig.hiddenColumns.includes(col.key));
    }

    private loadData() {
        if (!this.routeConfig) return;

        const tableType = {
            name: this.routeConfig.displayName,
            endpoint: this.routeConfig.apiEndpoint,
            idType: 'bigint' as 'bigint' | 'string',
            dataField: this.routeConfig.dataField || 'data',
            useTransform: this.routeConfig.useTransform || false
        };

        // Get input parameters from URL
        const params = this.getInputParams();

        this.readRoutesAdapter.getTableData(tableType, params).subscribe(
            response => {
                if (response.data && response.data.length > 0) {
                    // Set up columns from the column mapping
                    const columns = Object.keys(response.data[0])
                        .filter(key => !this.routeConfig?.tableConfig.hiddenColumns.includes(key))
                        .map(key => {
                            // Extract just the column name without tooltip
                            // Some column names might contain both name and tooltip separated by ::
                            const headerParts = key.split('::');
                            const header = headerParts[0].trim();
                            
                            return {
                                key,
                                header: header, // Use just the column name as the header
                                sortable: true,
                                resizable: true
                            };
                        });
                    
                    // Update table config with columns
                    this.tableConfig = {
                        ...this.tableConfig,
                        columns
                    };
                    
                    // Update the stored config
                    if (this.routeConfig) {
                        this.tableConfigService.setTableConfig(this.routeConfig.routeUrl, this.tableConfig);
                    }
                }

                this.tableData = response.data;
                this.formatOutputMessage(response);
                
                // Set tooltips and column mapping
                this.tooltips = response.tooltips || {};
                this.columnMapping = response.columnMapping || {};
                console.log('Tooltips received:', this.tooltips);
                console.log('Column mapping:', this.columnMapping);

                // Apply default sort if configured
                if (this.routeConfig?.tableConfig.defaultSort) {
                    this.sortColumn = this.routeConfig.tableConfig.defaultSort.column;
                    this.sortOrder = this.routeConfig.tableConfig.defaultSort.direction;
                    this.sortData();
                }
                
                // Apply column widths after data is loaded
                this.applyColumnWidths();
            },
            error => {
                console.error('Error loading data:', error);
                const errorResponse = this.applicationMessageService.createFromHttpError(error);
                this.appErrors = errorResponse.appErrors || [];
                this.systemErrors = errorResponse.systemErrors || [];
                this.messageItems = []; // Keep database messages separate
            }
        );
    }

    private getInputParams(): any {
        if (!this.routeConfig || !this.routeConfig.inputParameters) {
            return {};
        }

        const params: any = {};
        
        // Get parameters from the URL query params
        const queryParams = new URLSearchParams(window.location.search);
        
        // For each input parameter defined in the route config
        this.routeConfig.inputParameters.forEach(param => {
            // Check if the parameter exists in the URL query params
            if (queryParams.has(param)) {
                params[param] = queryParams.get(param);
            }
        });
        
        return params;
    }

    private formatOutputMessage(response: any): void {
        this.messageItems = [];
        
        // Only display output parameters listed in the OutputParameters column of read-routes.csv
        if (this.routeConfig && this.routeConfig.outputParameters) {
            // Process each output parameter defined in the route config
            this.routeConfig.outputParameters.forEach(param => {
                if (response[param] !== undefined && response[param] !== null) {
                    this.messageItems.push({
                        label: this.messageLabelService.getLabel(param),
                        value: response[param].toString()
                    });
                }
            });
        }
    }

    onColumnSelect(column: string): void {
        if (this.sortColumn === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortOrder = 'asc';
        }
        this.sortData();
    }

    private sortData(): void {
        if (!this.sortColumn) return;
        
        this.tableData.sort((a, b) => {
            const valueA = a[this.sortColumn];
            const valueB = b[this.sortColumn];
            if (valueA < valueB) {
                return this.sortOrder === 'asc' ? -1 : 1;
            } else if (valueA > valueB) {
                return this.sortOrder === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }
    
    // Column resizing method
    onColumnResize(event: MouseEvent, columnIndex: number): void {
        event.preventDefault();
        if (this.tableContainer && this.tableContainer.nativeElement) {
            const headerRow = this.tableContainer.nativeElement.querySelector('tr');
            const th = headerRow.children[columnIndex] as HTMLElement;
            const startX = event.pageX;
            const startWidth = th.offsetWidth;

            const onMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = moveEvent.pageX - startX;
                const newWidth = Math.max(50, startWidth + deltaX);
                th.style.width = `${newWidth}px`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.saveColumnWidths();
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
    }

    // Initialize column widths after view init
    initializeColumnWidths(): void {
        if (!this.routeConfig) return;
        
        if (this.tableContainer && this.tableContainer.nativeElement) {
            const tableElement = this.tableContainer.nativeElement.querySelector('table');
            if (tableElement) {
                const headerCells = tableElement.querySelectorAll('th');
                const columnWidths = Array.from(headerCells).map(cell => (cell as HTMLElement).offsetWidth);
                this.tableStateService.setColumnWidths(this.routeConfig.routeUrl, columnWidths);
            }
        }
    }

    // Apply saved column widths
    applyColumnWidths(): void {
        if (!this.routeConfig) return;
        
        const columnWidths = this.tableStateService.getColumnWidths(this.routeConfig.routeUrl);
        if (!columnWidths || columnWidths.length === 0) return;
        
        if (this.tableContainer && this.tableContainer.nativeElement) {
            const tableElement = this.tableContainer.nativeElement.querySelector('table');
            if (tableElement) {
                columnWidths.forEach((width, index) => {
                    const thElement = tableElement.querySelector(`th:nth-child(${index + 1})`);
                    if (thElement) {
                        thElement.style.width = `${width}px`;
                    }
                });
            }
        }
    }

    // Save column widths
    saveColumnWidths(): void {
        if (!this.routeConfig) return;
        
        if (this.tableContainer && this.tableContainer.nativeElement) {
            const headerCells = this.tableContainer.nativeElement.querySelectorAll('th');
            const columnWidths = Array.from(headerCells).map(cell => (cell as HTMLElement).offsetWidth);
            this.tableStateService.setColumnWidths(this.routeConfig.routeUrl, columnWidths);
        }
    }
    
    @HostListener('mousedown', ['$event'])
    onMouseDown(event: MouseEvent): void {
        this.isDragging = false;
        this.dragStartPosition = { x: event.clientX, y: event.clientY };
    }

    @HostListener('mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        if (this.dragStartPosition) {
            const dragDistance = Math.sqrt(
                Math.pow(event.clientX - this.dragStartPosition.x, 2) +
                Math.pow(event.clientY - this.dragStartPosition.y, 2)
            );
            if (dragDistance > 5) {
                this.isDragging = true;
            }
        }
    }

    @HostListener('mouseup', ['$event'])
    onMouseUp(event: MouseEvent): void {
        this.isDragging = false;
        this.dragStartPosition = null;
    }

    onRowMultiSelect(event: MouseEvent, row: any): void {
        if (this.isDragging) return;
        if (event.ctrlKey || event.metaKey) {
            // Multi-select with Ctrl/Cmd key
            const index = this.selectedRows.findIndex(selectedRow => selectedRow === row);
            if (index > -1) {
                this.selectedRows.splice(index, 1);
            } else {
                this.selectedRows.push(row);
            }
        } else if (event.shiftKey && this.selectedRows.length > 0) {
            // Multi-select with Shift key
            const lastSelectedIndex = this.tableData.findIndex(item => item === this.selectedRows[this.selectedRows.length - 1]);
            const currentSelectedIndex = this.tableData.findIndex(item => item === row);
            const startIndex = Math.min(lastSelectedIndex, currentSelectedIndex);
            const endIndex = Math.max(lastSelectedIndex, currentSelectedIndex);
            this.selectedRows = this.tableData.slice(startIndex, endIndex + 1);
        } else {
            // Single select
            this.selectedRows = [row];
        }

        // Get the key columns and key column pairs from the route config
        const keyColumns = this.routeConfig?.tableConfig.keyColumns || [];
        const keyColumnPairs = this.routeConfig?.tableConfig.keyColumnPairs || [];
        
        // We'll log the key column data in the tableSelectionExtensionService
        
        // If key columns are defined, use the first one as the ID column
        let idColumn = 'ID'; // Default ID column
        if (keyColumns.length > 0) {
            idColumn = keyColumns[0];
        }
        
        // Extract IDs from the selected rows using the ID column
        const selectedIds = this.selectedRows.map(row => {
            const id = row[idColumn];
            return id !== undefined ? id : null;
        }).filter(id => id !== null);
        
        // Update the selected IDs service
        this.selectedIdsService.setSelectedIdsAndNames(selectedIds, []);
        
        // Process selected rows directly using the current route config
        if (this.routeConfig) {
            // Extract the TableName from the route configuration using RouteConfigParserService
            this.routeConfigParserService.loadRouteConfigurations().subscribe({
                next: (configs: any[]) => {
                    // Find the config with the matching route URL
                    const config = configs.find((c: any) => c.RouteUrl === this.routeConfig?.routeUrl);
                    
                    if (config && config.TableName) {
                        // Process the selected rows with the TableName from read-routes.csv
                        console.log('Processing selected rows with table name:', config.TableName);
                        this.tableSelectionExtensionService.processSelectedRows(
                            config.TableName,
                            this.selectedRows
                        );
                    } else {
                        console.error('No table name found for route URL:', this.routeConfig?.routeUrl);
                    }
                },
                error: (error: any) => {
                    console.error('Error loading route configurations:', error);
                }
            });
        }
    }

    getTooltip(column: any): string {
        const columnKey = column.key;
        const fullKey = this.columnMapping[columnKey];
        return fullKey ? (this.tooltips[fullKey] || '') : '';
    }

    formatDisplayValue(value: any): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return '';
        return value.toString();
    }

    // Check if a column is the File ID column
    isFileIdColumn(columnKey: string): boolean {
        return columnKey === 'File ID';
    }

    // Check if a column is the Document ID column
    isDocumentIdColumn(columnKey: string): boolean {
        return columnKey === 'Document ID';
    }

    // Download a file by its ID
    downloadFile(fileId: string | number): void {
        if (fileId) {
            const numericFileId = typeof fileId === 'string' ? parseInt(fileId, 10) : fileId;
            this.fileDownloadService.downloadFile(numericFileId);
        }
    }

    // Navigate to files-for-one-document route with the document ID
    navigateToFilesForOneDocument(documentId: any, event: Event): void {
        event.preventDefault();
        if (documentId) {
            // Navigate to the files-for-one-document route with the document ID as a parameter
            // Route URL and parameter name confirmed from read-routes.csv
            this.router.navigate(['/reading/files-for-one-document'], {
                queryParams: { documentId: documentId }
            });
        }
    }
    
    ngOnDestroy(): void {
        // Clean up subscriptions
        if (this.routeChangeSubscription) {
            this.routeChangeSubscription.unsubscribe();
        }
    }

    /**
     * Provides data for the ChainNavigationComponent
     * This method is bound to the ChainNavigationComponent's getData input
     * @returns Record<string, any> Data to be passed to the next link in the chain
     */
    getChainData(): Record<string, any> {
        // Get the key columns from the route config
        const keyColumns = this.routeConfig?.tableConfig.keyColumns || [];
        
        // If key columns are defined, use the first one as the ID column
        let idColumn = 'ID'; // Default ID column
        if (keyColumns.length > 0) {
            idColumn = keyColumns[0];
        }
        
        // Extract data from the selected rows
        const result: Record<string, any> = {};
        
        // If we have selected rows, use the first one for chain data
        if (this.selectedRows.length > 0) {
            const selectedRow = this.selectedRows[0];
            
            // Add all properties from the selected row to the result
            Object.keys(selectedRow).forEach(key => {
                result[key] = selectedRow[key];
            });
            
            // Ensure we have an ID property
            if (selectedRow[idColumn] !== undefined) {
                result['ID'] = selectedRow[idColumn];
            }
        }
        
        return result;
    }
}

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

/**
 * MenuTreeBuilder module for parsing menu specification CSV data
 * and constructing menu trees using ForestBuilder.
 *
 * All functions in this module are pure functions with no side effects.
 */

import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import {
  ForestBuilder,
  Forest,
  FlatTree,
  NodeDataMap,
  TreeNode,
  TreeConstructionError,
} from './ForestBuilder';
import {
  MenuItemId,
  MenuItemData,
  Role,
  ActionType
} from '../models/menu-item.model';

// Column names for CSV parsing
export enum MenuCsvColumn {
  MenuItemId = 'MenuItemId',
  Label = 'Label',
  ParentMenu = 'ParentMenu',
  Roles = 'Roles',
  ActionType = 'ActionType',
  Reference = 'Reference',
  Shortcut = 'Shortcut',
  Order = 'Order',
  Description = 'Description',
  Icon = 'Icon',
}

// CSV parse result type
export interface CsvParseResult {
  headers: string[];
  rows: string[][];
}

// Type alias for CSV Row
export type CsvRow = string[];

// Parsed row data type
export interface ParsedRowData {
  menuItemId: MenuItemId;
  parentMenuId: O.Option<MenuItemId>;
  menuItemData: MenuItemData;
}

// ForestBuilder input type
export interface ForestBuilderInput {
  flatTree: FlatTree<MenuItemId>;
  nodeDataMap: NodeDataMap<MenuItemId, MenuItemData>;
}

// Menu tree node
export type MenuTreeNode = TreeNode<MenuItemId, MenuItemData>;

// Menu forest
export type MenuForest = Forest<MenuItemId, MenuItemData>;

// MenuTreeBuilder error types
export type MenuTreeBuilderError =
  | { type: 'GenericMenuTreeBuilderError'; message: string }
  | { type: 'MissingColumnError'; message: string; columnName: string }
  | { type: 'IncompleteRowError'; message: string; rowIndex: number }
  | {
      type: 'InvalidValueError';
      message: string;
      value: string;
      field: string;
      rowIndex: number;
    }
  | TreeConstructionError<MenuItemId>;

/**
 * MenuTreeBuilder class for constructing menu trees from CSV data.
 * All methods are pure functions.
 */
export class MenuTreeBuilder {
  // Required columns for menu CSV
  private static readonly REQUIRED_COLUMNS = [
    MenuCsvColumn.MenuItemId,
    MenuCsvColumn.Label,
    MenuCsvColumn.ParentMenu,
    MenuCsvColumn.Roles,
  ];

  // Numeric constants
  private static readonly DECIMAL_RADIX = 10;

  /**
   * Parse CSV string and extract header and rows
   *
   * This is a pure function with no side effects.
   *
   * @param csvString The CSV data as a string
   * @returns Either an error or a CsvParseResult
   */
  private static parseCSV(
    csvString: string
  ): E.Either<MenuTreeBuilderError, CsvParseResult> {
    const tryCatchCsv = (): CsvParseResult => {
      const lines = csvString
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        throw new Error('CSV is empty');
      }

      const headers = this.parseCSVRow(lines[0]);
      const rows = lines.slice(1).map((line) => this.parseCSVRow(line));

      return { headers, rows };
    };

    const handleError = (error: unknown): MenuTreeBuilderError => ({
      type: 'GenericMenuTreeBuilderError',
      message: `Error parsing CSV: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });

    return E.tryCatch(tryCatchCsv, handleError);
  }

  /**
   * Parse a single CSV row, handling quoted values and commas inside quotes
   *
   * This is a pure function with no side effects.
   *
   * @param row A CSV row as a string
   * @returns Array of field values as CsvRow
   */
  private static parseCSVRow(row: string): CsvRow {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Validate the CSV headers to ensure required columns are present
   *
   * This is a pure function with no side effects.
   *
   * @param headers Array of header names
   * @returns Either an error or the validated headers
   */
  private static validateHeaders(
    headers: string[]
  ): E.Either<MenuTreeBuilderError, string[]> {
    for (const column of this.REQUIRED_COLUMNS) {
      if (!headers.includes(column)) {
        return E.left({
          type: 'MissingColumnError',
          message: `Required column '${column}' is missing`,
          columnName: column,
        });
      }
    }

    return E.right(headers);
  }

  /**
   * Parse a semicolon-separated list of roles
   *
   * This is a pure function with no side effects.
   *
   * @param rolesString Semicolon-separated list of roles
   * @param rowIndex Row index for error reporting
   * @returns Either an error or an array of valid Role enums
   */
  private static parseRoles(
    rolesString: string,
    rowIndex: number
  ): E.Either<MenuTreeBuilderError, Role[]> {
    if (!rolesString) {
      // Empty roles means visible to any or no role set (as per functional specification)
      return E.right([]);
    }

    const roleStrings = rolesString.split(';');
    const roleResults = roleStrings.map((roleStr) => {
      const trimmedRole = roleStr.trim();
      if (Object.values(Role).includes(trimmedRole as Role)) {
        return E.right(trimmedRole as Role);
      } else {
        return E.left({
          type: 'InvalidValueError' as const,
          message: `Invalid role value '${trimmedRole}' in row ${rowIndex}`,
          value: trimmedRole,
          field: MenuCsvColumn.Roles,
          rowIndex,
        });
      }
    });

    return pipe(roleResults, A.sequence(E.Applicative));
  }

  /**
   * Parse an action type string
   *
   * This is a pure function with no side effects.
   *
   * @param actionTypeStr Action type string
   * @param rowIndex Row index for error reporting
   * @returns Either an error or an Option of ActionType
   */
  private static parseActionType(
    actionTypeStr: string,
    rowIndex: number
  ): E.Either<MenuTreeBuilderError, O.Option<ActionType>> {
    if (!actionTypeStr) {
      return E.right(O.none);
    }

    if (Object.values(ActionType).includes(actionTypeStr as ActionType)) {
      return E.right(O.some(actionTypeStr as ActionType));
    } else {
      return E.left({
        type: 'InvalidValueError',
        message: `Invalid action type '${actionTypeStr}' in row ${rowIndex}`,
        value: actionTypeStr,
        field: MenuCsvColumn.ActionType,
        rowIndex,
      });
    }
  }

  /**
   * Parse an order string to a number
   *
   * This is a pure function with no side effects.
   *
   * @param orderStr Order string
   * @param rowIndex Row index for error reporting
   * @returns Either an error or an Option of number
   */
  private static parseOrder(
    orderStr: string,
    rowIndex: number
  ): E.Either<MenuTreeBuilderError, O.Option<number>> {
    if (!orderStr) {
      return E.right(O.none);
    }

    const order = parseInt(orderStr, this.DECIMAL_RADIX);
    if (isNaN(order)) {
      return E.left({
        type: 'InvalidValueError',
        message: `Invalid order value '${orderStr}' in row ${rowIndex}`,
        value: orderStr,
        field: MenuCsvColumn.Order,
        rowIndex,
      });
    }

    return E.right(O.some(order));
  }

  /**
   * Convert a string to an Option
   *
   * This is a pure function with no side effects.
   *
   * @param value The string value
   * @returns An Option of string
   */
  private static stringToOption(value: string): O.Option<string> {
    return value ? O.some(value) : O.none;
  }

  /**
   * Create MenuItemData from parsed values
   *
   * This is a pure function with no side effects.
   *
   * @param label Label string
   * @param roles Array of roles
   * @param actionType Option of action type
   * @param reference Option of reference string
   * @param shortcut Option of shortcut string
   * @param order Option of order number
   * @param description Option of description string
   * @param icon Option of icon string
   * @returns MenuItemData
   */
  private static createMenuItemData(
    label: string,
    roles: Role[],
    actionType: O.Option<ActionType>,
    reference: O.Option<string>,
    shortcut: O.Option<string>,
    order: O.Option<number>,
    description: O.Option<string>,
    icon: O.Option<string>
  ): MenuItemData {
    return {
      label,
      roles,
      actionType,
      reference,
      shortcut,
      order,
      description,
      icon,
    };
  }

  /**
   * Parse a row of CSV data into a menu item entry
   *
   * This is a pure function with no side effects.
   *
   * @param row Array of field values
   * @param headers Array of header names
   * @param rowIndex Row index for error reporting
   * @returns Either an error or a ParsedRowData
   */
  private static parseRow(
    row: CsvRow,
    headers: string[],
    rowIndex: number
  ): E.Either<MenuTreeBuilderError, ParsedRowData> {
    // Helper to get a value from the row by column name
    const getValue = (columnName: MenuCsvColumn): string => {
      const index = headers.indexOf(columnName);
      return index >= 0 && index < row.length ? row[index] : '';
    };

    const menuItemId = getValue(MenuCsvColumn.MenuItemId);
    const label = getValue(MenuCsvColumn.Label);
    const parentMenu = getValue(MenuCsvColumn.ParentMenu);
    const rolesStr = getValue(MenuCsvColumn.Roles);
    const actionTypeStr = getValue(MenuCsvColumn.ActionType);
    const reference = getValue(MenuCsvColumn.Reference);
    const shortcut = getValue(MenuCsvColumn.Shortcut);
    const orderStr = getValue(MenuCsvColumn.Order);
    const description = getValue(MenuCsvColumn.Description);
    const icon = getValue(MenuCsvColumn.Icon);

    // Validate required fields
    if (!menuItemId) {
      return E.left({
        type: 'InvalidValueError',
        message: `MenuItemId cannot be empty in row ${rowIndex}`,
        value: menuItemId,
        field: MenuCsvColumn.MenuItemId,
        rowIndex,
      });
    }

    if (!label) {
      return E.left({
        type: 'InvalidValueError',
        message: `Label cannot be empty in row ${rowIndex}`,
        value: label,
        field: MenuCsvColumn.Label,
        rowIndex,
      });
    }

    // Parse action type
    const parseActionTypeResult = (actionTypeStr: string) =>
      this.parseActionType(actionTypeStr, rowIndex);

    // Parse order
    const parseOrderResult = (orderStr: string) =>
      this.parseOrder(orderStr, rowIndex);

    // Create ParsedRowData
    const createRowData = (
      roles: Role[],
      actionType: O.Option<ActionType>,
      order: O.Option<number>
    ): ParsedRowData => {
      const parentMenuOption = this.stringToOption(parentMenu);

      const menuItemData = this.createMenuItemData(
        label,
        roles,
        actionType,
        this.stringToOption(reference),
        this.stringToOption(shortcut),
        order,
        this.stringToOption(description),
        this.stringToOption(icon)
      );

      return {
        menuItemId,
        parentMenuId: parentMenuOption,
        menuItemData,
      };
    };

    // Parse roles and chain the other parsing operations
    const result = pipe(
      this.parseRoles(rolesStr, rowIndex),
      E.chain((roles) =>
        pipe(
          parseActionTypeResult(actionTypeStr),
          E.chain((actionType) =>
            pipe(
              parseOrderResult(orderStr),
              E.map((order) => createRowData(roles, actionType, order))
            )
          )
        )
      )
    );
    
//    if (E.isLeft(result)) {
//      console.error(`[MenuTreeBuilder.parseRow] Row ${rowIndex}: FAILED to parse`, result.left);
//    } else {
//      console.log(`[MenuTreeBuilder.parseRow] Row ${rowIndex}: Successfully parsed menu item "${label}"`);
//    }
    
    return result;
  }

  /**
   * Convert parsed rows to the format required by ForestBuilder
   *
   * This is a pure function with no side effects.
   *
   * @param parsedRows Array of ParsedRowData
   * @returns ForestBuilderInput
   */
  private static createForestBuilderInput(
    parsedRows: ParsedRowData[]
  ): ForestBuilderInput {
    // Create flat tree (parent-child relationships)
    const flatTree: FlatTree<MenuItemId> = [];

    parsedRows.forEach((row) => {
      pipe(
        row.parentMenuId,
        O.fold(
          () => {}, // Do nothing for None
          (parentId: MenuItemId) => {
            flatTree.push({
              parent: parentId,
              child: row.menuItemId,
            });
          }
        )
      );
    });

    // Create node data map
    const nodeDataMap: NodeDataMap<MenuItemId, MenuItemData> = parsedRows.map(
      (row) => ({ id: row.menuItemId, data: row.menuItemData })
    );

    return {
      flatTree,
      nodeDataMap,
    };
  }

  /**
   * Parse rows helper function for the build pipe
   *
   * This is a pure function with no side effects.
   *
   * @param headersAndRows Object containing headers and rows
   * @returns Either an error or array of ParsedRowData
   */
  private static parseRows(
    headersAndRows: CsvParseResult
  ): E.Either<MenuTreeBuilderError, ParsedRowData[]> {
    console.log('[MenuTreeBuilder.parseRows] Starting to parse all rows');
    const { headers, rows } = headersAndRows;
    console.log(`[MenuTreeBuilder.parseRows] Total rows to parse: ${rows.length}`);

    const parsedRowsResult = rows.map((row, index) =>
      this.parseRow(row, headers, index + 1)
    );

    // Check which rows failed before sequencing
    const failedRows = parsedRowsResult
      .map((result, index) => ({ result, index: index + 1 }))
      .filter(({ result }) => E.isLeft(result));
    
    if (failedRows.length > 0) {
      console.error(`[MenuTreeBuilder.parseRows] Found ${failedRows.length} failed rows before sequencing:`);
      failedRows.forEach(({ result, index }) => {
        if (E.isLeft(result)) {
          console.error(`  Row ${index} error:`, JSON.stringify(result.left, null, 2));
        }
      });
    }

    const result = pipe(parsedRowsResult, A.sequence(E.Applicative));
    
    if (E.isLeft(result)) {
      console.error('[MenuTreeBuilder.parseRows] FAILED to parse rows - Error details:');
      console.error('  Error type:', result.left.type);
      console.error('  Error message:', result.left.message);
      console.error('  Full error:', JSON.stringify(result.left, null, 2));
    } else {
      console.log(`[MenuTreeBuilder.parseRows] Successfully parsed ${result.right.length} rows`);
    }
    
    return result;
  }

  /**
   * Process parsed rows and build the forest
   *
   * This is a pure function with no side effects.
   *
   * @param parsedRows Array of ParsedRowData
   * @returns Either an error or a MenuForest
   */
  private static buildForest(
    parsedRows: ParsedRowData[]
  ): E.Either<MenuTreeBuilderError, MenuForest> {
    console.log('[MenuTreeBuilder.buildForest] Building menu forest');
    console.log(`[MenuTreeBuilder.buildForest] Total parsed rows: ${parsedRows.length}`);
    
    const { flatTree, nodeDataMap } = this.createForestBuilderInput(parsedRows);
    
    console.log(`[MenuTreeBuilder.buildForest] FlatTree entries: ${flatTree.length}`);
    console.log(`[MenuTreeBuilder.buildForest] NodeDataMap entries: ${nodeDataMap.length}`);
    console.log('[MenuTreeBuilder.buildForest] FlatTree:', flatTree);

    const result = pipe(
      ForestBuilder.build<MenuItemId, MenuItemData>(flatTree, nodeDataMap),
      E.mapLeft((error): MenuTreeBuilderError => error)
    );
    
    if (E.isLeft(result)) {
      console.error('[MenuTreeBuilder.buildForest] FAILED to build forest - Error details:');
      console.error('  Error type:', result.left.type);
      console.error('  Error message:', result.left.message);
      console.error('  Full error:', JSON.stringify(result.left, null, 2));
    } else {
      console.log(`[MenuTreeBuilder.buildForest] Successfully built forest with ${result.right.length} root nodes`);
    }
    
    return result;
  }

  /**
   * Build a menu tree from CSV data
   *
   * This is a pure function with no side effects.
   *
   * @param csvString The CSV data as a string
   * @returns Either an error or a MenuForest
   */
  static build(csvString: string): E.Either<MenuTreeBuilderError, MenuForest> {
    console.log('===============================================');
    console.log('[MenuTreeBuilder.build] STARTING MENU TREE BUILD');
    console.log('===============================================');
    
    // Validate the headers and get the parsed result
    const validateAndGetParsedResult = (
      parseResult: CsvParseResult
    ): E.Either<MenuTreeBuilderError, CsvParseResult> => {
      return pipe(
        this.validateHeaders(parseResult.headers),
        E.map(() => parseResult)
      );
    };

    const result = pipe(
      // Parse the CSV
      this.parseCSV(csvString),

      // Validate headers
      E.chain(validateAndGetParsedResult),

      // Parse all rows
      E.chain(this.parseRows.bind(this)),

      // Build the forest
      E.chain(this.buildForest.bind(this))
    );
    
    console.log('===============================================');
    if (E.isLeft(result)) {
      console.error('[MenuTreeBuilder.build] BUILD FAILED');
      console.error('[MenuTreeBuilder.build] Error type:', result.left.type);
      console.error('[MenuTreeBuilder.build] Error message:', result.left.message);
      console.error('[MenuTreeBuilder.build] Full error details:', JSON.stringify(result.left, null, 2));
      
      // Additional debugging for specific error types
      if ('rowIndex' in result.left) {
        console.error(`[MenuTreeBuilder.build] Failed at row: ${result.left.rowIndex}`);
      }
      if ('field' in result.left) {
        console.error(`[MenuTreeBuilder.build] Failed field: ${result.left.field}`);
      }
      if ('value' in result.left) {
        console.error(`[MenuTreeBuilder.build] Invalid value: "${result.left.value}"`);
      }
    } else {
      console.log('[MenuTreeBuilder.build] BUILD SUCCEEDED');
      console.log(`[MenuTreeBuilder.build] Forest has ${result.right.length} root nodes`);
    }
    console.log('===============================================');
    
    return result;
  }
}

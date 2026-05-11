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
 * Type aliases for backward compatibility
 */

import {
  TreeNode,
  Forest,
  Edge,
  FlatTree,
  NodeDataMap,
  NodeDataEntry,
  TreeConstructionError,
} from '../utils/ForestBuilder';

// Re-export the types
export {
  TreeNode,
  Forest,
  Edge,
  FlatTree,
  NodeDataMap,
  NodeDataEntry,
  TreeConstructionError,
};

// String-based type aliases
export type StringTreeNode = TreeNode<string, string>;
export type StringForest = Forest<string, string>;
export type StringEdge = Edge<string>;
export type StringFlatTree = FlatTree<string>;
export type StringNodeDataEntry = NodeDataEntry<string, string>;
export type StringNodeDataMap = NodeDataMap<string, string>;
export type StringTreeConstructionError = TreeConstructionError<string>;

// Numeric type aliases
export type NumericTreeNode = TreeNode<number, string>;
export type NumericForest = Forest<number, string>;
export type NumericEdge = Edge<number>;
export type NumericFlatTree = FlatTree<number>;
export type NumericNodeDataEntry = NodeDataEntry<number, string>;
export type NumericNodeDataMap = NodeDataMap<number, string>;
export type NumericTreeConstructionError = TreeConstructionError<number>;

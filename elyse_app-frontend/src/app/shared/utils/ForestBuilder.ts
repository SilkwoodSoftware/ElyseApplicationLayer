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
 * ForestBuilder module for constructing tree structures
 * using monadic error handling with fp-ts.
 *
 * All functions in this module are pure functions with no side effects.
 */

import * as E from 'fp-ts/Either';
import * as A from 'fp-ts/Array';
import { pipe, flow } from 'fp-ts/function';

// TreeNode represents a node in a tree
export interface TreeNode<TNodeId, TNodeData> {
  id: TNodeId;
  data: TNodeData;
  children: TreeNode<TNodeId, TNodeData>[];
}

// Forest is a list of trees (root nodes)
export type Forest<TNodeId, TNodeData> = TreeNode<TNodeId, TNodeData>[];

// Edge represents a parent-child relationship
export interface Edge<TNodeId> {
  parent: TNodeId;
  child: TNodeId;
}

// FlatTree is a list of parent-child relationships
export type FlatTree<TNodeId> = Edge<TNodeId>[];

/**
 * NodeDataEntry is a product type that pairs a node ID with its data
 */
export interface NodeDataEntry<TNodeId, TNodeData> {
  id: TNodeId;
  data: TNodeData;
}

/**
 * NodeDataMap is a list of NodeDataEntry items
 */
export type NodeDataMap<TNodeId, TNodeData> = NodeDataEntry<
  TNodeId,
  TNodeData
>[];

// TreeConstructionError is a sum type for possible errors
export type TreeConstructionError<TNodeId> =
  | { type: 'GenericError'; message: string }
  | { type: 'CycleDetectedError'; message: string; cycle: TNodeId[] }
  | { type: 'NodeDataMissingError'; message: string; nodeId: TNodeId }
  | { type: 'DuplicateNodeDetectedError'; message: string; nodeId: TNodeId };

/**
 * ForestBuilder class for constructing tree structures from flat data.
 * All methods are pure functions.
 *
 * @template TNodeId - The type of node identifiers (must support equality comparison)
 * @template TNodeData - The type of node data
 */
export class ForestBuilder<TNodeId, TNodeData> {
  /**
   * Identifies the root nodes in a flat tree.
   * Root nodes are those that appear as parents but not as children.
   *
   * This is a pure function with no side effects.
   *
   * @param flatTree A list of parent-child relationships
   * @returns Either an error or an array of root node IDs
   */
  static identifyRoots<TNodeId>(
    flatTree: FlatTree<TNodeId>
  ): E.Either<TreeConstructionError<TNodeId>, TNodeId[]> {
    return pipe(
      E.tryCatch(
        () => {
          // Get all unique parent nodes
          const parentNodes = [...new Set(flatTree.map((edge) => edge.parent))];

          // Get all unique child nodes
          const childNodes = [...new Set(flatTree.map((edge) => edge.child))];

          // Find nodes that are parents but not children
          return parentNodes.filter((parent) => !childNodes.includes(parent));
        },
        (error): TreeConstructionError<TNodeId> => ({
          type: 'GenericError',
          message: `Error identifying roots: ${
            error instanceof Error ? error.message : String(error)
          }`,
        })
      )
    );
  }

  /**
   * Constructs a TreeNode from a node ID, its data, and its children.
   *
   * This is a pure function with no side effects.
   *
   * @param nodeId The ID of the node (can be any type)
   * @param nodeDataMap A list of node ID and data pairs
   * @param children The children of this node
   * @returns Either an error or a TreeNode
   */
  static constructNode<TNodeId, TNodeData>(
    nodeId: TNodeId,
    nodeDataMap: NodeDataMap<TNodeId, TNodeData>,
    children: TreeNode<TNodeId, TNodeData>[]
  ): E.Either<TreeConstructionError<TNodeId>, TreeNode<TNodeId, TNodeData>> {
    // Find the entry with matching ID
    const entry = nodeDataMap.find(
      (entry) =>
        // Use deep equality for comparing IDs
        JSON.stringify(entry.id) === JSON.stringify(nodeId)
    );

    // Check if the node data exists in the map
    if (!entry) {
      return E.left({
        type: 'NodeDataMissingError',
        message: `Node data missing for node ID: ${nodeId}`,
        nodeId,
      });
    }

    // Construct the node with its data and children
    return E.right({
      id: nodeId,
      data: entry.data,
      children,
    });
  }

  /**
   * Recursively constructs a subtree, detecting cycles and duplicate nodes.
   *
   * This is a pure function with no side effects.
   *
   * @param flatTree A list of parent-child relationships
   * @param nodeId The ID of the current node
   * @param nodeDataMap A map of node IDs to their data
   * @param visitedNodes Set of node IDs that have been visited in this branch
   * @param allNodes Set of all node IDs that have been added to the tree
   * @returns Either an error or a TreeNode
   */
  static constructSubtree<TNodeId, TNodeData>(
    flatTree: FlatTree<TNodeId>,
    nodeId: TNodeId,
    nodeDataMap: NodeDataMap<TNodeId, TNodeData>,
    visitedNodes: Set<TNodeId> = new Set<TNodeId>(),
    allNodes: Set<TNodeId> = new Set<TNodeId>()
  ): E.Either<TreeConstructionError<TNodeId>, TreeNode<TNodeId, TNodeData>> {
    // Check for cycles
    if (visitedNodes.has(nodeId)) {
      // We've found a cycle
      const cycle = Array.from(visitedNodes).concat(nodeId);
      return E.left({
        type: 'CycleDetectedError',
        message: `Cycle detected involving node: ${nodeId}`,
        cycle,
      });
    }

    // Check for duplicate nodes
    if (allNodes.has(nodeId)) {
      return E.left({
        type: 'DuplicateNodeDetectedError',
        message: `Duplicate node detected: ${nodeId}`,
        nodeId,
      });
    }

    // Add this node to the visited set for cycle detection
    const newVisitedNodes = new Set(visitedNodes);
    newVisitedNodes.add(nodeId);

    // Add this node to the all nodes set for duplicate detection
    allNodes.add(nodeId);

    // Find all children of this node
    const childEdges = flatTree.filter((edge) => edge.parent === nodeId);
    const childIds = childEdges.map((edge) => edge.child);

    // If there are no children, create a leaf node
    if (childIds.length === 0) {
      return ForestBuilder.constructNode(nodeId, nodeDataMap, []);
    }

    // Define curried functions for use in the pipe

    // Create a subtree for a child node
    const createChildSubtree = (childId: TNodeId) =>
      ForestBuilder.constructSubtree(
        flatTree,
        childId,
        nodeDataMap,
        newVisitedNodes,
        allNodes
      );

    // Construct the parent node with its children
    const constructParentNode = (children: TreeNode<TNodeId, TNodeData>[]) =>
      ForestBuilder.constructNode(nodeId, nodeDataMap, children);

    // Recursively construct subtrees for each child
    return pipe(
      childIds,
      A.map(createChildSubtree),
      A.sequence(E.Applicative),
      E.chain(constructParentNode)
    );
  }

  /**
   * Constructs a single tree from a flat tree, starting from a root node.
   *
   * This is a pure function with no side effects.
   *
   * @param flatTree A list of parent-child relationships
   * @param rootId The ID of the root node
   * @param nodeDataMap A map of node IDs to their data
   * @returns Either an error or a TreeNode
   */
  static constructTree<TNodeId, TNodeData>(
    flatTree: FlatTree<TNodeId>,
    rootId: TNodeId,
    nodeDataMap: NodeDataMap<TNodeId, TNodeData>
  ): E.Either<TreeConstructionError<TNodeId>, TreeNode<TNodeId, TNodeData>> {
    return ForestBuilder.constructSubtree(flatTree, rootId, nodeDataMap);
  }

  /**
   * Process a list of root nodes to construct trees.
   *
   * This is a pure function with no side effects.
   *
   * @param flatTree A list of parent-child relationships
   * @param nodeDataMap A map of node IDs to their data
   * @param remainingRoots Roots left to process
   * @param accTrees Accumulated trees
   * @param allNodes Set of all node IDs that have been added to the tree
   * @returns Either an error or a Forest
   */
  private static processRoots<TNodeId, TNodeData>(
    flatTree: FlatTree<TNodeId>,
    nodeDataMap: NodeDataMap<TNodeId, TNodeData>,
    remainingRoots: TNodeId[],
    accTrees: TreeNode<TNodeId, TNodeData>[] = [],
    allNodes: Set<TNodeId> = new Set<TNodeId>()
  ): E.Either<TreeConstructionError<TNodeId>, Forest<TNodeId, TNodeData>> {
    if (remainingRoots.length === 0) {
      return E.right(accTrees);
    }

    const [currentRoot, ...restRoots] = remainingRoots;

    return pipe(
      ForestBuilder.constructSubtree(
        flatTree,
        currentRoot,
        nodeDataMap,
        new Set<TNodeId>(),
        allNodes
      ),
      E.chain((tree) =>
        ForestBuilder.processRoots(
          flatTree,
          nodeDataMap,
          restRoots,
          [...accTrees, tree],
          allNodes
        )
      )
    );
  }

  /**
   * Constructs a forest (list of trees) from a list of parent-child pairs.
   * This is a pure function that transforms a flat representation of trees
   * into a hierarchical structure.
   *
   * It will accept a forest (multiple trees) but will not accept any cycles.
   * It will not accept DAGs (Directed Acyclic Graphs) where a node can have
   * multiple parents.
   *
   * This is a pure function with no side effects.
   *
   * @param flatTree A list of parent-child relationships
   * @param nodeDataMap A map of node IDs to their data
   * @returns Either an error or a Forest (list of root TreeNodes)
   */
  static build<TNodeId, TNodeData>(
    flatTree: FlatTree<TNodeId>,
    nodeDataMap: NodeDataMap<TNodeId, TNodeData>
  ): E.Either<TreeConstructionError<TNodeId>, Forest<TNodeId, TNodeData>> {
    return pipe(
      // First, identify the root nodes
      ForestBuilder.identifyRoots(flatTree),

      // Then, map over the roots to construct trees
      E.chain((rootIds) => {
        // We need a shared set to track all nodes across all trees
        const allNodes = new Set<TNodeId>();

        return ForestBuilder.processRoots(
          flatTree,
          nodeDataMap,
          rootIds,
          [],
          allNodes
        );
      })
    );
  }
}

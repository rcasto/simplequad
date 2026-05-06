import { doBoundsIntersect } from "./sat";
import {
  Bound,
  BoundingBox,
  QuadTree,
  MinimumTranslationVectorInfo,
  QueryResult,
  QuadTreeOptions,
  isBound,
} from "./schema";
import {
  divideBoundingBox,
  doesBoundIntersectBox,
  doBoundsIntersectBool,
} from "./util";

interface QuadTreeNode<T> extends QuadTree<T> {
  _items: Set<T>;
  _posKeys: Map<number, Map<number, number>>;
  _extractor: ((obj: T) => Bound) | null;
  quadrants: QuadTreeNode<T>[];
  data: T[];
}

function getBound<T>(object: T, extractor: ((obj: T) => Bound) | null): Bound {
  let bound: Bound;
  if (extractor) {
    bound = extractor(object);
  } else {
    bound = object as unknown as Bound;
  }
  if (!isBound(bound)) {
    throw new Error(
      `Object ${JSON.stringify(object)} does not have spatial bounds.`,
    );
  }
  return bound;
}

function addToQuadTree<T>(
  quadTree: QuadTreeNode<T>,
  object: T,
  depth: number = 0,
): boolean {
  const bound = getBound(object, quadTree._extractor);
  if (!doesBoundIntersectBox(bound, quadTree.bounds)) {
    return false;
  }

  if (quadTree.quadrants.length) {
    let wasAddedToChild = false;
    for (const quadrant of quadTree.quadrants) {
      if (addToQuadTree(quadrant, object, depth + 1)) {
        wasAddedToChild = true;
      }
    }
    return wasAddedToChild;
  }

  // O(1) identity dedup via the auxiliary Set mirror
  if (quadTree._items.has(object)) {
    return false;
  }

  // O(1) co-location check: objects sharing a position can't be separated by subdivision
  const xMap = quadTree._posKeys.get(bound.x);
  const sharesPosition = xMap !== undefined && xMap.has(bound.y);

  if (
    depth >= quadTree.maxDepth ||
    sharesPosition ||
    quadTree.data.length < quadTree.capacity
  ) {
    quadTree.data.push(object);
    quadTree._items.add(object);
    let posXMap = quadTree._posKeys.get(bound.x);
    if (!posXMap) {
      posXMap = new Map<number, number>();
      quadTree._posKeys.set(bound.x, posXMap);
    }
    posXMap.set(bound.y, (posXMap.get(bound.y) ?? 0) + 1);
    return true;
  }

  const quadBoxes: BoundingBox[] = divideBoundingBox(quadTree.bounds);
  const quadrants: QuadTreeNode<T>[] = quadBoxes.map((quadBox) =>
    createQuadTreeNode(
      quadBox,
      quadTree.capacity,
      quadTree.maxDepth,
      quadTree._extractor,
    ),
  );
  const quadObjects: T[] = quadTree.data.slice();
  quadObjects.push(object);

  clearQuadTree(quadTree);
  quadTree.quadrants = quadrants;

  for (const quadObject of quadObjects) {
    addToQuadTree(quadTree, quadObject, depth);
  }
  return true;
}

function removeFromQuadTree<T>(quadTree: QuadTreeNode<T>, object: T): boolean {
  const bound = getBound(object, quadTree._extractor);
  if (!doesBoundIntersectBox(bound, quadTree.bounds)) {
    return false;
  }

  const idx = quadTree.data.indexOf(object);
  if (idx !== -1) {
    quadTree.data[idx] = quadTree.data[quadTree.data.length - 1];
    quadTree.data.pop();
    quadTree._items.delete(object);
    const posXMap = quadTree._posKeys.get(bound.x)!;
    const remaining = posXMap.get(bound.y)! - 1;
    if (remaining === 0) {
      posXMap.delete(bound.y);
      if (posXMap.size === 0) {
        quadTree._posKeys.delete(bound.x);
      }
    } else {
      posXMap.set(bound.y, remaining);
    }
    return true;
  }

  let wasRemoved = false;
  for (const quadrant of quadTree.quadrants) {
    if (removeFromQuadTree(quadrant, object)) {
      wasRemoved = true;
    }
  }

  return wasRemoved;
}

function clearQuadTree<T>(quadTree: QuadTreeNode<T>): void {
  quadTree.data.length = 0;
  quadTree._items.clear();
  quadTree._posKeys.clear();
  quadTree.quadrants.length = 0;
}

function queryQuadTree<T>(
  quadTree: QuadTreeNode<T>,
  bounds: Bound,
  seen: Set<T>,
  results: Array<QueryResult<T>>,
): void {
  if (!doesBoundIntersectBox(bounds, quadTree.bounds)) {
    return;
  }

  if (quadTree.quadrants.length === 0) {
    for (const quadObject of quadTree.data) {
      if (seen.has(quadObject)) continue;
      const quadBound = getBound(quadObject, quadTree._extractor);
      if ((quadBound as unknown) === bounds) continue;
      const mtv: MinimumTranslationVectorInfo | null = doBoundsIntersect(
        quadBound,
        bounds,
      );
      if (mtv) {
        seen.add(quadObject);
        results.push({ mtv, object: quadObject });
      }
    }
    return;
  }

  for (const quadrant of quadTree.quadrants) {
    queryQuadTree(quadrant, bounds, seen, results);
  }
}

function queryBroadQuadTree<T>(
  quadTree: QuadTreeNode<T>,
  bounds: Bound,
  seen: Set<T>,
  results: T[],
): void {
  if (!doesBoundIntersectBox(bounds, quadTree.bounds)) {
    return;
  }

  if (quadTree.quadrants.length === 0) {
    for (const quadObject of quadTree.data) {
      if (seen.has(quadObject)) continue;
      const quadBound = getBound(quadObject, quadTree._extractor);
      if ((quadBound as unknown) === bounds) continue;
      if (doBoundsIntersectBool(quadBound, bounds)) {
        seen.add(quadObject);
        results.push(quadObject);
      }
    }
    return;
  }

  for (const quadrant of quadTree.quadrants) {
    queryBroadQuadTree(quadrant, bounds, seen, results);
  }
}

function getQuadTreeData<T>(
  quadTree: QuadTreeNode<T>,
  seen: Set<T> = new Set(),
): T[] {
  for (const item of quadTree.data) {
    seen.add(item);
  }
  for (const quadrant of quadTree.quadrants) {
    getQuadTreeData(quadrant, seen);
  }
  return [...seen];
}


function containsInQuadTree<T>(
  quadTree: QuadTreeNode<T>,
  object: T,
): boolean {
  const bound = getBound(object, quadTree._extractor);
  if (!doesBoundIntersectBox(bound, quadTree.bounds)) {
    return false;
  }
  if (quadTree._items.has(object)) {
    return true;
  }
  for (const quadrant of quadTree.quadrants) {
    if (containsInQuadTree(quadrant, object)) {
      return true;
    }
  }
  return false;
}

function createQuadTreeNode<T>(
  bounds: BoundingBox,
  capacity: number,
  maxDepth: number,
  extractor: ((obj: T) => Bound) | null,
): QuadTreeNode<T> {
  const _seen = new Set<T>();

  const quadTree: QuadTreeNode<T> = {
    bounds,
    data: [],
    _items: new Set<T>(),
    _posKeys: new Map<number, Map<number, number>>(),
    _extractor: extractor,
    capacity,
    maxDepth,
    quadrants: [],
    add: (object) => addToQuadTree(quadTree, object, 0),
    remove: (object) => removeFromQuadTree(quadTree, object),
    clear: () => clearQuadTree(quadTree),
    query: (bounds) => {
      _seen.clear();
      const results: Array<QueryResult<T>> = [];
      queryQuadTree(quadTree, bounds, _seen, results);
      return results;
    },
    queryBroad: (bounds) => {
      _seen.clear();
      const results: T[] = [];
      queryBroadQuadTree(quadTree, bounds, _seen, results);
      return results;
    },
    getData: () => getQuadTreeData(quadTree),
    contains: (object) => containsInQuadTree(quadTree, object),
    move: (object, updateFn) => {
      if (!removeFromQuadTree(quadTree, object)) return false;
      updateFn(object);
      addToQuadTree(quadTree, object, 0);
      return true;
    },
    queryFor: (object) => {
      const bound = extractor ? extractor(object) : (object as unknown as Bound);
      _seen.clear();
      const results: Array<QueryResult<T>> = [];
      queryQuadTree(quadTree, bound, _seen, results);
      return extractor ? results.filter(r => r.object !== object) : results;
    },
  };
  return quadTree;
}

/**
 * Creates a quadtree using an extractor function to derive spatial bounds from arbitrary objects.
 * T can be any type when extractor is provided.
 */
export function createQuadTree<T>(
  bounds: BoundingBox,
  options: QuadTreeOptions<T> & { extractor: (obj: T) => Bound },
): QuadTree<T>;
/**
 * Creates a quadtree where T must extend Bound. Accepts an options object with optional
 * capacity and maxDepth, or positional capacity/maxDepth arguments (legacy).
 */
export function createQuadTree<T extends Bound>(
  bounds: BoundingBox,
  options?: QuadTreeOptions<T>,
): QuadTree<T>;
export function createQuadTree<T extends Bound>(
  bounds: BoundingBox,
  capacity?: number,
  maxDepth?: number,
): QuadTree<T>;
export function createQuadTree<T>(
  bounds: BoundingBox,
  capacityOrOptions?: number | QuadTreeOptions<T>,
  maxDepth?: number,
): QuadTree<T> {
  if (typeof capacityOrOptions === "object" && capacityOrOptions !== null) {
    const { extractor, capacity = 5, maxDepth: md = 8 } = capacityOrOptions;
    return createQuadTreeNode(bounds, capacity, md, extractor ?? null);
  }
  return createQuadTreeNode(
    bounds,
    capacityOrOptions ?? 5,
    maxDepth ?? 8,
    null,
  );
}

export const create = createQuadTree;
export * from "./schema";
export * from "./debug";

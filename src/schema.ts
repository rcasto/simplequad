/**
 * The minimum translation vector returned will point towards the bound
 * used to query. The represents then the amount the bound must be moved away.
 *
 * The x and y components of the vector itself, assume a coordinate space where
 * x gets larger running left to right, and y gets larger running top to bottom.
 */
export interface MinimumTranslationVectorInfo {
  /**
   * The actual minimum translation vector, composes both
   * magnitude and direction
   */
  vector: Point;
  /**
   * A unit vector representing the directionality of the minimum translation vector
   */
  direction: Point;
  /**
   * The magnitude or size of the minimum translation vector in the direction it is headed
   */
  magnitude: number;
}

export interface QueryResult<T> {
  mtv: MinimumTranslationVectorInfo;
  /**
   * The object intersecting with the queried bounds.
   */
  object: T;
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox extends Point {
  width: number;
  height: number;
}

export interface Circle extends Point {
  r: number;
}

export type Bound = BoundingBox | Circle | Point;

export function isBound(obj: any): obj is Bound {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  // A Point is the most basic type of Bound, so we check for that first.
  // All other bounds must have at least the properties of a Point, so this is a necessary condition for all Bound types.
  return typeof obj.x === "number" && typeof obj.y === "number";
}

export interface QuadTreeOptions<T = Bound> {
  capacity?: number;
  maxDepth?: number;
  /**
   * Derives a `Bound` from each object added to the tree. Required when T does
   * not extend `Bound` directly. When omitted, T must extend `Bound`.
   */
  extractor?: (obj: T) => Bound;
}

/** @deprecated Use `QuadTreeOptions` instead. */
export type QuadTreeOptionsWithExtractor<T> = QuadTreeOptions<T> & {
  extractor: (obj: T) => Bound;
};

export interface QuadTree<T = Bound> {
  // Properties
  /**
   * The bounding box that this quadtree "manages".
   *
   * Collision objects within this node are within these bounds.
   * Child nodes have there bounds derived from these bounds.
   */
  bounds: Readonly<BoundingBox>;
  /**
   * Holds collision objects at this leaf node as a flat array.
   * Object identity (===) is used for deduplication.
   * This will be empty for container nodes (nodes with children).
   */
  data: Readonly<T[]>;
  /**
   * The number of collision objects this node can hold
   * before subdividing.
   *
   * Child quadtrees or nodes will inherit this capacity upon subdividing.
   */
  capacity: number;
  /**
   * Maximum depth the tree will subdivide to. At this depth, a leaf node
   * accepts objects regardless of capacity to prevent unbounded recursion
   * when objects cluster at the same position or span quadrant boundaries.
   *
   * Child quadtrees or nodes will inherit this value upon subdividing.
   */
  maxDepth: number;
  /**
   * The child buckets/quadrants/nodes of this quadtree. They themselves
   * are quadtrees. Each manages a quarter of this quadtree's bounds.
   *
   * This will be of length 4 for "container" nodes.
   * This will be empty for leaf nodes.
   */
  quadrants: Readonly<QuadTree<T>[]>;
  // Methods
  /**
   * Adds a collision object to the quadtree.
   *
   * Will subdivide leaf nodes when there capacity is reached and re-distribute collision objects.
   * @param {T} object - The collision object to add to the quadtree.
   * @return {boolean} True if the collision object was added, false if the collision object was not.
   */
  add: (object: T) => boolean;
  /**
   * Removes a collision object from the quadtree.
   * @param {T} object - The collision object to remove from the quadtree.
   * @return {boolean} True if the collision object was removed, false if the collision object was not.
   */
  remove: (object: T) => boolean;
  /**
   * Clears the quadtree of all data and quadrant subdivisions (child nodes).
   */
  clear: () => void;
  /**
   * Queries the quadtree for intersecting objects.
   *
   * Pass a `Bound` to define the query region. If the exact same object reference
   * was added to the tree and is passed here, it is automatically excluded from
   * results via reference equality — so `tree.query(myBoundingBox)` naturally
   * skips `myBoundingBox` itself. When using an extractor, use `queryFor()` instead.
   *
   * @param {Bound} bounds - The spatial region to query.
   * @return {Array<QueryResult<T>>} Intersecting objects, excluding any in-tree object whose bound is the same reference as `bounds`.
   */
  query: (bounds: Bound) => Array<QueryResult<T>>;
  /**
   * Queries the quadtree for objects whose bounds broadly intersect the given region.
   * Unlike `query()`, no SAT or MTV is computed — this is a fast proximity/range check.
   * Useful for AI sight ranges, audio zones, spawn checks, and flocking neighbor lookups.
   *
   * Pass a `Bound` to define the query region. If the exact same object reference
   * was added to the tree and is passed here, it is automatically excluded from
   * results via reference equality.
   *
   * @param {Bound} bounds - The spatial region to query.
   * @return {T[]} Objects broadly intersecting the region, excluding any in-tree object whose bound is the same reference as `bounds`.
   */
  queryBroad: (bounds: Bound) => T[];
  /**
   * Returns all objects currently in the tree as a flat deduplicated array.
   * @return {T[]} All unique objects across all nodes in the tree.
   */
  getData: () => T[];
  /**
   * Returns true if the given object reference is currently in the tree.
   * @param {T} object - The object to check.
   */
  contains: (object: T) => boolean;
  /**
   * Atomically removes, mutates, and re-inserts an object.
   * Returns false if the object was not in the tree.
   * @param {T} object - The object to reposition.
   * @param {(obj: T) => void} updateFn - Called with the object before re-insertion.
   */
  move: (object: T, updateFn: (obj: T) => void) => boolean;
  /**
   * Like `query()` but takes an object `T` instead of a raw `Bound`.
   * When an extractor is in use, applies it automatically and excludes the queried
   * object from results. When no extractor is provided, behaves identically to `query(object)`.
   * @param {T} object - The object to query for intersections.
   */
  queryFor: (object: T) => Array<QueryResult<T>>;
}

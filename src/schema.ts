interface InternalMeta {
    _key?: string;
}

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
     * The object or bounds intersecting with the passed in query bounds or object
     */
    object: T;
}

export interface Point extends InternalMeta {
    x: number;
    y: number;
}

export interface BoundingBox extends Point, InternalMeta {
    width: number;
    height: number;
}

export interface Circle extends Point, InternalMeta {
    r: number;
}

export type Bound = BoundingBox | Circle | Point;

export interface QuadTree<T extends Bound = Bound> {
    // Properties
    /**
     * The bounding box that this quadtree "manages".
     * 
     * Collision objects within this node are within these bounds.
     * Child nodes have there bounds derived from these bounds.
     */
    bounds: BoundingBox;
    /**
     * Holds data in each node or bucket.
     * Key is generated from point (x, y).
     * Key for (x, y) is "(x,y)"
     * Each point can hold a set of collision objects. These won't count towards the node capacity.
     * 
     * This will be empty for "container nodes".
     */
    data: Map<string, Set<T>>;
    /**
     * The number of collision objects this node can hold
     * before subdividing.
     * 
     * Child quadtrees or nodes will inherit this capacity upon subdividing.
     */
    capacity: number;
    /**
     * The child buckets/quadrants/nodes of this quadtree. They themselves
     * are quadtrees. Each manages a quarter of this quadtree's bounds.
     * 
     * This will be of length 4 for "container" nodes.
     * This will be empty for leaf nodes.
     */
    quadrants: QuadTree<T>[];
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
     * 
     * Will collapse or consume child leaf nodes to parent node if # of child collision objects is less than
     * individual node capacity. Meaning parent can fit child collision objects.
     * @param {T} object - The collision object to remove from the quadtree.
     * @return {boolean} True if the collision object was removed, false if the collision object was not.
     */
    remove: (object: T) => boolean;
    /**
     * Clears the quadtree of all data and quadrant subdivisions (child nodes).
     */
    clear: () => void;
    /**
     * Queries the quadtree, finding what collision objects intersect with the input
     * query bound.
     * @param {Bound} bounds - The query window bounds, or "lens" into the quadtree to find intersections.
     * @return {Array<QueryResult<T>>} The list of results for which the query window bounds intersect with. The query window object input will not be included in the returned list. If empty, there are no intersections.
     */
    query: (bounds: Bound) => Array<QueryResult<T>>;
    /**
     * Convenience method offered to get the data for a node in an easier manner
     * Will take a flatten the map of data to a collection.
     * 
     * The data comes from being set based, so you can assume all of the items
     * are unique or different references.
     * @return {T[]} The list of collision objects that this "bucket" holds
     */
    getData: () => T[];
}
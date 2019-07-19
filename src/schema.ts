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

export type Bound = BoundingBox | Circle;

export interface CollisionObject {
    getBounds: () => Bound;
}

export interface QuadTree {
    // Properties
    bounds: BoundingBox;
    data: Map<string, CollisionObject[]>;
    capacity: number;
    quadrants: QuadTree[];
    // Methods
    add: (object: CollisionObject) => boolean;
    remove: (object: CollisionObject) => boolean;
    clear: () => void;
    query: (bounds: Bound) => CollisionObject[];
}
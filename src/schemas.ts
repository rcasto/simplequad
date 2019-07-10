export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface CollisionObject {
    getBoundingBox: () => BoundingBox;
}

export interface QuadTree {
    // Properties
    bounds: BoundingBox;
    data: CollisionObject[];
    capacity: number;
    quadrants: QuadTree[];
    // Methods
    add: (object: CollisionObject) => boolean;
    remove: (object: CollisionObject) => boolean;
    clear: () => void;
    query: (bounds: BoundingBox) => CollisionObject[];
}
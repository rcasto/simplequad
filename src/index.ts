import { BoundingBox, CollisionObject, QuadTree } from './schemas';

export function createQuadTree(bounds: BoundingBox, capacity: number = 3): QuadTree {
    return {
        bounds,
        data: [],
        capacity,
        quadrants: [],
        add: addToQuadTree,
        remove: removeFromQuadTree,
        clear: clearQuadTree,
        query: queryQuadTree
    };
}

export function addToQuadTree(object: CollisionObject): boolean {
    return true;
}

export function removeFromQuadTree(object: CollisionObject): boolean {
    return true;
}

export function clearQuadTree(): void {
    return;
}

export function queryQuadTree(bounds: BoundingBox): CollisionObject[] {
    return [];
}
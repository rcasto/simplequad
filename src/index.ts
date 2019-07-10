import { BoundingBox, CollisionObject, QuadTree } from './schemas';

export function createQuadTree(bounds: BoundingBox, capacity: number = 3): QuadTree {
    const quadTree: QuadTree = {
        bounds,
        data: [],
        capacity,
        quadrants: [],
        add: (object) => addToQuadTree(quadTree, object),
        remove: (object) => removeFromQuadTree(quadTree, object),
        clear: () => clearQuadTree(quadTree),
        query: (bounds) => queryQuadTree(quadTree, bounds)
    };
    return quadTree;
}

export function addToQuadTree(quadTree: QuadTree, object: CollisionObject): boolean {
    // Check children first, if not added to any child
    // Then check self, and add if appropriate

    // Checking children first
    if ((quadTree.quadrants || []).length > 0) {
        // Run through all children checking if the object can be added
        // It is possible an object could span across multiple quadrants
        const wasAddedToChild: boolean = quadTree.quadrants
            .reduce((wasAdded: boolean, quadrant) => (wasAdded || addToQuadTree(quadrant, object)), false);
        // If it was added to any child, let's go ahead and bail
        // Otherwise, no need to check self (this node)
        if (wasAddedToChild) {
            return true;
        }
    }

    // Below is the self check (this node)
    // This is the base case that is ran for all nodes

    if (quadTree.data.length + 1 <= quadTree.capacity) {
        quadTree.data.push(object);
    }


    return true;
}

export function removeFromQuadTree(quadTree: QuadTree, object: CollisionObject): boolean {
    return true;
}

export function clearQuadTree(quadTree: QuadTree): void {
    return;
}

export function queryQuadTree(quadTree: QuadTree, bounds: BoundingBox): CollisionObject[] {
    return [];
}
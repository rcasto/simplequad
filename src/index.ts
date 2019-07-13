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

    // Let's first check if the objects bounding box intersects
    // with this quadrants bounding box
    const objectBoundingBox: BoundingBox = object.getBoundingBox();

    if (!doBoundingBoxesIntersect(quadTree.bounds, objectBoundingBox)) {
        return false;
    }

    // Let's see if this quadrant has any capacity
    // If it does, we can go ahead and store the current object
    if (quadTree.data.length + 1 <= quadTree.capacity) {
        quadTree.data.push(object);
        return true;
    }

    // The current node fits the current object, but
    // There isn't any capacity
    // We need to split this quadrant up

    // Let's first build the child quadrants
    const quadWidth: number = quadTree.bounds.width / 2;
    const quadHeight: number = quadTree.bounds.height / 2;

    const nwBoundingBox: BoundingBox = {
        x: 0,
        y: 0,
        width: quadWidth,
        height: quadHeight,
    };
    const neBoundingBox: BoundingBox = {
        x: quadWidth,
        y: 0,
        width: quadWidth,
        height: quadHeight,
    };
    const swBoundingBox: BoundingBox = {
        x: 0,
        y: quadHeight,
        width: quadWidth,
        height: quadHeight,
    };
    const seBoundingBox: BoundingBox = {
        x: quadWidth,
        y: quadHeight,
        width: quadWidth,
        height: quadHeight,
    };

    // Let's create the child QuadTree's from the build quadrant bounds
    const quadrants: QuadTree[] = [
        createQuadTree(nwBoundingBox, quadTree.capacity),
        createQuadTree(neBoundingBox, quadTree.capacity),
        createQuadTree(swBoundingBox, quadTree.capacity),
        createQuadTree(seBoundingBox, quadTree.capacity),
    ];
    const quadObjects: CollisionObject[] = [...quadTree.data, object];

    // adjust current quadtree settings
    // May need to adjust these in-place instead of creating new references
    quadTree.quadrants = quadrants;
    quadTree.data = [];

    // add objects from this quad node back to it's own subtree
    // children will be attempted to be added to first
    return quadObjects
        .every(quadObject => addToQuadTree(quadTree, quadObject));
}

function doBoundingBoxesIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
    // If one rectangle is to the side of other (outside)
    if (box1.x > box2.x + box2.width || box2.x > box1.x + box1.width) {
        return false;
    }

    // If one rectangle is above the other (outside)
    if (box1.y > box2.y + box2.height || box2.y > box1.y + box1.height) {
        return false;
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
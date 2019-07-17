import { BoundingBox, CollisionObject, QuadTree } from './schema';
import { containsPoint, doBoundingBoxesIntersect, divideBoundingBox, isSamePoint } from './util';

function addToQuadTree(quadTree: QuadTree, object: CollisionObject): boolean {
    const objectBoundingBox: BoundingBox = object.getBoundingBox();

    // Let's first check if the point this object occupies is within
    // the bounds of the bucket
    if (!containsPoint(quadTree.bounds, objectBoundingBox)) {
        return false;
    }

    // Checking children, if this node is a "Container" (No data)
    if ((quadTree.quadrants || []).length > 0) {
        // Run through all children checking if the object can be added
        // At the first successful add, we can bail out, only needs to be stored once
        const wasAddedToChild: boolean = quadTree.quadrants
            .some((quadrant: QuadTree) => addToQuadTree(quadrant, object));
        // Only leaf nodes should have data (We are a "Container node")
        // If it didn't intersect with any child, it won't intersect with us
        return wasAddedToChild;
    }

    // Let's also check if this bucket already contains the object
    if (quadTree.data.has(object)) {
        return false;
    }

    // Now let's run through and verify that no other
    // object this bucket stores is occupying the same point (x, y)
    if ([...quadTree.data]
        .some(quadObject => isSamePoint(objectBoundingBox, quadObject.getBoundingBox()))) {
        return false;
    }

    // Let's see if this quadrant has any capacity
    // If it does, we can go ahead and store the current object
    if (quadTree.data.size + 1 <= quadTree.capacity) {
        quadTree.data.add(object);
        return true;
    }

    // The current node fits the current object, but
    // There isn't any capacity
    // We need to split this bucket up

    // Let's first build the child quadrants
    // Let's create the child QuadTree's from the divided quadrant bounds
    const quadBoxes: BoundingBox[] = divideBoundingBox(quadTree.bounds);
    const quadrants: QuadTree[] = quadBoxes.map(quadBox => createQuadTree(quadBox, quadTree.capacity));
    const quadObjects: CollisionObject[] = [...quadTree.data, object];

    // adjust current quadtree settings
    // May need to adjust these in-place instead of creating new references
    quadTree.quadrants = quadrants;
    quadTree.data = new Set<CollisionObject>();

    // add objects from this quad node back to it's own subtree
    // children will be attempted to be added to first
    return quadObjects
        .every(quadObject => addToQuadTree(quadTree, quadObject));
}

function removeFromQuadTree(quadTree: QuadTree, object: CollisionObject): boolean {
    // Check first if the objects point is within the bounds
    // of the bucket, if it doesn't we can bail immediately with false
    if (!containsPoint(quadTree.bounds, object.getBoundingBox())) {
        return false;
    }

    // If object is found, let's remove it
    if (quadTree.data.has(object)) {
        quadTree.data.delete(object);
        return true;
    }

    // Check children to find object and remove if found
    const wasRemoved: boolean = quadTree.quadrants
        .some(quadrant => removeFromQuadTree(quadrant, object));

    // If one of the children contained the object we just removed
    // Let's query the bounding box of us (the parent) to see if we 
    // can collapse or consume our children. Meaning the child subtree
    // contains less elements than our individual bucket capacity.
    if (wasRemoved) {
        const childObjectSet: Set<CollisionObject> = queryQuadTree(quadTree, quadTree.bounds);
        if (childObjectSet.size <= quadTree.capacity) {
            quadTree.data = childObjectSet;
            quadTree.quadrants = [];
        }
    }

    return wasRemoved;
}

function clearQuadTree(quadTree: QuadTree): void {
    quadTree.data = new Set<CollisionObject>();
    quadTree.quadrants = [];
}

function queryQuadTree(quadTree: QuadTree, bounds: BoundingBox): Set<CollisionObject> {
    // Check first if the query bounds intersect with the bounds
    // of the bucket, if it doesn't we can bail immediately with an empty set
    if (!doBoundingBoxesIntersect(quadTree.bounds, bounds)) {
        return new Set<CollisionObject>();
    }

    // Check if current node has children
    if ((quadTree.quadrants || []).length === 0) {
        // Let's iterate over the data in the bucket to see
        // if the objects themselves intersect with the query bounds
        return new Set<CollisionObject>(
            [...quadTree.data].filter(quadObject => doBoundingBoxesIntersect(quadObject.getBoundingBox(), bounds)));
    }

    // Check the current nodes children
    // querying them for the same info and collecting
    // the results
    const childQueryResultSet: Set<CollisionObject> = quadTree.quadrants
        .map(quadrant => queryQuadTree(quadrant, bounds))
        // filter out empty sets
        .filter(queryResultSet => queryResultSet.size > 0)
        // union all the collision sets together
        .reduce((prevResultSet: Set<CollisionObject>, currResultSet: Set<CollisionObject>) => {
            return new Set<CollisionObject>([...prevResultSet, ...currResultSet]);
        }, new Set<CollisionObject>());

    return childQueryResultSet;
}

export function createQuadTree(bounds: BoundingBox, capacity: number = 3): QuadTree {
    const quadTree: QuadTree = {
        bounds,
        data: new Set<CollisionObject>(),
        capacity,
        quadrants: [],
        add: (object) => addToQuadTree(quadTree, object),
        remove: (object) => removeFromQuadTree(quadTree, object),
        clear: () => clearQuadTree(quadTree),
        query: (bounds) => queryQuadTree(quadTree, bounds)
    };
    return quadTree;
}
export * from './schema';
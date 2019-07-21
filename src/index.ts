import { Bound, BoundingBox, CollisionObject, QuadTree } from './schema';
import { createPointKey, doBoundsIntersect, divideBoundingBox, flattenSets } from './util';

function addToQuadTree(quadTree: QuadTree, object: CollisionObject): boolean {
    const objectBound: Bound = object.getBounds();

    // Let's first check if the point this object occupies is within
    // the bounds of the bucket
    if (!doBoundsIntersect(quadTree.bounds, objectBound)) {
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

    // Let's get the data already associated with this bucket
    const objectPointKey: string = createPointKey(objectBound);
    const objectPointSet: Set<CollisionObject> = quadTree.data.get(objectPointKey) || new Set<CollisionObject>();

    // Let's check if the object is already in the bucket
    if (objectPointSet.has(object)) {
        return false;
    }

    // Let's see if this quadrant has any capacity
    // If it does, we can go ahead and store the current object
    //
    // We also wanna go ahead and add, if this point (x, y) has already
    // had an object added, we'll chain it on to the list of objects 
    // associated with this point
    if (objectPointSet.size > 0 ||
        quadTree.data.size + 1 <= quadTree.capacity) {
        quadTree.data.set(objectPointKey, new Set([...objectPointSet, object]));
        return true;
    }

    // The current node fits the current object, but
    // There isn't any capacity
    // We need to split this bucket up

    // Let's first build the child quadrants
    // Let's create the child QuadTree's from the divided quadrant bounds
    const quadBoxes: BoundingBox[] = divideBoundingBox(quadTree.bounds);
    const quadrants: QuadTree[] = quadBoxes.map(quadBox => createQuadTree(quadBox, quadTree.capacity));
    const quadObjects: CollisionObject[] = [...flattenSets([...quadTree.data.values()]), object];

    // adjust current quadtree settings
    // May need to adjust these in-place instead of creating new references
    clearQuadTree(quadTree);
    quadTree.quadrants = quadrants;

    // add objects from this quad node back to it's own subtree
    // children will be attempted to be added to first
    return quadObjects
        .every(quadObject => addToQuadTree(quadTree, quadObject));
}

function removeFromQuadTree(quadTree: QuadTree, object: CollisionObject): boolean {
    const objectBound: Bound = object.getBounds();
    const objectPointKey: string = createPointKey(objectBound);
    const objectPointSet: Set<CollisionObject> = quadTree.data.get(objectPointKey) || new Set<CollisionObject>();

    // If object is found, let's remove it
    if (objectPointSet.has(object)) {
        objectPointSet.delete(object);
        // If there were multiple objects at this point
        // we don't need to remove this point key
        if (objectPointSet.size > 0) {
            quadTree.data.set(objectPointKey, objectPointSet);
        } else {
            quadTree.data.delete(objectPointKey);
        }
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
            clearQuadTree(quadTree);
            childObjectSet.forEach(childObject => addToQuadTree(quadTree, childObject));
        }
    }

    return wasRemoved;
}

function clearQuadTree(quadTree: QuadTree): void {
    quadTree.data = new Map<string, Set<CollisionObject>>();
    quadTree.quadrants = [];
}

function queryQuadTree(quadTree: QuadTree, bounds: Bound): Set<CollisionObject> {
    // Check first if the query bounds intersect with the bounds
    // of the bucket, if it doesn't we can bail immediately with an empty list
    if (!doBoundsIntersect(quadTree.bounds, bounds)) {
        return new Set<CollisionObject>();
    }

    // Check if current node has children
    if ((quadTree.quadrants || []).length === 0) {
        // Let's iterate over the data in the bucket to see
        // if the objects themselves intersect with the query bounds
        return new Set<CollisionObject>(
            [...flattenSets([...quadTree.data.values()])]
                .filter(quadObject => doBoundsIntersect(quadObject.getBounds(), bounds)));
    }

    // Check the current nodes children
    // querying them for the same info and collecting
    // the results
    const childQueryResultSet: Set<CollisionObject> = flattenSets(quadTree.quadrants
        .map(quadrant => queryQuadTree(quadrant, bounds)));

    return childQueryResultSet;
}

/**
 * Creates a quadtree "managing" the input bounds with input node capacity.
 * 
 * All collision objects should intersect or be contained within these "managed" bounds.
 * @param {BoundingBox} bounds - The bounding box with which the quadtree "manages".
 * @param {number} capacity - The # of collision objects a node can contain before subdividing.
 * @return {QuadTree} The created quadtree "managing" the input bounds.
 */
export function createQuadTree(bounds: BoundingBox, capacity: number = 3): QuadTree {
    const quadTree: QuadTree = {
        bounds,
        data: new Map<string, Set<CollisionObject>>(),
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
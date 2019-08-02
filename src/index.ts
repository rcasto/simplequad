import { Bound, BoundingBox, CollisionObject, QuadTree, Point } from './schema';
import { createPointKey, doBoundsIntersect, divideBoundingBox, flattenSets } from './util';

function addToQuadTree<T extends CollisionObject>(quadTree: QuadTree<T>, object: T): boolean {
    const objectBound: Bound = object.getBounds();
    const objectPoint: Point = {
        x: objectBound.x,
        y: objectBound.y,
    };

    // Let's first check if the point this object occupies is within
    // the bounds of the bucket
    if (!doBoundsIntersect(quadTree.bounds, objectPoint)) {
        return false;
    }

    // Checking children, if this node is a "Container" (No data)
    if ((quadTree.quadrants || []).length) {
        // Run through all children checking if the object can be added
        // At the first successful add, we can bail out, only needs to be stored once
        const wasAddedToChild: boolean = quadTree.quadrants
            .some((quadrant: QuadTree<T>) => addToQuadTree(quadrant, object));
        // Only leaf nodes should have data (We are a "Container node")
        // If it didn't intersect with any child, it won't intersect with us
        return wasAddedToChild;
    }

    // Let's get the data already associated with this bucket
    const objectPointKey: string = createPointKey(objectBound);
    const objectPointSet: Set<T> = quadTree.data.get(objectPointKey) || new Set<T>();

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
        objectPointSet.add(object);
        quadTree.data.set(objectPointKey, objectPointSet);
        return true;
    }

    // The current node fits the current object, but
    // There isn't any capacity
    // We need to split this bucket up

    // Let's first build the child quadrants
    // Let's create the child QuadTree's from the divided quadrant bounds
    const quadBoxes: BoundingBox[] = divideBoundingBox(quadTree.bounds);
    const quadrants: QuadTree<T>[] = quadBoxes.map(quadBox => createQuadTree(quadBox, quadTree.capacity, quadTree.useSAT));
    const quadObjects: T[] = getQuadTreeData(quadTree).concat(object);

    // adjust current quadtree settings
    // May need to adjust these in-place instead of creating new references
    clearQuadTree(quadTree);
    quadTree.quadrants = quadrants;

    // add objects from this quad node back to it's own subtree
    // children will be attempted to be added to first
    return quadObjects
        .every(quadObject => addToQuadTree(quadTree, quadObject));
}

function removeFromQuadTree<T extends CollisionObject>(quadTree: QuadTree<T>, object: T): boolean {
    const objectBound: Bound = object.getBounds();
    const objectPointKey: string = createPointKey(objectBound);
    const objectPointSet: Set<T> = quadTree.data.get(objectPointKey) || new Set<T>();

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
        const childObjectSet: Set<T> = queryQuadTree(quadTree, quadTree.bounds);
        if (childObjectSet.size <= quadTree.capacity) {
            clearQuadTree(quadTree);
            childObjectSet.forEach(childObject => addToQuadTree(quadTree, childObject));
        }
    }

    return wasRemoved;
}

function clearQuadTree<T extends CollisionObject>(quadTree: QuadTree<T>): void {
    quadTree.data = new Map<string, Set<T>>();
    quadTree.quadrants = [];
}

function queryQuadTree<T extends CollisionObject>(quadTree: QuadTree<T>, bounds: Bound): Set<T> {
    // Check first if the query bounds intersect with the bounds
    // of the bucket, if it doesn't we can bail immediately with an empty list
    if (!doBoundsIntersect(quadTree.bounds, bounds)) {
        return new Set<T>();
    }

    // Check if current node has children
    if ((quadTree.quadrants || []).length === 0) {
        // Let's iterate over the data in the bucket to see
        // if the objects themselves intersect with the query bounds
        return new Set<T>(
            getQuadTreeData(quadTree)
                .filter(quadObject => doBoundsIntersect(quadObject.getBounds(), bounds, quadTree.useSAT)));
    }

    // Check the current nodes children
    // querying them for the same info and collecting
    // the results
    const childQueryResultSet: Set<T> = flattenSets(quadTree.quadrants
        .map(quadrant => queryQuadTree(quadrant, bounds)));

    return childQueryResultSet;
}

function getQuadTreeData<T extends CollisionObject>(quadTree: QuadTree<T>): T[] {
    return Array.from(flattenSets(Array.from(quadTree.data.values())));
}

/**
 * Creates a quadtree "managing" the input bounds with input node capacity.
 * 
 * All collision objects should intersect or be contained within these "managed" bounds.
 * @param {BoundingBox} bounds - The bounding box with which the quadtree "manages".
 * @param {number} [capacity=3] - The # of collision objects a node can contain before subdividing.
 * @return {QuadTree} The created quadtree "managing" the input bounds.
 */
export function createQuadTree<T extends CollisionObject>(bounds: BoundingBox, capacity: number = 3, useSAT: boolean = false): QuadTree<T> {
    const quadTree: QuadTree<T> = {
        bounds,
        data: new Map<string, Set<T>>(),
        capacity,
        quadrants: [],
        useSAT,
        add: (object) => addToQuadTree(quadTree, object),
        remove: (object) => removeFromQuadTree(quadTree, object),
        clear: () => clearQuadTree(quadTree),
        query: (bounds) => queryQuadTree(quadTree, bounds),
        getData: () => getQuadTreeData(quadTree),
    };
    return quadTree;
}
export * from './schema';
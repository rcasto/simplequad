import { BoundingBox, CollisionObject, Point, QuadTree } from './schema';
import { containsPoint, doBoundingBoxesIntersect, divideBoundingBox, flattenLists } from './util';

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

    // Let's initialize the point map for this point
    // If it's not already initialized
    if (!quadTree.data.has(objectBoundingBox)) {
        quadTree.data.set(objectBoundingBox, []);
    }

    // Let's also check if this bucket already contains the object
    const quadTreeData: CollisionObject[] = quadTree.data.get(objectBoundingBox) || [];

    if (quadTreeData.includes(object)) {
        return false;
    }

    // Let's see if this quadrant has any capacity
    // If it does, we can go ahead and store the current object
    if (quadTree.numData + 1 <= quadTree.capacity) {
        quadTreeData.push(object);
        quadTree.numData++;
        return true;
    }

    // The current node fits the current object, but
    // There isn't any capacity
    // We need to split this bucket up

    // Let's first build the child quadrants
    // Let's create the child QuadTree's from the divided quadrant bounds
    const quadBoxes: BoundingBox[] = divideBoundingBox(quadTree.bounds);
    const quadrants: QuadTree[] = quadBoxes.map(quadBox => createQuadTree(quadBox, quadTree.capacity));
    const quadObjects: CollisionObject[] = flattenLists<CollisionObject>([...quadTree.data.values()])

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
    const objectPointData = quadTree.data.get(object.getBoundingBox());

    // If there is no objectPointDataSet, nothing has been added
    // to then be removed, bail
    if (!objectPointData) {
        return false;
    }

    // If object is found, let's remove it
    const objectIndex = objectPointData.indexOf(object);

    if (objectIndex >= 0) {
        objectPointData.splice(objectIndex, 1);
        quadTree.numData--;
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
        const childObjects: CollisionObject[] = queryQuadTree(quadTree, quadTree.bounds);
        if (childObjects.length <= quadTree.capacity) {
            clearQuadTree(quadTree);
            childObjects.forEach(childObject => addToQuadTree(quadTree, childObject));
        }
    }

    return wasRemoved;
}

function clearQuadTree(quadTree: QuadTree): void {
    quadTree.data = new Map<Point, CollisionObject[]>();
    quadTree.quadrants = [];
    quadTree.numData = 0;
}

function queryQuadTree(quadTree: QuadTree, bounds: BoundingBox): CollisionObject[] {
    // Check first if the query bounds intersect with the bounds
    // of the bucket, if it doesn't we can bail immediately with an empty set
    if (!doBoundingBoxesIntersect(quadTree.bounds, bounds)) {
        return [];
    }

    // Check if current node has children
    if ((quadTree.quadrants || []).length === 0) {
        // Let's iterate over the data in the bucket to see
        // if the objects themselves intersect with the query bounds
        return [...flattenLists([...quadTree.data.values()])]
            .filter(quadObject => doBoundingBoxesIntersect(quadObject.getBoundingBox(), bounds));
    }

    // Check the current nodes children
    // querying them for the same info and collecting
    // the results
    const childQueryResults: CollisionObject[] = flattenLists(quadTree.quadrants
        .map(quadrant => queryQuadTree(quadrant, bounds)));

    return childQueryResults;
}

export function createQuadTree(bounds: BoundingBox, capacity: number = 3): QuadTree {
    const quadTree: QuadTree = {
        bounds,
        data: new Map<Point, CollisionObject[]>(),
        numData: 0,
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
import { BoundingBox, CollisionObject, QuadTree } from './schemas';
import { doBoundingBoxesIntersect, divideBoundingBox } from './util';

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

function addToQuadTree(quadTree: QuadTree, object: CollisionObject): boolean {
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
    // Let's create the child QuadTree's from the build quadrant bounds
    const quadBoxes: BoundingBox[] = divideBoundingBox(quadTree.bounds);
    const quadrants: QuadTree[] = quadBoxes.map(quadBox => createQuadTree(quadBox, quadTree.capacity));
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

function removeFromQuadTree(quadTree: QuadTree, object: CollisionObject): boolean {
    const objectIndex: number = quadTree.data.indexOf(object);

    // Object was found, let's remove it
    if (objectIndex >= 0) {
        quadTree.data.splice(objectIndex, 1);
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
            quadTree.data = [...childObjectSet];
            quadTree.quadrants = [];
        }
    }

    return wasRemoved;
}

function clearQuadTree(quadTree: QuadTree): void {
    quadTree.data = [];
    quadTree.quadrants = [];
}

function queryQuadTree(quadTree: QuadTree, bounds: BoundingBox): Set<CollisionObject> {
    // Check if current node has children
    // If it doesn't we should go ahead and return it's data
    // Only if, the bounds intersect though
    if ((quadTree.quadrants || []).length === 0) {
        return doBoundingBoxesIntersect(quadTree.bounds, bounds) ?
            new Set<CollisionObject>(quadTree.data) : new Set<CollisionObject>();
    }

    // Check the current nodes children
    // querying them for the same info and collecting
    // the results
    const childQueryResultSet: Set<CollisionObject> = quadTree.quadrants
        .map(quadrant => queryQuadTree(quadrant, bounds))
        // union all the collision sets together
        .reduce((prevResults: Set<CollisionObject>, currResult: Set<CollisionObject>) => new Set<CollisionObject>([...prevResults, ...currResult]), new Set<CollisionObject>());

    return childQueryResultSet;
}
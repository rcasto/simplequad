import { doBoundsIntersect } from './sat';
import { Bound, BoundingBox, QuadTree, MinimumTranslationVectorInfo, QueryResult } from './schema';
import { createPointKey, divideBoundingBox, doesBoundIntersectBox } from './util';

function addToQuadTree<T extends Bound>(quadTree: QuadTree<T>, object: T, depth: number = 0): boolean {
    // Check if the object's full bounds intersect with this node's bounds
    if (!doesBoundIntersectBox(object, quadTree.bounds)) {
        return false;
    }

    // Checking children, if this node is a "Container" (No data)
    if ((quadTree.quadrants || []).length) {
        // Add to every child whose bounds intersect the object's bounds —
        // a large object spanning a quadrant boundary belongs in multiple children
        let wasAddedToChild = false;
        for (const quadrant of quadTree.quadrants) {
            if (addToQuadTree(quadrant, object, depth + 1)) {
                wasAddedToChild = true;
            }
        }
        return wasAddedToChild;
    }

    // Let's get the data already associated with this bucket
    const objectPointKey: string = createPointKey(object);
    const objectPointSet: Set<T> = quadTree.data.get(objectPointKey) || new Set<T>();

    // Let's check if the object is already in the bucket
    if (objectPointSet.has(object)) {
        return false;
    }

    // At max depth, store here regardless of capacity to prevent unbounded subdivision
    if (depth >= quadTree.maxDepth ||
        objectPointSet.size > 0 ||
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
    const quadrants: QuadTree<T>[] = quadBoxes.map(quadBox => createQuadTree(quadBox, quadTree.capacity, quadTree.maxDepth));
    const quadObjects: T[] = getQuadTreeData(quadTree);
    quadObjects.push(object);

    // adjust current quadtree settings
    // May need to adjust these in-place instead of creating new references
    clearQuadTree(quadTree);
    quadTree.quadrants = quadrants;

    // add objects from this quad node back to it's own subtree
    // children will be attempted to be added to first
    return quadObjects
        .every(quadObject => addToQuadTree(quadTree, quadObject, depth));
}

function removeFromQuadTree<T extends Bound>(quadTree: QuadTree<T>, object: T): boolean {
    const objectPointKey: string = createPointKey(object);
    const objectPointSet: Set<T> = quadTree.data.get(objectPointKey) || new Set<T>();

    // Check if the object's full bounds intersect with this node's bounds
    if (!doesBoundIntersectBox(object, quadTree.bounds)) {
        return false;
    }

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

    // Check all children — a spanning object may live in multiple quadrants
    let wasRemoved = false;
    for (const quadrant of quadTree.quadrants) {
        if (removeFromQuadTree(quadrant, object)) {
            wasRemoved = true;
        }
    }

    // If one of the children contained the object we just removed
    // Let's query the bounding box of us (the parent) to see if we 
    // can collapse or consume our children. Meaning the child subtree
    // contains less elements than our individual bucket capacity.
    if (wasRemoved) {
        const childObjectResults: Array<QueryResult<T>> = queryQuadTree(quadTree, quadTree.bounds);
        if (childObjectResults.length <= quadTree.capacity) {
            clearQuadTree(quadTree);
            childObjectResults.forEach(childObjectResult => addToQuadTree(quadTree, childObjectResult.object));
        }
    }

    return wasRemoved;
}

function clearQuadTree<T extends Bound>(quadTree: QuadTree<T>): void {
    quadTree.data.clear();
    quadTree.quadrants.length = 0;
}

function queryQuadTree<T extends Bound>(quadTree: QuadTree<T>, bounds: Bound): Array<QueryResult<T>> {
    // Check first if the query bounds intersect with the bounds
    // of the bucket, if it doesn't we can bail immediately with an empty list
    if (!doesBoundIntersectBox(bounds, quadTree.bounds)) {
        return [];
    }

    // Check if current node has children
    if ((quadTree.quadrants || []).length === 0) {
        // Let's iterate over the data in the bucket to see
        // if the objects themselves intersect with the query bounds
        const queryResults: Array<QueryResult<T>> = [];
        getQuadTreeData(quadTree)
            .forEach(quadObject => {
                const mtv: MinimumTranslationVectorInfo | null = doBoundsIntersect(quadObject, bounds);
                if (mtv && quadObject !== bounds) {
                    queryResults.push({
                        mtv,
                        object: quadObject,
                    });
                }
            });

        return queryResults;
    }

    // Collect results across all children, deduplicating by object reference
    // so a spanning object stored in multiple quadrants is returned only once
    const seen = new Set<T>();
    const childQueryResults: Array<QueryResult<T>> = [];
    quadTree.quadrants.forEach(quadrant => {
        queryQuadTree(quadrant, bounds).forEach(result => {
            if (!seen.has(result.object)) {
                seen.add(result.object);
                childQueryResults.push(result);
            }
        });
    });

    return childQueryResults;
}

function getQuadTreeData<T extends Bound>(quadTree: QuadTree<T>, seen: Set<T> = new Set()): T[] {
    for (const quadTreeSet of quadTree.data.values()) {
        for (const item of quadTreeSet) {
            seen.add(item);
        }
    }
    for (const quadrant of quadTree.quadrants) {
        getQuadTreeData(quadrant, seen);
    }
    return [...seen];
}

/**
 * Creates a quadtree "managing" the input bounds with input node capacity.
 *
 * All collision objects should intersect or be contained within these "managed" bounds.
 * @param {BoundingBox} bounds - The bounding box with which the quadtree "manages".
 * @param {number} [capacity=5] - The # of collision objects a node can contain before subdividing.
 * @param {number} [maxDepth=8] - Maximum subdivision depth. Nodes at this depth store objects regardless of capacity.
 * @return {QuadTree} The created quadtree "managing" the input bounds.
 */
export function createQuadTree<T extends Bound>(bounds: BoundingBox, capacity: number = 5, maxDepth: number = 8): QuadTree<T> {
    const quadTree: QuadTree<T> = {
        bounds,
        data: new Map<string, Set<T>>(),
        capacity,
        maxDepth,
        quadrants: [],
        add: (object) => addToQuadTree(quadTree, object, 0),
        remove: (object) => removeFromQuadTree(quadTree, object),
        clear: () => clearQuadTree(quadTree),
        query: (bounds) => queryQuadTree(quadTree, bounds),
        getData: () => getQuadTreeData(quadTree),
    };
    return quadTree;
}
export * from './schema';
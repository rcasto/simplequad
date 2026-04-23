import { doBoundsIntersect } from './sat';
import { Bound, BoundingBox, QuadTree, MinimumTranslationVectorInfo, QueryResult } from './schema';
import { divideBoundingBox, doesBoundIntersectBox } from './util';

function addToQuadTree<T extends Bound>(quadTree: QuadTree<T>, object: T, depth: number = 0): boolean {
    if (!doesBoundIntersectBox(object, quadTree.bounds)) {
        return false;
    }

    if (quadTree.quadrants.length) {
        let wasAddedToChild = false;
        for (const quadrant of quadTree.quadrants) {
            if (addToQuadTree(quadrant, object, depth + 1)) {
                wasAddedToChild = true;
            }
        }
        return wasAddedToChild;
    }

    // O(1) identity dedup via the auxiliary Set mirror
    if (quadTree._items.has(object)) {
        return false;
    }

    // O(1) co-location check: objects sharing a position can't be separated by subdivision
    const posKey = `(${object.x},${object.y})`;
    const sharesPosition = quadTree._posKeys.has(posKey);

    if (depth >= quadTree.maxDepth || sharesPosition || quadTree.data.length < quadTree.capacity) {
        quadTree.data.push(object);
        quadTree._items.add(object);
        quadTree._posKeys.set(posKey, (quadTree._posKeys.get(posKey) ?? 0) + 1);
        return true;
    }

    const quadBoxes: BoundingBox[] = divideBoundingBox(quadTree.bounds);
    const quadrants: QuadTree<T>[] = quadBoxes.map(quadBox => createQuadTree(quadBox, quadTree.capacity, quadTree.maxDepth));
    const quadObjects: T[] = quadTree.data.slice();
    quadObjects.push(object);

    clearQuadTree(quadTree);
    quadTree.quadrants = quadrants;

    for (const quadObject of quadObjects) {
        addToQuadTree(quadTree, quadObject, depth);
    }
    return true;
}

function removeFromQuadTree<T extends Bound>(quadTree: QuadTree<T>, object: T): boolean {
    if (!doesBoundIntersectBox(object, quadTree.bounds)) {
        return false;
    }

    const idx = quadTree.data.indexOf(object);
    if (idx !== -1) {
        quadTree.data[idx] = quadTree.data[quadTree.data.length - 1];
        quadTree.data.pop();
        quadTree._items.delete(object);
        const posKey = `(${object.x},${object.y})`;
        const remaining = quadTree._posKeys.get(posKey)! - 1;
        if (remaining === 0) {
            quadTree._posKeys.delete(posKey);
        } else {
            quadTree._posKeys.set(posKey, remaining);
        }
        return true;
    }

    let wasRemoved = false;
    for (const quadrant of quadTree.quadrants) {
        if (removeFromQuadTree(quadrant, object)) {
            wasRemoved = true;
        }
    }

    return wasRemoved;
}

function clearQuadTree<T extends Bound>(quadTree: QuadTree<T>): void {
    quadTree.data.length = 0;
    quadTree._items.clear();
    quadTree._posKeys.clear();
    quadTree.quadrants.length = 0;
}

function queryQuadTree<T extends Bound>(quadTree: QuadTree<T>, bounds: Bound, seen: Set<T>, results: Array<QueryResult<T>>): void {
    if (!doesBoundIntersectBox(bounds, quadTree.bounds)) {
        return;
    }

    if (quadTree.quadrants.length === 0) {
        for (const quadObject of quadTree.data) {
            if (quadObject === bounds || seen.has(quadObject)) continue;
            const mtv: MinimumTranslationVectorInfo | null = doBoundsIntersect(quadObject, bounds);
            if (mtv) {
                seen.add(quadObject);
                results.push({ mtv, object: quadObject });
            }
        }
        return;
    }

    for (const quadrant of quadTree.quadrants) {
        queryQuadTree(quadrant, bounds, seen, results);
    }
}

function getQuadTreeData<T extends Bound>(quadTree: QuadTree<T>, seen: Set<T> = new Set()): T[] {
    for (const item of quadTree.data) {
        seen.add(item);
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
        data: [],
        _items: new Set<T>(),
        _posKeys: new Map<string, number>(),
        capacity,
        maxDepth,
        quadrants: [],
        add: (object) => addToQuadTree(quadTree, object, 0),
        remove: (object) => removeFromQuadTree(quadTree, object),
        clear: () => clearQuadTree(quadTree),
        query: (bounds) => {
            const seen = new Set<T>();
            const results: Array<QueryResult<T>> = [];
            queryQuadTree(quadTree, bounds, seen, results);
            return results;
        },
        getData: () => getQuadTreeData(quadTree),
    };
    return quadTree;
}
export * from './schema';

import { QuadTree, BoundingBox, Bound } from "../../src/schema";
import { createQuadTree } from "../../src";
import { createPointKey } from "../../src/util";

// Provides tree with pre-defined bounds
// Those fitting randomized mock objects for sure below
export function createMockQuadTree(capacity?: number): QuadTree {
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
    };
    return createQuadTree(bounds, capacity);
}

export function quadTreeBucketContains(quadTree: QuadTree, object: Bound): boolean {
    const objectPointDataSet = quadTree.data.get(createPointKey(object));
    if (objectPointDataSet) {
        return objectPointDataSet.has(object);
    }
    return false;
}
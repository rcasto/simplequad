import { QuadTree, BoundingBox } from "../../src/schema";
import { createQuadTree } from "../../src";

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
import { QuadTree, BoundingBox, CollisionObject } from "../src/schemas";
import { createQuadTree } from "../src";

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

export function createMockObject(): CollisionObject {
    const randomX = Math.random();
    const randomY = Math.random();
    const randomHeight = Math.random();
    const randomWidth = Math.random();
    return createMockBoundObject({
        x: randomX * 100,
        y: randomY * 100,
        height: randomHeight * 300,
        width: randomWidth * 400,
    });
}

export function createMockBoundObject(bounds: BoundingBox): CollisionObject {
    return {
        getBoundingBox() {
            return bounds;
        }
    };
}
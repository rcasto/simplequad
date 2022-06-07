import { QuadTree, BoundingBox, Circle, Point, Bound } from "../../src/schema";
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

const randomBoundGenerators = [
    createRandomCircle,
    createRandomPoint,
    createRandomBoundingBox,
];
export function createRandomBound(bounds: BoundingBox): Bound {
    const randomBoundGeneratorIndex: number = Math.floor(Math.random() * randomBoundGenerators.length);
    return randomBoundGenerators[randomBoundGeneratorIndex](bounds);
}

const maxCircleRadius: number = 15;
const minCircleRadius: number = 5;
function createRandomCircle(bounds: BoundingBox): Circle {
    const r = Math.max(maxCircleRadius * Math.random(), minCircleRadius); 
    const x = (bounds.x + bounds.width - r) * Math.random() + bounds.x + r;
    const y = (bounds.y + bounds.height - r) * Math.random() + bounds.y + r;
    return {
        x,
        y,
        r,
    };
}

function createRandomPoint(bounds: BoundingBox): Point {
    const x = (bounds.x + bounds.width) * Math.random() + bounds.x;
    const y = (bounds.y + bounds.height) * Math.random() + bounds.y;
    return {
        x,
        y,
    };
}

const maxBoundingBoxDimension: number = 15;
const minBoundingBoxDimension: number = 5;
function createRandomBoundingBox(bounds: BoundingBox): BoundingBox {
    const width = Math.max(maxBoundingBoxDimension * Math.random(), minBoundingBoxDimension);
    const height = Math.max(maxBoundingBoxDimension * Math.random(), minBoundingBoxDimension);
    const x = (bounds.x + bounds.width - width) * Math.random() + bounds.x;
    const y = (bounds.y + bounds.height - height) * Math.random() + bounds.y;
    return {
        x,
        y,
        width,
        height,
    };
}
import test from 'ava';
import { createQuadTree } from '../src/index';
import { BoundingBox, QuadTree } from '../src/schemas';

test('can create quad tree', t => {
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 50,
        height: 100,
    };
    const quadTree: QuadTree = createQuadTree(bounds);

    t.truthy(!!quadTree);
    t.deepEqual(quadTree.bounds, bounds);
    t.truthy(quadTree.capacity === 3);
    t.truthy(Array.isArray(quadTree.data) && quadTree.data.length === 0);
    t.truthy(Array.isArray(quadTree.quadrants) && quadTree.quadrants.length === 0);
});

test('can create quad tree - setting bucket capacity', t => {
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 50,
        height: 100,
    };
    const capacity: number = 15;
    const quadTree: QuadTree = createQuadTree(bounds, capacity);

    t.truthy(!!quadTree);
    t.truthy(quadTree.capacity === capacity);
});
import test from 'ava';
import { QuadTree } from '../src';
import { createMockQuadTree } from './helpers/util';

test('can create quad tree', t => {
    const quadTree: QuadTree = createMockQuadTree();

    t.truthy(!!quadTree);
    t.deepEqual(quadTree.bounds, {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
    });
    t.is(quadTree.capacity, 5);
    t.is(quadTree.data.size, 0);
    t.truthy(Array.isArray(quadTree.quadrants));
    t.is(quadTree.quadrants.length, 0);
});

test('can create quad tree - setting bucket capacity', t => {
    const capacity: number = 15;
    const quadTree: QuadTree = createMockQuadTree(capacity);

    t.truthy(!!quadTree);
    t.is(quadTree.capacity, capacity);
});
import test from 'ava';
import { QuadTree, CollisionObject } from '../src';
import { createMockQuadTree, createMockObject } from './helpers/util';

test('can clear the quad tree', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: CollisionObject = createMockObject({
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    });
    const object2: CollisionObject = createMockObject({
        x: 100,
        y: 100,
        width: 5,
        height: 5,
    });
    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.clear();

    t.is(quadTree.data.size, 0);
    t.is(quadTree.quadrants.length, 0);
});
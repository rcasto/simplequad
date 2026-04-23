import test from 'ava';
import { QuadTree, BoundingBox, Bound } from '../src';
import { createMockQuadTree } from './helpers/util';

test('can remove object added to quad tree', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: Bound = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };

    quadTree.add(object);
    quadTree.remove(object);

    t.is(quadTree.data.length, 0);
    t.is(quadTree.quadrants.length, 0);
});

test('can remove object at point with multiple objects', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };
    const object1: Bound = Object.assign({}, bounds);
    const object2: Bound = Object.assign({}, bounds);

    quadTree.add(object1);
    quadTree.add(object2);

    t.is(quadTree.data.length, 2);
    t.is(quadTree.quadrants.length, 0);
    t.truthy(quadTree.data.includes(object1));
    t.truthy(quadTree.data.includes(object2));

    quadTree.remove(object1);

    t.is(quadTree.data.length, 1);
    t.is(quadTree.quadrants.length, 0);
    t.falsy(quadTree.data.includes(object1));
    t.truthy(quadTree.data.includes(object2));

    quadTree.remove(object2);

    t.is(quadTree.data.length, 0);
    t.is(quadTree.quadrants.length, 0);
});

test('can remove object added to quad tree - no collapse after remove', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: Bound = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };
    const object2: Bound = {
        x: 100,
        y: 100,
        width: 5,
        height: 5,
    };

    quadTree.add(object1);
    quadTree.add(object2);

    t.is(quadTree.data.length, 0);
    t.is(quadTree.quadrants.length, 4);

    quadTree.remove(object1);

    // Tree stays subdivided — no collapse. Remaining object still findable.
    t.is(quadTree.quadrants.length, 4);
    const remaining = quadTree.getData();
    t.is(remaining.length, 1);
    t.true(remaining.includes(object2));
});

test('can remove object added to quad tree - no collapse after remove, higher capacity', t => {
    const quadTree: QuadTree = createMockQuadTree(2);
    const object1: Bound = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };
    const object2: Bound = {
        x: 100,
        y: 100,
        width: 5,
        height: 5,
    };
    const object3: Bound = {
        x: 200,
        y: 200,
        width: 5,
        height: 5,
    };

    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    t.is(quadTree.data.length, 0);
    t.is(quadTree.quadrants.length, 4);

    quadTree.remove(object1);

    // Tree stays subdivided — no collapse. Remaining objects still findable.
    t.is(quadTree.quadrants.length, 4);
    const remaining = quadTree.getData();
    t.is(remaining.length, 2);
    t.true(remaining.includes(object2));
    t.true(remaining.includes(object3));
});

import test from 'ava';
import { QuadTree, createQuadTree, BoundingBox, Bound } from '../src';
import { createMockQuadTree } from './helpers/util';
import { createPointKey } from '../src/util';

test('can add an object to quadtree', t => {
    const quadTree: QuadTree = createMockQuadTree();
    const object: Bound = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };

    t.truthy(quadTree.add(object));
    t.is(quadTree.data.size, 1);
    t.is(quadTree.quadrants.length, 0);
});

test('can add an object to quadtree - can add objects up to capacity', t => {
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

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.size, 2);
    t.is(quadTree.quadrants.length, 0);
});

test('can add an object to quadtree - bucket overflow and split', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: Bound = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object2: Bound = {
        x: 450,
        y: 350,
        width: 5,
        height: 5,
    };

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.size, 0);
    t.is(quadTree.quadrants.length, 4);
    t.is(quadTree.query(quadTree.bounds).length, 2);
    // NW quadrant
    t.is(quadTree.quadrants[0].data.size, 1);
    t.is(quadTree.quadrants[0].quadrants.length, 0);
    // NE quadrant
    t.is(quadTree.quadrants[1].data.size, 0);
    t.is(quadTree.quadrants[1].quadrants.length, 0);
    // SW quadrant
    t.is(quadTree.quadrants[2].data.size, 0);
    t.is(quadTree.quadrants[2].quadrants.length, 0);
    // SE quadrant
    t.is(quadTree.quadrants[3].data.size, 1);
    t.is(quadTree.quadrants[3].quadrants.length, 0);
});

test('can add an object to quadtree - bucket overflow and split offset bucket', t => {
    const quadTree: QuadTree = createQuadTree({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
    }, 1);
    const object1: Bound = {
        x: 100,
        y: 150,
        width: 5,
        height: 5,
    };
    const object2: Bound = {
        x: 150,
        y: 150,
        width: 5,
        height: 5,
    };

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));
});

test('can handle adding the same object twice', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: Bound = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };

    quadTree.add(object);

    t.falsy(quadTree.add(object));
    t.is(quadTree.data.size, 1);
    t.is(quadTree.quadrants.length, 0);
});

test('can handle adding 2 objects that occupy the same originating point, capacity > 1', t => {
    const quadTree: QuadTree = createMockQuadTree(2);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object1: Bound = Object.assign({}, bounds);
    const object2: Bound = Object.assign({}, bounds);

    quadTree.add(object1);
    
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.size, 1);

    const objectsAtPoint: Set<Bound> = quadTree.data.get(createPointKey(object1)) || new Set<Bound>();
    t.is(objectsAtPoint.size, 2);
    t.is(quadTree.quadrants.length, 0);
});

test('can handle adding 2 objects that occupy the same originating point, capacity > 1 - bounds copied', t => {
    const quadTree: QuadTree = createMockQuadTree(2);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const copyBounds: BoundingBox = Object.assign({}, { ...bounds });
    const object1: Bound = Object.assign({}, bounds);
    const object2: Bound = Object.assign({}, copyBounds);

    quadTree.add(object1);
    
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.size, 1);

    const objectsAtPoint: Set<Bound> = quadTree.data.get(createPointKey(object1)) || new Set<Bound>();
    t.is(objectsAtPoint.size, 2);
    t.is(quadTree.quadrants.length, 0);
});

// blackhole scenario
test('can handle adding 2 objects that occupy the same originating point, capacity of 1', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object1: Bound = Object.assign({}, bounds);
    const object2: Bound = Object.assign({}, bounds);

    quadTree.add(object1);
    
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.size, 1);
    t.is(quadTree.quadrants.length, 0);
});

test('can handle adding object directly on bucket boundary crossing', t => {
    const quadTree: QuadTree = createQuadTree({
        x: 0,
        y: 0,
        width: 200,
        height: 200,
    }, 1);
    const object1: Bound = {
        x: 175,
        y: 175,
        width: 5,
        height: 5,
    };
    const object2: Bound = {
        x: 100,
        y: 100,
        width: 5,
        height: 5,
    };

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));

    t.is(quadTree.data.size, 0);
    t.is(quadTree.quadrants.length, 4);

    const results = quadTree.query(quadTree.bounds);

    t.is(results.length, 2);
});
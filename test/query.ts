import test from 'ava';
import { QuadTree, BoundingBox, createQuadTree, Bound } from '../src';
import { createMockQuadTree } from './helpers/util';

test('can query the quad tree with bounds', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: Bound = ({
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    });

    quadTree.add(object);

    const results: Set<Bound> = quadTree.query(quadTree.bounds);
    t.is(results.size, 1);
    t.truthy(results.has(object));
});

test('can query the quad tree with bounds - multi object 1 point (whole window bounds)', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object1: Bound = (bounds);
    const object2: Bound = (bounds);
    const object3: Bound = ({
        x: 2,
        y: 0,
        width: 2,
        height: 2,
    });

    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    const results: Set<Bound> = quadTree.query(quadTree.bounds);
    t.is(results.size, 3);
    t.truthy(results.has(object1));
    t.truthy(results.has(object2));
    t.truthy(results.has(object3));
});

test('can query the quad tree with bounds - single quadrant query window', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: Bound = ({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    });
    const object2: Bound = ({
        x: 450,
        y: 350,
        width: 5,
        height: 5,
    });
    // SE bounding box
    const queryBounds: BoundingBox = {
        x: 400,
        y: 300,
        width: 400,
        height: 300,
    };
    quadTree.add(object1);
    quadTree.add(object2);

    const results: Set<Bound> = quadTree.query(queryBounds);
    t.is(results.size, 1);
    t.truthy(results.has(object2));
});

test('can query the quad tree with bounds - single quadrant object bounding box overlap', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: Bound = ({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    });
    const object2: Bound = ({
        x: 5,
        y: 5,
        width: 10,
        height: 10,
    });
    quadTree.add(object1);
    quadTree.add(object2);

    const results: Set<Bound> = quadTree.query(quadTree.bounds);
    t.is(results.size, 2);
    t.truthy(results.has(object1));
    t.truthy(results.has(object2));
});

test('can query the quad tree with bounds - multi quadrant query window', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: Bound = ({
        x: 350,
        y: 250,
        width: 100,
        height: 100,
    });
    const object2: Bound = ({
        x: 450,
        y: 350,
        width: 100,
        height: 100,
    });
    quadTree.add(object1);
    quadTree.add(object2);

    const results: Set<Bound> = quadTree.query(quadTree.bounds);
    t.is(results.size, 2);
    t.truthy(results.has(object1));
    t.truthy(results.has(object2));
});

test('can query the quad tree with bounds - multi level', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: Bound = ({
        x: 100,
        y: 100,
        width: 200,
        height: 200,
    });
    const object2: Bound = ({
        x: 300,
        y: 100,
        width: 200,
        height: 200,
    });
    quadTree.add(object1);
    quadTree.add(object2);

    const results: Set<Bound> = quadTree.query(quadTree.bounds);
    t.is(results.size, 2);
    t.truthy(results.has(object1));
    t.truthy(results.has(object2));
});

test('can query the quad tree with bounds - self bounding box', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: Bound = ({
        x: 100,
        y: 100,
        width: 200,
        height: 200,
    });
    quadTree.add(object);

    const results: Set<Bound> = quadTree.query(quadTree.bounds);
    t.is(results.size, 1);
    t.truthy(results.has(object));
});

test('can query the quad tree with bounds - self bounding box / multi-object', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object1: Bound = (bounds);
    const object2: Bound = (bounds);

    quadTree.add(object1);
    quadTree.add(object2);

    const results: Set<Bound> = quadTree.query(quadTree.bounds);
    t.is(results.size, 2);
    t.truthy(results.has(object1));
    t.truthy(results.has(object2));
});

test('can query the quad tree with bounds - square window, cross bucket bounds, multi object', t => {
    const quadTree: QuadTree = createQuadTree({
        x: 0,
        y: 0,
        width: 200,
        height: 200,
    }, 1);
    const object1: Bound = ({
        x: 50,
        y: 50,
        width: 50,
        height: 100,
    });
    const object2: Bound = ({
        x: 50,
        y: 100,
        width: 100,
        height: 50,
    });
    const object3: Bound = ({
        x: 100,
        y: 50,
        width: 50,
        height: 100,
    });
    const object4: Bound = ({
        x: 50,
        y: 50,
        width: 100,
        height: 50,
    });
    const queryWindow: BoundingBox = {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
    };

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));
    t.truthy(quadTree.add(object3));
    t.truthy(quadTree.add(object4));

    const results: Set<Bound> = quadTree.query(queryWindow);

    t.is(results.size, 4);
    t.truthy(results.has(object1));
    t.truthy(results.has(object2));
    t.truthy(results.has(object3));
    t.truthy(results.has(object4));
});

test('can get data within bucket', t => {
    const quadTree: QuadTree = createMockQuadTree(5);
    const object1: Bound = ({
        x: 100,
        y: 100,
        width: 200,
        height: 200,
    });
    const object2: Bound = ({
        x: 100,
        y: 150,
        width: 200,
        height: 200,
    });
    const object3: Bound = ({
        x: 100,
        y: 200,
        width: 200,
        height: 200,
    });
    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    const results: Bound[] = quadTree.getData();
    t.is(results.length, 3);
    t.truthy(results.includes(object1));
    t.truthy(results.includes(object2));
    t.truthy(results.includes(object3));
});

test('can get data within bucket - same point', t => {
    const quadTree: QuadTree = createMockQuadTree(5);
    const bounds: BoundingBox = {
        x: 100,
        y: 100,
        width: 200,
        height: 200,
    };
    const object1: Bound = (bounds);
    const object2: Bound = (bounds);
    const object3: Bound = (bounds);
    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    const results: Bound[] = quadTree.getData();
    t.is(results.length, 3);
    t.truthy(results.includes(object1));
    t.truthy(results.includes(object2));
    t.truthy(results.includes(object3));
});
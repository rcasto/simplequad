import test from 'ava';
import { BoundingBox, CollisionObject, QuadTree } from '../src/schemas';
import { createMockQuadTree, createMockObject } from './util';

test('can create quad tree', t => {
    const quadTree: QuadTree = createMockQuadTree();

    t.truthy(!!quadTree);
    t.deepEqual(quadTree.bounds, {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
    });
    t.is(quadTree.capacity, 3);
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

test('can add an object to quadtree', t => {
    const quadTree: QuadTree = createMockQuadTree();
    const object: CollisionObject = createMockObject({
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    });

    t.truthy(quadTree.add(object));
    t.is(quadTree.data.size, 1);
    t.truthy(quadTree.data.has(object));
    t.is(quadTree.quadrants.length, 0);
});

test('can add an object to quadtree - can add objects up to capacity', t => {
    const quadTree: QuadTree = createMockQuadTree(2);
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

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.size, 2);
    t.truthy(quadTree.data.has(object1));
    t.truthy(quadTree.data.has(object2));
    t.is(quadTree.quadrants.length, 0);
});

test('can add an object to quadtree - bucket overflow and split', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: CollisionObject = createMockObject({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    });
    const object2: CollisionObject = createMockObject({
        x: 450,
        y: 350,
        width: 5,
        height: 5,
    });

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.size, 0);
    t.is(quadTree.quadrants.length, 4);
    // NW quadrant
    t.is(quadTree.quadrants[0].data.size, 1);
    t.truthy(quadTree.quadrants[0].data.has(object1));
    t.is(quadTree.quadrants[0].quadrants.length, 0);
    // NE quadrant
    t.is(quadTree.quadrants[1].data.size, 0);
    t.is(quadTree.quadrants[1].quadrants.length, 0);
    // SW quadrant
    t.is(quadTree.quadrants[2].data.size, 0);
    t.is(quadTree.quadrants[2].quadrants.length, 0);
    // SE quadrant
    t.is(quadTree.quadrants[3].data.size, 1);
    t.truthy(quadTree.quadrants[3].data.has(object2));
    t.is(quadTree.quadrants[3].quadrants.length, 0);
});

test('can handle adding the same object twice', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: CollisionObject = createMockObject({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    });

    quadTree.add(object);

    t.falsy(quadTree.add(object));
    t.is(quadTree.data.size, 1);
    t.is(quadTree.quadrants.length, 0);
});

// Thinking through how to handle this more
test.skip('can handle adding 2 objects that occupy the same originating point', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object1: CollisionObject = createMockObject(bounds);
    const object2: CollisionObject = createMockObject(bounds);

    quadTree.add(object1);
    quadTree.add(object2);
});

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

test('can query the quad tree with bounds', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: CollisionObject = createMockObject({
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    });

    quadTree.add(object);

    const results: Set<CollisionObject> = quadTree.query(quadTree.bounds);
    t.is(results.size, 1);
    t.truthy(results.has(object));
});

test('can query the quad tree with bounds - single quadrant query window', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: CollisionObject = createMockObject({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    });
    const object2: CollisionObject = createMockObject({
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

    const results: Set<CollisionObject> = quadTree.query(queryBounds);
    t.is(results.size, 1);
    t.truthy(results.has(object2));
});

test('can query the quad tree with bounds - single quadrant object bounding box overlap', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: CollisionObject = createMockObject({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    });
    const object2: CollisionObject = createMockObject({
        x: 5,
        y: 5,
        width: 10,
        height: 10,
    });
    quadTree.add(object1);
    quadTree.add(object2);

    const results: Set<CollisionObject> = quadTree.query(object1.getBoundingBox());
    t.is(results.size, 2);
    t.truthy(results.has(object1));
    t.truthy(results.has(object2));
});

test('can query the quad tree with bounds - multi quadrant query window', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: CollisionObject = createMockObject({
        x: 350,
        y: 250,
        width: 100,
        height: 100,
    });
    const object2: CollisionObject = createMockObject({
        x: 450,
        y: 350,
        width: 100,
        height: 100,
    });
    quadTree.add(object1);
    quadTree.add(object2);

    const results: Set<CollisionObject> = quadTree.query(object1.getBoundingBox());
    t.is(results.size, 2);
    t.truthy(results.has(object1));
    t.truthy(results.has(object2));
});

test('can query the quad tree with bounds - multi level', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: CollisionObject = createMockObject({
        x: 100,
        y: 100,
        width: 200,
        height: 200,
    });
    const object2: CollisionObject = createMockObject({
        x: 300,
        y: 100,
        width: 200,
        height: 200,
    });
    quadTree.add(object1);
    quadTree.add(object2);

    const results: Set<CollisionObject> = quadTree.query(object1.getBoundingBox());
    t.is(results.size, 2);
    t.truthy(results.has(object1));
    t.truthy(results.has(object2));
});

test('can remove object added to quad tree', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: CollisionObject = createMockObject({
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    });

    quadTree.add(object);
    quadTree.remove(object);

    t.is(quadTree.data.size, 0);
    t.is(quadTree.quadrants.length, 0);
});

test('can remove object added to quad tree - collapse subtree', t => {
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

    t.is(quadTree.data.size, 0);
    t.is(quadTree.quadrants.length, 4);

    quadTree.remove(object1);

    t.is(quadTree.data.size, 1);
    t.truthy(quadTree.data.has(object2));
    t.is(quadTree.quadrants.length, 0);
});

test('can remove object added to quad tree - collapse subtree higher capacity', t => {
    const quadTree: QuadTree = createMockQuadTree(2);
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
    const object3: CollisionObject = createMockObject({
        x: 200,
        y: 200,
        width: 5,
        height: 5,
    });

    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    t.is(quadTree.data.size, 0);
    t.is(quadTree.quadrants.length, 4);

    quadTree.remove(object1);

    t.is(quadTree.data.size, 2);
    t.truthy(quadTree.data.has(object2));
    t.truthy(quadTree.data.has(object3));
    t.is(quadTree.quadrants.length, 0);
});
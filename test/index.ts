import test from 'ava';
import { createQuadTree } from '../src/index';
import { BoundingBox, CollisionObject, QuadTree } from '../src/schemas';

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
    t.truthy(Array.isArray(quadTree.data));
    t.is(quadTree.data.length, 0);
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
    const object: CollisionObject = createMockObject();

    t.truthy(quadTree.add(object));
    t.is(quadTree.data.length, 1);
    t.truthy(quadTree.data.includes(object));
    t.is(quadTree.quadrants.length, 0);
});

test('can add an object to quadtree - can add objects up to capacity', t => {
    const quadTree: QuadTree = createMockQuadTree(2);
    const object1: CollisionObject = createMockObject();
    const object2: CollisionObject = createMockObject();

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.length, 2);
    t.truthy(quadTree.data.includes(object1));
    t.truthy(quadTree.data.includes(object2));
    t.is(quadTree.quadrants.length, 0);
});

test('can add an object to quadtree - bucket overflow and split', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: CollisionObject = {
        getBoundingBox() {
            // NW quadrant
            return {
                x: 0,
                y: 0,
                width: 10,
                height: 10,
            };
        }
    };
    const object2: CollisionObject = {
        getBoundingBox() {
            // SE quadrant
            return {
                x: 450,
                y: 350,
                width: 5,
                height: 5,
            };
        }
    };

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.length, 0);
    t.is(quadTree.quadrants.length, 4);
    // NW quadrant
    t.is(quadTree.quadrants[0].data.length, 1);
    t.truthy(quadTree.quadrants[0].data.includes(object1));
    // NE quadrant
    t.is(quadTree.quadrants[1].data.length, 0);
    // SW quadrant
    t.is(quadTree.quadrants[2].data.length, 0);
    // SE quadrant
    t.is(quadTree.quadrants[3].data.length, 1);
    t.truthy(quadTree.quadrants[3].data.includes(object2));
});

test('can clear the quad tree', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    quadTree.add(createMockObject());
    quadTree.add(createMockObject());
    quadTree.clear();

    t.is(quadTree.data.length, 0);
    t.is(quadTree.quadrants.length, 0);
});

test('can query the quad tree with bounds', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    quadTree.add(createMockObject());
    quadTree.add(createMockObject());

    const results: Set<CollisionObject> = quadTree.query(quadTree.bounds);
    t.is(results.size, 2);
});

test('can query the quad tree with bounds - smaller query window', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: CollisionObject = {
        getBoundingBox() {
            // NW quadrant
            return {
                x: 0,
                y: 0,
                width: 10,
                height: 10,
            };
        }
    };
    const object2: CollisionObject = {
        getBoundingBox() {
            // SE quadrant
            return {
                x: 450,
                y: 350,
                width: 5,
                height: 5,
            };
        }
    };
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

// Provides tree with pre-defined bounds
// Those fitting randomized mock objects for sure below
function createMockQuadTree(capacity?: number): QuadTree {
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
    };
    return createQuadTree(bounds, capacity);
}

function createMockObject(): CollisionObject {
    return {
        getBoundingBox() {
            return {
                x: Math.random() * 100,
                y: Math.random() * 100,
                height: Math.random() * 300,
                width: Math.random() * 400,
            };
        }
    };
}
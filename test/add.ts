import test from 'ava';
import { QuadTree, CollisionObject, createQuadTree, BoundingBox } from '../src';
import { createMockQuadTree, createMockObject, quadTreeBucketContains } from './helpers/util';
import { createPointKey } from '../src/util';

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
    t.truthy(quadTreeBucketContains(quadTree, object));
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
    t.truthy(quadTreeBucketContains(quadTree, object1));
    t.truthy(quadTreeBucketContains(quadTree, object2));
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
    t.truthy(quadTreeBucketContains(quadTree.quadrants[0], object1));
    t.is(quadTree.quadrants[0].quadrants.length, 0);
    // NE quadrant
    t.is(quadTree.quadrants[1].data.size, 0);
    t.is(quadTree.quadrants[1].quadrants.length, 0);
    // SW quadrant
    t.is(quadTree.quadrants[2].data.size, 0);
    t.is(quadTree.quadrants[2].quadrants.length, 0);
    // SE quadrant
    t.is(quadTree.quadrants[3].data.size, 1);
    t.truthy(quadTreeBucketContains(quadTree.quadrants[3], object2));
    t.is(quadTree.quadrants[3].quadrants.length, 0);
});

test('can add an object to quadtree - bucket overflow and split offset bucket', t => {
    const quadTree: QuadTree = createQuadTree({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
    }, 1);
    const object1: CollisionObject = createMockObject({
        x: 100,
        y: 150,
        width: 5,
        height: 5,
    });
    const object2: CollisionObject = createMockObject({
        x: 150,
        y: 150,
        width: 5,
        height: 5,
    });

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));
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

test('can handle adding 2 objects that occupy the same originating point, capacity > 1', t => {
    const quadTree: QuadTree = createMockQuadTree(2);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object1: CollisionObject = createMockObject(bounds);
    const object2: CollisionObject = createMockObject(bounds);

    quadTree.add(object1);
    
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.size, 1);

    const objectsAtPoint: CollisionObject[] = quadTree.data.get(createPointKey(object1.getBounds())) || [];
    t.is(objectsAtPoint.length, 2);
    t.truthy(objectsAtPoint.includes(object1));
    t.truthy(objectsAtPoint.includes(object2));
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
    const object1: CollisionObject = createMockObject(bounds);
    const object2: CollisionObject = createMockObject(copyBounds);

    quadTree.add(object1);
    
    t.truthy(quadTree.add(object2));
    t.is(quadTree.data.size, 1);

    const objectsAtPoint: CollisionObject[] = quadTree.data.get(createPointKey(object1.getBounds())) || [];
    t.is(objectsAtPoint.length, 2);
    t.truthy(objectsAtPoint.includes(object1));
    t.truthy(objectsAtPoint.includes(object2));
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
    const object1: CollisionObject = createMockObject(bounds);
    const object2: CollisionObject = createMockObject(bounds);

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
    const object1: CollisionObject = createMockObject({
        x: 175,
        y: 175,
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

    t.is(quadTree.data.size, 0);
    t.is(quadTree.quadrants.length, 4);

    const results = quadTree.query(quadTree.bounds);

    t.is(results.length, 2);
    t.truthy(results.includes(object1));
    t.truthy(results.includes(object2));
});
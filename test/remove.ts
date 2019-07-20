import test from 'ava';
import { QuadTree, CollisionObject, BoundingBox } from '../src';
import { createMockQuadTree, createMockObject, quadTreeBucketContains } from './helpers/util';
import { createPointKey } from '../src/util';

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

test('can remove object at point with multiple objects', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };
    const object1: CollisionObject = createMockObject(bounds);
    const object2: CollisionObject = createMockObject(bounds);

    quadTree.add(object1);
    quadTree.add(object2);

    let objectsAtPoint: Set<CollisionObject> = quadTree.data.get(createPointKey(object1.getBounds())) || new Set<CollisionObject>();
    t.is(quadTree.data.size, 1);
    t.is(quadTree.quadrants.length, 0);
    t.is(objectsAtPoint.size, 2);
    t.truthy(objectsAtPoint.has(object1));
    t.truthy(objectsAtPoint.has(object2));

    quadTree.remove(object1);
    objectsAtPoint = quadTree.data.get(createPointKey(object1.getBounds())) || new Set<CollisionObject>();

    t.is(quadTree.data.size, 1);
    t.is(quadTree.quadrants.length, 0);
    t.is(objectsAtPoint.size, 1);
    t.falsy(objectsAtPoint.has(object1));
    t.truthy(objectsAtPoint.has(object2));

    quadTree.remove(object2);
    objectsAtPoint = quadTree.data.get(createPointKey(object1.getBounds())) || new Set<CollisionObject>();

    t.is(quadTree.data.size, 0);
    t.is(quadTree.quadrants.length, 0);
    t.is(objectsAtPoint.size, 0);
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
    t.truthy(quadTreeBucketContains(quadTree, object2));
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
    t.truthy(quadTreeBucketContains(quadTree, object2));
    t.truthy(quadTreeBucketContains(quadTree, object3));
    t.is(quadTree.quadrants.length, 0);
});
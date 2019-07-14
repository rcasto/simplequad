import test from 'ava';
import { createQuadTree } from '../src/index';
import { BoundingBox, CollisionObject, QuadTree } from '../src/schemas';

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

test('can add an object to quadtree', t => {
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
    };
    const quadTree: QuadTree = createQuadTree(bounds);
    const object: CollisionObject = createMockObject();

    t.truthy(quadTree.add(object));
    t.truthy(quadTree.data.length === 1);
    t.truthy(quadTree.data.includes(object));
    t.truthy(quadTree.quadrants.length === 0);
});

test('can add an object to quadtree - can add objects up to capacity', t => {
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
    };
    const quadTree: QuadTree = createQuadTree(bounds, 2);
    const object1: CollisionObject = createMockObject();
    const object2: CollisionObject = createMockObject();

    t.truthy(quadTree.add(object1));
    t.truthy(quadTree.add(object2));
    t.truthy(quadTree.data.length === 2);
    t.truthy(quadTree.data.includes(object1));
    t.truthy(quadTree.data.includes(object2));
    t.truthy(quadTree.quadrants.length === 0);
});

test('can add an object to quadtree - bucket overflow and split', t => {
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 50,
        height: 50,
    };
    const quadTree: QuadTree = createQuadTree(bounds, 1);
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
                x: 30,
                y: 40,
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
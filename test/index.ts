import test from 'ava';
import { createMockQuadTree, createMockObject } from './helpers/util';
import { BoundingBox, CollisionObject, QuadTree, createQuadTree } from '../src';
import { createPointKey } from '../src/util';

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

    const results: CollisionObject[] = quadTree.query(quadTree.bounds);
    t.is(results.length, 1);
    t.truthy(results.includes(object));
});

test('can query the quad tree with bounds - multi object 1 point (whole window bounds)', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object1: CollisionObject = createMockObject(bounds);
    const object2: CollisionObject = createMockObject(bounds);
    const object3: CollisionObject = createMockObject({
        x: 2,
        y: 0,
        width: 2,
        height: 2,
    });

    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    const results: CollisionObject[] = quadTree.query(quadTree.bounds);
    t.is(results.length, 3);
    t.truthy(results.includes(object1));
    t.truthy(results.includes(object2));
    t.truthy(results.includes(object3));
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

    const results: CollisionObject[] = quadTree.query(queryBounds);
    t.is(results.length, 1);
    t.truthy(results.includes(object2));
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

    const results: CollisionObject[] = quadTree.query(object1.getBounds());
    t.is(results.length, 2);
    t.truthy(results.includes(object1));
    t.truthy(results.includes(object2));
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

    const results: CollisionObject[] = quadTree.query(object1.getBounds());
    t.is(results.length, 2);
    t.truthy(results.includes(object1));
    t.truthy(results.includes(object2));
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

    const results: CollisionObject[] = quadTree.query(object1.getBounds());
    t.is(results.length, 2);
    t.truthy(results.includes(object1));
    t.truthy(results.includes(object2));
});

test('can query the quad tree with bounds - self bounding box', t => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: CollisionObject = createMockObject({
        x: 100,
        y: 100,
        width: 200,
        height: 200,
    });
    quadTree.add(object);

    const results: CollisionObject[] = quadTree.query(object.getBounds());
    t.is(results.length, 1);
    t.truthy(results.includes(object));
});

test('can query the quad tree with bounds - self bounding box / multi-object', t => {
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

    const results: CollisionObject[] = quadTree.query(object1.getBounds());
    t.is(results.length, 2);
    t.truthy(results.includes(object1));
    t.truthy(results.includes(object2));
});

test('can query the quad tree with bounds - square window, cross bucket bounds, multi object', t => {
    const quadTree: QuadTree = createQuadTree({
        x: 0,
        y: 0,
        width: 200,
        height: 200,
    }, 1);
    const object1: CollisionObject = createMockObject({
        x: 50,
        y: 50,
        width: 50,
        height: 100,
    });
    const object2: CollisionObject = createMockObject({
        x: 50,
        y: 100,
        width: 100,
        height: 50,
    });
    const object3: CollisionObject = createMockObject({
        x: 100,
        y: 50,
        width: 50,
        height: 100,
    });
    const object4: CollisionObject = createMockObject({
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

    const results: CollisionObject[] = quadTree.query(queryWindow);

    // wole window
    t.is(quadTree.query(quadTree.bounds).length, 4);

    t.is(results.length, 4);
    t.truthy(results.includes(object1));
    t.truthy(results.includes(object2));
    t.truthy(results.includes(object3));
    t.truthy(results.includes(object4));
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

    let objectsAtPoint: CollisionObject[] = quadTree.data.get(createPointKey(object2.getBounds())) || [];
    t.is(quadTree.data.size, 1);
    t.is(quadTree.quadrants.length, 0);
    t.is(objectsAtPoint.length, 2);
    t.truthy(objectsAtPoint.includes(object1));
    t.truthy(objectsAtPoint.includes(object2));

    quadTree.remove(object1);
    objectsAtPoint = quadTree.data.get(createPointKey(object2.getBounds())) || [];

    t.is(quadTree.data.size, 1);
    t.is(quadTree.quadrants.length, 0);
    t.is(objectsAtPoint.length, 1);
    t.falsy(objectsAtPoint.includes(object1));
    t.truthy(objectsAtPoint.includes(object2));

    quadTree.remove(object2);
    objectsAtPoint = quadTree.data.get(createPointKey(object2.getBounds())) || [];

    t.is(quadTree.data.size, 0);
    t.is(quadTree.quadrants.length, 0);
    t.is(objectsAtPoint.length, 0);
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

function quadTreeBucketContains(quadTree: QuadTree, object: CollisionObject): boolean {
    const objectPointDataSet = quadTree.data.get(createPointKey(object.getBounds()));
    if (objectPointDataSet) {
        return objectPointDataSet.includes(object);
    }
    return false;
}
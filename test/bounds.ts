import test from 'ava';
import { BoundingBox, createQuadTree, QuadTree, CollisionObject } from '../src';
import { createMockObject } from './helpers/util';

/*
    This test file is mainly meant as a means to verify the individual bounds checks
    between all the available bounds

    The supported bounds will be as follows:
    - Point
    - Circle
    - BoundingBox

    The # of combinations between these 3 bounds is as follows:
    - Circle and Circle
    - Circle and Point
    - Circle and BoundingBox
    - BoundingBox and BoundingBox
    - BoundingBox and Point
    - Point and Point
*/
const bounds: BoundingBox = {
    x: 0,
    y: 0,
    width: 200,
    height: 200,
};

test('can find 2 circles intersect', t => {
    const object1: CollisionObject = createMockObject({
        x: 10,
        y: 10,
        r: 5,
    });
    const object2: CollisionObject = createMockObject({
        x: 5,
        y: 10,
        r: 5,
    });

    t.truthy(doIntersect(object1, object2));
});

test('can find 2 circles intersect - circle contains circle', t => {
    const object1: CollisionObject = createMockObject({
        x: 10,
        y: 10,
        r: 5,
    });
    const object2: CollisionObject = createMockObject({
        x: 10,
        y: 10,
        r: 2,
    });

    t.truthy(doIntersect(object1, object2));
});

test('can find circle intersects with point', t => {
    const object1: CollisionObject = createMockObject({
        x: 10,
        y: 10,
        r: 5,
    });
    const object2: CollisionObject = createMockObject({
        x: 11,
        y: 12,
    });

    t.truthy(doIntersect(object1, object2));
});

test('can find circle intersects with bounding box', t => {
    const object1: CollisionObject = createMockObject({
        x: 10,
        y: 10,
        r: 5,
    });
    const object2: CollisionObject = createMockObject({
        x: 5,
        y: 10,
        width: 5,
        height: 5,
    });

    t.truthy(doIntersect(object1, object2));
});

test('can find 2 bounding boxes intersect', t => {
    const object1: CollisionObject = createMockObject({
        x: 10,
        y: 10,
        width: 5,
        height: 5,
    });
    const object2: CollisionObject = createMockObject({
        x: 5,
        y: 10,
        width: 5,
        height: 5,
    });

    t.truthy(doIntersect(object1, object2));
});

test('can find bounding box intersects with Point', t => {
    const object1: CollisionObject = createMockObject({
        x: 10,
        y: 10,
    });
    const object2: CollisionObject = createMockObject({
        x: 5,
        y: 10,
        width: 5,
        height: 5,
    });

    t.truthy(doIntersect(object1, object2));
});

test('can find 2 points intersect', t => {
    const object1: CollisionObject = createMockObject({
        x: 10,
        y: 10,
    });
    const object2: CollisionObject = createMockObject({
        x: 10,
        y: 10,
    });

    t.truthy(doIntersect(object1, object2));
});

// This function assumes all objects fit within the default test bounds
function doIntersect(object1: CollisionObject, object2: CollisionObject): boolean {
    const quadTree: QuadTree = createQuadTree(bounds, 2);
    quadTree.add(object1);

    const results: Set<CollisionObject> = quadTree.query(object2.getBounds());
    return results.size > 0;
}
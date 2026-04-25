import { test, expect } from 'vitest';
import { BoundingBox, createQuadTree, QuadTree, Bound, Circle, QueryResult } from '../src';

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

test('can find 2 circles intersect', () => {
    const object1: Bound = ({
        x: 10,
        y: 10,
        r: 5,
    });
    const object2: Bound = ({
        x: 5,
        y: 10,
        r: 5,
    });

    const results = doIntersect(object1, object2);

    expect(results).toBeTruthy();
    expect([...results][0].mtv).toEqual({
        vector: {
            x: -5,
            y: 0,
        },
        direction: {
            x: -1,
            y: 0,
        },
        magnitude: 5,
    });
});

test('can find 2 circles intersect - circle contains circle', () => {
    const object1: Bound = ({
        x: 10,
        y: 10,
        r: 5,
    });
    const object2: Bound = ({
        x: 10,
        y: 10,
        r: 2,
    });

    expect(doIntersect(object1, object2)).toBeTruthy();
});

test('can find circle intersects with point', () => {
    const object1: Bound = ({
        x: 10,
        y: 10,
        r: 5,
    });
    const object2: Bound = ({
        x: 11,
        y: 12,
    });

    expect(doIntersect(object1, object2)).toBeTruthy();
});

test('can find circle intersects with bounding box', () => {
    const circle: Circle = ({
        x: 10,
        y: 10,
        r: 5,
    });
    const box: BoundingBox = ({
        x: 5,
        y: 10,
        width: 5,
        height: 5,
    });

    // query as box
    const resultsQueryAsBox = doIntersect(circle, box);

    // query as circle
    const resultsQueryAsCircle = doIntersect(box, circle);

    expect(resultsQueryAsBox).toBeTruthy();
    expect([...resultsQueryAsBox][0].mtv).toEqual({
        vector: {
            x: -0,
            y: 5,
        },
        direction: {
            x: -0,
            y: 1,
        },
        magnitude: 5,
    });

    expect(resultsQueryAsCircle).toBeTruthy();
    expect([...resultsQueryAsCircle][0].mtv).toEqual({
        vector: {
            x: 0,
            y: -5,
        },
        direction: {
            x: 0,
            y: -1,
        },
        magnitude: 5,
    });
});

test('can find circle intersects with bounding box - center of circle to closest bounding box point normal', () => {
    const circle: Circle = ({
        x: 10,
        y: 10,
        r: 5,
    });
    const box: BoundingBox = ({
        x: 12,
        y: 12,
        width: 5,
        height: 5,
    });

    const squareRootOfOneHalf = 0.7071067811865475;     // Math.sqrt(0.5)
    const expectedMagnitude = 2.171572875253812;        // 5 - 4 * squareRootOfOneHalf
    const expectedVectorComponent = 1.5355339059327389; // squareRootOfOneHalf * expectedMagnitude

    // query as box
    const resultsQueryAsBox = doIntersect(circle, box);

    // query as circle
    const resultsQueryAsCircle = doIntersect(box, circle);

    expect(resultsQueryAsBox).toBeTruthy();
    expect([...resultsQueryAsBox][0].mtv).toEqual({
        vector: {
            x: expectedVectorComponent,
            y: expectedVectorComponent
        },
        direction: {
            x: squareRootOfOneHalf,
            y: squareRootOfOneHalf,
        },
        magnitude: expectedMagnitude,
    });

    expect(resultsQueryAsCircle).toBeTruthy();
    expect([...resultsQueryAsCircle][0].mtv).toEqual({
        vector: {
            x: -expectedVectorComponent,
            y: -expectedVectorComponent,
        },
        direction: {
            x: -squareRootOfOneHalf,
            y: -squareRootOfOneHalf,
        },
        magnitude: expectedMagnitude,
    });
});

test('can find 2 bounding boxes intersect', () => {
    const object1: Bound = ({
        x: 10,
        y: 10,
        width: 5,
        height: 5,
    });
    const object2: Bound = ({
        x: 5,
        y: 10,
        width: 5,
        height: 5,
    });

    const results = doIntersect(object1, object2);

    expect(results).toBeTruthy();
    expect([...results][0].mtv).toEqual({
        vector: {
            x: -0,
            y: 0,
        },
        direction: {
            x: -1,
            y: 0,
        },
        magnitude: 0,
    });
});

test('can find bounding box intersects with Point', () => {
    const object1: Bound = ({
        x: 10,
        y: 10,
    });
    const object2: Bound = ({
        x: 5,
        y: 10,
        width: 5,
        height: 5,
    });

    expect(doIntersect(object1, object2)).toBeTruthy();
});

test('can find 2 points intersect', () => {
    const object1: Bound = ({
        x: 10,
        y: 10,
    });
    const object2: Bound = ({
        x: 10,
        y: 10,
    });

    expect(doIntersect(object1, object2)).toBeTruthy();
});

/**
 * This function assumes all objects fit within the default test bounds
 *
 * @param object1 Bound to add to tree
 * @param object2 Bound to query tree with
 * @returns query results using object or bound 2
 */
function doIntersect(object1: Bound, object2: Bound): Array<QueryResult<Bound>> {
    const quadTree: QuadTree = createQuadTree(bounds, 1);
    quadTree.add(object1);
    return quadTree.query(object2);
}

import { test, expect } from 'vitest';
import { QuadTree, BoundingBox, createQuadTree, Bound, QueryResult } from '../src';
import { createMockQuadTree } from './helpers/util';

test('can query the quad tree with bounds', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: Bound = ({
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    });

    quadTree.add(object);

    const results: Array<QueryResult<Bound>> = quadTree.query(quadTree.bounds);
    expect(results.length).toBe(1);
    expect([...results][0].mtv).toEqual({
        vector: {
            x: 0,
            y: 5,
        },
        direction: {
            x: 0,
            y: 1,
        },
        magnitude: 5,
    });
});

test('can query the quad tree with bounds - dont include current object in window', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: Bound = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };

    quadTree.add(object);

    const results: Array<QueryResult<Bound>> = quadTree.query(object);
    expect(results.length).toBe(0);
});

test('can query the quad tree with bounds - filter out current object in window', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: Bound = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };
    const copyObject: Bound = Object.assign({}, object);

    quadTree.add(object);
    quadTree.add(copyObject);

    const results: Array<QueryResult<Bound>> = quadTree.query(object);
    expect(results.length).toBe(1);
});

test('can query the quad tree with bounds - multi object 1 point (whole window bounds)', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object1: Bound = Object.assign({}, bounds);
    const object2: Bound = Object.assign({}, bounds);
    const object3: Bound = ({
        x: 2,
        y: 0,
        width: 2,
        height: 2,
    });

    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    const results: Array<QueryResult<Bound>> = quadTree.query(quadTree.bounds);
    expect(results.length).toBe(3);
});

test('can query the quad tree with bounds - single quadrant query window', () => {
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

    const results: Array<QueryResult<Bound>> = quadTree.query(queryBounds);
    expect(results.length).toBe(1);
});

test('can query the quad tree with bounds - single quadrant object bounding box overlap', () => {
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

    const results: Array<QueryResult<Bound>> = quadTree.query(quadTree.bounds);
    expect(results.length).toBe(2);
});

test('can query the quad tree with bounds - multi quadrant query window', () => {
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

    const results: Array<QueryResult<Bound>> = quadTree.query(quadTree.bounds);
    expect(results.length).toBe(2);
});

test('can query the quad tree with bounds - multi level', () => {
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

    const results: Array<QueryResult<Bound>> = quadTree.query(quadTree.bounds);
    expect(results.length).toBe(2);
});

test('can query the quad tree with bounds - self bounding box', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: Bound = ({
        x: 100,
        y: 100,
        width: 200,
        height: 200,
    });
    quadTree.add(object);

    const results: Array<QueryResult<Bound>> = quadTree.query(quadTree.bounds);
    expect(results.length).toBe(1);
});

test('can query the quad tree with bounds - self bounding box / multi-object', () => {
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
    quadTree.add(object2);

    const results: Array<QueryResult<Bound>> = quadTree.query(quadTree.bounds);
    expect(results.length).toBe(2);
});

test('can query the quad tree with bounds - square window, cross bucket bounds, multi object', () => {
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

    expect(quadTree.add(object1)).toBeTruthy();
    expect(quadTree.add(object2)).toBeTruthy();
    expect(quadTree.add(object3)).toBeTruthy();
    expect(quadTree.add(object4)).toBeTruthy();

    const results: Array<QueryResult<Bound>> = quadTree.query(queryWindow);

    expect(results.length).toBe(4);
});

test('can get data within bucket', () => {
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
    expect(results.length).toBe(3);
    expect(results.includes(object1)).toBeTruthy();
    expect(results.includes(object2)).toBeTruthy();
    expect(results.includes(object3)).toBeTruthy();
});

test('can get data within bucket - same point', () => {
    const quadTree: QuadTree = createMockQuadTree(5);
    const bounds: BoundingBox = {
        x: 100,
        y: 100,
        width: 200,
        height: 200,
    };
    const object1: Bound = Object.assign({}, bounds);
    const object2: Bound = Object.assign({}, bounds);
    const object3: Bound = Object.assign({}, bounds);
    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    const results: Bound[] = quadTree.getData();
    expect(results.length).toBe(3);
    expect(results.includes(object1)).toBeTruthy();
    expect(results.includes(object2)).toBeTruthy();
    expect(results.includes(object3)).toBeTruthy();
});

test('can get data within bucket - subdivided tree', () => {
    // capacity=1 forces subdivision after the first object
    const quadTree: QuadTree = createQuadTree({
        x: 0,
        y: 0,
        width: 200,
        height: 200,
    }, 1);
    const object1: Bound = { x: 10, y: 10, width: 5, height: 5 };  // NW quadrant
    const object2: Bound = { x: 150, y: 10, width: 5, height: 5 }; // NE quadrant
    const object3: Bound = { x: 10, y: 150, width: 5, height: 5 }; // SW quadrant

    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    const results: Bound[] = quadTree.getData();
    expect(results.length).toBe(3);
    expect(results.includes(object1)).toBeTruthy();
    expect(results.includes(object2)).toBeTruthy();
    expect(results.includes(object3)).toBeTruthy();
});

/**
 * Debating on adjusting this behavior, but will keep for now.
 * Not sure that touching should be considered a collision, but it has been being flagged
 * right now and the mtv can be used to detect this scenario.
 */
test('can query getting touching, but non-overlapping objects', () => {
    const quadTree: QuadTree = createMockQuadTree(5);
    const object1: Bound = ({
        x: 0,
        y: 0,
        width: 50,
        height: 50,
    });
    const object2: Bound = ({
        x: 50,
        y: 0,
        width: 50,
        height: 50,
    });
    const object3: Bound = ({
        x: 0,
        y: 50,
        width: 50,
        height: 50,
    });
    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    const results: Array<QueryResult<Bound>> = quadTree.query(object1);

    expect(results.length).toBe(2);
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
    expect([...results][1].mtv).toEqual({
        vector: {
            x: 0,
            y: -0,
        },
        direction: {
            x: 0,
            y: -1,
        },
        magnitude: 0,
    });
});

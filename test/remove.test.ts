import { test, expect } from 'vitest';
import { QuadTree, BoundingBox, Bound } from '../src';
import { createMockQuadTree } from './helpers/util';

test('can remove object added to quad tree', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: Bound = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };

    quadTree.add(object);
    quadTree.remove(object);

    expect(quadTree.data.length).toBe(0);
    expect(quadTree.quadrants.length).toBe(0);
});

test('can remove object at point with multiple objects', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };
    const object1: Bound = Object.assign({}, bounds);
    const object2: Bound = Object.assign({}, bounds);

    quadTree.add(object1);
    quadTree.add(object2);

    expect(quadTree.data.length).toBe(2);
    expect(quadTree.quadrants.length).toBe(0);
    expect(quadTree.data.includes(object1)).toBeTruthy();
    expect(quadTree.data.includes(object2)).toBeTruthy();

    quadTree.remove(object1);

    expect(quadTree.data.length).toBe(1);
    expect(quadTree.quadrants.length).toBe(0);
    expect(quadTree.data.includes(object1)).toBeFalsy();
    expect(quadTree.data.includes(object2)).toBeTruthy();

    quadTree.remove(object2);

    expect(quadTree.data.length).toBe(0);
    expect(quadTree.quadrants.length).toBe(0);
});

test('can remove object added to quad tree - no collapse after remove', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: Bound = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };
    const object2: Bound = {
        x: 100,
        y: 100,
        width: 5,
        height: 5,
    };

    quadTree.add(object1);
    quadTree.add(object2);

    expect(quadTree.data.length).toBe(0);
    expect(quadTree.quadrants.length).toBe(4);

    quadTree.remove(object1);

    // Tree stays subdivided — no collapse. Remaining object still findable.
    expect(quadTree.quadrants.length).toBe(4);
    const remaining = quadTree.getData();
    expect(remaining.length).toBe(1);
    expect(remaining.includes(object2)).toBe(true);
});

test('can remove object added to quad tree - no collapse after remove, higher capacity', () => {
    const quadTree: QuadTree = createMockQuadTree(2);
    const object1: Bound = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };
    const object2: Bound = {
        x: 100,
        y: 100,
        width: 5,
        height: 5,
    };
    const object3: Bound = {
        x: 200,
        y: 200,
        width: 5,
        height: 5,
    };

    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.add(object3);

    expect(quadTree.data.length).toBe(0);
    expect(quadTree.quadrants.length).toBe(4);

    quadTree.remove(object1);

    // Tree stays subdivided — no collapse. Remaining objects still findable.
    expect(quadTree.quadrants.length).toBe(4);
    const remaining = quadTree.getData();
    expect(remaining.length).toBe(2);
    expect(remaining.includes(object2)).toBe(true);
    expect(remaining.includes(object3)).toBe(true);
});

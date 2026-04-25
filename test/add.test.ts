import { test, expect } from 'vitest';
import { QuadTree, createQuadTree, BoundingBox, Bound } from '../src';
import { createMockQuadTree } from './helpers/util';

test('can add an object to quadtree', () => {
    const quadTree: QuadTree = createMockQuadTree();
    const object: Bound = {
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    };

    expect(quadTree.add(object)).toBeTruthy();
    expect(quadTree.data.length).toBe(1);
    expect(quadTree.quadrants.length).toBe(0);
});

test('can add an object to quadtree - can add objects up to capacity', () => {
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

    expect(quadTree.add(object1)).toBeTruthy();
    expect(quadTree.add(object2)).toBeTruthy();
    expect(quadTree.data.length).toBe(2);
    expect(quadTree.quadrants.length).toBe(0);
});

test('can add an object to quadtree - bucket overflow and split', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: Bound = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object2: Bound = {
        x: 450,
        y: 350,
        width: 5,
        height: 5,
    };

    expect(quadTree.add(object1)).toBeTruthy();
    expect(quadTree.add(object2)).toBeTruthy();
    expect(quadTree.data.length).toBe(0);
    expect(quadTree.quadrants.length).toBe(4);
    expect(quadTree.query(quadTree.bounds).length).toBe(2);
    // NW quadrant
    expect(quadTree.quadrants[0].data.length).toBe(1);
    expect(quadTree.quadrants[0].quadrants.length).toBe(0);
    // NE quadrant
    expect(quadTree.quadrants[1].data.length).toBe(0);
    expect(quadTree.quadrants[1].quadrants.length).toBe(0);
    // SW quadrant
    expect(quadTree.quadrants[2].data.length).toBe(0);
    expect(quadTree.quadrants[2].quadrants.length).toBe(0);
    // SE quadrant
    expect(quadTree.quadrants[3].data.length).toBe(1);
    expect(quadTree.quadrants[3].quadrants.length).toBe(0);
});

test('can add an object to quadtree - bucket overflow and split offset bucket', () => {
    const quadTree: QuadTree = createQuadTree({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
    }, 1);
    const object1: Bound = {
        x: 100,
        y: 150,
        width: 5,
        height: 5,
    };
    const object2: Bound = {
        x: 150,
        y: 150,
        width: 5,
        height: 5,
    };

    expect(quadTree.add(object1)).toBeTruthy();
    expect(quadTree.add(object2)).toBeTruthy();
});

test('can handle adding the same object twice', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object: Bound = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };

    quadTree.add(object);

    expect(quadTree.add(object)).toBeFalsy();
    expect(quadTree.data.length).toBe(1);
    expect(quadTree.quadrants.length).toBe(0);
});

test('can handle adding 2 objects that occupy the same originating point, capacity > 1', () => {
    const quadTree: QuadTree = createMockQuadTree(2);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const object1: Bound = Object.assign({}, bounds);
    const object2: Bound = Object.assign({}, bounds);

    quadTree.add(object1);

    expect(quadTree.add(object2)).toBeTruthy();
    expect(quadTree.data.length).toBe(2);
    expect(quadTree.data.includes(object1)).toBeTruthy();
    expect(quadTree.data.includes(object2)).toBeTruthy();
    expect(quadTree.quadrants.length).toBe(0);
});

test('can handle adding 2 objects that occupy the same originating point, capacity > 1 - bounds copied', () => {
    const quadTree: QuadTree = createMockQuadTree(2);
    const bounds: BoundingBox = {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    };
    const copyBounds: BoundingBox = Object.assign({}, { ...bounds });
    const object1: Bound = Object.assign({}, bounds);
    const object2: Bound = Object.assign({}, copyBounds);

    quadTree.add(object1);

    expect(quadTree.add(object2)).toBeTruthy();
    expect(quadTree.data.length).toBe(2);
    expect(quadTree.data.includes(object1)).toBeTruthy();
    expect(quadTree.data.includes(object2)).toBeTruthy();
    expect(quadTree.quadrants.length).toBe(0);
});

// blackhole scenario
test('can handle adding 2 objects that occupy the same originating point, capacity of 1', () => {
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

    expect(quadTree.add(object2)).toBeTruthy();
    expect(quadTree.data.length).toBe(2);
    expect(quadTree.quadrants.length).toBe(0);
});

test('can handle adding object directly on bucket boundary crossing', () => {
    const quadTree: QuadTree = createQuadTree({
        x: 0,
        y: 0,
        width: 200,
        height: 200,
    }, 1);
    const object1: Bound = {
        x: 175,
        y: 175,
        width: 5,
        height: 5,
    };
    const object2: Bound = {
        x: 100,
        y: 100,
        width: 5,
        height: 5,
    };

    expect(quadTree.add(object1)).toBeTruthy();
    expect(quadTree.add(object2)).toBeTruthy();

    expect(quadTree.data.length).toBe(0);
    expect(quadTree.quadrants.length).toBe(4);

    const results = quadTree.query(quadTree.bounds);

    expect(results.length).toBe(2);
});

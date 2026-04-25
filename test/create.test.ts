import { test, expect } from 'vitest';
import { QuadTree } from '../src';
import { createMockQuadTree } from './helpers/util';

test('can create quad tree', () => {
    const quadTree: QuadTree = createMockQuadTree();

    expect(!!quadTree).toBeTruthy();
    expect(quadTree.bounds).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
    });
    expect(quadTree.capacity).toBe(5);
    expect(quadTree.data.length).toBe(0);
    expect(Array.isArray(quadTree.quadrants)).toBeTruthy();
    expect(quadTree.quadrants.length).toBe(0);
});

test('can create quad tree - setting bucket capacity', () => {
    const capacity: number = 15;
    const quadTree: QuadTree = createMockQuadTree(capacity);

    expect(!!quadTree).toBeTruthy();
    expect(quadTree.capacity).toBe(capacity);
});

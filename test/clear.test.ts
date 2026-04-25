import { test, expect } from 'vitest';
import { QuadTree, Bound } from '../src';
import { createMockQuadTree } from './helpers/util';

test('can clear the quad tree', () => {
    const quadTree: QuadTree = createMockQuadTree(1);
    const object1: Bound = ({
        x: 0,
        y: 0,
        width: 5,
        height: 5,
    });
    const object2: Bound = ({
        x: 100,
        y: 100,
        width: 5,
        height: 5,
    });
    quadTree.add(object1);
    quadTree.add(object2);
    quadTree.clear();

    expect(quadTree.data.length).toBe(0);
    expect(quadTree.quadrants.length).toBe(0);
});

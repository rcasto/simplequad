import { test, expect } from 'vitest';
import { createMockQuadTree } from './helpers/util';
import { Bound } from '../src';

const box = (x: number, y: number): Bound => ({ x, y, width: 10, height: 10 });

test('move returns false when object is not in tree', () => {
    const tree = createMockQuadTree();
    const obj = box(10, 10);
    expect(tree.move(obj, (o) => { (o as any).x = 50; })).toBe(false);
});

test('move returns true and repositions the object', () => {
    const tree = createMockQuadTree();
    const obj: Bound & { x: number; y: number } = { x: 10, y: 10, width: 10, height: 10 };
    tree.add(obj);

    const result = tree.move(obj, (o) => {
        (o as typeof obj).x = 200;
        (o as typeof obj).y = 200;
    });

    expect(result).toBe(true);
    expect(tree.contains(obj)).toBe(true);
    // should find it at new position
    const hits = tree.query({ x: 195, y: 195, width: 20, height: 20 });
    expect(hits.some(r => r.object === obj)).toBe(true);
});

test('move: object is only at new position after move', () => {
    const tree = createMockQuadTree();
    const obj: Bound & { x: number; y: number } = { x: 10, y: 10, width: 10, height: 10 };
    tree.add(obj);

    tree.move(obj, (o) => {
        (o as typeof obj).x = 400;
        (o as typeof obj).y = 400;
    });

    // old position — no hit
    const oldHits = tree.query({ x: 10, y: 10, width: 10, height: 10 });
    expect(oldHits.some(r => r.object === obj)).toBe(false);
});

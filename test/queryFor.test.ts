import { test, expect } from 'vitest';
import { createQuadTree } from '../src';
import { Bound, BoundingBox } from '../src';

const bounds: BoundingBox = { x: 0, y: 0, width: 800, height: 600 };
const box = (x: number, y: number): Bound => ({ x, y, width: 10, height: 10 });

test('queryFor with no extractor behaves like query — excludes self', () => {
    const tree = createQuadTree<Bound>(bounds);
    const obj = box(10, 10);
    const neighbor = box(15, 15);
    tree.add(obj);
    tree.add(neighbor);

    const results = tree.queryFor(obj);
    expect(results.every(r => r.object !== obj)).toBe(true);
    expect(results.some(r => r.object === neighbor)).toBe(true);
});

test('queryFor with extractor excludes the queried object by reference', () => {
    interface Sprite { id: number; x: number; y: number; width: number; height: number; }
    const extractor = (s: Sprite): Bound => ({ x: s.x, y: s.y, width: s.width, height: s.height });
    const tree = createQuadTree<Sprite>(bounds, { extractor });

    const a: Sprite = { id: 1, x: 10, y: 10, width: 10, height: 10 };
    const b: Sprite = { id: 2, x: 15, y: 15, width: 10, height: 10 };
    tree.add(a);
    tree.add(b);

    const results = tree.queryFor(a);
    expect(results.every(r => r.object !== a)).toBe(true);
    expect(results.some(r => r.object === b)).toBe(true);
});

test('queryFor returns empty when no neighbors', () => {
    const tree = createQuadTree<Bound>(bounds);
    const obj = box(10, 10);
    tree.add(obj);

    const results = tree.queryFor(obj);
    expect(results.length).toBe(0);
});

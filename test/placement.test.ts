import { test, expect } from 'vitest';
import { QuadTree, BoundingBox, Bound, QueryResult, createQuadTree } from '../src';

// All tests use a 200x200 tree that subdivides into four 100x100 quadrants:
//   NW: [0,100) x [0,100)    NE: [100,200] x [0,100)
//   SW: [0,100) x [100,200]  SE: [100,200] x [100,200]
function makeSmallTree(capacity = 1): QuadTree {
    return createQuadTree({ x: 0, y: 0, width: 200, height: 200 }, capacity);
}

// Forces subdivision: adds a small anchor in NW, then a spanning object, triggering the split.
function addAndSplit(tree: QuadTree, spanning: Bound): void {
    tree.add({ x: 10, y: 10, width: 5, height: 5 } as Bound);
    tree.add(spanning);
}

// ─── add: multi-quadrant placement ───────────────────────────────────────────

test('placement: large AABB spanning all quadrants is findable via SE-only query', () => {
    const tree = makeSmallTree();
    // origin (50,50) is in NW; bounds [50,150]x[50,150] cross all four quadrants
    const largeObj: Bound = { x: 50, y: 50, width: 100, height: 100 };
    addAndSplit(tree, largeObj);

    // query window sits entirely within SE quadrant — should still find largeObj
    const seWindow: BoundingBox = { x: 110, y: 110, width: 20, height: 20 };
    const results: Array<QueryResult<Bound>> = tree.query(seWindow);

    expect(results.length).toBe(1);
    expect(results[0].object).toBe(largeObj);
});

test('placement: large AABB spanning NW+NE is findable via NE-only query', () => {
    const tree = makeSmallTree();
    // origin (80,10) is in NW; right edge at x=120 crosses into NE
    const largeObj: Bound = { x: 80, y: 10, width: 40, height: 5 };
    addAndSplit(tree, largeObj);

    // query window sits entirely within NE — should find largeObj
    const neWindow: BoundingBox = { x: 105, y: 5, width: 20, height: 20 };
    const results: Array<QueryResult<Bound>> = tree.query(neWindow);

    expect(results.length).toBe(1);
    expect(results[0].object).toBe(largeObj);
});

test('placement: large AABB spanning NW+SW is findable via SW-only query', () => {
    const tree = makeSmallTree();
    // origin (10,80) is in NW; bottom edge at y=120 crosses into SW
    const largeObj: Bound = { x: 10, y: 80, width: 5, height: 40 };
    addAndSplit(tree, largeObj);

    // query window sits entirely within SW
    const swWindow: BoundingBox = { x: 5, y: 110, width: 20, height: 20 };
    const results: Array<QueryResult<Bound>> = tree.query(swWindow);

    expect(results.length).toBe(1);
    expect(results[0].object).toBe(largeObj);
});

// ─── query: deduplication ────────────────────────────────────────────────────

test('placement: full-tree query returns spanning object exactly once (no duplicates)', () => {
    const tree = makeSmallTree();
    const anchor: Bound = { x: 10, y: 10, width: 5, height: 5 };
    const largeObj: Bound = { x: 50, y: 50, width: 100, height: 100 };
    tree.add(anchor);
    tree.add(largeObj);

    const results: Array<QueryResult<Bound>> = tree.query(tree.bounds);
    const objects = results.map(r => r.object);

    // both objects must appear, but neither more than once
    expect(results.length).toBe(2);
    expect(objects.filter(o => o === largeObj).length).toBe(1);
    expect(objects.filter(o => o === anchor).length).toBe(1);
});

// ─── remove: all quadrants cleared ───────────────────────────────────────────

test('placement: removing a spanning object removes it from all quadrants', () => {
    const tree = makeSmallTree();
    const anchor: Bound = { x: 10, y: 10, width: 5, height: 5 };
    const largeObj: Bound = { x: 50, y: 50, width: 100, height: 100 };
    tree.add(anchor);
    tree.add(largeObj);

    const removed = tree.remove(largeObj);
    expect(removed).toBe(true);

    const results: Array<QueryResult<Bound>> = tree.query(tree.bounds);
    expect(results.length).toBe(1);
    expect(results[0].object).toBe(anchor);
});

test('placement: removing a spanning object leaves it unfindable from any quadrant', () => {
    const tree = makeSmallTree();
    const anchor: Bound = { x: 10, y: 10, width: 5, height: 5 };
    const largeObj: Bound = { x: 50, y: 50, width: 100, height: 100 };
    tree.add(anchor);
    tree.add(largeObj);
    tree.remove(largeObj);

    const seWindow: BoundingBox = { x: 110, y: 110, width: 20, height: 20 };
    const neWindow: BoundingBox = { x: 110, y: 10, width: 20, height: 20 };
    const swWindow: BoundingBox = { x: 10, y: 110, width: 20, height: 20 };

    expect(tree.query(seWindow).length).toBe(0);
    expect(tree.query(neWindow).length).toBe(0);
    expect(tree.query(swWindow).length).toBe(0);
});

import { test, expect } from 'vitest';
import { createQuadTree, create, BoundingBox, Bound } from '../src';

interface Sprite {
    name: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
}

const treeBounds: BoundingBox = { x: 0, y: 0, width: 800, height: 600 };

function spriteExtractor(sprite: Sprite): Bound {
    return {
        x: sprite.position.x,
        y: sprite.position.y,
        width: sprite.size.width,
        height: sprite.size.height,
    };
}

function makeSprite(x: number, y: number, w = 10, h = 10): Sprite {
    return { name: `sprite@(${x},${y})`, position: { x, y }, size: { width: w, height: h } };
}

test('can create tree with extractor', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    expect(!!tree).toBeTruthy();
    expect(tree.capacity).toBe(5);
    expect(tree.data.length).toBe(0);
});

test('create alias works with extractor', () => {
    const tree = create<Sprite>(treeBounds, { extractor: spriteExtractor });
    expect(!!tree).toBeTruthy();
});

test('create alias works without extractor (backwards compatible)', () => {
    const tree = create(treeBounds);
    expect(!!tree).toBeTruthy();
    expect(tree.capacity).toBe(5);
});

test('extractor - can add non-Bound objects', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    const sprite = makeSprite(100, 100);
    expect(tree.add(sprite)).toBeTruthy();
    expect(tree.data.length).toBe(1);
});

test('extractor - add returns false when object is outside tree bounds', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    const sprite = makeSprite(900, 700);
    expect(tree.add(sprite)).toBeFalsy();
});

test('extractor - deduplication: adding same object twice returns false', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    const sprite = makeSprite(100, 100);
    tree.add(sprite);
    expect(tree.add(sprite)).toBeFalsy();
    expect(tree.data.length).toBe(1);
});

test('extractor - can remove added object', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    const sprite = makeSprite(100, 100);
    tree.add(sprite);
    expect(tree.remove(sprite)).toBeTruthy();
    expect(tree.data.length).toBe(0);
});

test('extractor - remove returns false for object not in tree', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    const sprite = makeSprite(100, 100);
    expect(tree.remove(sprite)).toBeFalsy();
});

test('extractor - getData returns added objects', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    const s1 = makeSprite(100, 100);
    const s2 = makeSprite(400, 300);
    tree.add(s1);
    tree.add(s2);
    const data = tree.getData();
    expect(data.length).toBe(2);
    expect(data).toContain(s1);
    expect(data).toContain(s2);
});

test('extractor - query finds intersecting objects', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    const s1 = makeSprite(100, 100, 20, 20);
    const s2 = makeSprite(400, 300, 20, 20);
    tree.add(s1);
    tree.add(s2);
    // query at s1's position
    const hits = tree.query({ x: 100, y: 100, width: 20, height: 20 });
    const hitObjects = hits.map(h => h.object);
    expect(hitObjects).toContain(s1);
    expect(hitObjects).not.toContain(s2);
});

test('extractor - query returns MTV', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    const sprite = makeSprite(100, 100, 20, 20);
    tree.add(sprite);
    const hits = tree.query({ x: 105, y: 105, width: 20, height: 20 });
    expect(hits.length).toBeGreaterThan(0);
    const [hit] = hits;
    expect(hit.object).toBe(sprite);
    expect(hit.mtv.magnitude).toBeGreaterThan(0);
});

test('extractor - tree subdivides correctly with non-Bound objects', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor, capacity: 1 });
    const s1 = makeSprite(10, 10);
    const s2 = makeSprite(600, 400);
    tree.add(s1);
    tree.add(s2);
    expect(tree.quadrants.length).toBe(4);
    const all = tree.getData();
    expect(all.length).toBe(2);
});

test('extractor - capacity option is respected', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor, capacity: 10 });
    expect(tree.capacity).toBe(10);
});

test('extractor - clear removes all objects', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    tree.add(makeSprite(100, 100));
    tree.add(makeSprite(200, 200));
    tree.clear();
    expect(tree.data.length).toBe(0);
    expect(tree.getData().length).toBe(0);
});

test('extractor - query(bound) works as area query', () => {
    const tree = createQuadTree<Sprite>(treeBounds, { extractor: spriteExtractor });
    const s1 = makeSprite(100, 100, 20, 20);
    const s2 = makeSprite(400, 300, 20, 20);
    tree.add(s1);
    tree.add(s2);
    // Plain Bound with x/y: treated as area query, both sprites may be found if they overlap
    const hits = tree.query({ x: 100, y: 100, width: 20, height: 20 });
    const hitObjects = hits.map(h => h.object);
    expect(hitObjects).toContain(s1); // area query includes the overlapping sprite
    expect(hitObjects).not.toContain(s2);
});

test('createQuadTree - options object without extractor (T extends Bound)', () => {
    const tree = createQuadTree({ x: 0, y: 0, width: 800, height: 600 }, { capacity: 3, maxDepth: 5 });
    expect(tree.capacity).toBe(3);
    expect(tree.maxDepth).toBe(5);
});


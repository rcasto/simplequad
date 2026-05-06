import { test, expect } from 'vitest';
import { createMockQuadTree } from './helpers/util';
import { Bound } from '../src';

const box = (x: number, y: number): Bound => ({ x, y, width: 10, height: 10 });

test('contains returns false for empty tree', () => {
    const tree = createMockQuadTree();
    expect(tree.contains(box(10, 10))).toBe(false);
});

test('contains returns true for added object', () => {
    const tree = createMockQuadTree();
    const obj = box(10, 10);
    tree.add(obj);
    expect(tree.contains(obj)).toBe(true);
});

test('contains returns false after remove', () => {
    const tree = createMockQuadTree();
    const obj = box(10, 10);
    tree.add(obj);
    tree.remove(obj);
    expect(tree.contains(obj)).toBe(false);
});

test('contains uses reference equality, not value equality', () => {
    const tree = createMockQuadTree();
    const obj = box(10, 10);
    const copy = box(10, 10);
    tree.add(obj);
    expect(tree.contains(obj)).toBe(true);
    expect(tree.contains(copy)).toBe(false);
});

test('contains finds object after subdivision', () => {
    const tree = createMockQuadTree(1);
    const a = box(10, 10);
    const b = box(50, 50);
    const c = box(200, 200);
    tree.add(a);
    tree.add(b);
    tree.add(c);
    expect(tree.contains(a)).toBe(true);
    expect(tree.contains(b)).toBe(true);
    expect(tree.contains(c)).toBe(true);
});

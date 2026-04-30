import { test, expect } from "vitest";
import { QuadTree, BoundingBox, Bound, createQuadTree } from "../src";
import { createMockQuadTree } from "./helpers/util";

test("queryBroad returns objects that overlap the query region", () => {
  const tree: QuadTree = createMockQuadTree(5);
  const obj: Bound = { x: 0, y: 0, width: 50, height: 50 };
  tree.add(obj);

  const results = tree.queryBroad(tree.bounds);
  expect(results.length).toBe(1);
  expect(results[0].object).toBe(obj);
});

test("queryBroad excludes the same reference when querying", () => {
  const tree: QuadTree = createMockQuadTree(5);
  const obj: Bound = { x: 0, y: 0, width: 50, height: 50 };
  tree.add(obj);

  const results = tree.queryBroad(obj);
  expect(results.length).toBe(0);
});

test("queryBroad returns objects minus self, same shape", () => {
  const tree: QuadTree = createMockQuadTree(5);
  const obj: Bound = { x: 0, y: 0, width: 50, height: 50 };
  const obj2: Bound = { ...obj };
  tree.add(obj);
  tree.add(obj2);

  const results = tree.queryBroad(obj);
  expect(results.length).toBe(1);
  expect(results[0].object).toBe(obj2);
});

test("queryBroad excludes objects outside query region", () => {
  const tree: QuadTree = createMockQuadTree(5);
  const inside: Bound = { x: 450, y: 350, width: 10, height: 10 };
  const outside: Bound = { x: 0, y: 0, width: 10, height: 10 };
  tree.add(inside);
  tree.add(outside);

  const queryRegion: BoundingBox = { x: 400, y: 300, width: 400, height: 300 };
  const results = tree.queryBroad(queryRegion);
  expect(results.length).toBe(1);
  expect(results[0].object).toBe(inside);
});

test("queryBroad deduplicates objects that span multiple quadrants", () => {
  const tree = createQuadTree<Bound>(
    { x: 0, y: 0, width: 200, height: 200 },
    1,
  );
  // Large object that spans all quadrants once tree subdivides
  const large: Bound = { x: 50, y: 50, width: 100, height: 100 };
  const small: Bound = { x: 10, y: 10, width: 5, height: 5 };
  tree.add(small);
  tree.add(large);

  const results = tree.queryBroad(tree.bounds);
  expect(results.length).toBe(2);
});

test("queryBroad results are T[] with no mtv property", () => {
  const tree: QuadTree = createMockQuadTree(5);
  const obj: Bound = { x: 0, y: 0, width: 50, height: 50 };
  tree.add(obj);

  const results = tree.queryBroad(tree.bounds);
  expect(results.length).toBe(1);
  // queryBroad returns T[], not QueryResult<T>[] — no mtv
  expect((results[0] as any).mtv).toBeUndefined();
});

test("queryBroad works with circle bounds", () => {
  const tree: QuadTree = createMockQuadTree(5);
  const circle: Bound = { x: 100, y: 100, r: 20 };
  const box: Bound = { x: 80, y: 80, width: 20, height: 20 };
  tree.add(circle);
  tree.add(box);

  // Query with a region covering both
  const region: BoundingBox = { x: 0, y: 0, width: 200, height: 200 };
  const results = tree.queryBroad(region);
  expect(results.length).toBe(2);
});

test("queryBroad with a circle query region does not include non-overlapping objects", () => {
  const tree: QuadTree = createMockQuadTree(5);
  const nearby: Bound = { x: 100, y: 100, width: 10, height: 10 };
  const farAway: Bound = { x: 700, y: 500, width: 10, height: 10 };
  tree.add(nearby);
  tree.add(farAway);

  // Circle centered at 100,100 with r=50 — farAway is well outside
  const circleQuery: Bound = { x: 100, y: 100, r: 50 };
  const results = tree.queryBroad(circleQuery);
  expect(results.length).toBe(1);
  expect(results[0].object).toBe(nearby);
});

test("queryBroad returns same set as query for overlapping objects", () => {
  const tree: QuadTree = createMockQuadTree(5);
  const obj1: Bound = { x: 0, y: 0, width: 50, height: 50 };
  const obj2: Bound = { x: 30, y: 30, width: 50, height: 50 };
  const obj3: Bound = { x: 500, y: 400, width: 20, height: 20 };
  tree.add(obj1);
  tree.add(obj2);
  tree.add(obj3);

  const queryRegion: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
  const broadResults = tree.queryBroad(queryRegion);
  const fullResults = tree.query(queryRegion);

  const broadObjects = new Set(broadResults.map((r) => r.object));
  const fullObjects = new Set(fullResults.map((r) => r.object));
  expect(broadObjects).toEqual(fullObjects);
});

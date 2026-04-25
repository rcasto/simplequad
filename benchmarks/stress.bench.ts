import { createQuadTree } from '../src';
import { bench, printHeader, printResult, printSectionHeader } from './bench';
import { TREE_BOUNDS, makeBox, makeCircle, makePoint, makeRandomBoxes } from './helpers';

// Stress tests covering pathological inputs and edge cases that the happy-path
// benchmarks won't surface.

export function runStressBenchmarks(rng: () => number = Math.random): void {
    printHeader('STRESS — pathological inputs and edge cases');

    // All objects at the exact same (x, y).
    // These go into the same Set in the data Map — no subdivision occurs.
    // Query has to run SAT against all n objects in one leaf node.
    printSectionHeader('All objects at same point (x=100, y=100) — no subdivision, but O(n) query');
    for (const n of [50, 200, 500, 1000]) {
        const objects = Array.from({ length: n }, () => makeBox(100, 100, 10, 10));
        const tree = createQuadTree(TREE_BOUNDS, 5);
        objects.forEach(o => tree.add(o));
        const queryWindow = makeBox(95, 95, 20, 20);

        const result = bench(`query n=${n} co-located objects`, () => {
            tree.query(queryWindow);
        }, { iterations: 2000, warmupIterations: 100 });
        printResult(result);
    }

    // Objects clustered in a small region — forces deep subdivision.
    // Tests the depth/capacity tradeoff under spatial density.
    printSectionHeader('Dense cluster in center (5% of area, 200 objects) — deep tree');
    const clusterBounds = makeBox(360, 270, 40, 30); // 5% of 800x600
    const clusteredObjects = Array.from({ length: 200 }, (_, i) => makeBox(
        360 + (i % 20) * 2,
        270 + Math.floor(i / 20) * 3,
        5, 5,
    ));
    const clusterTree = createQuadTree(TREE_BOUNDS, 5);
    clusteredObjects.forEach(o => clusterTree.add(o));
    const clusterQueryWindow = makeBox(360, 270, 40, 30);

    const clusterQueryResult = bench('query inside dense cluster (200 objects)', () => {
        clusterTree.query(clusterQueryWindow);
    }, { iterations: 2000, warmupIterations: 100 });
    printResult(clusterQueryResult);

    const clusterAddResult = bench('add 200 clustered objects (forces deep tree)', () => {
        const tree = createQuadTree(TREE_BOUNDS, 5);
        for (let i = 0; i < 200; i++) tree.add(clusteredObjects[i]);
    }, { iterations: 200, warmupIterations: 20 });
    printResult(clusterAddResult);

    // Maximum tree depth: capacity=1 means every second unique-position object splits a node.
    // Tests how expensive insert becomes when the tree is maximally deep.
    printSectionHeader('Capacity=1 (maximum tree depth) vs capacity=5 at n=200');
    const objects200 = makeRandomBoxes(200, TREE_BOUNDS, rng);
    const cap1Result = bench('add 200 objects, capacity=1', () => {
        const tree = createQuadTree(TREE_BOUNDS, 1);
        for (let i = 0; i < 200; i++) tree.add(objects200[i]);
    }, { iterations: 200, warmupIterations: 20 });
    printResult(cap1Result);

    const cap5Result = bench('add 200 objects, capacity=5', () => {
        const tree = createQuadTree(TREE_BOUNDS, 5);
        for (let i = 0; i < 200; i++) tree.add(objects200[i]);
    }, { iterations: 200, warmupIterations: 20 });
    printResult(cap5Result);

    // Objects near quadrant boundaries — tests whether objects on the boundary
    // between NW/NE or NW/SW quadrants are placed and queried correctly.
    printSectionHeader('Objects straddling quadrant boundaries (x=400 or y=300 in 800x600 tree)');
    const boundaryObjects = [
        makeBox(396, 100, 10, 10),  // straddles NW/NE horizontal boundary
        makeBox(100, 296, 10, 10),  // straddles NW/SW vertical boundary
        makeBox(396, 296, 10, 10),  // straddles all 4 quadrants
        makeBox(396, 296, 200, 200),// large box spanning NE + SE + beyond
    ];
    const boundaryTree = createQuadTree(TREE_BOUNDS, 1);
    const addedCount = boundaryObjects.filter(o => boundaryTree.add(o)).length;
    console.log(`\n  Boundary objects added: ${addedCount}/${boundaryObjects.length}`);

    const boundaryQueryFull = boundaryTree.query(TREE_BOUNDS);
    console.log(`  Objects found via full-bounds query: ${boundaryQueryFull.length}/${boundaryObjects.length}`);
    console.log(`  Note: any shortfall here exposes the origin-point placement bug.`);

    const boundaryQueryNE = boundaryTree.query(makeBox(400, 0, 400, 300));
    const boundaryQuerySE = boundaryTree.query(makeBox(400, 300, 400, 300));
    console.log(`  Objects found in NE quadrant only: ${boundaryQueryNE.length}`);
    console.log(`  Objects found in SE quadrant only: ${boundaryQuerySE.length}`);

    // Mixed shape SAT overhead: circle-vs-box is more expensive than box-vs-box
    // because it requires the extra closestPoint computation.
    printSectionHeader('SAT overhead: box-vs-box vs circle-vs-box query');
    const boxObjects = makeRandomBoxes(100, TREE_BOUNDS, rng);
    const circleObjects = Array.from({ length: 100 }, (_, i) =>
        makeCircle(50 + (i % 10) * 70, 50 + Math.floor(i / 10) * 50, 8)
    );
    const boxTree = createQuadTree(TREE_BOUNDS, 5);
    boxObjects.forEach(o => boxTree.add(o));
    const circleTree = createQuadTree(TREE_BOUNDS, 5);
    circleObjects.forEach(o => circleTree.add(o));

    const queryWindow100 = makeBox(200, 150, 400, 300);

    const boxQueryResult = bench('query 100 AABB objects (box-vs-box SAT)', () => {
        boxTree.query(queryWindow100);
    }, { iterations: 5000, warmupIterations: 200 });
    printResult(boxQueryResult);

    const circleQueryResult = bench('query 100 Circle objects (box-vs-circle SAT)', () => {
        circleTree.query(queryWindow100);
    }, { iterations: 5000, warmupIterations: 200 });
    printResult(circleQueryResult);

    // Rapid remove-all stress: each remove is O(1) amortized after collapse scan was removed
    printSectionHeader('Remove-all cost scaling — O(n) total, ~2–4μs per remove regardless of n');
    for (const n of [25, 50, 100, 200]) {
        const objects = makeRandomBoxes(n, TREE_BOUNDS, rng);
        const start = performance.now();
        const iters = 20;
        for (let iter = 0; iter < iters; iter++) {
            const tree = createQuadTree(TREE_BOUNDS, 5);
            objects.forEach(o => tree.add(o));
            for (let i = n - 1; i >= 0; i--) tree.remove(objects[i]);
        }
        const avgMs = (performance.now() - start) / iters;
        const perRemoveMs = avgMs / n;
        console.log(`  remove-all n=${String(n).padEnd(4)}   total avg ${avgMs.toFixed(2)}ms   per-remove ${(perRemoveMs * 1000).toFixed(1)}μs`);
    }
}

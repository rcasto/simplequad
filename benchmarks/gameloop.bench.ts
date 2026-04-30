import { createQuadTree } from '../src';
import { averageResults, bench, printHeader, printResult, printSectionHeader } from './bench';
import { TREE_BOUNDS, makeRandomBoxes, seededRandom } from './helpers';

// Simulates the most common dynamic-scene usage pattern:
//   each "frame" — clear the tree, re-add all objects, query each object
// This is how most game devs use a quadtree when objects move every frame.

export function runGameloopBenchmarks(seeds: number[]): void {
    printHeader(`GAME LOOP — simulated frame: clear → add all → query each object (averaged across ${seeds.length} seeds)`);

    printSectionHeader('Full frame cost at varying object counts');
    for (const n of [25, 50, 100, 200, 400, 750, 1000]) {
        const results = seeds.map(seed => {
            const objects = makeRandomBoxes(n, TREE_BOUNDS, seededRandom(seed));
            const tree = createQuadTree(TREE_BOUNDS, 5);
            return bench(`frame with n=${n} AABB objects`, () => {
                tree.clear();
                for (let i = 0; i < n; i++) tree.add(objects[i]);
                for (let i = 0; i < n; i++) tree.query(objects[i]);
            }, { iterations: 500, warmupIterations: 50 });
        });
        printResult(averageResults(results));
    }

    printSectionHeader('Frame budget check — can we hit 60fps (16.7ms/frame)?');
    const budgetMs = 16.7;
    console.log(`\n  Target: <${budgetMs}ms per frame for 60fps`);
    for (const n of [25, 50, 100, 150, 200, 300, 400, 500, 750, 1000]) {
        const results = seeds.map(seed => {
            const objects = makeRandomBoxes(n, TREE_BOUNDS, seededRandom(seed));
            const tree = createQuadTree(TREE_BOUNDS, 5);
            return bench(`n=${n}`, () => {
                tree.clear();
                for (let i = 0; i < n; i++) tree.add(objects[i]);
                for (let i = 0; i < n; i++) tree.query(objects[i]);
            }, { iterations: 200, warmupIterations: 30 });
        });

        const result = averageResults(results);
        const withinBudget = result.avgMs <= budgetMs;
        const budgetUsed = ((result.avgMs / budgetMs) * 100).toFixed(1);
        const fmtMs = (ms: number) => ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(3)}ms`;
        const marker = withinBudget ? '✓' : '✗';
        console.log(`  ${marker}  n=${String(n).padEnd(4)}  avg ${result.avgMs.toFixed(3)}ms   p95 ${fmtMs(result.p95Ms)}   (${budgetUsed}% of 16.7ms frame budget)`);
    }

    // Capacity effect and rebuild sections use a single seed since they test structural
    // behavior rather than spatial variance.
    const rng = seededRandom(seeds[0]);

    printSectionHeader('Capacity effect on frame cost at n=100');
    const objects100 = makeRandomBoxes(100, TREE_BOUNDS, rng);
    for (const cap of [1, 2, 5, 10, 25]) {
        const tree = createQuadTree(TREE_BOUNDS, cap);
        const result = bench(`frame n=100, capacity=${cap}`, () => {
            tree.clear();
            for (let i = 0; i < 100; i++) tree.add(objects100[i]);
            for (let i = 0; i < 100; i++) tree.query(objects100[i]);
        }, { iterations: 500, warmupIterations: 50 });
        printResult(result);
    }

    printSectionHeader('Add-only cost (clear + re-add, no query) — isolates _posKeys path');
    for (const n of [100, 200, 400, 750, 1000]) {
        const results = seeds.map(seed => {
            const objects = makeRandomBoxes(n, TREE_BOUNDS, seededRandom(seed));
            const tree = createQuadTree(TREE_BOUNDS, 5);
            return bench(`clear+add n=${n}`, () => {
                tree.clear();
                for (let i = 0; i < n; i++) tree.add(objects[i]);
            }, { iterations: 500, warmupIterations: 50 });
        });
        printResult(averageResults(results));
    }

    printSectionHeader('Rebuild-from-scratch vs clear+re-add at n=100');
    const objects100b = makeRandomBoxes(100, TREE_BOUNDS, rng);
    const existingTree = createQuadTree(TREE_BOUNDS, 5);
    objects100b.forEach(o => existingTree.add(o));

    const rebuildResult = bench('clear + re-add 100 objects', () => {
        existingTree.clear();
        for (let i = 0; i < 100; i++) existingTree.add(objects100b[i]);
    }, { iterations: 1000, warmupIterations: 100 });
    printResult(rebuildResult);

    const freshResult = bench('create new tree + add 100 objects', () => {
        const tree = createQuadTree(TREE_BOUNDS, 5);
        for (let i = 0; i < 100; i++) tree.add(objects100b[i]);
    }, { iterations: 1000, warmupIterations: 100 });
    printResult(freshResult);
}

import { createQuadTree } from '../src';
import { bench, printHeader, printResult, printSectionHeader } from './bench';
import { TREE_BOUNDS, makeRandomBoxes, makeRandomMixedBounds } from './helpers';

export function runInsertBenchmarks(): void {
    printHeader('INSERT — throughput at varying population sizes and capacities');

    printSectionHeader('AABB objects, default capacity (5)');
    for (const n of [50, 200, 500, 1000, 2000]) {
        const objects = makeRandomBoxes(n);
        const result = bench(`add ${n} AABB objects`, () => {
            const tree = createQuadTree(TREE_BOUNDS, 5);
            for (let i = 0; i < n; i++) tree.add(objects[i]);
        }, { iterations: 200, warmupIterations: 20 });
        printResult(result);
    }

    printSectionHeader('AABB objects — capacity comparison at n=500');
    const objects500 = makeRandomBoxes(500);
    for (const cap of [1, 2, 5, 10, 25, 50]) {
        const result = bench(`add 500 objects, capacity=${cap}`, () => {
            const tree = createQuadTree(TREE_BOUNDS, cap);
            for (let i = 0; i < 500; i++) tree.add(objects500[i]);
        }, { iterations: 200, warmupIterations: 20 });
        printResult(result);
    }

    printSectionHeader('Mixed shapes (AABB + Circle + Point), n=500, capacity=5');
    const mixedObjects = makeRandomMixedBounds(500);
    const result = bench('add 500 mixed-shape objects', () => {
        const tree = createQuadTree(TREE_BOUNDS, 5);
        for (let i = 0; i < 500; i++) tree.add(mixedObjects[i]);
    }, { iterations: 200, warmupIterations: 20 });
    printResult(result);
}

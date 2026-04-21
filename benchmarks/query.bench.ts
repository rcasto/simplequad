import { createQuadTree, QuadTree, Bound } from '../src';
import { bench, printHeader, printResult, printSectionHeader } from './bench';
import { TREE_BOUNDS, makeRandomBoxes, makeRandomMixedBounds, makeBox } from './helpers';

function buildTree(objects: Bound[], capacity = 5): QuadTree {
    const tree = createQuadTree(TREE_BOUNDS, capacity);
    objects.forEach(o => tree.add(o));
    return tree;
}

export function runQueryBenchmarks(): void {
    printHeader('QUERY — time per query call at varying population and window sizes');

    printSectionHeader('Single object query vs tree population (small query window ~1% of area)');
    const smallWindow = makeBox(390, 290, 8, 6); // ~1% of 800x600
    for (const n of [50, 200, 500, 1000, 2000]) {
        const objects = makeRandomBoxes(n);
        const tree = buildTree(objects);
        const result = bench(`query n=${n}, small window`, () => {
            tree.query(smallWindow);
        }, { iterations: 5000, warmupIterations: 200 });
        printResult(result);
    }

    printSectionHeader('Query window size comparison at n=500');
    const objects500 = makeRandomBoxes(500);
    const tree500 = buildTree(objects500);
    const windows = [
        { label: 'tiny (0.5% area)', bounds: makeBox(395, 295, 4, 3) },
        { label: 'small (5% area)',  bounds: makeBox(350, 250, 40, 30) },
        { label: 'medium (25% area)',bounds: makeBox(200, 150, 200, 150) },
        { label: 'large (50% area)', bounds: makeBox(0, 0, 400, 300) },
        { label: 'full bounds',      bounds: TREE_BOUNDS },
    ];
    for (const { label, bounds } of windows) {
        const result = bench(`query n=500, ${label}`, () => {
            tree500.query(bounds);
        }, { iterations: 5000, warmupIterations: 200 });
        printResult(result);
    }

    printSectionHeader('Query all objects against themselves (per-object query pattern)');
    for (const n of [50, 100, 200]) {
        const objects = makeRandomBoxes(n);
        const tree = buildTree(objects);
        const result = bench(`query-each-against-tree n=${n}`, () => {
            for (let i = 0; i < n; i++) tree.query(objects[i]);
        }, { iterations: 500, warmupIterations: 50 });
        printResult(result);
    }

    printSectionHeader('Mixed shapes vs AABB-only at n=500');
    const mixedObjects = makeRandomMixedBounds(500);
    const mixedTree = buildTree(mixedObjects);
    const queryBound = makeBox(200, 150, 200, 150);

    const aabbResult = bench('query AABB-only tree, medium window', () => {
        tree500.query(queryBound);
    }, { iterations: 5000, warmupIterations: 200 });
    printResult(aabbResult);

    const mixedResult = bench('query mixed-shape tree, medium window', () => {
        mixedTree.query(queryBound);
    }, { iterations: 5000, warmupIterations: 200 });
    printResult(mixedResult);
}

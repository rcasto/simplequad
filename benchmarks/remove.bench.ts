import { createQuadTree, QuadTree, Bound } from '../src';
import { bench, printHeader, printResult, printSectionHeader } from './bench';
import { TREE_BOUNDS, makeRandomBoxes, shuffled } from './helpers';

function buildTree(objects: Bound[], capacity = 5): QuadTree {
    const tree = createQuadTree(TREE_BOUNDS, capacity);
    objects.forEach(o => tree.add(o));
    return tree;
}

export function runRemoveBenchmarks(): void {
    printHeader('REMOVE — per-remove cost, exposing the O(n) collapse scan');

    printSectionHeader('Remove all objects one by one — cost per remove vs tree size');
    // Each iteration removes ONE object from a pre-built tree of size n.
    // We rebuild between iterations by adding the object back.
    for (const n of [50, 200, 500, 1000]) {
        const objects = makeRandomBoxes(n);
        const tree = buildTree(objects);
        let removeIndex = 0;

        const result = bench(`remove 1 object from n=${n} tree`, () => {
            const obj = objects[removeIndex % n];
            tree.remove(obj);
            tree.add(obj);
            removeIndex++;
        }, { iterations: 1000, warmupIterations: 50 });
        printResult(result);
    }

    printSectionHeader('Remove all n objects sequentially — total cost scales with n²');
    for (const n of [50, 100, 200, 500]) {
        const objects = makeRandomBoxes(n);
        const result = bench(`drain n=${n} objects from tree`, () => {
            const tree = buildTree(objects);
            const order = shuffled(objects);
            for (let i = 0; i < n; i++) tree.remove(order[i]);
        }, { iterations: 100, warmupIterations: 10 });
        printResult(result);
    }

    printSectionHeader('Remove cost vs capacity (affects collapse frequency)');
    const objects200 = makeRandomBoxes(200);
    for (const cap of [1, 5, 10, 50]) {
        const result = bench(`remove 1 from n=200, capacity=${cap}`, () => {
            const tree = buildTree(objects200, cap);
            const obj = objects200[Math.floor(Math.random() * 200)];
            tree.remove(obj);
        }, { iterations: 500, warmupIterations: 50 });
        printResult(result);
    }
}

import test from 'ava';
import { performance } from 'perf_hooks';
import { QuadTree } from '../src';
import { createMockQuadTree, createRandomBound } from './helpers/util';


/*
    From a performance point of view, the main focus is on speeding up
    - Adding objects to the quad tree
    - Querying the quad tree
*/

test('can add an object to quadtree', t => {
    const numObjectsToAdd: number = 1000000;
    const quadTree: QuadTree = createMockQuadTree();

    const startTime = performance.now();

    for (let i = 0; i < numObjectsToAdd; i++) {
        quadTree.add(createRandomBound(quadTree.bounds));
    }

    const duration = (performance.now() - startTime) / 1000; // in seconds
    t.log(`Took ${duration} seconds to add ${numObjectsToAdd} objects`);

    const results = quadTree.query(quadTree.bounds);
    t.is(results.size, numObjectsToAdd);
});

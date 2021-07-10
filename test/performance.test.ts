import test from 'ava';
import { performance } from 'perf_hooks';
import { QuadTree } from '../src';
import { createMockQuadTree, createRandomBound } from './helpers/util';

/*
    From a performance point of view, the main focus is on speeding up
    - Adding objects to the quad tree
    - Querying the quad tree
*/

// These bounds are a little generous and the goal is to improve
// If it starts failing, it should be a sign that something
// horrible has happened to performance via a change made
const addThresholdInSeconds: number = 20;
const queryThresholdInSeconds: number = 10;

test('can add an object to quadtree', t => {
    const numObjectsToAdd: number = 1000000;
    const quadTree: QuadTree = createMockQuadTree();

    let startTime: number = performance.now();
    let duration: number;

    for (let i = 0; i < numObjectsToAdd; i++) {
        quadTree.add(createRandomBound(quadTree.bounds));
    }

    duration = (performance.now() - startTime) / 1000; // in seconds
    t.log(`Took ${duration} seconds to add ${numObjectsToAdd} objects`);
    t.assert(duration < addThresholdInSeconds);

    startTime = performance.now();
    const results = quadTree.query(quadTree.bounds);
    duration = (performance.now() - startTime) / 1000; // in seconds
    t.log(`Took ${duration} seconds to query for objects`);

    t.is(results.size, numObjectsToAdd);
    t.assert(duration < queryThresholdInSeconds);
});

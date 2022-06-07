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
const addThresholdInSeconds: number = 10;
const queryThresholdInSeconds: number = 8;

test('can add an object to quadtree', t => {
    const numSimulations: number = 3;
    const numObjectsToAdd: number = 1000000;
    const quadTree: QuadTree = createMockQuadTree(Math.floor(numObjectsToAdd * .01)); // 1% of objects capacity per node

    const addDurations = [];
    const queryDurations = [];

    for (let i = 0; i < numSimulations; i++) {
        let startTime: number = performance.now();
        let duration: number;

        for (let j = 0; j < numObjectsToAdd; j++) {
            const randomBound = createRandomBound(quadTree.bounds);
            quadTree.add(randomBound);
        }

        duration = (performance.now() - startTime) / 1000; // in seconds
        addDurations.push(duration);
        t.log(`Took ${duration} seconds to add ${numObjectsToAdd} objects. Average time per object: ${(duration / numObjectsToAdd) * 1000} ms`);
        t.assert(duration < addThresholdInSeconds);

        startTime = performance.now();
        const results = quadTree.query(quadTree.bounds);
        duration = (performance.now() - startTime) / 1000; // in seconds
        queryDurations.push(duration);
        t.log(`Took ${duration} seconds to query for ${numObjectsToAdd} objects`);

        t.is(results.size, numObjectsToAdd);
        t.assert(duration < queryThresholdInSeconds);

        quadTree.clear();
    }

    const averageAddDuration = addDurations.reduce((totalDuration, currAddDuration) => totalDuration + currAddDuration, 0) / numSimulations;
    const averageQueryDuration = queryDurations.reduce((totalDuration, currQueryDuration) => totalDuration + currQueryDuration, 0) / numSimulations;

    t.log(`Took ${averageAddDuration} seconds on average to add ${numObjectsToAdd} objects`);
    t.log(`Took ${averageQueryDuration} seconds on average to query ${numObjectsToAdd} objects`);
});

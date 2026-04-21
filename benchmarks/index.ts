import { runInsertBenchmarks } from './insert.bench';
import { runQueryBenchmarks } from './query.bench';
import { runRemoveBenchmarks } from './remove.bench';
import { runGameloopBenchmarks } from './gameloop.bench';
import { runStressBenchmarks } from './stress.bench';

console.log('\nsimplequad benchmark suite');
console.log(`  ${new Date().toISOString()}`);

runInsertBenchmarks();
runQueryBenchmarks();
runRemoveBenchmarks();
runGameloopBenchmarks();
runStressBenchmarks();

console.log('\n');

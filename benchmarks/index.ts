import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { runInsertBenchmarks } from './insert.bench';
import { runQueryBenchmarks } from './query.bench';
import { runRemoveBenchmarks } from './remove.bench';
import { runGameloopBenchmarks } from './gameloop.bench';
import { runStressBenchmarks } from './stress.bench';

const outputLines: string[] = [];
const originalLog = console.log.bind(console);
console.log = (...args: unknown[]) => {
    const line = args.map(a => String(a)).join(' ');
    originalLog(line);
    outputLines.push(line);
};

console.log('\nsimplequad benchmark suite');
console.log(`  ${new Date().toISOString()}`);

runInsertBenchmarks();
runQueryBenchmarks();
runRemoveBenchmarks();
runGameloopBenchmarks();
runStressBenchmarks();

console.log('\n');

console.log = originalLog;

const resultsDir = join(__dirname, 'results');
if (!existsSync(resultsDir)) mkdirSync(resultsDir);

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const datestamp = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
const timestamp = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const resultsFile = join(resultsDir, `benchmark_${datestamp}_${timestamp}.txt`);
writeFileSync(resultsFile, outputLines.join('\n') + '\n');
console.log(`  Results saved to benchmarks/results/benchmark_${datestamp}_${timestamp}.txt`);

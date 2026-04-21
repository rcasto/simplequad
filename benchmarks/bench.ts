export interface BenchResult {
    name: string;
    opsPerSec: number;
    avgMs: number;
    totalMs: number;
    iterations: number;
}

export interface BenchOptions {
    iterations?: number;
    warmupIterations?: number;
}

export function bench(name: string, fn: () => void, options: BenchOptions = {}): BenchResult {
    const { iterations = 1000, warmupIterations = 50 } = options;

    for (let i = 0; i < warmupIterations; i++) fn();

    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const totalMs = performance.now() - start;

    const avgMs = totalMs / iterations;
    const opsPerSec = Math.round(1000 / avgMs);

    return { name, opsPerSec, avgMs, totalMs, iterations };
}

export function printResult(result: BenchResult): void {
    const opsStr = result.opsPerSec.toLocaleString();
    const avgStr = result.avgMs < 1
        ? `${(result.avgMs * 1000).toFixed(2)}μs`
        : `${result.avgMs.toFixed(3)}ms`;
    console.log(`  ${result.name.padEnd(55)} ${opsStr.padStart(12)} ops/s   avg ${avgStr}`);
}

export function printHeader(title: string): void {
    console.log(`\n${'─'.repeat(90)}`);
    console.log(`  ${title}`);
    console.log('─'.repeat(90));
}

export function printSectionHeader(title: string): void {
    console.log(`\n  ${title}`);
    console.log(`  ${'·'.repeat(60)}`);
}

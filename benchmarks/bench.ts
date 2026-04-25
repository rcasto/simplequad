export interface BenchResult {
    name: string;
    opsPerSec: number;
    avgMs: number;
    minMs: number;
    p50Ms: number;
    p95Ms: number;
    totalMs: number;
    iterations: number;
}

export interface BenchOptions {
    iterations?: number;
    warmupIterations?: number;
}

function percentile(sorted: number[], p: number): number {
    const idx = Math.ceil(p / 100 * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

export function bench(name: string, fn: () => void, options: BenchOptions = {}): BenchResult {
    const { iterations = 1000, warmupIterations = 50 } = options;

    for (let i = 0; i < warmupIterations; i++) fn();

    const samples: number[] = new Array(iterations);
    for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        fn();
        samples[i] = performance.now() - t0;
    }

    samples.sort((a, b) => a - b);
    const totalMs = samples.reduce((sum, s) => sum + s, 0);
    const avgMs = totalMs / iterations;
    const minMs = samples[0];
    const p50Ms = percentile(samples, 50);
    const p95Ms = percentile(samples, 95);
    const opsPerSec = Math.round(1000 / avgMs);

    return { name, opsPerSec, avgMs, minMs, p50Ms, p95Ms, totalMs, iterations };
}

function fmtTime(ms: number): string {
    return ms < 1 ? `${(ms * 1000).toFixed(1)}μs` : `${ms.toFixed(3)}ms`;
}

export function printResult(result: BenchResult): void {
    const opsStr = result.opsPerSec.toLocaleString();
    console.log(
        `  ${result.name.padEnd(55)} ${opsStr.padStart(12)} ops/s` +
        `   avg ${fmtTime(result.avgMs)}` +
        `   p50 ${fmtTime(result.p50Ms)}` +
        `   p95 ${fmtTime(result.p95Ms)}`
    );
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

import { BoundingBox, Circle, Point, Bound } from '../src/schema';

export const TREE_BOUNDS: BoundingBox = { x: 0, y: 0, width: 800, height: 600 };

// Mulberry32 — fast, high-quality 32-bit seeded PRNG.
export function seededRandom(seed: number): () => number {
    let s = seed >>> 0;
    return function(): number {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function makeBox(x: number, y: number, w = 10, h = 10): BoundingBox {
    return { x, y, width: w, height: h };
}

export function makeCircle(x: number, y: number, r = 8): Circle {
    return { x, y, r };
}

export function makePoint(x: number, y: number): Point {
    return { x, y };
}

export function randomFloat(min: number, max: number, rng: () => number = Math.random): number {
    return rng() * (max - min) + min;
}

export function makeRandomBox(bounds: BoundingBox = TREE_BOUNDS, maxSize = 15, rng: () => number = Math.random): BoundingBox {
    const w = randomFloat(5, maxSize, rng);
    const h = randomFloat(5, maxSize, rng);
    return {
        x: randomFloat(bounds.x, bounds.x + bounds.width - w, rng),
        y: randomFloat(bounds.y, bounds.y + bounds.height - h, rng),
        width: w,
        height: h,
    };
}

export function makeRandomCircle(bounds: BoundingBox = TREE_BOUNDS, maxR = 10, rng: () => number = Math.random): Circle {
    const r = randomFloat(3, maxR, rng);
    return {
        x: randomFloat(bounds.x + r, bounds.x + bounds.width - r, rng),
        y: randomFloat(bounds.y + r, bounds.y + bounds.height - r, rng),
        r,
    };
}

export function makeRandomPoint(bounds: BoundingBox = TREE_BOUNDS, rng: () => number = Math.random): Point {
    return {
        x: randomFloat(bounds.x, bounds.x + bounds.width, rng),
        y: randomFloat(bounds.y, bounds.y + bounds.height, rng),
    };
}

export function makeRandomMixedBounds(n: number, bounds: BoundingBox = TREE_BOUNDS, rng: () => number = Math.random): Bound[] {
    return Array.from({ length: n }, (_, i) => {
        const t = i % 3;
        if (t === 0) return makeRandomBox(bounds, 15, rng);
        if (t === 1) return makeRandomCircle(bounds, 10, rng);
        return makeRandomPoint(bounds, rng);
    });
}

export function makeRandomBoxes(n: number, bounds: BoundingBox = TREE_BOUNDS, rng: () => number = Math.random): BoundingBox[] {
    return Array.from({ length: n }, () => makeRandomBox(bounds, 15, rng));
}

export function shuffled<T>(arr: T[], rng: () => number = Math.random): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

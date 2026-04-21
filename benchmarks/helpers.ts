import { BoundingBox, Circle, Point, Bound } from '../src/schema';

export const TREE_BOUNDS: BoundingBox = { x: 0, y: 0, width: 800, height: 600 };

export function makeBox(x: number, y: number, w = 10, h = 10): BoundingBox {
    return { x, y, width: w, height: h };
}

export function makeCircle(x: number, y: number, r = 8): Circle {
    return { x, y, r };
}

export function makePoint(x: number, y: number): Point {
    return { x, y };
}

export function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function makeRandomBox(bounds: BoundingBox = TREE_BOUNDS, maxSize = 15): BoundingBox {
    const w = randomFloat(5, maxSize);
    const h = randomFloat(5, maxSize);
    return {
        x: randomFloat(bounds.x, bounds.x + bounds.width - w),
        y: randomFloat(bounds.y, bounds.y + bounds.height - h),
        width: w,
        height: h,
    };
}

export function makeRandomCircle(bounds: BoundingBox = TREE_BOUNDS, maxR = 10): Circle {
    const r = randomFloat(3, maxR);
    return {
        x: randomFloat(bounds.x + r, bounds.x + bounds.width - r),
        y: randomFloat(bounds.y + r, bounds.y + bounds.height - r),
        r,
    };
}

export function makeRandomPoint(bounds: BoundingBox = TREE_BOUNDS): Point {
    return {
        x: randomFloat(bounds.x, bounds.x + bounds.width),
        y: randomFloat(bounds.y, bounds.y + bounds.height),
    };
}

export function makeRandomMixedBounds(n: number, bounds: BoundingBox = TREE_BOUNDS): Bound[] {
    return Array.from({ length: n }, (_, i) => {
        const t = i % 3;
        if (t === 0) return makeRandomBox(bounds);
        if (t === 1) return makeRandomCircle(bounds);
        return makeRandomPoint(bounds);
    });
}

export function makeRandomBoxes(n: number, bounds: BoundingBox = TREE_BOUNDS): BoundingBox[] {
    return Array.from({ length: n }, () => makeRandomBox(bounds));
}

export function shuffled<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

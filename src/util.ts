import { Bound, BoundingBox, Circle, Point } from './schema';

export function containsPoint(bounds: BoundingBox, point: Point) {
    return doBoundingBoxesIntersect(bounds, {
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
    });
}

export function isCircle(bound: Bound): bound is Circle {
    return (bound as Circle).r !== undefined;
}

export function doBoundsIntersect(bound1: Bound, bound2: Bound) {
    const isBound1Circle: boolean = isCircle(bound1);
    const isBound2Circle: boolean = isCircle(bound2);
    // They are both circles
    if (isBound1Circle && isBound2Circle) {
        return doCirclesIntersect(bound1 as Circle, bound2 as Circle);
    }
    // They are both bounding boxes
    if (!isBound1Circle && !isBound2Circle) {
        return doBoundingBoxesIntersect(bound1 as BoundingBox, bound2 as BoundingBox);
    }
    // One is circle, one is box
    if (isBound1Circle) {
        return doCircleBoundingBoxIntersect(bound1 as Circle, bound2 as BoundingBox);
    }
    return doCircleBoundingBoxIntersect(bound2 as Circle, bound1 as BoundingBox);
}

// https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection#Axis-Aligned_Bounding_Box
function doBoundingBoxesIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
    return (
        box1.x <= box2.x + box2.width &&
        box1.x + box1.width >= box2.x &&
        box1.y <= box2.y + box2.height &&
        box1.y + box1.height >= box2.y
    );
}

// https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection#Circle_Collision
function doCirclesIntersect(circle1: Circle, circle2: Circle): boolean {
    const dx: number = circle1.x - circle2.x;
    const dy: number = circle1.y - circle2.y;
    const distance: number = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    return distance <= circle1.r + circle2.r;
}

// https://yal.cc/rectangle-circle-intersection-test/
function doCircleBoundingBoxIntersect(circle: Circle, box: BoundingBox): boolean {
    const dx: number = circle.x - Math.max(box.x, Math.min(circle.x, box.x + box.width));
    const dy: number = circle.y - Math.max(box.y, Math.min(circle.y, box.y + box.height));
    return Math.pow(dx, 2) + Math.pow(dy, 2) <= Math.pow(circle.r, 2);
}

export function divideBoundingBox(bounds: BoundingBox): BoundingBox[] {
    const quadWidth: number = bounds.width / 2;
    const quadHeight: number = bounds.height / 2;

    const offsetX: number = bounds.x + quadWidth;
    const offsetY: number = bounds.y + quadHeight;

    const nwBoundingBox: BoundingBox = {
        x: bounds.x,
        y: bounds.y,
        width: quadWidth,
        height: quadHeight,
    };
    const neBoundingBox: BoundingBox = {
        x: offsetX,
        y: bounds.y,
        width: quadWidth,
        height: quadHeight,
    };
    const swBoundingBox: BoundingBox = {
        x: bounds.x,
        y: offsetY,
        width: quadWidth,
        height: quadHeight,
    };
    const seBoundingBox: BoundingBox = {
        x: offsetX,
        y: offsetY,
        width: quadWidth,
        height: quadHeight,
    };

    return [
        nwBoundingBox,
        neBoundingBox,
        swBoundingBox,
        seBoundingBox,
    ];
}

export function createPointKey(point: Point): string {
    return `(${point.x},${point.y})`;
}

export function flattenSets<T>(lists: Set<T>[]): Set<T> {
    return (lists || [])
        .reduce((prevSet, currSet) => {
            if (currSet.size === 0) {
                return prevSet;
            }
            return new Set<T>([...prevSet, ...currSet]);
        }, new Set<T>());
}
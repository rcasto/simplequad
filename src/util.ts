import { Bound, BoundingBox, Circle, Point } from './schema';
import { doIntersectBoundingBoxesSAT, doIntersectBoundingBoxCircleSAT, doIntersectCirclesSAT } from './sat';

// The # of combinations between these 3 bounds is as follows:
// - Circle and Circle
// - Circle and Point
// - Circle and BoundingBox
// - BoundingBox and BoundingBox
// - BoundingBox and Point
// - Point and Point

function isCircle(bound: Bound): bound is Circle {
    return (bound as Circle).r !== undefined;
}

function isBoundingBox(bound: Bound): bound is BoundingBox {
    return (bound as BoundingBox).width !== undefined;
}

function isPoint(bound: Bound): bound is Point {
    return !isCircle(bound) && !isBoundingBox(bound);
}

function toCircleFromPoint(point: Point): Circle {
    return {
        x: point.x,
        y: point.y,
        r: 0,
    };
}

function toBoundingBoxFromPoint(point: Point): BoundingBox {
    return {
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
    };
}

export function doBoundsIntersect(bound1: Bound, bound2: Bound): Point | null {
    const isBound1Circle: boolean = isCircle(bound1);
    const isBound2Circle: boolean = isCircle(bound2);

    const isBound1BoundingBox: boolean = isBoundingBox(bound1);
    const isBound2BoundingBox: boolean = isBoundingBox(bound2);

    const isBound1Point: boolean = isPoint(bound1);
    const isBound2Point: boolean = isPoint(bound2);

    // They are both circles
    if (isBound1Circle && isBound2Circle) {
        return doIntersectCirclesSAT(bound1 as Circle, bound2 as Circle);
    }

    // They are both bounding boxes
    if (isBound1BoundingBox && isBound2BoundingBox) {
        return doIntersectBoundingBoxesSAT(bound1 as BoundingBox, bound2 as BoundingBox);
    }

    // They are both points
    if (isBound1Point && isBound2Point) {
        const point1Circle: Circle = toCircleFromPoint(bound1 as Point);
        const point2Circle: Circle = toCircleFromPoint(bound2 as Point);
        return doIntersectCirclesSAT(point1Circle, point2Circle);
    }

    // 1 is circle, 2 is bounding box
    if (isBound1Circle && isBound2BoundingBox) {
        return doIntersectBoundingBoxCircleSAT(bound2 as BoundingBox, bound1 as Circle);
    }

    // 1 is bounding box, 2 is circle
    if (isBound1BoundingBox && isBound2Circle) {
        return doIntersectBoundingBoxCircleSAT(bound1 as BoundingBox, bound2 as Circle);   
    }

    // 1 is circle, 2 is point
    if (isBound1Circle && isBound2Point) {
        const point2Circle: Circle = toCircleFromPoint(bound2 as Point);
        return doIntersectCirclesSAT(bound1 as Circle, point2Circle);
    }

    // 1 is point, 2 is 2 is circle
    if (isBound1Point && isBound2Circle) {
        const point1Circle: Circle = toCircleFromPoint(bound1 as Point);
        return doIntersectCirclesSAT(point1Circle, bound2 as Circle);
    }

    // 1 is bounding box, 2 is point
    if (isBound1BoundingBox && isBound2Point) {
        const point2Box: BoundingBox = toBoundingBoxFromPoint(bound2 as Point);
        return doIntersectBoundingBoxesSAT(bound1 as BoundingBox, point2Box);
    }

    // 1 is point, 2 is bounding box
    const point1Box: BoundingBox = toBoundingBoxFromPoint(bound1 as Point);
    return doIntersectBoundingBoxesSAT(point1Box, bound2 as BoundingBox);
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

export function createPointKey(bound: Bound): string {
    if (typeof bound._key !== 'string') {
        bound._key = `(${bound.x},${bound.y})`;
    }
    return bound._key;
}

/**
 * Quicker/much cheaper check for intersection between box and point for add/remove scenarios
 * where we don't necessarily need to use SAT.
 * 
 * @param point Object point or rather point to check intersection with input box
 * @param box Box to check for intersection with input point
 */
export function doPointAndBoxIntersect(point: Point, box: BoundingBox): boolean {
    const maxX = box.x + box.width;
    const maxY = box.y + box.height;
    return (
        point.x >= box.x && point.x <= maxX &&
        point.y >= box.y && point.y <= maxY
    );
}

// https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection#Axis-Aligned_Bounding_Box
export function doBoxAndBoxIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
    return (
        box1.x <= box2.x + box2.width &&
        box1.x + box1.width >= box2.x &&
        box1.y <= box2.y + box2.height &&
        box1.y + box1.height >= box2.y
    );
}

// https://yal.cc/rectangle-circle-intersection-test/
export function doBoxAndCircleIntersect(box: BoundingBox, circle: Circle): boolean {
    const dx: number = circle.x - Math.max(box.x, Math.min(circle.x, box.x + box.width));
    const dy: number = circle.y - Math.max(box.y, Math.min(circle.y, box.y + box.height));
    const distance: number = (dx * dx) + (dy * dy);
    return distance <= (circle.r * circle.r);
}

// This also handles point to point collisions
// https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection#Circle_Collision
export function doCircleAndCircleIntersect(circle1: Circle, circle2: Circle): boolean {
    const dx: number = circle1.x - circle2.x;
    const dy: number = circle1.y - circle2.y;
    const distance: number = (dx * dx) + (dy * dy);
    const combinedRadius: number = circle1.r + circle2.r;
    return distance <= (combinedRadius * combinedRadius);
}

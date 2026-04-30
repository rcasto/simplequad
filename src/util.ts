import { Bound, BoundingBox, Circle, Point } from './schema';

// The # of combinations between these 3 bounds is as follows:
// - Circle and Circle
// - Circle and Point
// - Circle and BoundingBox
// - BoundingBox and BoundingBox
// - BoundingBox and Point
// - Point and Point

export function isCircle(bound: Bound): bound is Circle {
    return (bound as Circle).r !== undefined;
}

export function isBoundingBox(bound: Bound): bound is BoundingBox {
    return (bound as BoundingBox).width !== undefined;
}

export function isPoint(bound: Bound): bound is Point {
    return !isCircle(bound) && !isBoundingBox(bound);
}

export function toCircleFromPoint(point: Point): Circle {
    return {
        x: point.x,
        y: point.y,
        r: 0,
    };
}

export function toBoundingBoxFromPoint(point: Point): BoundingBox {
    return {
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
    };
}

/**
 * Resultant vector points in direction from point1 to point2
 * @param point1 First point or vector
 * @param point2 Second point or vector
 * @returns Vector pointing from vector/point 1 to vector/point 2
 */
export function subtract(point1: Point, point2: Point): Point {
    return {
        x: point2.x - point1.x,
        y: point2.y - point1.y,
    };
}

export function getPoints(boundingBox: BoundingBox): Point[] {
    const x = boundingBox.x;
    const y = boundingBox.y;

    const maxX: number = x + boundingBox.width;
    const maxY: number = y + boundingBox.height;

    const topLeftPoint: Point = {
        x,
        y,
    };
    const topRightPoint: Point = {
        x: maxX,
        y,
    };
    const bottomRightPoint: Point = {
        x: maxX,
        y: maxY,
    };
    const bottomLeftPoint: Point = {
        x,
        y: maxY,
    };

    return [
        topLeftPoint,
        topRightPoint,
        bottomRightPoint,
        bottomLeftPoint,
    ];
}

export function normalize(vector: Point): Point {
    const magnitude: number = getMagnitude(vector);
    return {
        x: magnitude > 0 ? vector.x / magnitude : 0,
        y: magnitude > 0 ? vector.y / magnitude : 0,
    };
}

export function getDot(vector1: Point, vector2: Point): number {
    return (vector1.x * vector2.x) + (vector1.y * vector2.y);
}

export function scalarMultiply(vector: Point, scalar: number): Point {
    return {
        x: vector.x * scalar,
        y: vector.y * scalar,
    };
}

export function getMagnitude(vector: Point, trueMagnitude = true): number {
    const underRootMagnitude = (vector.x * vector.x) + (vector.y * vector.y);
    if (!trueMagnitude || underRootMagnitude === 1) {
        return underRootMagnitude;
    }
    return Math.sqrt(underRootMagnitude);
}

export function closestPointToTargetPoint(targetPoint: Point, points: Point[]): {
    closestPoint: Point;
} {
    let closestPoint: Point = points[0];
    let closestDistance: number = Number.POSITIVE_INFINITY;
    let currentDistance: number;
    for (const point of points) {
        currentDistance = getMagnitude(subtract(targetPoint, point), false);
        if (currentDistance < closestDistance) {
            closestDistance = currentDistance;
            closestPoint = point;
        }
    }
    return {
        closestPoint,
    };
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

/**
 * Allocation-free boolean intersection test between any two Bounds.
 * Used for queryBroad where SAT and MTV are not needed.
 */
export function doBoundsIntersectBool(bound1: Bound, bound2: Bound): boolean {
    if (isBoundingBox(bound1)) {
        if (isBoundingBox(bound2)) return doBoxAndBoxIntersect(bound1, bound2);
        if (isCircle(bound2)) return doBoxAndCircleIntersect(bound1, bound2);
        return doPointAndBoxIntersect(bound2 as Point, bound1);
    }
    if (isCircle(bound1)) {
        if (isCircle(bound2)) return doCircleAndCircleIntersect(bound1, bound2);
        if (isBoundingBox(bound2)) return doBoxAndCircleIntersect(bound2, bound1);
        // bound2 is a point — treat as r=0 circle
        const dx = bound1.x - (bound2 as Point).x;
        const dy = bound1.y - (bound2 as Point).y;
        return dx * dx + dy * dy <= bound1.r * bound1.r;
    }
    // bound1 is a point
    if (isBoundingBox(bound2)) return doPointAndBoxIntersect(bound1 as Point, bound2);
    if (isCircle(bound2)) {
        const dx = (bound1 as Point).x - bound2.x;
        const dy = (bound1 as Point).y - bound2.y;
        return dx * dx + dy * dy <= bound2.r * bound2.r;
    }
    // both points — coincident
    return (bound1 as Point).x === (bound2 as Point).x && (bound1 as Point).y === (bound2 as Point).y;
}

/**
 * Cheap boolean-only intersection test between any Bound and a BoundingBox.
 * Used for add/remove routing where no MTV is needed.
 */
export function doesBoundIntersectBox(bound: Bound, box: BoundingBox): boolean {
    if (isBoundingBox(bound)) return doBoxAndBoxIntersect(bound, box);
    if (isCircle(bound)) return doBoxAndCircleIntersect(box, bound);
    return doPointAndBoxIntersect(bound as Point, box);
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

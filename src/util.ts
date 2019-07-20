import { Bound, BoundingBox, Circle, Point } from './schema';

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

function doPointsIntersect(point1: Point, point2: Point): boolean {
    return point1.x === point2.x &&
           point1.y === point2.y;
}

function doBoundingBoxPointIntersect(bounds: BoundingBox, point: Point) {
    return doBoundingBoxesIntersect(bounds, {
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
    });
}

function doCirclePointIntersect(circle: Circle, point: Point) {
    return doCirclesIntersect(circle, {
        x: point.x,
        y: point.y,
        r: 0,
    });
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

export function doBoundsIntersect(bound1: Bound, bound2: Bound) {
    const isBound1Circle: boolean = isCircle(bound1);
    const isBound2Circle: boolean = isCircle(bound2);

    const isBound1BoundingBox: boolean = isBoundingBox(bound1);
    const isBound2BoundingBox: boolean = isBoundingBox(bound2);

    const isBound1Point: boolean = isPoint(bound1);
    const isBound2Point: boolean = isPoint(bound2);

    // They are both circles
    if (isBound1Circle && isBound2Circle) {
        return doCirclesIntersect(bound1 as Circle, bound2 as Circle);
    }

    // They are both bounding boxes
    if (isBound1BoundingBox && isBound2BoundingBox) {
        return doBoundingBoxesIntersect(bound1 as BoundingBox, bound2 as BoundingBox);
    }

    // They are both points
    if (isBound1Point && isBound2Point) {
        return doPointsIntersect(bound1 as Point, bound2 as Point);
    }

    // 1 is circle, 2 is bounding box
    if (isBound1Circle && isBound2BoundingBox) {
        return doCircleBoundingBoxIntersect(bound1 as Circle, bound2 as BoundingBox);
    }

    // 1 is circle, 2 is point
    if (isBound1Circle && isBound2Point) {
        return doCirclePointIntersect(bound1 as Circle, bound2 as Point);
    }

    // 1 is bounding box, 2 is circle
    if (isBound1BoundingBox && isBound2Circle) {
        return doCircleBoundingBoxIntersect(bound2 as Circle, bound1 as BoundingBox);
    }

    // 1 is bounding box, 2 is point
    if (isBound1BoundingBox && isBound2Point) {
        return doBoundingBoxPointIntersect(bound1 as BoundingBox, bound2 as Point);
    }

    // 1 is point, 2 is 2 is circle
    if (isBound1Point && isBound2Circle) {
        return doCirclePointIntersect(bound2 as Circle, bound1 as Point);
    }

    // 1 is point, 2 is bounding box
    return doBoundingBoxPointIntersect(bound2 as BoundingBox, bound1 as Point);
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

export function flattenLists<T>(lists: Array<T[]>): T[] {
    return (lists || [])
        .reduce((prevList, currList) => {
            if (currList.length === 0) {
                return prevList;
            }
            return [...prevList, ...currList];
        }, []);
}
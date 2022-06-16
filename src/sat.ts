import { BoundingBox, Point, Circle, SATInfo } from './schema';
import { doBoxAndBoxIntersect, doBoxAndCircleIntersect, doCircleAndCircleIntersect } from './util';

/**
 * Resultant vector points in direction from point1 to point2
 * @param point1 First point or vector
 * @param point2 Second point or vector
 * @returns Vector pointing from vector/point 1 to vector/point 2
 */
function subtract(point1: Point, point2: Point): Point {
    return {
        x: point2.x - point1.x,
        y: point2.y - point1.y,
    };
}

function getPoints(boundingBox: BoundingBox): Point[] {
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

function normalize(vector: Point): Point {
    const magnitude: number = getMagnitude(vector);
    return {
        x: magnitude > 0 ? vector.x / magnitude : 0,
        y: magnitude > 0 ? vector.y / magnitude : 0,
    };
}

function getDot(vector1: Point, vector2: Point): number {
    return (vector1.x * vector2.x) + (vector1.y * vector2.y);
}

function scalarMultiply(vector: Point, scalar: number): Point {
    return {
        x: vector.x * scalar,
        y: vector.y * scalar,
    };
}

function getMagnitude(vector: Point, trueMagnitude = true): number {
    const underRootMagnitude = (vector.x * vector.x) + (vector.y * vector.y);
    if (!trueMagnitude || underRootMagnitude === 1) {
        return underRootMagnitude;
    }
    return Math.sqrt(underRootMagnitude);
}

function closestPointToTargetPoint(targetPoint: Point, points: Point[]): {
    closestPoint: Point;
} {
    let closestPoint: Point = points[0];
    let closestDistance: number = Number.POSITIVE_INFINITY;
    let currentDistance: number;
    points
        .forEach(point => {
            currentDistance = getMagnitude(subtract(targetPoint, point), false);
            if (currentDistance < closestDistance) {
                closestDistance = currentDistance;
                closestPoint = point;
            }
        });
    return {
        closestPoint,
    };
}

export function doIntersectCirclesSAT(circle1: Circle, circle2: Circle): Point | null {
    if (!doCircleAndCircleIntersect(circle1, circle2)) {
        return null;
    }

    const sat1: SATInfo = getSATInfoForCircle(circle1);
    const sat2: SATInfo = getSATInfoForCircle(circle2);

    const normalizedCenterPointsAxis: Point = normalize(subtract(circle1, circle2));
    sat1.axes.push(normalizedCenterPointsAxis);

    return doIntersectSAT(sat1, sat2);
}

export function doIntersectBoundingBoxCircleSAT(box: BoundingBox, circle: Circle): Point | null {
    if (!doBoxAndCircleIntersect(box, circle)) {
        return null;
    }

    const sat1: SATInfo = getSATInfoForBoundingBox(box);
    const sat2: SATInfo = getSATInfoForCircle(circle);
    const { closestPoint: closestBoundingBoxPoint } = closestPointToTargetPoint(circle, sat1.points);

    const normalizedCenterPointsAxis: Point = normalize(subtract(circle, closestBoundingBoxPoint));
    sat2.axes.push(normalizedCenterPointsAxis);

    return doIntersectSAT(sat1, sat2);
}

export function doIntersectBoundingBoxesSAT(box1: BoundingBox, box2: BoundingBox): Point | null {
    if (!doBoxAndBoxIntersect(box1, box2)) {
        return null;
    }

    const sat1: SATInfo = getSATInfoForBoundingBox(box1);
    const sat2: SATInfo = getSATInfoForBoundingBox(box2);

    // Bounding boxes share same orientation or rotation (none)
    // Thus don't also need to include normals for the second box
    // Only 2 axes total need to be checked
    sat2.axes = [];

    return doIntersectSAT(sat1, sat2);
}

function getSATInfoForCircle(circle: Circle): SATInfo {
    return {
        axes: [],
        points: [{
            x: circle.x,
            y: circle.y,
        }],
        center: {
            x: circle.x,
            y: circle.y,
        },
        buffer: circle.r,
    };
}

const NON_ROTATIONAL_AXIS_ALIGNED_BOUNDING_BOX_AXES: Point[] = [
    {
        x: 0,
        y: -1,
    },
    {
        x: 1,
        y: 0,
    },
];

function getSATInfoForBoundingBox(box: BoundingBox): SATInfo {
    const points: Point[] = getPoints(box);

    return {
        axes: [...NON_ROTATIONAL_AXIS_ALIGNED_BOUNDING_BOX_AXES],
        points,
        center: {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
        },
        buffer: 0,
    };
}

/**
 * 
 * @param sat1 SAT information for first bound
 * @param sat2 SAT information for second bound
 * @returns {Point | null} If non-null, Point returned represents MTV (minimum translation vector) pointing in direction from sat1 bound to sat2 bound (unless directed to flip direction)
 */
function doIntersectSAT(sat1: SATInfo, sat2: SATInfo): Point | null {
    const allAxes: Point[] = sat1.axes.concat(sat2.axes);

    let scalarProjection: number;
    let maxBox1: number;
    let minBox1: number;
    let maxBox2: number;
    let minBox2: number;
    let minTranslationDistance: number = Number.POSITIVE_INFINITY;
    let minTranslationVector: Point | null = null;
    const numAxes: number = allAxes.length;
    const sat1Buffer: number = sat1.buffer;
    const sat2Buffer: number = sat2.buffer;

    for (let axesIndex: number = 0; axesIndex < numAxes; axesIndex++) {
        const normalizedAxis = allAxes[axesIndex];

        maxBox1 = Number.NEGATIVE_INFINITY;
        minBox1 = Number.POSITIVE_INFINITY;

        maxBox2 = Number.NEGATIVE_INFINITY;
        minBox2 = Number.POSITIVE_INFINITY;

        // project all sides of box1 onto normal (separating axis)
        // We want to record the minimum and maximum scalar projections
        // This will be done for both boxes
        sat1.points
            .forEach(pointIn1 => {
                scalarProjection = getDot(pointIn1, normalizedAxis);
                minBox1 = Math.min(scalarProjection - sat1Buffer, minBox1);
                maxBox1 = Math.max(scalarProjection + sat1Buffer, maxBox1);
            });

        sat2.points
            .forEach(pointIn2 => {
                scalarProjection = getDot(pointIn2, normalizedAxis);
                minBox2 = Math.min(scalarProjection - sat2Buffer, minBox2);
                maxBox2 = Math.max(scalarProjection + sat2Buffer, maxBox2);
            });

        // Must intersect (overlap) on all separating axes
        // Can bail early, or on the first time not overlapping
        if (maxBox1 < minBox2 ||
            maxBox2 < minBox1) {
            return null;
        }

        const minBox = Math.max(minBox1, minBox2);
        const maxBox = Math.min(maxBox1, maxBox2);
        const overlap = maxBox - minBox;

        if (overlap < minTranslationDistance) {
            minTranslationDistance = overlap;
            minTranslationVector = normalizedAxis;
        }
    }

    if (!minTranslationVector) {
        return null;
    }

    return scalarMultiply(minTranslationVector, minTranslationDistance);
}
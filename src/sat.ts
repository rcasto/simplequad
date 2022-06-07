import { BoundingBox, Point, Circle, SATInfo } from './schema';

function getVectorBetweenPoints(point1: Point, point2: Point): Point {
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

function multiply(vector1: Point, vector2: Point): Point {
    return {
        x: vector1.x * vector2.x,
        y: vector1.y * vector2.y,
    };
}

function getMagnitude(vector: Point, trueMagnitude = true): number {
    const underRootMagnitude = (vector.x * vector.x) + (vector.y * vector.y);
    if (!trueMagnitude || underRootMagnitude === 1) {
        return underRootMagnitude;
    }
    return Math.sqrt(underRootMagnitude);
}

function closestToPoint(targetPoint: Point, points: Point[]): Point {
    let closestPoint: Point = points[0];
    let closestDistance: number = Number.POSITIVE_INFINITY;
    let currentDistance: number;
    points
        .forEach(point => {
            currentDistance = getMagnitude(getVectorBetweenPoints(targetPoint, point), false);
            if (currentDistance < closestDistance) {
                closestDistance = currentDistance;
                closestPoint = point;
            }
        });
    return closestPoint;
}

export function doIntersectCirclesSAT(circle1: Circle, circle2: Circle): Point | null {
    const sat1: SATInfo = getSATInfoForCircle(circle1);
    const sat2: SATInfo = getSATInfoForCircle(circle2);

    const centerPointsAxis: Point = getVectorBetweenPoints(circle1, circle2);
    sat1.axes.push(normalize(centerPointsAxis));

    return doIntersectSAT(sat1, sat2);
}

export function doIntersectBoundingBoxCircleSAT(box: BoundingBox, circle: Circle): Point | null {
    const sat1: SATInfo = getSATInfoForBoundingBox(box);
    const sat2: SATInfo = getSATInfoForCircle(circle);

    const boxPoints: Point[] = getPoints(box);
    const closestPoint: Point = closestToPoint(circle, boxPoints);

    sat1.axes.push(normalize(getVectorBetweenPoints(closestPoint, circle)));

    return doIntersectSAT(sat1, sat2);
}

export function doIntersectBoundingBoxesSAT(box1: BoundingBox, box2: BoundingBox): Point | null {
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
        buffer: 0,
    };
}

export function doIntersectSAT(sat1: SATInfo, sat2: SATInfo): Point | null {
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

    return minTranslationVector ?
        multiply(minTranslationVector, {
            x: minTranslationDistance,
            y: minTranslationDistance,
        }) : null;
}
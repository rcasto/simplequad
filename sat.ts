import { BoundingBox, Point, Circle } from './src/schema';

interface SATInfo {
    axes: Point[];
    points: Point[];
    // Mainly used to handle circles easier
    buffer: number;
}

function getVectorBetweenPoints(point1: Point, point2: Point): Point {
    return {
        x: point2.x - point1.x,
        y: point2.y - point1.y,
    };
}

function getPoints(boundingBox: BoundingBox): Point[] {
    const topLeftPoint: Point = {
        x: boundingBox.x,
        y: boundingBox.y,
    };
    const topRightPoint: Point = {
        x: boundingBox.x + boundingBox.width,
        y: boundingBox.y,
    };
    const bottomLeftPoint: Point = {
        x: boundingBox.x,
        y: boundingBox.y + boundingBox.height,
    };
    const bottomRightPoint: Point = {
        x: boundingBox.x + boundingBox.width,
        y: boundingBox.y + boundingBox.height,
    };
    return [
        topLeftPoint,
        topRightPoint,
        bottomLeftPoint,
        bottomRightPoint,
    ];
}

function getSideVectors(boundingBox: BoundingBox): Point[] {
    const points: Point[] = getPoints(boundingBox);
    return [
        getVectorBetweenPoints(points[0], points[1]),
        getVectorBetweenPoints(points[1], points[2]),
        getVectorBetweenPoints(points[2], points[3]),
        getVectorBetweenPoints(points[3], points[0]),
    ];
}

function getNormal(vector: Point): Point {
    return {
        x: -vector.y,
        y: vector.x,
    };
}

function normalize(vector: Point): Point {
    const magnitude: number = getMagnitude(vector);
    return {
        x: vector.x / magnitude,
        y: vector.y / magnitude,
    };
}

function getDot(vector1: Point, vector2: Point): number {
    return vector1.x * vector2.x + vector1.y * vector2.y;
}

function getMagnitude(vector: Point): number {
    return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
}

function closestToPoint(targetPoint: Point, points: Point[]): Point {
    let closestPoint: Point = points[0];
    let closestDistance: number = Number.MAX_VALUE;
    let currentDistance: number;
    points
        .forEach(point => {
            currentDistance = getMagnitude(getVectorBetweenPoints(targetPoint, point));
            if (currentDistance < closestDistance) {
                closestDistance = currentDistance;
                closestPoint = point;
            }
        });
    return closestPoint;
}

export function doIntersectBoundingBoxCircleSAT(box: BoundingBox, circle: Circle): boolean {
    const sat1: SATInfo = getSATInfoForBoundingBox(box);
    const sat2: SATInfo = getSATInfoForCircle(circle);

    const boxPoints: Point[] = getPoints(box);
    const closestPoint: Point = closestToPoint(circle, boxPoints);

    sat2.axes.push(getVectorBetweenPoints(closestPoint, circle));

    return doIntersectSAT(sat1, sat2);
}

export function doIntersectBoundingBoxesSAT(box1: BoundingBox, box2: BoundingBox): boolean {
    const sat1: SATInfo = getSATInfoForBoundingBox(box1);
    const sat2: SATInfo = getSATInfoForBoundingBox(box2);
    return doIntersectSAT(sat1, sat2);
}

function getSATInfoForCircle(circle: Circle): SATInfo {
    return {
        axes: [],
        points: [circle],
        buffer: circle.r || 0,
    }
}

function getSATInfoForBoundingBox(box: BoundingBox): SATInfo {
    const points: Point[] = getPoints(box);
    const sides: Point[] = getSideVectors(box);

    const axes: Point[] = sides
        .map(side => getNormal(side));

    return {
        axes,
        points,
        buffer: 0,
    }
}

export function doIntersectSAT(sat1: SATInfo, sat2: SATInfo): boolean {
    let scalarProjection: number;
    let maxBox1: number;
    let minBox1: number;
    let maxBox2: number;
    let minBox2: number;
    let axesIndex: number = 0;
    const axes: Point[] = [...sat1.axes, ...sat2.axes];

    // normalize the axes
    // don't need this until adding minimum translation vector (MTV)
    // axes = axes.map(axis => normalize(axis));

    while (axesIndex < axes.length) {
        maxBox1 = Number.MIN_VALUE;
        minBox1 = Number.MAX_VALUE;

        maxBox2 = Number.MIN_VALUE;
        minBox2 = Number.MAX_VALUE;

        // project all sides of box1 onto normal (separating axis)
        // We want to record the minimum and maximum scalar projections
        // This will be done for both boxes
        sat1.points
            .forEach(pointIn1 => {
                scalarProjection = getDot(pointIn1, axes[axesIndex]);
                if (scalarProjection - sat1.buffer < minBox1) {
                    minBox1 = scalarProjection - sat1.buffer;
                }
                if (scalarProjection + sat1.buffer > maxBox1) {
                    maxBox1 = scalarProjection + sat1.buffer;
                }
            });

        sat2.points
            .forEach(pointIn2 => {
                scalarProjection = getDot(pointIn2, axes[axesIndex]);
                if (scalarProjection - sat2.buffer < minBox2) {
                    minBox2 = scalarProjection - sat2.buffer;
                }
                if (scalarProjection + sat2.buffer > maxBox2) {
                    maxBox2 = scalarProjection + sat2.buffer;
                }
            });

        // Must intersect (overlap) on all separating axes
        // Can bail early, or on the first time not overlapping
        if (maxBox1 < minBox2 ||
            maxBox2 < minBox1) {
            return false;
        }

        axesIndex++;
    }

    return true;
}
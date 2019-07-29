import { BoundingBox, Point } from './src/schema';

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

export function doIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
    const box1Points: Point[] = getPoints(box1);
    const box2Points: Point[] = getPoints(box2);

    const box1Sides: Point[] = getSideVectors(box1);
    const box2Sides: Point[] = getSideVectors(box2);

    const axes: Point[] = [...box1Sides, ...box2Sides]
        .map(sideVector => getNormal(sideVector))
        .map(normalVector => normalize(normalVector));

    return doIntersectSAT(axes, box1Points, box2Points);
}

export function doIntersectSAT(axes: Point[], pointList1: Point[], pointList2: Point[]): boolean {
    let scalarProjection: number;
    let maxBox1: number;
    let minBox1: number;
    let maxBox2: number;
    let minBox2: number;
    let axesIndex: number = 0;

    while (axesIndex < axes.length) {
        maxBox1 = Number.MIN_VALUE;
        minBox1 = Number.MAX_VALUE;

        maxBox2 = Number.MIN_VALUE;
        minBox2 = Number.MAX_VALUE;

        // project all sides of box1 onto normal (separating axis)
        // We want to record the minimum and maximum scalar projections
        // This will be done for both boxes
        pointList1
            .forEach(pointIn1 => {
                scalarProjection = getDot(pointIn1, axes[axesIndex]);
                if (scalarProjection < minBox1) {
                    minBox1 = scalarProjection;
                }
                if (scalarProjection > maxBox1) {
                    maxBox1 = scalarProjection;
                }
            });

        pointList2
            .forEach(pointIn2 => {
                scalarProjection = getDot(pointIn2, axes[axesIndex]);
                if (scalarProjection < minBox2) {
                    minBox2 = scalarProjection;
                }
                if (scalarProjection > maxBox2) {
                    maxBox2 = scalarProjection;
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
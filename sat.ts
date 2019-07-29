import { BoundingBox, Point } from './src/schema';

interface Vector extends Point {}

function getVectorBetweenPoints(point1: Point, point2: Point): Vector {
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

function getSideVectors(boundingBox: BoundingBox): Vector[] {
    const points: Point[] = getPoints(boundingBox);
    return [
        getVectorBetweenPoints(points[0], points[1]),
        getVectorBetweenPoints(points[1], points[2]),
        getVectorBetweenPoints(points[2], points[3]),
        getVectorBetweenPoints(points[3], points[0]),
    ];
}

function getNormal(vector: Vector): Vector {
    return {
        x: -vector.y,
        y: vector.x,
    };
}

function normalize(vector: Vector): Vector {
    const magnitude: number = getMagnitude(vector);
    return {
        x: vector.x / magnitude,
        y: vector.y / magnitude,
    };
}

function getDot(vector1: Vector, vector2: Vector): number {
    return vector1.x * vector2.x + vector1.y * vector2.y;
}

function getMagnitude(vector: Vector): number {
    return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
}

export function doIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
    const box1Points: Point[] = getPoints(box1);
    const box2Points: Point[] = getPoints(box2);

    const box1Sides: Vector[] = getSideVectors(box1);
    const box2Sides: Vector[] = getSideVectors(box2);

    // These are the axes
    const normalVectors: Vector[] = [...box1Sides, ...box2Sides]
        .map(sideVector => getNormal(sideVector))
        .map(normalVector => normalize(normalVector));

    let scalarProjection: number;
    let maxBox1: number;
    let minBox1: number;
    let maxBox2: number;
    let minBox2: number;
    let normalVectorIndex: number = 0;

    while (normalVectorIndex < normalVectors.length) {
        maxBox1 = Number.MIN_VALUE;
        minBox1 = Number.MAX_VALUE;
        maxBox2 = Number.MIN_VALUE;
        minBox2 = Number.MAX_VALUE;

        // project all sides of box1 onto normal (separating axis)
        // We want to record the minimum and maximum scalar projections
        // This will be done for both boxes
        box1Points
            .forEach(box1Point => {
                scalarProjection = getDot(box1Point, normalVectors[normalVectorIndex]);
                if (scalarProjection < minBox1) {
                    minBox1 = scalarProjection;
                }
                if (scalarProjection > maxBox1) {
                    maxBox1 = scalarProjection;
                }
            });

        box2Points
            .forEach(box2Point => {
                scalarProjection = getDot(box2Point, normalVectors[normalVectorIndex]);
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

        normalVectorIndex++;
    }

    return true;
}
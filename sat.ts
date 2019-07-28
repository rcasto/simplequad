import { BoundingBox, Point } from './src/schema';

interface Vector extends Point {}

function getVectorBetweenPoints(point1: Point, point2: Point): Vector {
    return {
        x: point2.x - point1.x,
        y: point2.y - point1.y,
    };
}

function getSideVectors(boundingBox: BoundingBox): Vector[] {
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
        getVectorBetweenPoints(topLeftPoint, topRightPoint),
        getVectorBetweenPoints(topRightPoint, bottomRightPoint),
        getVectorBetweenPoints(bottomRightPoint, bottomLeftPoint),
        getVectorBetweenPoints(bottomLeftPoint, topLeftPoint),
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

// project vector1 onto vector2
function getProjectionMagnitude(vector1: Vector, vector2: Vector): number {
    return getDot(vector1, vector2) / getMagnitude(vector2);
}

function getDot(vector1: Vector, vector2: Vector): number {
    return vector1.x * vector2.x + vector1.y * vector2.y;
}

function getMagnitude(vector: Vector): number {
    return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
}

function getNormalVectors(vectors: Vector[]): Vector[] {
    return vectors.map(vector => getNormal(vector));
}

export function doIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
    const box1Sides: Vector[] = getSideVectors(box1);
    const box2Sides: Vector[] = getSideVectors(box2);
    const normalVectors: Vector[] = [...getNormalVectors(box1Sides), ...getNormalVectors(box2Sides)]
        .map(normalVector => normalize(normalVector));

    let normalVector: Vector;
    let scalarProjection: number;
    let maxBox1: number;
    let minBox1: number;
    let maxBox2: number;
    let minBox2: number;

    while (normalVectors.length) {
        normalVector = normalVectors.pop() as Vector;
        maxBox1 = Number.MIN_VALUE;
        minBox1 = Number.MAX_VALUE;
        maxBox2 = Number.MIN_VALUE;
        minBox2 = Number.MAX_VALUE;

        // project all sides of box1 onto normal (separating axis)
        // We want to record the minimum and maximum scalar projections
        // This will be done for both boxes
        box1Sides
            .forEach(box1Side => {
                scalarProjection = getProjectionMagnitude(normalize(box1Side), normalVector);
                if (scalarProjection < minBox1) {
                    minBox1 = scalarProjection;
                }
                if (scalarProjection > maxBox1) {
                    maxBox1 = scalarProjection;
                }
            });

        box2Sides
            .forEach(box2Side => {
                scalarProjection = getProjectionMagnitude(normalize(box2Side), normalVector);
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
    }

    return true;
}
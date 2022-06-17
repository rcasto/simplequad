import { BoundingBox, Point, Circle, SATInfo, Bound, MinimumTranslationVectorInfo } from './schema';
import {
    closestPointToTargetPoint,
    doBoxAndBoxIntersect,
    doBoxAndCircleIntersect,
    doCircleAndCircleIntersect,
    getDot,
    getPoints,
    isBoundingBox,
    isCircle,
    isPoint,
    normalize,
    scalarMultiply,
    subtract,
    toBoundingBoxFromPoint,
    toCircleFromPoint,
} from './util';

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

/**
 * 
 * @param bound1 First bound, from usage this will always be a quad tree node bound or another object bound in the quad tree
 * @param bound2 Second bound, from usage this will always be the passed in user bound used for querying
 * @returns {Point | null} MTV (minimum translation vector) pointing towards the user passed in bound or null, if there is no collision/overlap with an object in the quad tree
 */
 export function doBoundsIntersect(bound1: Bound, bound2: Bound): MinimumTranslationVectorInfo | null {
    const isBound1Circle: boolean = isCircle(bound1);
    const isBound2Circle: boolean = isCircle(bound2);

    const isBound1BoundingBox: boolean = isBoundingBox(bound1);
    const isBound2BoundingBox: boolean = isBoundingBox(bound2);

    const isBound1Point: boolean = isPoint(bound1);
    const isBound2Point: boolean = isPoint(bound2);

    // They are both circles
    if (isBound1Circle && isBound2Circle) {
        return doIntersectCirclesSAT(bound1 as Circle, bound2 as Circle, false);
    }

    // They are both bounding boxes
    if (isBound1BoundingBox && isBound2BoundingBox) {
        return doIntersectBoundingBoxesSAT(bound1 as BoundingBox, bound2 as BoundingBox, false);
    }

    // They are both points
    if (isBound1Point && isBound2Point) {
        const point1Circle: Circle = toCircleFromPoint(bound1 as Point);
        const point2Circle: Circle = toCircleFromPoint(bound2 as Point);
        return doIntersectCirclesSAT(point1Circle, point2Circle, false);
    }

    // 1 is circle, 2 is bounding box
    if (isBound1Circle && isBound2BoundingBox) {
        return doIntersectBoundingBoxCircleSAT(bound2 as BoundingBox, bound1 as Circle, true);
    }

    // 1 is bounding box, 2 is circle
    if (isBound1BoundingBox && isBound2Circle) {
        return doIntersectBoundingBoxCircleSAT(bound1 as BoundingBox, bound2 as Circle, false);   
    }

    // 1 is circle, 2 is point
    if (isBound1Circle && isBound2Point) {
        const point2Circle: Circle = toCircleFromPoint(bound2 as Point);
        return doIntersectCirclesSAT(bound1 as Circle, point2Circle, false);
    }

    // 1 is point, 2 is 2 is circle
    if (isBound1Point && isBound2Circle) {
        const point1Circle: Circle = toCircleFromPoint(bound1 as Point);
        return doIntersectCirclesSAT(point1Circle, bound2 as Circle, false);
    }

    // 1 is bounding box, 2 is point
    if (isBound1BoundingBox && isBound2Point) {
        const point2Box: BoundingBox = toBoundingBoxFromPoint(bound2 as Point);
        return doIntersectBoundingBoxesSAT(bound1 as BoundingBox, point2Box, false);
    }

    // 1 is point, 2 is bounding box
    const point1Box: BoundingBox = toBoundingBoxFromPoint(bound1 as Point);
    return doIntersectBoundingBoxesSAT(point1Box, bound2 as BoundingBox, false);
}

function doIntersectCirclesSAT(circle1: Circle, circle2: Circle, shouldFlipMtvDirection: boolean): MinimumTranslationVectorInfo | null {
    if (!doCircleAndCircleIntersect(circle1, circle2)) {
        return null;
    }

    const sat1: SATInfo = getSATInfoForCircle(circle1);
    const sat2: SATInfo = getSATInfoForCircle(circle2);

    const normalizedCenterPointsAxis: Point = normalize(subtract(circle1, circle2));
    sat1.axes.push(normalizedCenterPointsAxis);

    return doIntersectSAT(sat1, sat2, shouldFlipMtvDirection);
}

function doIntersectBoundingBoxCircleSAT(box: BoundingBox, circle: Circle, shouldFlipMtvDirection: boolean): MinimumTranslationVectorInfo | null {
    if (!doBoxAndCircleIntersect(box, circle)) {
        return null;
    }

    const sat1: SATInfo = getSATInfoForBoundingBox(box);
    const sat2: SATInfo = getSATInfoForCircle(circle);
    const { closestPoint: closestBoundingBoxPoint } = closestPointToTargetPoint(circle, sat1.points);

    // Only add the circle center to closest polygon point normal if the closest point is not the center
    // of the circle itself (could essentially short circuit upon this finding, but will let it run the usual course)
    if (closestBoundingBoxPoint.x !== circle.x || closestBoundingBoxPoint.y !== circle.y) {
        const normalizedCenterPointsAxis: Point = normalize(subtract(circle, closestBoundingBoxPoint));
        sat2.axes.push(normalizedCenterPointsAxis);
    }

    return doIntersectSAT(sat1, sat2, shouldFlipMtvDirection);
}

function doIntersectBoundingBoxesSAT(box1: BoundingBox, box2: BoundingBox, shouldFlipMtvDirection: boolean): MinimumTranslationVectorInfo | null {
    if (!doBoxAndBoxIntersect(box1, box2)) {
        return null;
    }

    const sat1: SATInfo = getSATInfoForBoundingBox(box1);
    const sat2: SATInfo = getSATInfoForBoundingBox(box2);

    // Bounding boxes share same orientation or rotation (none)
    // Thus don't also need to include normals for the second box
    // Only 2 axes total need to be checked
    sat2.axes = [];

    return doIntersectSAT(sat1, sat2, shouldFlipMtvDirection);
}

/**
 * 
 * @param sat1 SAT information for first bound
 * @param sat2 SAT information for second bound
 * @param shouldFlipMtvDirection Whether the mtv returned should have its direction flipped or not (normally pointing towards sat2 bound)
 * @returns {Point | null} If non-null, Point returned represents MTV (minimum translation vector) pointing in direction of sat2 bound (unless directed to flip direction)
 */
function doIntersectSAT(sat1: SATInfo, sat2: SATInfo, shouldFlipMtvDirection: boolean): MinimumTranslationVectorInfo | null {
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

    const vectorFromSat1CenterToSat2Center = subtract(sat1.center, sat2.center);
    const isMtvPointingTowardsSat2Center = getDot(minTranslationVector, vectorFromSat1CenterToSat2Center) > 0;

    if (
        !isMtvPointingTowardsSat2Center && !shouldFlipMtvDirection ||
        isMtvPointingTowardsSat2Center && shouldFlipMtvDirection
    ) {
        minTranslationVector = scalarMultiply(minTranslationVector, -1);
    }

    return {
        vector: scalarMultiply(minTranslationVector, minTranslationDistance),
        direction: minTranslationVector,
        magnitude: minTranslationDistance,
    };
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

function getSATInfoForBoundingBox(box: BoundingBox): SATInfo {
    const points: Point[] = getPoints(box);

    return {
        axes: [...NON_ROTATIONAL_AXIS_ALIGNED_BOUNDING_BOX_AXES],
        points,
        center: {
            x: box.x + (box.width / 2),
            y: box.y + (box.height / 2),
        },
        buffer: 0,
    };
}
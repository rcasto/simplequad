import { BoundingBox, Point, Circle, Bound, MinimumTranslationVectorInfo } from './schema';
import {
    doBoxAndBoxIntersect,
    doBoxAndCircleIntersect,
    doCircleAndCircleIntersect,
    getDot,
    getPoints,
    isBoundingBox,
    isCircle,
    normalize,
    scalarMultiply,
    subtract,
    toBoundingBoxFromPoint,
    toCircleFromPoint,
} from './util';

/**
 * Internal interface utilized to group info needed for SAT (separating axis theorem)
 */
interface SATInfo {
    axes: Point[];
    points: Point[];
    center: Point;
    buffer: number;
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

/**
 *
 * @param bound1 First bound, from usage this will always be a quad tree node bound or another object bound in the quad tree
 * @param bound2 Second bound, from usage this will always be the passed in user bound used for querying
 * @returns {Point | null} MTV (minimum translation vector) pointing towards the user passed in bound or null, if there is no collision/overlap with an object in the quad tree
 */
export function doBoundsIntersect(bound1: Bound, bound2: Bound): MinimumTranslationVectorInfo | null {
    if (isBoundingBox(bound1)) {
        if (isBoundingBox(bound2)) {
            if (!doBoxAndBoxIntersect(bound1 as BoundingBox, bound2 as BoundingBox)) return null;
            return aabbVsAabbMTV(bound1 as BoundingBox, bound2 as BoundingBox);
        }
        if (isCircle(bound2)) {
            return doIntersectBoundingBoxCircleSAT(bound1 as BoundingBox, bound2 as Circle, false);
        }
        // bound2 is a point
        const point2Box: BoundingBox = toBoundingBoxFromPoint(bound2 as Point);
        return doIntersectBoundingBoxesSAT(bound1 as BoundingBox, point2Box, false);
    }

    if (isCircle(bound1)) {
        if (isCircle(bound2)) {
            return doIntersectCirclesSAT(bound1 as Circle, bound2 as Circle, false);
        }
        if (isBoundingBox(bound2)) {
            return doIntersectBoundingBoxCircleSAT(bound2 as BoundingBox, bound1 as Circle, true);
        }
        // bound2 is a point
        const point2Circle: Circle = toCircleFromPoint(bound2 as Point);
        return doIntersectCirclesSAT(bound1 as Circle, point2Circle, false);
    }

    // bound1 is a point
    if (isCircle(bound2)) {
        const point1Circle: Circle = toCircleFromPoint(bound1 as Point);
        return doIntersectCirclesSAT(point1Circle, bound2 as Circle, false);
    }
    if (isBoundingBox(bound2)) {
        const point1Box: BoundingBox = toBoundingBoxFromPoint(bound1 as Point);
        return doIntersectBoundingBoxesSAT(point1Box, bound2 as BoundingBox, false);
    }
    // both points
    const point1Circle: Circle = toCircleFromPoint(bound1 as Point);
    const point2Circle: Circle = toCircleFromPoint(bound2 as Point);
    return doIntersectCirclesSAT(point1Circle, point2Circle, false);
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
    if (!doBoxAndCircleIntersect(box, circle)) return null;

    const r = circle.r;
    const cx = circle.x;
    const cy = circle.y;
    const maxX = box.x + box.width;
    const maxY = box.y + box.height;
    const halfW = box.width * 0.5;
    const halfH = box.height * 0.5;
    const boxCx = box.x + halfW;
    const boxCy = box.y + halfH;

    // Axis 1: (0, -1) — matches original NON_ROTATIONAL_AXIS_ALIGNED_BOUNDING_BOX_AXES order
    const aabbMin1 = -maxY;
    const aabbMax1 = -box.y;
    const circMin1 = -cy - r;
    const circMax1 = -cy + r;
    if (aabbMax1 < circMin1 || circMax1 < aabbMin1) return null;
    const overlap1 = Math.min(aabbMax1, circMax1) - Math.max(aabbMin1, circMin1);

    // Axis 2: (1, 0)
    const aabbMin2 = box.x;
    const aabbMax2 = maxX;
    const circMin2 = cx - r;
    const circMax2 = cx + r;
    if (aabbMax2 < circMin2 || circMax2 < aabbMin2) return null;
    const overlap2 = Math.min(aabbMax2, circMax2) - Math.max(aabbMin2, circMin2);

    let minOverlap = overlap1;
    let axisX = 0;
    let axisY = -1;
    if (overlap2 < minOverlap) {
        minOverlap = overlap2;
        axisX = 1;
        axisY = 0;
    }

    // Axis 3: Voronoi — find closest AABB corner to circle center without allocating Point objects
    const dxL = cx - box.x;
    const dxR = cx - maxX;
    const dyT = cy - box.y;
    const dyB = cy - maxY;

    let closestCornerX = box.x;
    let closestCornerY = box.y;
    let minDist2 = dxL * dxL + dyT * dyT;

    let d2 = dxR * dxR + dyT * dyT;
    if (d2 < minDist2) { minDist2 = d2; closestCornerX = maxX; closestCornerY = box.y; }

    d2 = dxR * dxR + dyB * dyB;
    if (d2 < minDist2) { minDist2 = d2; closestCornerX = maxX; closestCornerY = maxY; }

    d2 = dxL * dxL + dyB * dyB;
    if (d2 < minDist2) { closestCornerX = box.x; closestCornerY = maxY; }

    const voronoiDiffX = cx - closestCornerX;
    const voronoiDiffY = cy - closestCornerY;

    if (voronoiDiffX !== 0 || voronoiDiffY !== 0) {
        const voronoiLen = Math.sqrt(voronoiDiffX * voronoiDiffX + voronoiDiffY * voronoiDiffY);
        const ax3 = voronoiDiffX / voronoiLen;
        const ay3 = voronoiDiffY / voronoiLen;

        // Project AABB onto axis3 via support function — avoids materializing corners
        // max/min projection = center·axis ± (halfW·|ax| + halfH·|ay|)
        const centerProj3 = boxCx * ax3 + boxCy * ay3;
        const halfSpan3 = halfW * Math.abs(ax3) + halfH * Math.abs(ay3);
        const aabbMin3 = centerProj3 - halfSpan3;
        const aabbMax3 = centerProj3 + halfSpan3;

        const circCenter3 = cx * ax3 + cy * ay3;
        const circMin3 = circCenter3 - r;
        const circMax3 = circCenter3 + r;

        if (aabbMax3 < circMin3 || circMax3 < aabbMin3) return null;
        const overlap3 = Math.min(aabbMax3, circMax3) - Math.max(aabbMin3, circMin3);

        if (overlap3 < minOverlap) {
            minOverlap = overlap3;
            axisX = ax3;
            axisY = ay3;
        }
    }

    // Ensure MTV points toward sat2 (circle) when shouldFlipMtvDirection=false.
    // vectorFromSat1ToSat2 = circle_center - box_center (matches subtract(sat1.center, sat2.center) convention)
    const isMtvPointingTowardsSat2Center = (axisX * (cx - boxCx) + axisY * (cy - boxCy)) > 0;
    let dirX = axisX;
    let dirY = axisY;
    if (!isMtvPointingTowardsSat2Center && !shouldFlipMtvDirection ||
        isMtvPointingTowardsSat2Center && shouldFlipMtvDirection) {
        dirX = -dirX;
        dirY = -dirY;
    }

    return {
        vector: { x: dirX * minOverlap, y: dirY * minOverlap },
        direction: { x: dirX, y: dirY },
        magnitude: minOverlap,
    };
}

function aabbVsAabbMTV(box1: BoundingBox, box2: BoundingBox): MinimumTranslationVectorInfo {
    const overlapX = Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x);
    const overlapY = Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y);

    if (overlapX < overlapY) {
        const dirX = (box2.x + box2.width * 0.5) >= (box1.x + box1.width * 0.5) ? 1 : -1;
        return {
            vector: { x: overlapX * dirX, y: 0 },
            direction: { x: dirX, y: 0 },
            magnitude: overlapX,
        };
    } else {
        const dirY = (box2.y + box2.height * 0.5) >= (box1.y + box1.height * 0.5) ? 1 : -1;
        return {
            vector: { x: 0, y: overlapY * dirY },
            direction: { x: 0, y: dirY },
            magnitude: overlapY,
        };
    }
}

function doIntersectBoundingBoxesSAT(box1: BoundingBox, box2: BoundingBox, shouldFlipMtvDirection: boolean): MinimumTranslationVectorInfo | null {
    if (!doBoxAndBoxIntersect(box1, box2)) {
        return null;
    }

    const sat1: SATInfo = getSATInfoForBoundingBox(box1);
    const sat2: SATInfo = getSATInfoForBoundingBox(box2, false);

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
    const allAxes: Point[] = sat2.axes.length > 0 ? sat1.axes.concat(sat2.axes) : sat1.axes;

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

        for (const pointIn1 of sat1.points) {
            scalarProjection = getDot(pointIn1, normalizedAxis);
            minBox1 = Math.min(scalarProjection - sat1Buffer, minBox1);
            maxBox1 = Math.max(scalarProjection + sat1Buffer, maxBox1);
        }

        for (const pointIn2 of sat2.points) {
            scalarProjection = getDot(pointIn2, normalizedAxis);
            minBox2 = Math.min(scalarProjection - sat2Buffer, minBox2);
            maxBox2 = Math.max(scalarProjection + sat2Buffer, maxBox2);
        }

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

function getSATInfoForBoundingBox(box: BoundingBox, includeAxes = true): SATInfo {
    const points: Point[] = getPoints(box);

    return {
        axes: includeAxes ? NON_ROTATIONAL_AXIS_ALIGNED_BOUNDING_BOX_AXES : [],
        points,
        center: {
            x: box.x + (box.width / 2),
            y: box.y + (box.height / 2),
        },
        buffer: 0,
    };
}

import { BoundingBox, Point } from './schema';

export function containsPoint(bounds: BoundingBox, point: Point) {
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y &&
           point.y <= bounds.y + bounds.height;
}

export function doBoundingBoxesIntersect(box1: BoundingBox, box2: BoundingBox): boolean {
    // If one rectangle is to the side of other (outside)
    if (box1.x > box2.x + box2.width || box2.x > box1.x + box1.width) {
        return false;
    }

    // If one rectangle is above the other (outside)
    if (box1.y > box2.y + box2.height || box2.y > box1.y + box1.height) {
        return false;
    }

    return true;
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

export function flattenLists<T>(lists: Array<T[]>): T[] {
    return (lists || [])
        .reduce((prevList, currList) => {
            if (currList.length === 0) {
                return prevList;
            }
            return prevList.concat(currList);
        }, []);
}
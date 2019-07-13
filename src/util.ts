import { BoundingBox } from './schemas';

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

    const nwBoundingBox: BoundingBox = {
        x: 0,
        y: 0,
        width: quadWidth,
        height: quadHeight,
    };
    const neBoundingBox: BoundingBox = {
        x: quadWidth,
        y: 0,
        width: quadWidth,
        height: quadHeight,
    };
    const swBoundingBox: BoundingBox = {
        x: 0,
        y: quadHeight,
        width: quadWidth,
        height: quadHeight,
    };
    const seBoundingBox: BoundingBox = {
        x: quadWidth,
        y: quadHeight,
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
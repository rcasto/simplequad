
import { BoundingBox, CollisionObject } from "./schemas";
import { createQuadTree, addToQuadTree } from "./index";

interface Box extends CollisionObject {
    id: string;
}

const bounds: BoundingBox = {
    x: 0,
    y: 0,
    width: 400,
    height: 400,
};
const quadTree = createQuadTree(bounds, 3);

console.log(quadTree);

const nwBox: Box = {
    id: "northwest",
    getBoundingBox: () => {
        return {
            x: 0,
            y: 0,
            width: 20,
            height: 20,
        };
    }
};
const neBox: Box = {
    id: "northeast",
    getBoundingBox: () => {
        return {
            x: bounds.width / 2 + 1,
            y: 0,
            width: 20,
            height: 20,
        };
    }
};
const swBox: Box = {
    id: "southwest",
    getBoundingBox: () => {
        return {
            x: 0,
            y: bounds.height / 2 + 1,
            width: 20,
            height: 20,
        };
    }
};
const seBox: Box = {
    id: "southeast",
    getBoundingBox: () => {
        return {
            x: bounds.width / 2 + 1,
            y: bounds.height / 2 + 1,
            width: 20,
            height: 20,
        };
    }
};

addToQuadTree(quadTree, nwBox);
addToQuadTree(quadTree, neBox);
addToQuadTree(quadTree, swBox);

// Adding 1 more instance of the box
// exceeds the nodes capacity, triggering a split
addToQuadTree(quadTree, seBox);

console.log(quadTree);
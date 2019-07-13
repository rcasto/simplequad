
import { BoundingBox, CollisionObject } from "./schemas";
import { createQuadTree, addToQuadTree } from "./index";

const bounds: BoundingBox = {
    x: 0,
    y: 0,
    width: 400,
    height: 400,
};
const quadTree = createQuadTree(bounds);

console.log(quadTree);

const box1: CollisionObject = {
    getBoundingBox: () => {
        return {
            x: 0,
            y: 0,
            width: 20,
            height: 20,
        };
    }
};

addToQuadTree(quadTree, box1);

console.log(quadTree);
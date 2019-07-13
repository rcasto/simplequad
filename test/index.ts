
import { BoundingBox, CollisionObject } from "../src/schemas";
import { createQuadTree } from "../src/index";

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

quadTree.add(nwBox);
quadTree.add(neBox);
quadTree.add(swBox);

// Adding 1 more instance of the box
// exceeds the nodes capacity, triggering a split
quadTree.add(seBox);

console.log(quadTree);

// Query the entire bounds and make sure
// all the objects are returned (should be 4)
const queryResults1 = quadTree.query(bounds);
console.log(queryResults1);

// Now query on a smaller window, picking up 2 of them
// The top half of the overall quadtree bounds
const topHalfBounds: BoundingBox = {
    x: 0,
    y: 0,
    width: bounds.width,
    height: bounds.height / 2,
};
const queryResult2 = quadTree.query(topHalfBounds);
console.log(queryResult2);

const topHalfHalfBounds: BoundingBox = {
    x: 0,
    y: 0,
    width: topHalfBounds.width,
    height: topHalfBounds.height / 2,
};
const queryResult3 = quadTree.query(topHalfHalfBounds);
console.log(queryResult3);
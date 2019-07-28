# simplequad
A simple [quadtree](https://en.wikipedia.org/wiki/Quadtree) implementation useful for 2D collision detection and more.

**Note:** This library will help you determine which objects have collided with each other. It will not help with resolving these collisions, however.

## Installation

### npm
```
npm install simplequad
```

### CDN
```html
<script src="https://unpkg.com/simplequad@latest/dist/simplequad.umd.min.js"></script>
```

The window global is `SimpleQuad`.

## Usage
```typescript
import { BoundingBox, CollisionObject, createQuadTree, QuadTree } from 'simplequad';

interface Monster extends CollisionObject {
    hp: number;
    attack: number;
    favoriteFood: string;
}

// Define both the bounds with which this QuadTree should manage
// and the capacity of each node or bucket in the QuadTree
const bounds: BoundingBox = {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
};
const nodeCapacity: number = 5;

// Create the QuadTree by passing in the Bounds and Capacity
// The bounds here are required to be a BoundingBox
const quadTree: QuadTree = createQuadTree(bounds, nodeCapacity);

// Create a monster object
const monster: Monster = {
    hp: 100,
    attack: 50,
    favoriteFood: 'tacos',
    // Requirement is that objects added to the QuadTree
    // implement a getBoundingBox method, this method returns a Bound
    // containing the object
    // A Bound can be a Circle, Point, or BoundingBox.
    getBounds() {
        return {
            x: 0,
            y: 0,
            width: 200,
            height: 200,
        };
    }
};

// Let's first check for the monster
// He shouldn't be there
let monsterResultSet = quadTree.query(monster.getBounds());
console.log(`# of monsters found: ${monsterResultSet.size}`);

// Now let's add the monster object to the QuadTree
quadTree.add(monster);
console.log("Added the monster");

// Now lets make sure the monster is there
// Let's hope he didn't run off
monsterResultSet = quadTree.query(monster.getBounds());
console.log(`# of monsters found: ${monsterResultSet.size}`);

// Remove the monster from the QuadTree
// No one likes monsters...geesh
quadTree.remove(monster);
console.log("Removed the monster");

// Let's just make sure we actually
// got rid of the monster
monsterResultSet = quadTree.query(monster.getBounds());
console.log(`# of monsters found: ${monsterResultSet.size}`);

// Remove all objects from the QuadTree
// It's already empty...but let's just make sure
// we got all the monsters
quadTree.clear();
console.log("Cleared all monsters...they be gone");
```

### Examples
- simplequad with monster (above example)
    - [CodePen](https://codepen.io/rcasto/pen/JgPjVm?editors=0012)
- simplequad with static circles
    - [CodePen](https://codepen.io/rcasto/full/EqYxWw)
- simplequad with moving circles
    - [CodePen](https://codepen.io/rcasto/full/wVGGzV)
- simplequad with images 
    - [CodePen](https://codepen.io/rcasto/full/MNjryG)
- simple with images (web worker)
    - [CodePen](https://codepen.io/rcasto/full/PMbXMm)
    - [GitHub Page](https://rcasto.github.io/simplequad-playground/)

## API
All of the schema definitions shown below, can also be found in the `schema.ts` within the repo.

### Creating a QuadTree
```typescript
/**
 * Creates a quadtree "managing" the input bounds with input node capacity.
 * 
 * All collision objects should intersect or be contained within these "managed" bounds.
 * @param {BoundingBox} bounds - The bounding box with which the quadtree "manages".
 * @param {number} [capacity=3] - The # of collision objects a node can contain before subdividing.
 * @return {QuadTree} The created quadtree "managing" the input bounds.
 */
export function createQuadTree<T extends CollisionObject>(bounds: BoundingBox, capacity: number = 3): QuadTree<T> {
    const quadTree: QuadTree<T> = {
        bounds,
        data: new Map<string, Set<T>>(),
        capacity,
        quadrants: [],
        add: (object) => addToQuadTree(quadTree, object),
        remove: (object) => removeFromQuadTree(quadTree, object),
        clear: () => clearQuadTree(quadTree),
        query: (bounds) => queryQuadTree(quadTree, bounds),
        getData: () => getQuadTreeData(quadTree),
    };
    return quadTree;
}
```

### QuadTree
```typescript
export interface QuadTree<T extends CollisionObject = CollisionObject> {
    // Properties
    /**
     * The bounding box that this quadtree "manages".
     * 
     * Collision objects within this node are within these bounds.
     * Child nodes have there bounds derived from these bounds.
     */
    bounds: BoundingBox;
    /**
     * Holds data in each node or bucket.
     * Key is generated from point (x, y).
     * Key for (x, y) is "(x,y)"
     * Each point can hold a set of collision objects. These won't count towards the node capacity.
     * 
     * This will be empty for "container nodes".
     */
    data: Map<string, Set<T>>;
    /**
     * The number of collision objects this node can hold
     * before subdividing.
     * 
     * Child quadtrees or nodes will inherit this capacity upon subdividing.
     */
    capacity: number;
    /**
     * The child buckets/quadrants/nodes of this quadtree. They themselves
     * are quadtrees. Each manages a quarter of this quadtree's bounds.
     * 
     * This will be of length 4 for "container" nodes.
     * This will be empty for leaf nodes.
     */
    quadrants: QuadTree<T>[];
    // Methods
    /**
     * Adds a collision object to the quadtree.
     * 
     * Will subdivide leaf nodes when there capacity is reached and re-distribute collision objects.
     * @param {T} object - The collision object to add to the quadtree.
     * @return {boolean} True if the collision object was added, false if the collision object was not.
     */
    add: (object: T) => boolean;
    /**
     * Removes a collision object from the quadtree.
     * 
     * Will collapse or consume child leaf nodes to parent node if # of child collision objects is less than
     * individual node capacity. Meaning parent can fit child collision objects.
     * @param {T} object - The collision object to remove from the quadtree.
     * @return {boolean} True if the collision object was removed, false if the collision object was not.
     */
    remove: (object: T) => boolean;
    /**
     * Clears the quadtree of all data and quadrant subdivisions (child nodes).
     */
    clear: () => void;
    /**
     * Queries the quadtree, finding what collision objects intersect with the input
     * query bound.
     * @param {Bound} bounds - The query window bounds, or "lens" into the quadtree to find intersections.
     * @return {Set<T>} The set of objects the query window bounds intersect with. If empty, there are no intersections.
     */
    query: (bounds: Bound) => Set<T>;
    /**
     * Convenience method offered to get the data for a node in an easier manner
     * Will take a flatten the map of data to a collection.
     * 
     * The data comes from being set based, so you can assume all of the items
     * are unique or different references.
     * @return {T[]} The list of collision objects that this "bucket" holds
     */
    getData: () => T[];
}
```

### CollisionObject
```typescript
export interface CollisionObject {
    /**
     * @return {Bound} Bounds that contain the object. Should be as "tight" as possible to actual object shape.
     */
    getBounds: () => Bound;
}
```

### Bounds
```typescript
export type Bound = BoundingBox | Circle | Point;
```

#### Point
```typescript
export interface Point {
    x: number;
    y: number;
}
```

#### BoundingBox
```typescript
export interface BoundingBox extends Point {
    width: number;
    height: number;
}
```

#### Circle
```typescript
export interface Circle extends Point {
    r: number;
}
```

## Testing
Tests can be ran by simply executing:
```
npm test
```

Generating code coverage report for tests:
```
npm run test:coverage
```

**Note:** Make sure to first install the dev dependency packages via `npm install`.
# simplequad
A simple QuadTree implementation. Mainly implemented for my own learning and introduction into 2D games.  

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
- simplequad with monster (above example) - [CodePen](https://codepen.io/rcasto/pen/JgPjVm?editors=0012)
- simplequad with circles - [CodePen](https://codepen.io/rcasto/full/EqYxWw)

## API
All of the schema definitions shown below, can also be found in the `schema.ts` within the repo.

### QuadTree
```typescript
export interface QuadTree {
    // Properties
    bounds: BoundingBox;
    data: Map<string, Set<CollisionObject>>;
    capacity: number;
    quadrants: QuadTree[];
    // Methods
    add: (object: CollisionObject) => boolean;
    remove: (object: CollisionObject) => boolean;
    clear: () => void;
    query: (bounds: Bound) => Set<CollisionObject>;
}
```

### Point
```typescript
export interface Point {
    x: number;
    y: number;
}
```

### BoundingBox
```typescript
export interface BoundingBox extends Point {
    width: number;
    height: number;
}
```

### Circle
```typescript
export interface Circle extends Point {
    r: number;
}
```

### Bound
```typescript
export type Bound = BoundingBox | Circle | Point;
```

### CollisionObject
```typescript
export interface CollisionObject {
    getBounds: () => Bound;
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

Make sure to first install the packages via `npm install`.
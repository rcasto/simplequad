# simplequad
A simple QuadTree implementation. Mainly implemented for my own learning and introduction into 2D games.  

## Installation

### npm
```
npm install simplequad
```

### CDN
```html
<script src="https://unpkg.com/simplequad"></script>
```

The window global is `SimpleQuad`.

## Usage
```typescript
import { BoundingBox, createQuadTree, QuadTree } from 'simplequad';

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
const quadTree: QuadTree = SimpleQuad.createQuadTree(bounds, nodeCapacity);

// Create a monster object
const monster: CollisionObject = {
    hp: 100,
    attack: 50,
    favoriteFood: 'tacos',
    // Current requirement is that objects added to the QuadTree
    // implement a getBoundingBox method, this method returns a BoundingBox
    // containing the object
    getBoundingBox() {
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
let monsterResultSet = quadTree.query(monster.getBoundingBox());
console.log(`# of monsters found: ${monsterResultSet.size}`);

// Now let's add the monster object to the QuadTree
quadTree.add(monster);
console.log("Added the monster");

// Now lets make sure the monster is there
// Let's hope he didn't run off
monsterResultSet = quadTree.query(monster.getBoundingBox());
console.log(`# of monsters found: ${monsterResultSet.size}`);

// Remove the monster from the QuadTree
// No one likes monsters...geesh
quadTree.remove(monster);
console.log("Removed the monster");

// Let's just make sure we actually
// got rid of the monster
monsterResultSet = quadTree.query(monster.getBoundingBox());
console.log(`# of monsters found: ${monsterResultSet.size}`);

// Remove all objects from the QuadTree
// It's already empty...but let's just make sure
// we got all the monster
quadTree.clear();
console.log("Cleared all monsters...they be gone");
```

### Examples
- simplequad with monster (above example) - [CodePen](https://codepen.io/rcasto/pen/JgPjVm?editors=0012)
- simplequad with circles - [CodePen](https://codepen.io/rcasto/full/EqYxWw)

## API
All of the schema definitions can be found in the `schema.ts` file of the repo.

### QuadTree
```typescript
export interface QuadTree {
    // Properties
    bounds: BoundingBox;
    data: Map<string, CollisionObject[]>;
    capacity: number;
    quadrants: QuadTree[];
    // Methods
    add: (object: CollisionObject) => boolean;
    remove: (object: CollisionObject) => boolean;
    clear: () => void;
    query: (bounds: BoundingBox) => CollisionObject[];
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

### CollisionObject
```typescript
export interface CollisionObject {
    getBoundingBox: () => BoundingBox;
}
```

## Testing
Tests can be ran by simply executing:
```
npm test
```

Make sure to first install the packages via `npm install`.
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
const quadTree: QuadTree = createQuadTree(bounds, nodeCapacity);

// Create a monster object
const monster = {
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

// Add the monster object to the QuadTree
quadTree.add(monster);

// Query for objects with BoundingBox window
// Here we'll query with the monsters own BoundingBox
quadTree.query(monster.getBoundingBox());

// Remove the monster from the QuadTree
// No one likes monsters...geesh
quadTree.remove(monster);

// Remove all objects from the QuadTree
// It's already empty...but let's make sure
quadTree.clear();
```

[Live CodePen example](https://codepen.io/rcasto/full/EqYxWw)

## API
### QuadTree
```typescript
export interface QuadTree {
    // Properties
    bounds: BoundingBox;
    data: Set<CollisionObject>;
    capacity: number;
    quadrants: QuadTree[];
    // Methods
    add: (object: CollisionObject) => boolean;
    remove: (object: CollisionObject) => boolean;
    clear: () => void;
    query: (bounds: BoundingBox) => Set<CollisionObject>;
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

All of these schemas can be found in the `schema.ts` file of the repo.

## Testing
Tests can be ran by simply executing:
```
npm test
```

Make sure to first install the packages via `npm install`.
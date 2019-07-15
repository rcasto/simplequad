# simplequad
A simple QuadTree implementation. Mainly implemented for my own learning and introduction into making 2D games.  

## Installation
Not on npm yet, will update with that info later.

1. Clone the repo
2. Run `npm run build`
3. Utilize one of the CJS, ES, or IIFE modules output in the `dist` folder

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
```

## API
- createQuadTree(bounds: BoundingBox, capacity?: number): QuadTree

QuadTree
- add: (object: CollisionObject) => boolean;
- remove: (object: CollisionObject) => boolean;
- clear: () => void;
- query: (bounds: BoundingBox) => Set<CollisionObject>;

## Testing
Tests can be ran by simply executing:
`npm test`
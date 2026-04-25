# simplequad

[![Node.js CI](https://github.com/rcasto/simplequad/actions/workflows/node.js.yml/badge.svg)](https://github.com/rcasto/simplequad/actions/workflows/node.js.yml)

Most spatial indexers return candidates — simplequad returns results. One `query()` call gives you the colliding objects *and* the overlap vector to push them apart. No second library, no glue code.

Bundles quadtree spatial partitioning, SAT intersection testing, and minimum translation vector (MTV) output in a single zero-dependency TypeScript package. Supports `BoundingBox`, `Circle`, and `Point`, freely mixed. It detects and measures collisions — resolution is up to you.

![simplequad](./simplequad.gif)  
[Examples →](https://rcasto.github.io/simplequad/)

---

## Who this is for

You're building a canvas game or interactive 2D app and you need to know: *what am I colliding with, and by how much?* — without pulling in a full physics engine.

```ts
const hits = tree.query(myObject);
// hits: Array<{ object: T, mtv: MinimumTranslationVectorInfo }>
```

One call returns the colliding objects and the overlap vectors you need to push things apart. Supported shapes: `BoundingBox`, `Circle`, `Point`, freely mixed.

If you're using a canvas renderer or something like Pixi.js — which has no built-in collision — simplequad plugs in cleanly.

### Games that fit

| Genre | Typical active objects | Fits? |
|-------|------------------------|-------|
| Casual / puzzle | < 100 | Comfortably |
| Platformer (player + enemies + projectiles) | 50–80 | Comfortably |
| Top-down shooter / twin-stick | 100–200 | Yes |
| Tower defense (peak wave) | 150–350 | Yes |
| Bullet hell | 500–2000 | No |
| RTS (large armies) | 300–1000+ | No |

---

## When to look elsewhere

- **Beyond ~1000 dynamic objects.** Stays within the 60fps budget up to 1000 objects; past that, you want something purpose-built for high object counts.
- **Rotation or convex polygons.** Only axis-aligned boxes, circles, and points are supported.
- **Continuous collision detection.** Intersections are checked at query time — fast-moving objects can tunnel through thin geometry between frames.
- **Full physics simulation.** No mass, inertia, joints, or constraints. simplequad tells you *that* objects overlap and *by how much*, not how they should physically react.

---

## Performance

Benchmarked using the game-loop pattern (clear → add all → query each object per frame) with AABB objects, averaged across multiple seeds:

| Objects | avg frame time | p95 frame time | 60fps budget used |
|---------|----------------|----------------|-------------------|
| 100     | 0.14ms         | 0.15ms         | 0.8%              |
| 200     | 0.32ms         | 0.33ms         | 1.9%              |
| 300     | 0.56ms         | 0.59ms         | 3.4%              |
| 500     | 1.12ms         | 1.15ms         | 6.7%              |
| 1000    | 2.98ms         | 3.3ms          | 17.8%             |

The p95 column shows worst-case frame time across test samples; it stays within the 16.7ms budget at all tested object counts.

**Mixed-shape note:** Scenes with circles run at roughly 1.5–2× the cost of AABB-only scenes at the same object count and query window size.

---

## Installation

### npm
```
npm install simplequad
```

### CDN
```html
<script src="https://unpkg.com/simplequad@latest/dist/simplequad.umd.js"></script>
```

The window global is `SimpleQuad`.

---

## Usage

### Game loop pattern (recommended for moving objects)

Clear and rebuild the tree every frame. This is the pattern the benchmarks above are based on.

```ts
import { createQuadTree } from 'simplequad';

const tree = createQuadTree({ x: 0, y: 0, width: 800, height: 600 });

function gameLoop(entities: Entity[]) {
    tree.clear();
    for (const entity of entities) {
        tree.add(entity);
    }
    for (const entity of entities) {
        const hits = tree.query(entity);
        for (const { object, mtv } of hits) {
            // object: the entity this one is colliding with
            // mtv.vector: apply to entity's position to push it out of the overlap
        }
    }
}
```

### Basic example

```typescript
import { BoundingBox, Bound, createQuadTree, QuadTree } from 'simplequad';

interface Monster extends Bound {
    hp: number;
    attack: number;
    favoriteFood: string;
}

const bounds: BoundingBox = { x: 0, y: 0, width: 800, height: 600 };
const quadTree: QuadTree<Monster> = createQuadTree(bounds);

const monster: Monster = {
    x: 0, y: 0, width: 200, height: 200,
    hp: 100, attack: 50, favoriteFood: 'tacos',
};

quadTree.add(monster);

const results = quadTree.query({ x: 0, y: 0, width: 100, height: 100 });
// results[0].object === monster
// results[0].mtv contains the overlap vector

quadTree.remove(monster);
quadTree.clear();
```

### Moving a single object

simplequad doesn't track object movement. To reposition an object:

```ts
tree.remove(entity);
entity.x = newX;
entity.y = newY;
tree.add(entity);
```

For scenes with many moving objects, the clear+rebuild pattern above is simpler at scale.

### MTV semantics

`query()` returns an MTV for each colliding object. The vector points from the found object *toward* the querying object, with a magnitude equal to the overlap depth.

To push the querying object out of a collision:

```ts
const hits = tree.query(player);
for (const { mtv } of hits) {
    player.x += mtv.vector.x;
    player.y += mtv.vector.y;
}
```

---

## Examples

Live demos at **[rcasto.github.io/simplequad](https://rcasto.github.io/simplequad/)**

| Example | What it shows |
|---------|---------------|
| [Query Explorer](examples/hello-world/index.html) | All three shape types, live query window, MTV arrows drawn — start here |
| [Platformer](examples/platformer/index.html) | AABB collision and MTV resolution — player stands on platforms and collects coins |
| [Top-down Shooter](examples/shooter/index.html) | Circle queries across escalating enemy waves, 100–200 dynamic objects |
| [Breakout](examples/breakout/index.html) | Mixed shapes — circle ball vs. AABB bricks, MTV drives push-out and reflection angle |
| [Boids](examples/boids/index.html) | 150 flocking agents querying spatial neighborhoods every frame; toggle tree overlay |
| [Gravity Sandbox](examples/gravity-sandbox/index.html) | Spawn colliding blobs with real-time gravity and drag controls |
| [Asteroid Field](examples/asteroid-field/index.html) | Split mechanic — rocks fragment on impact, mixed-size circle queries grow each frame |
| [Tower Defense](examples/tower-defense/index.html) | Fixed towers query a range circle every frame against many path-following enemies |
| [Predator-Prey](examples/predator-prey/index.html) | Prey flock and flee via spatial queries; predators hunt and eat on collision — same tree, two roles |

---

## API

All schema definitions are also available in `schema.ts` in the repo.

### `createQuadTree(bounds, capacity?, maxDepth?)`

```typescript
export function createQuadTree<T extends Bound>(
    bounds: BoundingBox,
    capacity: number = 5,
    maxDepth: number = 8
): QuadTree<T>
```

Creates a quadtree over the given bounds. All objects added should intersect or be contained within these bounds.

- `capacity` — number of objects a node holds before subdividing. Higher values mean shallower trees; lower values mean finer spatial partitioning. Tune upward for scenes with many objects clustered in small areas.
- `maxDepth` — maximum subdivision depth. Nodes at this depth store objects regardless of capacity, preventing unbounded recursion when many objects share a small region.

### `QuadTree<T>`

```typescript
export interface QuadTree<T extends Bound = Bound> {
    bounds: BoundingBox;
    capacity: number;

    add(object: T): boolean;
    remove(object: T): boolean;
    clear(): void;
    query(bounds: Bound): Array<QueryResult<T>>;
    getData(): T[];
}
```

#### `add(object)`
Adds a collision object to the tree. Returns `true` if added, `false` if the object falls outside the tree's bounds.

Subdivides the containing node when capacity is reached, redistributing its objects into child quadrants.

#### `remove(object)`
Removes a collision object from the tree. Returns `true` if found and removed, `false` otherwise.

#### `clear()`
Removes all objects and resets all subdivisions.

#### `query(bounds)`
Returns all objects in the tree whose bounds intersect the given query bounds. The query bounds themselves are not included in the results.

#### `getData()`
Returns all objects currently in the tree as a flat array.

---

### `QueryResult<T>`

```typescript
export interface QueryResult<T> {
    object: T;
    mtv: MinimumTranslationVectorInfo;
}
```

---

### `MinimumTranslationVectorInfo`

```typescript
export interface MinimumTranslationVectorInfo {
    vector: Point;     // full translation vector (direction × magnitude)
    direction: Point;  // unit vector
    magnitude: number; // overlap depth
}
```

The MTV points from the found object toward the querying object. Apply `mtv.vector` to the querying object's position to push it out of the overlap. The coordinate space assumes x increases left-to-right and y increases top-to-bottom.

---

### Bound types

```typescript
export type Bound = BoundingBox | Circle | Point;

export interface Point {
    x: number;
    y: number;
}

export interface BoundingBox extends Point {
    width: number;
    height: number;
}

export interface Circle extends Point {
    r: number;
}
```

Objects added to the tree must extend one of these types directly (the relevant fields must be present on the object itself).

---

## Testing

```
npm install
npm test
```

Coverage report:
```
npm run test:coverage
```

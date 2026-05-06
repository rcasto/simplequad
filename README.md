# simplequad

[![Node.js CI](https://github.com/rcasto/simplequad/actions/workflows/ci.yml/badge.svg)](https://github.com/rcasto/simplequad/actions/workflows/ci.yml)
[![Bundle Size](https://deno.bundlejs.com/badge?q=simplequad@latest)](https://deno.bundlejs.com/badge?q=simplequad@latest)

Bundles quadtree spatial partitioning, SAT intersection testing, and minimum translation vector (MTV) output in a single zero-dependency TypeScript package.

![simplequad](./simplequad.gif)  
[Examples →](https://rcasto.github.io/simplequad/)

---

## Who this is for

You're building a canvas game or interactive 2D app and you need to know: _what am I colliding with, and by how much?_ — without pulling in a full physics engine.

```ts
const hits = tree.query(myObject);
// hits: Array<{ object: T, mtv: MinimumTranslationVectorInfo }>
```

One call returns the colliding objects and the overlap vectors you need to push things apart. Supported shapes: `BoundingBox`, `Circle`, `Point`, freely mixed.

If you're using a canvas renderer or something like Pixi.js — which has no built-in collision — simplequad plugs in cleanly.

### Object count guide

| Scale  | Object count | Example genres                  | Budget used |
| ------ | ------------ | ------------------------------- | ----------- |
| Small  | < 100        | Casual, puzzle, platformer      | < 1.5%      |
| Medium | 100–500      | Shooter, tower defense, boids   | 1.5–10%     |
| Large  | 500–1 000    | Horde survival, light RTS       | 10–26%      |
| XL     | 1 000+       | Dense bullet hell, large armies | Not advised |

At 1 000 objects, simplequad uses ~26% of the frame budget — real headroom for game logic and rendering. Drop below 500 and it's nearly free.

---

## When to look elsewhere

- **Beyond 1000 dynamic objects.** Stays within the 60fps budget up to 1000 objects; past that, you want something purpose-built for high object counts.
- **Rotation or convex polygons.** Only axis-aligned boxes, circles, and points are supported.
- **Continuous collision detection.** Intersections are checked at query time — fast-moving objects can tunnel through thin geometry between frames.
- **Full physics simulation.** No mass, inertia, joints, or constraints. simplequad tells you _that_ objects overlap and _by how much_, not how they should physically react.

---

## Performance

Benchmarked using the game-loop pattern (clear → add all → query each object per frame) with AABB objects, averaged across multiple seeds:

| Objects | avg frame time | p95 frame time | 60fps budget used |
| ------- | -------------- | -------------- | ----------------- |
| 100     | 0.233ms        | 0.238ms        | 1.4%              |
| 200     | 0.491ms        | 0.501ms        | 2.9%              |
| 300     | 0.861ms        | 0.878ms        | 5.2%              |
| 500     | 1.634ms        | 1.657ms        | 9.8%              |
| 1000    | 4.271ms        | 4.669ms        | 25.6%             |

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
import { createQuadTree } from "simplequad";

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

### Moving a single object

Use `move()` to atomically remove, mutate, and re-insert an object:

```ts
tree.move(entity, (e) => {
  e.x = newX;
  e.y = newY;
});
```

Returns `false` if the object wasn't in the tree. Manually doing `remove` → mutate → `add` also works, but forgetting the `remove` first silently leaves a stale entry.

For scenes with many moving objects, the clear+rebuild pattern above is simpler at scale.

### MTV semantics

`query()` returns an MTV for each colliding object. The vector points from the found object _toward_ the querying object, with a magnitude equal to the overlap depth.

To push the querying object out of a collision:

```ts
const hits = tree.query(player);
for (const { mtv } of hits) {
  player.x += mtv.vector.x;
  player.y += mtv.vector.y;
}
```

### Physics response patterns

simplequad tells you _where_ objects overlap and by _how much_. What to do with that depends on your game type.

**Platformer** — detect floor, ceiling, and wall contacts by MTV direction, then zero the matching velocity component:

```typescript
const hits = tree.query(player.body);
player.onGround = false;

for (const { mtv } of hits) {
  player.x += mtv.vector.x;
  player.y += mtv.vector.y;

  if (mtv.vector.y < -0.1) {
    // pushed upward → landed on floor
    player.vy = 0;
    player.onGround = true;
  }
  if (mtv.vector.y > 0.1 && player.vy < 0) player.vy = 0; // hit ceiling while moving up
  if (Math.abs(mtv.vector.x) > 0.1) player.vx = 0; // hit wall
}
```

The `0.1` threshold filters near-zero y values from diagonal MTVs so they don't trigger floor/ceiling detection incorrectly. See [Pixi.js Platformer](examples/pixi-platformer/src/main.ts) for a full implementation with dt-based gravity and smooth acceleration.

**Elastic collision** — split the MTV equally between two moving bodies and exchange an impulse along the collision normal:

```typescript
for (const { object, mtv } of tree.query(body)) {
  // Shared push-out (each body moves half)
  body.x += mtv.vector.x * 0.5;
  body.y += mtv.vector.y * 0.5;
  object.x -= mtv.vector.x * 0.5;
  object.y -= mtv.vector.y * 0.5;

  // Impulse along normal (equal masses, restitution coefficient e)
  const nx = mtv.direction.x,
    ny = mtv.direction.y;
  const dvx = body.vx - object.vx,
    dvy = body.vy - object.vy;
  const dot = dvx * nx + dvy * ny;
  if (dot < 0) {
    // only exchange impulse if approaching
    const impulse = (dot * (1 + e)) / 2;
    body.vx -= impulse * nx;
    body.vy -= impulse * ny;
    object.vx += impulse * nx;
    object.vy += impulse * ny;
  }
}
```

See [Gravity Sandbox](examples/gravity-sandbox/index.html).

**Soft separation** — for crowd simulation where only positions matter, not velocities:

```typescript
for (const { mtv } of tree.query(entity)) {
  entity.x += mtv.vector.x * 0.5;
  entity.y += mtv.vector.y * 0.5;
}
```

See [Horde Survival](examples/horde-survival/index.html) — this keeps 500+ enemies from overlapping without any velocity math.

---

## Examples

Live demos at **[rcasto.github.io/simplequad](https://rcasto.github.io/simplequad/)**

| Example                                                | What it shows                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| [Query Explorer](examples/hello-world/index.html)      | All three shape types, live query window, MTV arrows drawn — start here                                      |
| [Platformer](examples/platformer/index.html)           | AABB collision and MTV resolution — player stands on platforms and collects coins                            |
| [Top-down Shooter](examples/shooter/index.html)        | Circle queries across escalating enemy waves, 100–200 dynamic objects                                        |
| [Horde Survival](examples/horde-survival/index.html)   | Wave-based survival with escalating enemy counts; stress-tests the tree at high object densities             |
| [Breakout](examples/breakout/index.html)               | Mixed shapes — circle ball vs. AABB bricks, MTV drives push-out and reflection angle                         |
| [Boids](examples/boids/index.html)                     | 150 flocking agents querying spatial neighborhoods every frame; toggle tree overlay                          |
| [Gravity Sandbox](examples/gravity-sandbox/index.html) | Spawn colliding blobs with real-time gravity and drag controls                                               |
| [Asteroid Field](examples/asteroid-field/index.html)   | Split mechanic — rocks fragment on impact, mixed-size circle queries grow each frame                         |
| [Tower Defense](examples/tower-defense/index.html)     | Fixed towers query a range circle every frame against many path-following enemies                            |
| [Predator-Prey](examples/predator-prey/index.html)     | Prey flock and flee via spatial queries; predators hunt and eat on collision — same tree, two roles          |
| [Pixi.js Platformer](examples/pixi-platformer)         | Rolling circle player on a scrolling level; Pixi.js renders, simplequad handles circle-vs-AABB MTV collision |
| [Image Compression](examples/image-compression)        | Upload any image — a quadtree progressively compresses it, subdividing where colors vary most                |

---

## API

All schema definitions are also available in `schema.ts` in the repo.

### `createQuadTree` / `create`

`create` is an alias for `createQuadTree` — both refer to the same function.

**Standard form** — object type must extend `Bound`:

```typescript
export function createQuadTree<T extends Bound>(
  bounds: BoundingBox,
  options?: QuadTreeOptions<T>,
): QuadTree<T>;
```

**Extractor form** — use when your objects don't extend `Bound` directly:

```typescript
export function createQuadTree<T>(
  bounds: BoundingBox,
  options: QuadTreeOptions<T> & { extractor: (obj: T) => Bound },
): QuadTree<T>;
```

Creates a quadtree over the given bounds. All objects added should intersect or be contained within these bounds.

- `capacity` (default `5`) — number of objects a node holds before subdividing. Higher values mean shallower trees; lower values mean finer spatial partitioning. Tune upward for scenes with many objects clustered in small areas.
- `maxDepth` (default `8`) — maximum subdivision depth. Nodes at this depth store objects regardless of capacity, preventing unbounded recursion when many objects share a small region.
- `extractor` — function that derives a `Bound` from your object. When provided, `T` can be any type. When omitted, `T` must extend `Bound`. See [Extractor pattern](#extractor-pattern) below.

> Positional `capacity` and `maxDepth` arguments (`createQuadTree(bounds, 5, 8)`) remain supported for backwards compatibility but are not the preferred form.

### `QuadTreeOptions<T>`

```typescript
export interface QuadTreeOptions<T = Bound> {
  capacity?: number;
  maxDepth?: number;
  extractor?: (obj: T) => Bound;
}
```

When `extractor` is provided, `T` can be any type. When `extractor` is omitted, `T` must extend `Bound`.

### `QuadTree<T>`

#### Mutation

**`add(object: T): boolean`** — Adds an object. Returns `false` if it falls outside the tree's bounds. Subdivides the containing node when capacity is reached.

**`remove(object: T): boolean`** — Removes an object by reference equality. Returns `false` if not found.

**`clear(): void`** — Removes all objects and resets all subdivisions.

**`move(object: T, updateFn: (obj: T) => void): boolean`** — Atomically removes, calls `updateFn` to mutate, then re-inserts. Returns `false` if the object was not in the tree. Use this instead of manual `remove` → mutate → `add` to avoid leaving stale entries.

#### Querying

**`query(bounds: Bound): Array<QueryResult<T>>`** — Returns all objects whose bounds intersect `bounds`, with MTV for each. If the same object reference was added to the tree and passed as `bounds`, it is automatically excluded. When using an extractor, use `queryFor()` instead.

**`queryFor(object: T): Array<QueryResult<T>>`** — Like `query()` but takes a `T` directly. When an extractor is configured, applies it automatically and excludes `object` from results by reference. Prefer this over `query()` for entity-vs-world collision checks.

**`queryBroad(bounds: Bound): T[]`** — Like `query()` but skips SAT — returns the objects themselves (no MTV) whose bounds broadly overlap `bounds`. Faster; use for AI sight ranges, audio zones, spawn checks, and flocking neighbor lookups.

#### Inspection

**`getData(): T[]`** — Returns all objects currently in the tree as a flat deduplicated array.

**`contains(object: T): boolean`** — Returns `true` if the given object reference is in the tree.

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
  vector: Point; // full translation vector (direction × magnitude)
  direction: Point; // unit vector
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

Objects added to the tree must either extend one of these types directly, or be used with the [extractor pattern](#extractor-pattern) described below.

---

## Extractor pattern

By default, simplequad reads spatial bounds directly from the objects you add (`x`, `y`, `width`/`height` or `r`). If your objects store their position elsewhere, pass an `extractor` function at tree creation time instead.

```ts
import { create } from "simplequad";

// Works with any object shape
interface Sprite {
  id: string;
  pos: { x: number; y: number };
  w: number;
  h: number;
}

const tree = create<Sprite>(
  { x: 0, y: 0, width: 800, height: 600 },
  {
    extractor: (sprite) => ({
      x: sprite.pos.x,
      y: sprite.pos.y,
      width: sprite.w,
      height: sprite.h,
    }),
  },
);

tree.add(sprite);
tree.remove(sprite);

// query for a specific entity's collisions — extractor and self-exclusion handled automatically:
const hits = tree.queryFor(sprite);

// area query (no specific entity):
const areaHits = tree.query({ x: 100, y: 100, width: 200, height: 200 });
```

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

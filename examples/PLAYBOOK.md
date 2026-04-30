# simplequad Examples Playbook

A guide for building new examples — patterns, recipes, and the shared engine utilities.

---

## Quick start

Copy `template.html` into a new directory, then fill in:

1. `[Title]` in the `<title>` tag
2. The `entities` array and any game-specific state
3. The `update(dt)` function — move things, run collision queries
4. The `draw()` function — render entities to the canvas

Everything else (game loop, FPS tracker, theme, input) is already wired up.

---

## engine.js API

All utilities live on the global `SQEngine` object, loaded via `<script src="../engine.js"></script>`.

### `SQEngine.initTheme()`

Wires up the `#btn-theme` button to toggle light/dark mode and persist the choice to `localStorage`. Call once at startup — already in template.html.

---

### `SQEngine.makeToCanvas(canvas, W, H) → (clientX, clientY) → {x, y}`

Returns a function that converts viewport coordinates to canvas logical coordinates, accounting for CSS scaling.

```js
const toCanvas = SQEngine.makeToCanvas(canvas, W, H);

canvas.addEventListener("mousemove", e => {
  const p = toCanvas(e.clientX, e.clientY);
  mouse.x = p.x; mouse.y = p.y;
});
```

---

### `SQEngine.createFpsTracker(fpsEl, canvas) → tick(ts)`

Returns a `tick` function to call at the start of every frame. Accepts the `requestAnimationFrame` timestamp, returns `dt` (ms since last frame), and updates the FPS display automatically. Passing `canvas` injects a small overlay graph into the top-right corner.

```js
const fpsTick = SQEngine.createFpsTracker(document.getElementById("fps"), canvas);

function loop(ts) {
  const dt = fpsTick(ts);
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
```

---

### `SQEngine.drawBox(ctx, box, color)`

Strokes a `BoundingBox` shape (`{x, y, width, height}`).

```js
SQEngine.drawBox(ctx, player, "#7c4dff");
```

---

### `SQEngine.drawCircle(ctx, circle, color)`

Strokes a `Circle` shape (`{x, y, r}`).

```js
SQEngine.drawCircle(ctx, enemy, "#ff4d4d");
```

---

### `SQEngine.screenWrap(entity, W, H)`

Teleports an entity to the opposite edge when it leaves the canvas. Works with both circle entities (reads `.r`) and box entities (reads `.width`/`.height`).

```js
for (const ship of ships) {
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  SQEngine.screenWrap(ship, W, H);
}
```

---

### `SQEngine.createTouchJoystick(padEl, knobEl) → { dx, dy }`

Wires up a virtual joystick from existing pad/knob DOM elements. Returns a live direction object with `dx` and `dy` normalized to -1..1. The template.html already includes the required HTML markup and CSS.

```js
const joystick = SQEngine.createTouchJoystick(
  document.getElementById("joystick-pad"),
  document.getElementById("joystick-knob")
);

// In update():
const inputX = keys["ArrowRight"] ? 1 : keys["ArrowLeft"] ? -1 : joystick.dx;
const inputY = keys["ArrowDown"]  ? 1 : keys["ArrowUp"]   ? -1 : joystick.dy;
player.x += inputX * speed * dt;
player.y += inputY * speed * dt;
```

---

## Game loop pattern

The recommended pattern for scenes with many moving objects — clear and rebuild the tree every frame:

```js
const tree = SimpleQuad.createQuadTree({ x: 0, y: 0, width: W, height: H });

function update(dt) {
  tree.clear();

  for (const entity of entities) {
    tree.add(entity);
  }

  for (const entity of entities) {
    const hits = tree.query(entity);
    for (const { object, mtv } of hits) {
      // resolve collision between entity and object
    }
  }
}
```

The benchmarks are based on this pattern. At 500 objects it uses ~10% of the 16.7ms frame budget; at 1000 objects, ~26%.

---

## Collision response recipes

simplequad tells you *that* objects overlap and *by how much* (the MTV). What you do with that depends on the game type.

### Platformer — floor, ceiling, wall contacts

Use the MTV direction to classify which surface was hit, then zero the matching velocity component:

```js
const hits = tree.query(player.body);
player.onGround = false;

for (const { mtv } of hits) {
  player.x += mtv.vector.x;
  player.y += mtv.vector.y;

  if (mtv.vector.y < -0.1) {                              // pushed up → landed on floor
    player.vy = 0;
    player.onGround = true;
  }
  if (mtv.vector.y > 0.1 && player.vy < 0) player.vy = 0; // hit ceiling while rising
  if (Math.abs(mtv.vector.x) > 0.1)        player.vx = 0; // hit wall
}
```

The `0.1` threshold filters near-zero y values from diagonal MTVs. See [Pixi.js Platformer](pixi-platformer/src/main.ts).

---

### Elastic collision — equal-mass impulse exchange

Split the MTV equally and exchange velocity along the collision normal:

```js
for (const { object, mtv } of tree.query(body)) {
  body.x   += mtv.vector.x * 0.5;
  body.y   += mtv.vector.y * 0.5;
  object.x -= mtv.vector.x * 0.5;
  object.y -= mtv.vector.y * 0.5;

  const nx = mtv.direction.x, ny = mtv.direction.y;
  const dvx = body.vx - object.vx, dvy = body.vy - object.vy;
  const dot = dvx * nx + dvy * ny;
  if (dot < 0) {                         // only exchange if approaching
    const e = 0.85;                      // restitution coefficient
    const impulse = dot * (1 + e) / 2;
    body.vx   -= impulse * nx;  body.vy   -= impulse * ny;
    object.vx += impulse * nx;  object.vy += impulse * ny;
  }
}
```

See [Gravity Sandbox](gravity-sandbox/index.html).

---

### Soft separation — crowd simulation

Apply a fraction of the MTV to push overlapping entities apart without any velocity math:

```js
for (const { mtv } of tree.query(entity)) {
  entity.x += mtv.vector.x * 0.5;
  entity.y += mtv.vector.y * 0.5;
}
```

Keeps hundreds of entities from overlapping without needing physics. See [Horde Survival](horde-survival/index.html).

---

## Input patterns

### Keyboard

```js
const keys = {};
document.addEventListener("keydown", e => { keys[e.code] = true; });
document.addEventListener("keyup",   e => { keys[e.code] = false; });

// In update():
if (keys["ArrowRight"] || keys["KeyD"]) player.x += speed * dt;
```

### Mouse

```js
const mouse = { x: W / 2, y: H / 2 };
const toCanvas = SQEngine.makeToCanvas(canvas, W, H);

canvas.addEventListener("mousemove", e => {
  const p = toCanvas(e.clientX, e.clientY);
  mouse.x = p.x; mouse.y = p.y;
});
```

### Touch joystick

Use `SQEngine.createTouchJoystick` — see [API section](#sqenginecreatetouchjoystickpadel-knobel---dx-dy) above. The template.html includes the joystick HTML/CSS; hide keyboard controls with:

```css
@media (hover: none), (max-width: 600px) {
  #touch-controls { display: flex; }
  #controls       { display: none; }
}
```

---

## Example index

| Example | Collision pattern | Key concept |
| ------- | ----------------- | ----------- |
| [Query Explorer](hello-world/index.html) | Shape inspection | All three shape types; live MTV arrows |
| [Platformer](platformer/index.html) | MTV direction → surface type | Floor/ceiling/wall classification |
| [Top-down Shooter](shooter/index.html) | Circle queries | Enemy waves, 100–200 dynamic objects |
| [Horde Survival](horde-survival/index.html) | Soft separation | 500+ enemies; stress test |
| [Breakout](breakout/index.html) | Mixed shapes | Circle ball vs AABB bricks; MTV reflection |
| [Boids](boids/index.html) | Neighborhood queries | Flocking via spatial proximity |
| [Gravity Sandbox](gravity-sandbox/index.html) | Elastic collision | Equal-mass impulse exchange |
| [Asteroid Field](asteroid-field/index.html) | Mixed-size circles | Split mechanic; screen wrap |
| [Tower Defense](tower-defense/index.html) | Range circle queries | Static towers querying moving enemies |
| [Predator-Prey](predator-prey/index.html) | Role-based queries | Two agent types sharing one tree |
| [Pixi.js Platformer](pixi-platformer/) | Circle-vs-AABB MTV | External renderer integration |
| [Image Compression](image-compression/) | Quadtree subdivision | Non-game use case |

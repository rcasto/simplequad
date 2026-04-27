import { Application, Container, Graphics, Text, Ticker } from "pixi.js";
import { create, type Circle, type BoundingBox } from "simplequad";
import levelData from "./level.json";

// ── Viewport & physics constants ───────────────────────────────────────────

const W = 800;
const H = 500;

const GRAVITY   = 1800;  // px/s²
const MAX_VX    = 300;   // px/s — horizontal speed cap
const ACCEL     = 2000;  // px/s² — horizontal acceleration (and deceleration)
const JUMP_VY   = -660;  // px/s — initial jump velocity (negative = up)
const COIN_R    = 7;

// ── Types ──────────────────────────────────────────────────────────────────

interface Platform {
  type: "platform";
  body: BoundingBox;
  gfx: Graphics;
}

interface Coin {
  type: "coin";
  body: Circle;
  gfx: Graphics;
  collected: boolean;
}

type CollisionEntity = Platform | Coin;

interface Player {
  body: Circle;
  gfx: Graphics;
  rotation: number;      // accumulated roll angle in radians
  vx: number;
  vy: number;
  direction: -1 | 0 | 1;
  onGround: boolean;
}

interface LevelData {
  world: { width: number; height: number };
  player: { x: number; y: number; r: number };
  platforms: Array<{ x: number; y: number; width: number; height: number }>;
  coins: Array<{ x: number; y: number }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makePlatform(
  { x, y, width, height }: { x: number; y: number; width: number; height: number },
  container: Container,
): Platform {
  const isGround = height > 20;
  const color = isGround ? 0x2d4a37 : 0x4a7c59;
  const gfx = new Graphics();
  gfx.rect(0, 0, width, height).fill(color);
  gfx.rect(0, 0, width, 3).fill({ color: 0xffffff, alpha: 0.08 });
  gfx.x = x;
  gfx.y = y;
  container.addChild(gfx);
  return { type: "platform", body: { x, y, width, height }, gfx };
}

function makeCoin(cx: number, cy: number, container: Container): Coin {
  const gfx = new Graphics();
  gfx.circle(0, 0, COIN_R).fill(0xf5c518).stroke({ color: 0xffdd00, width: 1.5 });
  gfx.x = cx;
  gfx.y = cy;
  container.addChild(gfx);
  return { type: "coin", body: { x: cx, y: cy, r: COIN_R }, gfx, collected: false };
}

function makePlayerGfx(r: number, container: Container): Graphics {
  const g = new Graphics();
  g.circle(0, 0, r).fill(0xe8a838).stroke({ color: 0xf5c518, width: 2 });
  // crosshair lines — these rotate with the circle to show rolling
  g.moveTo(0, -(r - 4)).lineTo(0, r - 4).stroke({ color: 0x1a1a2e, width: 2.5 });
  g.moveTo(-(r - 4), 0).lineTo(r - 4, 0).stroke({ color: 0x1a1a2e, width: 2.5 });
  container.addChild(g);
  return g;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const level: LevelData = levelData as LevelData;

  const WORLD_W = level.world.width;
  const WORLD_H = level.world.height;

  const app = new Application();
  await app.init({ width: W, height: H, backgroundColor: 0x0d0d1a, antialias: true });
  document.body.appendChild(app.canvas);

  // Two containers: world objects move with the camera; HUD stays fixed.
  const worldContainer = new Container();
  const hudContainer = new Container();
  app.stage.addChild(worldContainer, hudContainer);

  // Quadtree covers the full world — platforms and coins go in here each frame.
  // Player is never added; it queries the tree to find what it overlaps.
  const tree = create<CollisionEntity>(
    { x: 0, y: 0, width: WORLD_W, height: WORLD_H },
    { extractor: (e) => e.body },
  );

  // ── Scene ──────────────────────────────────────────────────────────────

  const platforms = level.platforms.map((p) => makePlatform(p, worldContainer));
  const coins = level.coins.map(({ x, y }) => makeCoin(x, y, worldContainer));

  const PLAYER_R = level.player.r;
  const player: Player = {
    body: { x: level.player.x, y: level.player.y, r: PLAYER_R },
    gfx: makePlayerGfx(PLAYER_R, worldContainer),
    rotation: 0,
    vx: 0,
    vy: 0,
    direction: 0,
    onGround: false,
  };
  player.gfx.x = player.body.x;
  player.gfx.y = player.body.y;

  // ── Camera ─────────────────────────────────────────────────────────────

  const camera = { x: 0, y: 0 };

  function cameraFollow(): void {
    camera.x = Math.max(0, Math.min(player.body.x - W / 2, WORLD_W - W));
    camera.y = Math.max(0, Math.min(player.body.y - H / 2, WORLD_H - H));
  }

  // ── HUD ────────────────────────────────────────────────────────────────

  const scoreText = new Text({
    text: `coins: 0 / ${coins.length}`,
    style: { fill: "#f5c518", fontFamily: "monospace", fontSize: 16, fontWeight: "bold" },
  });
  scoreText.x = 12;
  scoreText.y = 8;
  hudContainer.addChild(scoreText);

  const fpsText = new Text({
    text: "fps: 0",
    style: { fill: "#888888", fontFamily: "monospace", fontSize: 14 },
  });
  fpsText.x = W - 72;
  fpsText.y = 8;
  hudContainer.addChild(fpsText);

  // ── Win overlay ────────────────────────────────────────────────────────

  const winOverlay = new Graphics();
  winOverlay.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.55 });
  winOverlay.visible = false;
  hudContainer.addChild(winOverlay);

  const winTitle = new Text({
    text: "You collected all coins!",
    style: { fill: "#f5c518", fontFamily: "monospace", fontSize: 28, fontWeight: "bold" },
  });
  winTitle.anchor.set(0.5);
  winTitle.x = W / 2;
  winTitle.y = H / 2;
  winTitle.visible = false;
  hudContainer.addChild(winTitle);

  const restartHint = new Text({
    text: "Press Space or tap to play again",
    style: { fill: "#aaaaaa", fontFamily: "monospace", fontSize: 15 },
  });
  restartHint.anchor.set(0.5);
  restartHint.x = W / 2;
  restartHint.y = H / 2 + 44;
  restartHint.visible = false;
  hudContainer.addChild(restartHint);

  // ── Input ──────────────────────────────────────────────────────────────

  const keys: Record<string, boolean> = {};
  document.addEventListener("keydown", (e) => { keys[e.code] = true; });
  document.addEventListener("keyup",   (e) => { keys[e.code] = false; });

  // ── Game state ─────────────────────────────────────────────────────────

  let score = 0;
  let gameState: "playing" | "won" = "playing";

  function showWin(): void {
    gameState = "won";
    winOverlay.visible = true;
    winTitle.visible = true;
    restartHint.visible = true;
  }

  function resetGame(): void {
    score = 0;
    gameState = "playing";
    player.body.x = level.player.x;
    player.body.y = level.player.y;
    player.vx = 0;
    player.vy = 0;
    player.rotation = 0;
    player.onGround = false;
    for (const c of coins) {
      c.collected = false;
      c.gfx.visible = true;
    }
    winOverlay.visible = false;
    winTitle.visible = false;
    restartHint.visible = false;
    scoreText.text = `coins: 0 / ${coins.length}`;
  }

  app.canvas.addEventListener("click", () => { if (gameState === "won") resetGame(); });
  app.canvas.addEventListener("touchstart", (e) => {
    if (gameState === "won") { e.preventDefault(); resetGame(); }
  }, { passive: false });

  // ── Game loop ──────────────────────────────────────────────────────────

  app.ticker.add((ticker: Ticker) => {
    // Cap dt at 50ms to prevent physics blow-up on slow/hidden-tab frames
    const dt = Math.min(ticker.deltaMS, 50) / 1000;

    fpsText.text = `fps: ${Math.round(ticker.FPS)}`;

    if (gameState === "won") {
      if (keys["Space"] || keys["Enter"]) resetGame();
      return;
    }

    // ── 1. Input → direction ──────────────────────────────────────────

    if (keys["ArrowLeft"] || keys["KeyA"])       player.direction = -1;
    else if (keys["ArrowRight"] || keys["KeyD"]) player.direction =  1;
    else                                          player.direction =  0;

    const wantsJump = keys["ArrowUp"] || keys["KeyW"] || keys["Space"];

    // ── 2. Horizontal: acceleration / deceleration model ─────────────
    // Inspired by the smooth feel of the CircleMan project — acceleration
    // ramps up to MAX_VX, and naturally decelerates when no key is held.

    const prevVx = player.vx;
    const dv = ACCEL * dt;

    if (player.direction > 0) {
      player.vx = Math.min(player.vx + dv, MAX_VX);
    } else if (player.direction < 0) {
      player.vx = Math.max(player.vx - dv, -MAX_VX);
    } else {
      // Decelerate toward zero
      player.vx = player.vx > 0
        ? Math.max(player.vx - dv, 0)
        : Math.min(player.vx + dv, 0);
    }

    // ── 3. Jump ───────────────────────────────────────────────────────

    if (wantsJump && player.onGround) {
      player.vy = JUMP_VY;
      player.onGround = false;
    }

    // ── 4. Gravity ────────────────────────────────────────────────────

    player.vy += GRAVITY * dt;

    // ── 5. Integrate position ─────────────────────────────────────────
    // Trapezoid integration for x (smoother with acceleration model);
    // simple Euler for y (gravity is constant, Euler is exact here).

    const prevX = player.body.x;
    player.body.x += ((prevVx + player.vx) / 2) * dt;
    player.body.y += player.vy * dt;

    // Clamp x to world bounds
    player.body.x = Math.max(PLAYER_R, Math.min(WORLD_W - PLAYER_R, player.body.x));

    // ── 6. Rolling rotation ───────────────────────────────────────────
    // A rolling circle rotates by dx/r radians (rolling without slipping).

    player.rotation += (player.body.x - prevX) / PLAYER_R;

    // ── 7. Rebuild tree and resolve collisions ────────────────────────

    tree.clear();
    for (const p of platforms) tree.add(p);
    for (const c of coins) {
      if (!c.collected) tree.add(c);
    }

    const hits = tree.query(player.body);
    player.onGround = false;

    for (const { object, mtv } of hits) {
      if (object.type === "coin") {
        object.collected = true;
        object.gfx.visible = false;
        score++;
        scoreText.text = `coins: ${score} / ${coins.length}`;
        continue;
      }
      // Platform: push player out via MTV, then adjust velocity
      player.body.x += mtv.vector.x;
      player.body.y += mtv.vector.y;

      // mtv.vector.y < 0 = pushed upward = landed on top of platform
      if (mtv.vector.y < -0.1) {
        player.vy = 0;
        player.onGround = true;
      }
      // mtv.vector.y > 0 = pushed downward = hit ceiling
      if (mtv.vector.y > 0.1 && player.vy < 0) player.vy = 0;
      // horizontal hit = stop horizontal movement
      if (Math.abs(mtv.vector.x) > 0.1) player.vx = 0;
    }

    // ── 8. Respawn on fall ────────────────────────────────────────────

    if (player.body.y > WORLD_H + 60) {
      player.body.x = level.player.x;
      player.body.y = level.player.y;
      player.vx = 0;
      player.vy = 0;
      player.rotation = 0;
    }

    // ── 9. Camera follow ──────────────────────────────────────────────

    cameraFollow();
    worldContainer.x = -camera.x;
    worldContainer.y = -camera.y;

    // ── 10. Sync player graphics ──────────────────────────────────────

    player.gfx.x = player.body.x;
    player.gfx.y = player.body.y;
    player.gfx.rotation = player.rotation;

    // ── 11. Win check ─────────────────────────────────────────────────

    if (score === coins.length) showWin();
  });
}

main().catch(console.error);

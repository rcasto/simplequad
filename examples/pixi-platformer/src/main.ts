import { Application, Graphics, Text, Ticker } from "pixi.js";
import { create } from "simplequad";

const W = 800;
const H = 500;
const GRAVITY = 0.5;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -11;
const TILE = 24;

// Entity types — body holds collision bounds separately from the PixiJS display object.
// This is the pattern the 3.1.0 extractor API is designed for: your domain objects
// don't need to extend Bound; the extractor derives it from wherever bounds live.
interface Platform {
  type: "platform";
  body: { x: number; y: number; width: number; height: number };
  gfx: Graphics;
}

interface Coin {
  type: "coin";
  body: { x: number; y: number; width: number; height: number };
  gfx: Graphics;
  collected: boolean;
}

type CollisionEntity = Platform | Coin;

interface Player {
  body: { x: number; y: number; width: number; height: number };
  gfx: Graphics;
  vx: number;
  vy: number;
  onGround: boolean;
}

function makePlatform(
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  app: Application,
): Platform {
  const gfx = new Graphics();
  gfx.bounds;
  gfx.rect(0, 0, w, h).fill(color);
  gfx.rect(0, 0, w, 3).fill({ color: 0xffffff, alpha: 0.08 });
  gfx.x = x;
  gfx.y = y;
  app.stage.addChild(gfx);
  return { type: "platform", body: { x, y, width: w, height: h }, gfx };
}

function makeCoin(cx: number, cy: number, app: Application): Coin {
  const gfx = new Graphics();
  gfx.circle(5, 5, 5).fill(0xf5c518);
  gfx.x = cx;
  gfx.y = cy;
  app.stage.addChild(gfx);
  return {
    type: "coin",
    body: { x: cx, y: cy, width: 10, height: 10 },
    gfx,
    collected: false,
  };
}

function makePlayerGfx(app: Application): Graphics {
  const g = new Graphics();
  g.rect(0, 0, 24, 32).fill(0xe8a838);
  g.rect(5, 8, 4, 4).fill(0x1a1a2e);
  g.rect(15, 8, 4, 4).fill(0x1a1a2e);
  app.stage.addChild(g);
  return g;
}

async function main(): Promise<void> {
  const app = new Application();
  await app.init({
    width: W,
    height: H,
    backgroundColor: 0x1a1a2e,
    antialias: true,
  });
  document.body.appendChild(app.canvas);

  // extractor derives the spatial BoundingBox from each entity —
  // Platform and Coin don't extend Bound directly, they carry it in `.body`.
  const tree = create<CollisionEntity>(
    { x: 0, y: 0, width: W, height: H },
    { extractor: (e) => e.body },
  );

  // --- Platforms ---
  const platforms: Platform[] = [
    makePlatform(0, H - TILE, W, TILE, 0x4a7c59, app),
    makePlatform(100, 360, 160, TILE, 0x4a7c59, app),
    makePlatform(340, 300, 120, TILE, 0x4a7c59, app),
    makePlatform(540, 250, 140, TILE, 0x4a7c59, app),
    makePlatform(200, 210, 100, TILE, 0x4a7c59, app),
    makePlatform(620, 380, 130, TILE, 0x4a7c59, app),
    makePlatform(50, 140, 120, TILE, 0x3d6b4f, app),
    makePlatform(660, 150, 110, TILE, 0x3d6b4f, app),
    makePlatform(350, 120, 100, TILE, 0x3d6b4f, app),
  ];

  // --- Coins ---
  const coins: Coin[] = [
    [130, 340],
    [200, 340],
    [380, 280],
    [440, 280],
    [570, 230],
    [640, 230],
    [230, 190],
    [260, 190],
    [80, 120],
    [130, 120],
    [380, 100],
    [430, 100],
    [680, 130],
    [720, 130],
    [660, 360],
  ].map(([cx, cy]) => makeCoin(cx, cy, app));

  // --- Player ---
  const player: Player = {
    body: { x: 60, y: H - TILE - 32, width: 24, height: 32 },
    gfx: makePlayerGfx(app),
    vx: 0,
    vy: 0,
    onGround: false,
  };
  player.gfx.x = player.body.x;
  player.gfx.y = player.body.y;

  // --- HUD ---
  const scoreText = new Text({
    text: `coins: 0 / ${coins.length}`,
    style: {
      fill: "#f5c518",
      fontFamily: "monospace",
      fontSize: 16,
      fontWeight: "bold",
    },
  });
  scoreText.x = 12;
  scoreText.y = 8;
  app.stage.addChild(scoreText);

  const fpsText = new Text({
    text: "fps: 0",
    style: { fill: "#888888", fontFamily: "monospace", fontSize: 14 },
  });
  fpsText.x = W - 72;
  fpsText.y = 8;
  app.stage.addChild(fpsText);

  const countText = new Text({
    text: "in tree: 0",
    style: { fill: "#888888", fontFamily: "monospace", fontSize: 14 },
  });
  countText.x = W - 200;
  countText.y = 8;
  app.stage.addChild(countText);

  // --- Win overlay ---
  const winOverlay = new Graphics();
  winOverlay.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.55 });
  winOverlay.visible = false;
  app.stage.addChild(winOverlay);

  const winTitle = new Text({
    text: "You collected all coins!",
    style: {
      fill: "#f5c518",
      fontFamily: "monospace",
      fontSize: 32,
      fontWeight: "bold",
    },
  });
  winTitle.anchor.set(0.5);
  winTitle.x = W / 2;
  winTitle.y = H / 2;
  winTitle.visible = false;
  app.stage.addChild(winTitle);

  const restartHint = new Text({
    text: "Press Space or tap to play again",
    style: { fill: "#aaaaaa", fontFamily: "monospace", fontSize: 16 },
  });
  restartHint.anchor.set(0.5);
  restartHint.x = W / 2;
  restartHint.y = H / 2 + 44;
  restartHint.visible = false;
  app.stage.addChild(restartHint);

  // --- Input ---
  const keys: Record<string, boolean> = {};
  document.addEventListener("keydown", (e) => {
    keys[e.code] = true;
  });
  document.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  function isJump(): boolean {
    return !!(keys["ArrowUp"] || keys["KeyW"] || keys["Space"]);
  }

  // --- Game state ---
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
    player.body.x = 60;
    player.body.y = H - TILE - 32;
    player.vx = 0;
    player.vy = 0;
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

  app.canvas.addEventListener("click", () => {
    if (gameState === "won") resetGame();
  });
  app.canvas.addEventListener(
    "touchstart",
    (e) => {
      if (gameState === "won") {
        e.preventDefault();
        resetGame();
      }
    },
    { passive: false },
  );

  // --- Game loop ---
  app.ticker.add((ticker: Ticker) => {
    fpsText.text = `fps: ${Math.round(ticker.FPS)}`;

    if (gameState === "won") {
      if (keys["Space"] || keys["Enter"]) resetGame();
      return;
    }

    // Horizontal movement
    if (keys["ArrowLeft"] || keys["KeyA"]) player.vx = -PLAYER_SPEED;
    else if (keys["ArrowRight"] || keys["KeyD"]) player.vx = PLAYER_SPEED;
    else player.vx = 0;

    // Jump
    if (isJump() && player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
    }

    player.vy += GRAVITY;
    player.body.x += player.vx;
    player.body.y += player.vy;
    player.body.x = Math.max(0, Math.min(W - player.body.width, player.body.x));

    // Rebuild tree each frame — same game-loop pattern as the vanilla examples
    tree.clear();
    for (const p of platforms) tree.add(p);
    for (const c of coins) {
      if (!c.collected) tree.add(c);
    }

    // query takes a plain Bound — pass the extracted player body directly.
    // Player is never in the tree, so no self-exclusion needed.
    const hits = tree.query(player.body);
    player.onGround = false;

    countText.text = `in tree: ${tree.getData().length}`;

    for (const { object, mtv } of hits) {
      if (object.type === "coin") {
        object.collected = true;
        object.gfx.visible = false;
        score++;
        scoreText.text = `coins: ${score} / ${coins.length}`;
        continue;
      }
      // Platform push-out via MTV
      player.body.x += mtv.vector.x;
      player.body.y += mtv.vector.y;

      if (mtv.vector.y < -0.1) {
        player.vy = 0;
        player.onGround = true;
      }
      if (mtv.vector.y > 0.1 && player.vy < 0) player.vy = 0;
      if (Math.abs(mtv.vector.x) > 0.1) player.vx = 0;
    }

    // Fall off bottom → respawn
    if (player.body.y > H + 50) {
      player.body.x = 60;
      player.body.y = H - TILE - 32;
      player.vx = 0;
      player.vy = 0;
    }

    // Sync PixiJS sprite to collision body position
    player.gfx.x = player.body.x;
    player.gfx.y = player.body.y;

    if (score === coins.length) showWin();
  });
}

main().catch(console.error);

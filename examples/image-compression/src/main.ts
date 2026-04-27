// Max dimensions for quadtree processing — keeps frame generation fast.
const MAX_W = 512;
const MAX_H = 384;

// Playback speed: ms per frame during auto-play.
const FRAME_MS = 160;

interface Frame {
  data: ImageData;
  capacity: number; // 0 = original image
}

// ── State ──────────────────────────────────────────────────────────────────

let frames: Frame[] = [];
let currentIndex = 0;
let playing = false;
let playTimer: ReturnType<typeof setInterval> | null = null;
let worker: Worker | null = null;
let canvasW = MAX_W;
let canvasH = MAX_H;

// ── DOM refs ───────────────────────────────────────────────────────────────

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const uploadArea = document.getElementById("upload-area")!;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const playBtn = document.getElementById("play-btn") as HTMLButtonElement;
const prevBtn = document.getElementById("prev-btn") as HTMLButtonElement;
const nextBtn = document.getElementById("next-btn") as HTMLButtonElement;
const slider = document.getElementById("slider") as HTMLInputElement;
const frameLabel = document.getElementById("frame-label")!;
const capacityLabel = document.getElementById("capacity-label")!;
const statusBar = document.getElementById("status-bar")!;
const controls = document.getElementById("controls")!;

// ── Canvas helpers ─────────────────────────────────────────────────────────

function drawFrame(frame: Frame): void {
  ctx.putImageData(frame.data, 0, 0);
}

function drawPlaceholder(): void {
  ctx.fillStyle = "#14142a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#2a2a4a";
  ctx.fillRect(canvas.width / 2 - 40, canvas.height / 2 - 40, 80, 80);
  ctx.fillStyle = "#555577";
  ctx.font = "13px monospace";
  ctx.textAlign = "center";
  ctx.fillText("upload an image", canvas.width / 2, canvas.height / 2 + 60);
}

// ── Playback ───────────────────────────────────────────────────────────────

function showFrame(index: number): void {
  currentIndex = Math.max(0, Math.min(frames.length - 1, index));
  if (frames.length === 0) return;
  drawFrame(frames[currentIndex]);
  slider.value = String(currentIndex);

  const { capacity } = frames[currentIndex];
  const isOriginal = capacity === 0;
  frameLabel.textContent = `frame ${currentIndex + 1} / ${frames.length}`;
  capacityLabel.textContent = isOriginal
    ? "original image"
    : `capacity: ${capacity.toLocaleString()} px/leaf`;
}

function startPlay(): void {
  if (playTimer !== null) return;
  playing = true;
  playBtn.textContent = "⏸";
  playTimer = setInterval(() => {
    const next = (currentIndex + 1) % frames.length;
    showFrame(next);
  }, FRAME_MS);
}

function stopPlay(): void {
  playing = false;
  playBtn.textContent = "▶";
  if (playTimer !== null) {
    clearInterval(playTimer);
    playTimer = null;
  }
}

function togglePlay(): void {
  if (playing) stopPlay();
  else startPlay();
}

// ── Image loading ──────────────────────────────────────────────────────────

function scaleImageData(img: HTMLImageElement): ImageData {
  const scale = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1);
  canvasW = Math.round(img.naturalWidth * scale);
  canvasH = Math.round(img.naturalHeight * scale);

  const offscreen = document.createElement("canvas");
  offscreen.width = canvasW;
  offscreen.height = canvasH;
  const offCtx = offscreen.getContext("2d")!;
  offCtx.drawImage(img, 0, 0, canvasW, canvasH);
  return offCtx.getImageData(0, 0, canvasW, canvasH);
}

function loadFile(file: File): void {
  stopPlay();
  frames = [];
  statusBar.textContent = "processing…";
  controls.classList.add("hidden");

  // Terminate any in-flight worker.
  if (worker) worker.terminate();

  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);

    // Resize canvas to match the scaled image dimensions.
    canvas.width = canvasW = Math.round(
      img.naturalWidth * Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1),
    );
    canvas.height = canvasH = Math.round(
      img.naturalHeight * Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1),
    );

    const imageData = scaleImageData(img);

    worker = new Worker(
      new URL("./compression.worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as { type: string; data?: ImageData; capacity?: number };
      if (msg.type === "draw" && msg.data) {
        frames.push({ data: msg.data, capacity: msg.capacity ?? 0 });
        // Show each frame as it arrives so the user sees progress.
        showFrame(frames.length - 1);
        if (frames.length === 1) {
          slider.max = "0";
          controls.classList.remove("hidden");
        } else {
          slider.max = String(frames.length - 1);
        }
      } else if (msg.type === "processed") {
        statusBar.textContent = `${frames.length} compression levels generated`;
        startPlay();
      }
    };

    worker.onerror = (err) => {
      statusBar.textContent = `error: ${err.message}`;
    };

    worker.postMessage({ type: "new-image", data: imageData });
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    statusBar.textContent = "failed to load image";
  };
  img.src = url;
}

// ── Input wiring ───────────────────────────────────────────────────────────

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) loadFile(file);
});

uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("drag-over");
});
uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("drag-over");
});
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (file?.type.startsWith("image/")) loadFile(file);
});

playBtn.addEventListener("click", togglePlay);
prevBtn.addEventListener("click", () => { stopPlay(); showFrame(currentIndex - 1); });
nextBtn.addEventListener("click", () => { stopPlay(); showFrame(currentIndex + 1); });

slider.addEventListener("input", () => {
  stopPlay();
  showFrame(Number(slider.value));
});

// ── Theme toggle ───────────────────────────────────────────────────────────

const themeBtn = document.getElementById("btn-theme")!;
themeBtn.textContent =
  document.documentElement.getAttribute("data-theme") === "light" ? "☾" : "☀";
themeBtn.addEventListener("click", () => {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const next = isLight ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("sq-theme", next);
  themeBtn.textContent = isLight ? "☀" : "☾";
});

// ── Init ───────────────────────────────────────────────────────────────────

canvas.width = MAX_W;
canvas.height = MAX_H;
drawPlaceholder();

/// <reference lib="webworker" />
import { create, type QuadTree, type BoundingBox } from "simplequad";

interface Pixel {
  x: number;
  y: number;
  r: number; // red 0-255  (NOT a radius — use extractor to pass only {x,y} to the tree)
  g: number;
  b: number;
  a: number;
}

type WorkerInMessage =
  | { type: "new-image"; data: ImageData };

type WorkerOutMessage =
  | { type: "draw"; data: ImageData; capacity: number }
  | { type: "processed" };

function createPixels(imageData: ImageData): Pixel[] {
  const pixels: Pixel[] = [];
  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const offset = (y * imageData.width + x) * 4;
      pixels.push({
        x, y,
        r: imageData.data[offset],
        g: imageData.data[offset + 1],
        b: imageData.data[offset + 2],
        a: imageData.data[offset + 3],
      });
    }
  }
  return pixels;
}

type RGBA = { r: number; g: number; b: number; a: number };

// Pairwise rolling RMS — matches the original playground behavior.
// Each step averages the running result with the next pixel via RMS,
// which preserves perceptual brightness better than a linear mean.
function getAverageColor(pixels: Pixel[]): RGBA {
  if (pixels.length === 0) return { r: 255, g: 255, b: 255, a: 255 };
  return pixels.slice(1).reduce<RGBA>((avg, p) => ({
    r: Math.sqrt((avg.r ** 2 + p.r ** 2) / 2),
    g: Math.sqrt((avg.g ** 2 + p.g ** 2) / 2),
    b: Math.sqrt((avg.b ** 2 + p.b ** 2) / 2),
    a: Math.sqrt((avg.a ** 2 + p.a ** 2) / 2),
  }), pixels[0]);
}

function fillImageData(imageData: ImageData, tree: QuadTree<Pixel>): void {
  if (tree.quadrants.length > 0) {
    for (const q of tree.quadrants) fillImageData(imageData, q);
    return;
  }
  const pixels = tree.getData();
  if (pixels.length === 0) return;
  const avg = getAverageColor(pixels);
  const w = imageData.width;
  for (const p of pixels) {
    const offset = (p.y * w + p.x) * 4;
    imageData.data[offset]     = Math.round(avg.r);
    imageData.data[offset + 1] = Math.round(avg.g);
    imageData.data[offset + 2] = Math.round(avg.b);
    imageData.data[offset + 3] = Math.round(avg.a);
  }
}

function generateFrame(pixels: Pixel[], bounds: BoundingBox, capacity: number): ImageData {
  // Extractor returns only {x, y} so the tree treats each pixel as a Point,
  // avoiding confusion with the `.r` red-channel field (which isCircle() checks).
  const tree = create<Pixel>(bounds, {
    capacity,
    extractor: (p) => ({ x: p.x, y: p.y }),
  });
  for (const pixel of pixels) tree.add(pixel);
  const out = new ImageData(bounds.width, bounds.height);
  fillImageData(out, tree);
  return out;
}

function processImage(imageData: ImageData): void {
  const pixels = createPixels(imageData);
  const bounds: BoundingBox = {
    x: 0, y: 0,
    width: imageData.width,
    height: imageData.height,
  };

  // Start at the coarsest level (one leaf covers the whole image → single avg color)
  // and halve capacity each step until we reach capacity = 1 (finest detail).
  let capacity = imageData.width * imageData.height;
  while (capacity >= 1) {
    const cap = Math.max(1, Math.floor(capacity));
    const frame = generateFrame(pixels, bounds, cap);
    const msg: WorkerOutMessage = { type: "draw", data: frame, capacity: cap };
    postMessage(msg);
    if (capacity === 1) break;
    capacity /= 2;
  }

  // Final: send the original unmodified ImageData as the reference frame.
  const original: WorkerOutMessage = { type: "draw", data: imageData, capacity: 0 };
  postMessage(original);

  const done: WorkerOutMessage = { type: "processed" };
  postMessage(done);
}

self.addEventListener("message", (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;
  if (msg.type === "new-image" && msg.data) {
    processImage(msg.data);
  }
});

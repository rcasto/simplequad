import { QuadTree } from './schema';

export interface DrawDebugOptions {
    /** Stroke color for node boundaries. Default: `'rgba(0, 255, 0, 0.5)'` */
    strokeStyle?: string;
    /** Line width for node boundaries. Default: `1` */
    lineWidth?: number;
    /** Fill color for leaf nodes. Omitted (no fill) by default. */
    fillStyle?: string;
    /** Label each node with its depth. Default: `false` */
    showDepth?: boolean;
}

const DEFAULTS: Required<DrawDebugOptions> = {
    strokeStyle: 'rgba(0, 255, 0, 0.5)',
    lineWidth: 1,
    fillStyle: '',
    showDepth: false,
};

function drawNode<T>(
    node: QuadTree<T>,
    ctx: CanvasRenderingContext2D,
    opts: Required<DrawDebugOptions>,
    depth: number,
): void {
    const { x, y, width, height } = node.bounds;
    const isLeaf = node.quadrants.length === 0;

    if (opts.fillStyle && isLeaf) {
        ctx.fillStyle = opts.fillStyle;
        ctx.fillRect(x, y, width, height);
    }

    ctx.strokeRect(x, y, width, height);

    if (opts.showDepth) {
        ctx.fillStyle = opts.strokeStyle;
        ctx.fillText(String(depth), x + 3, y + 11);
    }

    for (const quadrant of node.quadrants) {
        drawNode(quadrant, ctx, opts, depth + 1);
    }
}

/**
 * Draws the quadtree node boundaries onto a canvas context for debugging.
 * Saves and restores canvas state so it does not interfere with the caller's drawing.
 *
 * @param tree - The quadtree to visualize.
 * @param ctx - The 2D canvas rendering context to draw on.
 * @param options - Optional style overrides.
 */
export function drawDebug<T>(
    tree: QuadTree<T>,
    ctx: CanvasRenderingContext2D,
    options?: DrawDebugOptions,
): void {
    const opts: Required<DrawDebugOptions> = {
        strokeStyle: options?.strokeStyle ?? DEFAULTS.strokeStyle,
        lineWidth: options?.lineWidth ?? DEFAULTS.lineWidth,
        fillStyle: options?.fillStyle ?? DEFAULTS.fillStyle,
        showDepth: options?.showDepth ?? DEFAULTS.showDepth,
    };

    ctx.save();
    ctx.strokeStyle = opts.strokeStyle;
    ctx.lineWidth = opts.lineWidth;
    drawNode(tree, ctx, opts, 0);
    ctx.restore();
}

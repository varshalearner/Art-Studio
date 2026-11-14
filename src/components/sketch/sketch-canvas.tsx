"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { getStroke } from "perfect-freehand";
import {
  Brush,
  Droplet,
  Eraser,
  ImagePlus,
  Pencil,
  Redo2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fileToDataUrl, cn } from "@/lib/utils";

type Tool = "brush" | "pencil" | "eraser" | "fill";

export interface SketchCanvasHandle {
  /** Export the drawing (background photo + strokes) as a PNG data-URL. */
  exportImage: () => string | null;
  /** True when the user has drawn or filled anything. */
  hasContent: () => boolean;
}

const LOGICAL_W = 1000;
const LOGICAL_H = 750;
const MAX_HISTORY = 25;

const SWATCHES = [
  "#3F3A35", "#C96F4A", "#D9A441", "#8A9B6E", "#5B7BA6",
  "#8E5BA6", "#C94A6B", "#FFFFFF", "#F3E6CF", "#1F1B17",
];

function strokeToPath(points: number[][]): Path2D {
  const path = new Path2D();
  if (points.length === 0) return path;
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    path.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
  }
  path.closePath();
  return path;
}

export const SketchCanvas = forwardRef<
  SketchCanvasHandle,
  { initialBackground?: string; className?: string }
>(function SketchCanvas({ initialBackground, className }, ref) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const committedRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const pointsRef = useRef<number[][]>([]);
  const drawingRef = useRef(false);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const dirtyRef = useRef(false);

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#3F3A35");
  const [size, setSize] = useState(10);
  const [hasBg, setHasBg] = useState(false);
  const [historyTick, setHistoryTick] = useState(0); // re-render for undo/redo buttons

  // ---------- setup ----------
  useEffect(() => {
    const committed = document.createElement("canvas");
    committed.width = LOGICAL_W;
    committed.height = LOGICAL_H;
    committedRef.current = committed;
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialBackground) void setBackground(initialBackground);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBackground]);

  const ctx = () => committedRef.current?.getContext("2d") ?? null;

  // ---------- rendering ----------
  const render = useCallback((previewPath?: Path2D, previewColor?: string, erasePreview?: boolean) => {
    const display = displayRef.current;
    const committed = committedRef.current;
    if (!display || !committed) return;
    const dctx = display.getContext("2d");
    if (!dctx) return;
    dctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    // paper
    dctx.fillStyle = "#FFFCF5";
    dctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    // background photo layer
    const bg = bgImageRef.current;
    if (bg) {
      const scale = Math.min(LOGICAL_W / bg.width, LOGICAL_H / bg.height);
      const w = bg.width * scale;
      const h = bg.height * scale;
      dctx.globalAlpha = 0.95;
      dctx.drawImage(bg, (LOGICAL_W - w) / 2, (LOGICAL_H - h) / 2, w, h);
      dctx.globalAlpha = 1;
    }
    // committed strokes
    dctx.drawImage(committed, 0, 0);
    // live stroke preview
    if (previewPath && !erasePreview) {
      dctx.fillStyle = previewColor ?? color;
      dctx.fill(previewPath);
    }
    if (previewPath && erasePreview) {
      dctx.save();
      dctx.fillStyle = "rgba(255,252,245,0.9)";
      dctx.fill(previewPath);
      dctx.restore();
    }
  }, [color]);

  // ---------- history ----------
  const pushHistory = () => {
    const c = ctx();
    if (!c) return;
    undoStack.current.push(c.getImageData(0, 0, LOGICAL_W, LOGICAL_H));
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
    setHistoryTick((t) => t + 1);
  };

  const undo = () => {
    const c = ctx();
    if (!c || undoStack.current.length === 0) return;
    redoStack.current.push(c.getImageData(0, 0, LOGICAL_W, LOGICAL_H));
    c.putImageData(undoStack.current.pop()!, 0, 0);
    setHistoryTick((t) => t + 1);
    render();
  };

  const redo = () => {
    const c = ctx();
    if (!c || redoStack.current.length === 0) return;
    undoStack.current.push(c.getImageData(0, 0, LOGICAL_W, LOGICAL_H));
    c.putImageData(redoStack.current.pop()!, 0, 0);
    setHistoryTick((t) => t + 1);
    render();
  };

  const clearAll = () => {
    const c = ctx();
    if (!c) return;
    pushHistory();
    c.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    render();
  };

  // ---------- pointer handling ----------
  const toLogical = (e: React.PointerEvent): [number, number, number] => {
    const canvas = displayRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_W;
    const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_H;
    return [x, y, e.pressure || 0.5];
  };

  const strokeOptions = () => ({
    size: tool === "pencil" ? Math.max(2, size * 0.4) : size,
    thinning: tool === "pencil" ? 0.7 : 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: true,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const [x, y] = toLogical(e);
    if (tool === "fill") {
      floodFill(Math.round(x), Math.round(y));
      return;
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    pointsRef.current = [toLogical(e)];
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    pointsRef.current.push(toLogical(e));
    const outline = getStroke(pointsRef.current, strokeOptions());
    render(strokeToPath(outline), tool === "pencil" ? color + "cc" : color, tool === "eraser");
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const c = ctx();
    if (!c) return;
    const outline = getStroke(pointsRef.current, strokeOptions());
    const path = strokeToPath(outline);
    pushHistory();
    if (tool === "eraser") {
      c.save();
      c.globalCompositeOperation = "destination-out";
      c.fillStyle = "#000";
      c.fill(path);
      c.restore();
    } else {
      c.fillStyle = tool === "pencil" ? color + "cc" : color;
      c.fill(path);
    }
    dirtyRef.current = true;
    pointsRef.current = [];
    render();
  };

  // ---------- flood fill ----------
  const floodFill = (sx: number, sy: number) => {
    const committed = committedRef.current;
    if (!committed) return;
    // composite (paper + bg + strokes) defines the region boundaries
    const comp = document.createElement("canvas");
    comp.width = LOGICAL_W;
    comp.height = LOGICAL_H;
    const cc = comp.getContext("2d")!;
    cc.fillStyle = "#FFFCF5";
    cc.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    const bg = bgImageRef.current;
    if (bg) {
      const scale = Math.min(LOGICAL_W / bg.width, LOGICAL_H / bg.height);
      cc.drawImage(bg, (LOGICAL_W - bg.width * scale) / 2, (LOGICAL_H - bg.height * scale) / 2, bg.width * scale, bg.height * scale);
    }
    cc.drawImage(committed, 0, 0);
    const img = cc.getImageData(0, 0, LOGICAL_W, LOGICAL_H);
    const data = img.data;
    const idx = (x: number, y: number) => (y * LOGICAL_W + x) * 4;
    const si = idx(sx, sy);
    const target = [data[si], data[si + 1], data[si + 2]];
    const fillRgb = [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
    if (
      Math.abs(target[0] - fillRgb[0]) < 8 &&
      Math.abs(target[1] - fillRgb[1]) < 8 &&
      Math.abs(target[2] - fillRgb[2]) < 8
    ) {
      return; // already that colour
    }
    const TOL = 28;
    const match = (i: number) =>
      Math.abs(data[i] - target[0]) <= TOL &&
      Math.abs(data[i + 1] - target[1]) <= TOL &&
      Math.abs(data[i + 2] - target[2]) <= TOL;

    const mask = new Uint8Array(LOGICAL_W * LOGICAL_H);
    const stack: number[] = [sx + sy * LOGICAL_W];
    mask[stack[0]] = 1;
    let filled = 0;
    while (stack.length && filled < LOGICAL_W * LOGICAL_H) {
      const p = stack.pop()!;
      filled++;
      const x = p % LOGICAL_W;
      const y = (p / LOGICAL_W) | 0;
      const neighbors = [
        x > 0 ? p - 1 : -1,
        x < LOGICAL_W - 1 ? p + 1 : -1,
        y > 0 ? p - LOGICAL_W : -1,
        y < LOGICAL_H - 1 ? p + LOGICAL_W : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && !mask[n] && match(n * 4)) {
          mask[n] = 1;
          stack.push(n);
        }
      }
    }
    // paint the mask onto the committed layer
    const fillImg = new ImageData(LOGICAL_W, LOGICAL_H);
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) {
        const o = i * 4;
        fillImg.data[o] = fillRgb[0];
        fillImg.data[o + 1] = fillRgb[1];
        fillImg.data[o + 2] = fillRgb[2];
        fillImg.data[o + 3] = 255;
      }
    }
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = LOGICAL_W;
    maskCanvas.height = LOGICAL_H;
    maskCanvas.getContext("2d")!.putImageData(fillImg, 0, 0);
    pushHistory();
    ctx()!.drawImage(maskCanvas, 0, 0);
    dirtyRef.current = true;
    render();
  };

  // ---------- background photo ----------
  const setBackground = async (dataUrl: string) => {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        bgImageRef.current = img;
        setHasBg(true);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });
    render();
  };

  const onUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    await setBackground(dataUrl);
    e.target.value = "";
  };

  const removeBg = () => {
    bgImageRef.current = null;
    setHasBg(false);
    render();
  };

  // ---------- export ----------
  useImperativeHandle(ref, () => ({
    exportImage: () => {
      const committed = committedRef.current;
      if (!committed) return null;
      const out = document.createElement("canvas");
      out.width = LOGICAL_W;
      out.height = LOGICAL_H;
      const octx = out.getContext("2d")!;
      octx.fillStyle = "#FFFCF5";
      octx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      const bg = bgImageRef.current;
      if (bg) {
        const scale = Math.min(LOGICAL_W / bg.width, LOGICAL_H / bg.height);
        octx.drawImage(bg, (LOGICAL_W - bg.width * scale) / 2, (LOGICAL_H - bg.height * scale) / 2, bg.width * scale, bg.height * scale);
      }
      octx.drawImage(committed, 0, 0);
      return out.toDataURL("image/png");
    },
    hasContent: () => dirtyRef.current || hasBg,
  }));

  const tools: { id: Tool; icon: typeof Brush; label: string }[] = [
    { id: "brush", icon: Brush, label: "Brush" },
    { id: "pencil", icon: Pencil, label: "Pencil" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "fill", icon: Droplet, label: "Fill" },
  ];

  return (
    <div className={cn("rounded-lg border bg-card p-3 shadow-cozy", className)} data-testid="sketch-canvas">
      {/* toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-muted p-1" role="radiogroup" aria-label="Drawing tool">
          {tools.map((item) => (
            <button
              key={item.id}
              role="radio"
              aria-checked={tool === item.id}
              aria-label={item.label}
              title={item.label}
              onClick={() => setTool(item.id)}
              className={cn(
                "rounded-full p-2 transition-colors",
                tool === item.id ? "bg-card text-primary shadow-cozy" : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`tool-${item.id}`}
            >
              <item.icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* colour */}
        <div className="flex items-center gap-1" role="group" aria-label="Colour">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              aria-label={`Colour ${swatch}`}
              onClick={() => setColor(swatch)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                color === swatch ? "border-primary ring-2 ring-primary/40" : "border-border"
              )}
              style={{ backgroundColor: swatch }}
            />
          ))}
          <label className="relative ml-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border" title="Custom colour">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Custom colour"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
          </label>
        </div>

        {/* size */}
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Size</span>
          <input
            type="range"
            min={2}
            max={48}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            aria-label="Brush size"
            className="w-24 accent-[#C96F4A]"
          />
          <span
            aria-hidden
            className="inline-block rounded-full bg-foreground"
            style={{ width: Math.max(4, size / 2), height: Math.max(4, size / 2) }}
          />
        </label>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={undo} disabled={undoStack.current.length === 0} aria-label="Undo" data-history={historyTick} data-testid="sketch-undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={redoStack.current.length === 0} aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={clearAll} aria-label="Clear canvas" data-testid="sketch-clear">
            <Trash2 className="h-4 w-4" />
          </Button>
          {hasBg ? (
            <Button variant="ghost" size="sm" onClick={removeBg} aria-label="Remove background photo">
              <X className="h-3.5 w-3.5" /> photo
            </Button>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-muted" title="Draw on top of a photo">
              <ImagePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Photo under</span>
              <input type="file" accept="image/*" className="sr-only" onChange={onUploadBg} />
            </label>
          )}
        </div>
      </div>

      {/* canvas */}
      <canvas
        ref={displayRef}
        width={LOGICAL_W}
        height={LOGICAL_H}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="w-full cursor-crosshair touch-none rounded-md border bg-[#FFFCF5]"
        style={{ aspectRatio: `${LOGICAL_W} / ${LOGICAL_H}` }}
        aria-label="Sketch canvas — draw your idea with mouse, touch or stylus"
      />
    </div>
  );
});

import { FrameState } from 'ol/Map';
import { createWebMercatorProjection } from '../../utils/map';

export function getCanvasAndCtx(container: HTMLElement, width: number, height: number, id: string) {
  let canvas = container.querySelector<HTMLCanvasElement>(`#${id}`);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = id;
  // Position and size canvas to overlay the map viewport
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  // Let map capture events by default; tooltips/selections use SVG or explicit handlers
  canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);
  }
  const dpr = Math.max(1, (globalThis as any).devicePixelRatio || 1);
  const desiredW = Math.floor(width * dpr);
  const desiredH = Math.floor(height * dpr);
  if (canvas.width !== desiredW) canvas.width = desiredW;
  if (canvas.height !== desiredH) canvas.height = desiredH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not available');
  // Prefer crisp vector edges when scaling
  try { (ctx as any).imageSmoothingEnabled = false; } catch {}
  // Reset transform so callers can clear in device pixels, then scale for CSS drawing
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas, ctx, dpr } as const;
}

export function mercatorProjector(frameState: FrameState, width: number, height: number) {
  const proj = createWebMercatorProjection(frameState, width, height);
  return (lon: number, lat: number) => proj([lon, lat]) as [number, number];
}

/** 拖拽对齐引导线：与其他元素 / 画布边缘、中心对齐时吸附并返回引导线 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Guide {
  /** v：竖线（对齐 X）；h：横线（对齐 Y） */
  orientation: 'v' | 'h';
  /** 引导线位置，单位点(dot) */
  pos: number;
}

export interface SnapResult {
  /** 相对 proposed 矩形原点的 X 吸附修正（点） */
  dx: number;
  /** 相对 proposed 矩形原点的 Y 吸附修正（点） */
  dy: number;
  guides: Guide[];
}

function xEdges(r: Rect): number[] {
  return [r.x, r.x + r.w / 2, r.x + r.w];
}

function yEdges(r: Rect): number[] {
  return [r.y, r.y + r.h / 2, r.y + r.h];
}

/**
 * 元素在画布上的轴对齐包围盒（考虑 90°/270° 绕中心旋转后宽高对调）。
 * 平移 (x,y) 时该 AABB 同步平移，故吸附 delta 可直接加回元素坐标。
 */
export function rotatedAabb(x: number, y: number, w: number, h: number, rotation = 0): Rect {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 90 || r === 270) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    return { x: cx - h / 2, y: cy - w / 2, w: h, h: w };
  }
  return { x, y, w, h };
}

/** 多个矩形的包围盒 */
export function unionRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * 将 moving 矩形相对 targets 做边缘/中心吸附。
 * threshold：吸附阈值（点）。返回修正量与应对齐的引导线。
 */
export function snapRect(moving: Rect, targets: Rect[], threshold: number): SnapResult {
  const tx: number[] = [];
  const ty: number[] = [];
  for (const t of targets) {
    tx.push(...xEdges(t));
    ty.push(...yEdges(t));
  }

  let bestDx = 0;
  let bestDxAbs = threshold + 1;
  for (const m of xEdges(moving)) {
    for (const t of tx) {
      const d = t - m;
      const a = Math.abs(d);
      if (a <= threshold && a < bestDxAbs) {
        bestDxAbs = a;
        bestDx = d;
      }
    }
  }

  let bestDy = 0;
  let bestDyAbs = threshold + 1;
  for (const m of yEdges(moving)) {
    for (const t of ty) {
      const d = t - m;
      const a = Math.abs(d);
      if (a <= threshold && a < bestDyAbs) {
        bestDyAbs = a;
        bestDy = d;
      }
    }
  }

  const dx = bestDxAbs <= threshold ? bestDx : 0;
  const dy = bestDyAbs <= threshold ? bestDy : 0;
  const snapped: Rect = { x: moving.x + dx, y: moving.y + dy, w: moving.w, h: moving.h };

  // 吸附后收集所有对齐到的位置（去重），作为可见引导线
  const eps = 0.51;
  const vPos = new Set<number>();
  const hPos = new Set<number>();
  for (const m of xEdges(snapped)) {
    for (const t of tx) {
      if (Math.abs(m - t) <= eps) vPos.add(t);
    }
  }
  for (const m of yEdges(snapped)) {
    for (const t of ty) {
      if (Math.abs(m - t) <= eps) hPos.add(t);
    }
  }

  const guides: Guide[] = [
    ...[...vPos].map((pos): Guide => ({ orientation: 'v', pos })),
    ...[...hPos].map((pos): Guide => ({ orientation: 'h', pos })),
  ];

  return { dx, dy, guides };
}

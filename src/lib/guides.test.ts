import { describe, expect, it } from 'vitest';
import { rotatedAabb, snapRect, unionRects } from './guides';

describe('rotatedAabb', () => {
  it('keeps box for 0/180', () => {
    expect(rotatedAabb(10, 20, 40, 10, 0)).toEqual({ x: 10, y: 20, w: 40, h: 10 });
    expect(rotatedAabb(10, 20, 40, 10, 180)).toEqual({ x: 10, y: 20, w: 40, h: 10 });
  });

  it('swaps size around center for 90/270', () => {
    // center (30, 25); after 90 → 10×40 box centered there
    expect(rotatedAabb(10, 20, 40, 10, 90)).toEqual({ x: 25, y: 5, w: 10, h: 40 });
    expect(rotatedAabb(10, 20, 40, 10, 270)).toEqual({ x: 25, y: 5, w: 10, h: 40 });
  });
});

describe('unionRects', () => {
  it('returns null for empty input', () => {
    expect(unionRects([])).toBeNull();
  });

  it('unions multiple rects', () => {
    expect(unionRects([
      { x: 10, y: 20, w: 30, h: 40 },
      { x: 5, y: 50, w: 10, h: 10 },
    ])).toEqual({ x: 5, y: 20, w: 35, h: 40 });
  });
});

describe('snapRect', () => {
  const canvas = { x: 0, y: 0, w: 100, h: 80 };

  it('snaps left edge to another element left', () => {
    const moving = { x: 22, y: 10, w: 20, h: 10 };
    const other = { x: 20, y: 40, w: 15, h: 10 };
    const r = snapRect(moving, [canvas, other], 5);
    expect(r.dx).toBe(-2);
    expect(r.guides.some((g) => g.orientation === 'v' && g.pos === 20)).toBe(true);
  });

  it('snaps center to canvas center', () => {
    const moving = { x: 38, y: 10, w: 20, h: 10 }; // center x = 48, canvas cx = 50
    const r = snapRect(moving, [canvas], 5);
    expect(r.dx).toBe(2);
    expect(r.guides.some((g) => g.orientation === 'v' && g.pos === 50)).toBe(true);
  });

  it('does not snap beyond threshold', () => {
    const moving = { x: 40, y: 10, w: 20, h: 10 };
    const other = { x: 10, y: 40, w: 15, h: 10 };
    const r = snapRect(moving, [other], 2);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
    expect(r.guides).toEqual([]);
  });

  it('snaps both axes independently', () => {
    const moving = { x: 19, y: 39, w: 20, h: 10 };
    const other = { x: 20, y: 40, w: 30, h: 20 };
    const r = snapRect(moving, [other], 5);
    expect(r.dx).toBe(1);
    expect(r.dy).toBe(1);
    expect(r.guides.some((g) => g.orientation === 'v' && g.pos === 20)).toBe(true);
    expect(r.guides.some((g) => g.orientation === 'h' && g.pos === 40)).toBe(true);
  });
});

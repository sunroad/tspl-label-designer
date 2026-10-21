// 条码 / 二维码的示意性预览渲染。
// 说明：浏览器内无法生成真实的条码位图编码，这里用「种子随机」生成视觉上逼真的条码与二维码。
// 实际打印精度以打印机渲染为准。

const hashCode = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const lcg = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

export function barcodeBars(content: string, wPx: number): [number, number][] {
  const rnd = lcg(hashCode(content));
  const bars: [number, number][] = [];
  let x = wPx * 0.04;
  let guard = 0;
  while (x < wPx * 0.96 && guard++ < 600) {
    const bw = Math.max(1, wPx * 0.012 + rnd() * wPx * 0.028);
    bars.push([x, bw]);
    x += bw + Math.max(1, wPx * 0.008 + rnd() * wPx * 0.02);
  }
  return bars;
}

export function qrBlackCells(content: string, n = 21): [number, number][] {
  const cells: [number, number][] = [];
  const rnd = lcg(hashCode(content));
  const finder = (r: number, c: number, fr: number, fc: number): boolean | null => {
    if (r >= fr && r < fr + 7 && c >= fc && c < fc + 7) {
      const dr = r - fr;
      const dc = c - fc;
      if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
      if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
      return false;
    }
    return null;
  };
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      let on = finder(r, c, 0, 0);
      if (on === null) on = finder(r, c, 0, n - 7);
      if (on === null) on = finder(r, c, n - 7, 0);
      if (on === null) on = r === 6 || c === 6 ? (r + c) % 2 === 0 : rnd() < 0.45;
      if (on) cells.push([r, c]);
    }
  }
  return cells;
}

/** 二维条码（PDF417 / DataMatrix / Aztec / MaxiCode）示意：带 L 形定位边的规则点阵 */
export function matrixBlackCells(content: string, cols = 16, rows = 16): [number, number][] {
  const cells: [number, number][] = [];
  const rnd = lcg(hashCode(content));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 四周作为定位/静区边，内部用种子随机填充
      const edge = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
      const on = edge ? (r + c) % 2 === 0 : rnd() < 0.5;
      if (on) cells.push([r, c]);
    }
  }
  return cells;
}

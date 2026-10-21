// 内置 2–5 英数字体（12×20 / 16×24 / 24×32 / 32×48）的 ASCII 点阵化预览。
// 说明：TSC 固件字形的二进制数据是私有格式、无法获取，这里用「程序点阵化」近似——
// 用系统等宽字体把字符渲染到 w×h 网格，逐像素量化采样成布尔点阵，供预览逐点画块。
// 非可打印 ASCII 字符（含中文）返回 null，由调用方回退到系统字体压宽方案。

import { DOT_FONTS } from './fonts';

/** 点阵网格宽高（点），与 DOT_FONTS 一致 */
interface Grid {
  w: number;
  h: number;
}

// 采样阈值：像素灰度高于此值判为「墨点」。0.5 即取中灰，兼顾细笔画与抗锯齿
const THRESHOLD = 0.5;

// 模块级缓存：fontKey:char → 点阵，避免每次渲染重复采样
const cache = new Map<string, boolean[][]>();

/** 是否为可渲染的可打印 ASCII（空格 0x20 ~ ~ 0x7E） */
const isPrintableAscii = (ch: string): boolean => {
  const c = ch.charCodeAt(0);
  return c >= 0x20 && c <= 0x7e;
};

/**
 * 把单个字符渲染为 point 点阵（true=墨点）。
 * 仅支持内置 2–5 英数字体与可打印 ASCII；其余返回 null。
 */
export function dotMatrix(fontKey: string, ch: string): boolean[][] | null {
  if (!isPrintableAscii(ch)) return null;
  const f = DOT_FONTS[fontKey];
  if (!f || fontKey === '0' || fontKey === '1' || fontKey.endsWith('.BF2')) return null;

  const key = `${fontKey}:${ch}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const grid: Grid = { w: f[0], h: f[1] };
  // 离屏 canvas 尺寸即点阵宽高，逐像素即逐点采样
  const canvas = document.createElement('canvas');
  canvas.width = grid.w;
  canvas.height = grid.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, grid.w, grid.h);
  ctx.fillStyle = '#000';

  // 字号取格高时，字形墨迹只占 em 盒的约 65%，导致数字比中文回退文本矮一大截。
  // 以数字 '8' 的墨迹高度为基准反推字号，让数字/大写填满约 90% 格高（贴近真实位图字体，
  // 也与回退 <text> 中 CJK 字形 ~88% em 的视觉高度一致）；基线置于 95% 格高，下方留少量下降部空间。
  const DIGIT_FILL = 0.9;
  ctx.font = `${grid.h}px monospace`;
  const probe = ctx.measureText('8');
  const probeInk = Math.max(probe.actualBoundingBoxAscent + probe.actualBoundingBoxDescent, 1);
  const fontSize = (grid.h * DIGIT_FILL) * (grid.h / probeInk);
  ctx.font = `${fontSize}px monospace`;

  // 横向：以数字 '8' 墨迹恰好占满格宽为统一缩放；个别更宽的字符（如 M/W）再多压一点
  const pm = ctx.measureText('8');
  const pInkW = Math.max(pm.actualBoundingBoxLeft + pm.actualBoundingBoxRight, 1);
  const sxBase = grid.w / pInkW;
  const m = ctx.measureText(ch);
  const inkW = Math.max(m.actualBoundingBoxLeft + m.actualBoundingBoxRight, 1);
  const sx = Math.min(sxBase, grid.w / inkW);

  ctx.save();
  // 平移到「基线居中点」再缩放：墨迹水平居中，数字墨迹纵向占 [5%, 95%] 格高
  ctx.translate(grid.w / 2, grid.h * (1 - (1 - DIGIT_FILL) / 2));
  ctx.scale(sx, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(ch, 0, 0);
  ctx.restore();

  const data = ctx.getImageData(0, 0, grid.w, grid.h).data;
  const matrix: boolean[][] = [];
  for (let r = 0; r < grid.h; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < grid.w; c++) {
      // 取 R 通道即可（黑字白底），> 阈值判为墨点
      const gray = data[(r * grid.w + c) * 4] / 255;
      row.push(gray < THRESHOLD);
    }
    matrix.push(row);
  }

  cache.set(key, matrix);
  return matrix;
}

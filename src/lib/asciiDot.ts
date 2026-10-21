// 内置点阵字体的字符点阵化预览。
// 说明：打印机固件字形为私有格式、无法获取，这里用「程序点阵化」近似——
// 用系统字体把字符渲染到 w×h 网格，逐像素量化采样成布尔点阵，供预览逐点画块。
// 内置 0–5：中文用原尺寸方格、英数用半尺寸方格；.BF2：半角 [12,24]、全角 [24,24]。

import { charDotSize, isCJK, isCJKDotFont } from './fonts';

/** 点阵网格宽高（点） */
interface Grid {
  w: number;
  h: number;
}

// 采样阈值：像素灰度低于此值判为「墨点」。0.5 即取中灰，兼顾细笔画与抗锯齿
const THRESHOLD = 0.5;

// 墨迹约占格高的比例
const GLYPH_FILL = 0.88;

// 采样字体：等宽优先，并带中文回退
const SAMPLE_FONT =
  '"Menlo", "Consolas", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", monospace';

// 模块级缓存：fontKey:char → 点阵，避免每次渲染重复采样
const cache = new Map<string, boolean[][]>();

/** 是否为可打印 ASCII（空格 0x20 ~ ~ 0x7E） */
const isPrintableAscii = (ch: string): boolean => {
  const c = ch.charCodeAt(0);
  return c >= 0x20 && c <= 0x7e;
};

/**
 * 把单个字符渲染为 point 点阵（true=墨点）。
 * 内置 0–5：中英按各自字号采样；混排时英数保留半宽、采用中文格高。
 * .BF2：ASCII 半角、中文全角。无法采样时返回 null，由调用方回退。
 */
export function dotMatrix(fontKey: string, ch: string, mixedLineHeight?: number): boolean[][] | null {
  // .BF2 仅对可打印 ASCII 做半角点阵；中文走系统字压宽（全角 2 单元）即可
  if (isCJKDotFont(fontKey) && !isPrintableAscii(ch)) return null;

  const size = charDotSize(fontKey, ch);
  if (!size) return null;
  const grid: Grid = {
    w: size[0],
    h: mixedLineHeight && !isCJKDotFont(fontKey) && !isCJK(ch) ? mixedLineHeight : size[1],
  };
  if (grid.w <= 0 || grid.h <= 0) return null;

  const key = `${fontKey}:${grid.w}x${grid.h}:${ch}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = grid.w;
  canvas.height = grid.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, grid.w, grid.h);
  ctx.fillStyle = '#000';

  // 以代表性字符的墨迹高度反推字号，让墨迹填满约 GLYPH_FILL 格高
  const probeChar = isCJK(ch) ? '国' : '8';
  ctx.font = `${grid.h}px ${SAMPLE_FONT}`;
  const probe = ctx.measureText(probeChar);
  const probeInk = Math.max(probe.actualBoundingBoxAscent + probe.actualBoundingBoxDescent, 1);
  const fontSize = (grid.h * GLYPH_FILL) * (grid.h / probeInk);
  ctx.font = `${fontSize}px ${SAMPLE_FONT}`;

  // 横向：以探针墨迹占满格宽为统一缩放；当前字符更宽时再压一点，避免溢出格子
  const pm = ctx.measureText(probeChar);
  const pInkW = Math.max(pm.actualBoundingBoxLeft + pm.actualBoundingBoxRight, 1);
  const sxBase = grid.w / pInkW;
  const m = ctx.measureText(ch);
  const inkW = Math.max(m.actualBoundingBoxLeft + m.actualBoundingBoxRight, 1);
  const sx = Math.min(sxBase, grid.w / inkW);

  ctx.save();
  // 墨迹水平居中；基线置于格底附近
  ctx.translate(grid.w / 2, grid.h * (1 - (1 - GLYPH_FILL) / 2));
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
      const gray = data[(r * grid.w + c) * 4] / 255;
      row.push(gray < THRESHOLD);
    }
    matrix.push(row);
  }

  cache.set(key, matrix);
  return matrix;
}

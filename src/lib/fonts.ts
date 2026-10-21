// TSPL 内置点阵字体：[宽, 高]（单位：点）
// 依据 TSC TSPL 手册：1=8×12, 2=12×20, 3=16×24, 4=24×32, 5=32×48；0 为 TSPL2 等比例 TrueType
export const DOT_FONTS: Record<string, [number, number]> = {
  '1': [8, 12],
  '2': [12, 20],
  '3': [16, 24],
  '4': [24, 32],
  '5': [32, 48],
};

export interface FontOption {
  value: string;
  label: string;
}

export const FONTS: FontOption[] = [
  { value: '0', label: '内置 0 · TrueType (TSPL2)' },
  { value: '1', label: '内置 1 · 8×12' },
  { value: '2', label: '内置 2 · 12×20' },
  { value: '3', label: '内置 3 · 16×24' },
  { value: '4', label: '内置 4 · 24×32' },
  { value: '5', label: '内置 5 · 32×48' },
  { value: 'TST24.BF2', label: 'TST24.BF2 简体中文' },
  { value: 'TSS24.BF2', label: 'TSS24.BF2 繁体中文' },
  { value: 'Arial', label: 'Arial (TTF)' },
];

export const BARCODE_TYPES = [
  '128', 'EAN128', '39', '93', 'EAN13', 'EAN8', 'UPCA', 'UPCE',
  'CODABAR', 'ITF14', 'EAN14', '25', 'MSI', 'PLESSEY',
];

/** 二维条码码制（合并为 barcode2d 元素类型） */
export const BARCODE2D_TYPES = ['PDF417', 'DMATRIX', 'AZTEC', 'MAXICODE'];

/** 位图图像格式（image 元素） */
export const IMAGE_FORMATS = ['BMP', 'PCX'];

export const ROTATIONS = [0, 90, 180, 270];

export const ECCS = ['L', 'M', 'Q', 'H'];

const isCJK = (ch: string): boolean => /[　-〿一-鿿＀-￯]/.test(ch);

/** 计算字符串显示宽度，中文等全角字符按 2 个字符宽计 */
export const displayWidth = (s: string): number => {
  let w = 0;
  for (const ch of s) w += isCJK(ch) ? 2 : 1;
  return w;
};

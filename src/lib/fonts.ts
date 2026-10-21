// TSPL 内置点阵字体：[宽, 高]（单位：点）
// 商米 V3 官方（含中文，全角占 2 单元）：0=12×24 ASCII / 24×24 中文 GBK，1=8×16 ASCII / 16×16 中文 GBK
// TSC 通用（纯英数，一律 1 单元/字符）：2=12×20, 3=16×24, 4=24×32, 5=32×48
// BF2 为 24×24 中文点阵：半角(ASCII) 12 点宽、全角(中文) 24 点宽，高 24 点，故记录为 [12, 24]
// TSS=简体(GB 码)、TST=繁体(Big5 码)：点阵字体按码表寻址，发送端须用对应编码，UTF-8 会乱码
export const DOT_FONTS: Record<string, [number, number]> = {
  '0': [12, 24],
  '1': [8, 16],
  '2': [12, 20],
  '3': [16, 24],
  '4': [24, 32],
  '5': [32, 48],
  'TST24.BF2': [12, 24],
  'TSS24.BF2': [12, 24],
};

export interface FontOption {
  value: string;
  label: string;
}

export const FONTS: FontOption[] = [
  { value: '0', label: '内置 0 · 12×24 英数 + 24×24 中文 (GBK)' },
  { value: '1', label: '内置 1 · 8×16 英数 + 16×16 中文 (GBK)' },
  { value: '2', label: '内置 2 · 12×20 英数' },
  { value: '3', label: '内置 3 · 16×24 英数' },
  { value: '4', label: '内置 4 · 24×32 英数' },
  { value: '5', label: '内置 5 · 32×48 英数' },
  { value: 'TSS24.BF2', label: 'TSS24.BF2 简体中文 (GB)' },
  { value: 'TST24.BF2', label: 'TST24.BF2 繁体中文 (Big5)' },
  { value: 'Arial', label: 'Arial (TTF)' },
];

// 自定义字体持久化 key；仅保存名字，点阵未知时按 TTF 等比估算
const CUSTOM_FONTS_KEY = 'tspl:customFonts';

/** 读取用户自定义字体名列表（本地持久化） */
export function loadCustomFonts(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FONTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
  } catch {
    return [];
  }
}

/** 新增自定义字体名（去重，返回更新后的列表） */
export function addCustomFont(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return loadCustomFonts();
  const list = loadCustomFonts();
  if (list.includes(trimmed)) return list;
  const next = [...list, trimmed];
  try { localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(next)); } catch { /* 隐私模式写入失败忽略 */ }
  return next;
}

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

/** 判断字符是否为全角（中文等），用于按点阵单元宽度排布 */
export const isCJK = (ch: string): boolean => /[　-〿一-鿿＀-￯]/.test(ch);

/** 是否为中文点阵字体（全角占 2 单元、半角占 1 单元）：
 *  商米内置 0/1 与 .BF2 均含中文点阵；TSC 英数字体 2–5 无全角概念，一律 1 单元/字符。 */
export const isCJKDotFont = (font: string): boolean => font === '0' || font === '1' || font.endsWith('.BF2');

/** 计算字符串显示宽度，中文等全角字符按 2 个字符宽计（用于 TrueType 等比字体） */
export const displayWidth = (s: string): number => {
  let w = 0;
  for (const ch of s) w += isCJK(ch) ? 2 : 1;
  return w;
};

/** 计算字符串在该点阵字体下占用的「单元」数：
 *  中文点阵字体全角=2、半角=1；英数字体一律 1 单元/字符（按 Unicode 码点计）。 */
export const cellCount = (s: string, font: string): number => {
  if (isCJKDotFont(font)) return displayWidth(s);
  return Array.from(s).length;
};

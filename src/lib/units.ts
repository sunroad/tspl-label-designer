export const DPI = 203;
export const DOTS_PER_MM = DPI / 25.4; // ≈ 8 点/mm

/** mm → 点(dot)，四舍五入 */
export const mm2d = (mm: number): number => Math.round(mm * DOTS_PER_MM);

/** 点(dot) → mm */
export const d2mm = (dots: number): number => dots / DOTS_PER_MM;

/** 保留一位小数 */
export const fmt = (n: number): number => Math.round(n * 10) / 10;

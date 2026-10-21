// 打印头分辨率。TSC 常见 203（约 8 点/mm），商米标签模块/工业机为 300。
// DPI 现为用户可配置项，保存在 LabelSettings.dpi；此常量仅作未配置时的兜底默认值。
export const DPI = 203;
export const DEFAULT_DOT_PER_MM = DPI / 25.4; // ≈ 8 点/mm

/** mm → 点(dot)，四舍五入；dpi 缺省用 203 */
export const mm2d = (mm: number, dpi: number = DPI): number => Math.round(mm * (dpi / 25.4));

/** 点(dot) → mm；dpi 缺省用 203 */
export const d2mm = (dots: number, dpi: number = DPI): number => dots / (dpi / 25.4);

/** 屏幕校准：由「测量条像素长 / 实测 mm」反推屏幕 PPI */
export const measurePpi = (barPx: number, measuredMm: number): number => {
  if (measuredMm <= 0) return 0;
  return (barPx * 25.4) / measuredMm;
};

/** 物理 1:1 显示倍率（px/mm）= PPI / 25.4；PPI 未校准(0)时返回 0 */
export const ppiToZoom = (ppi: number): number => (ppi > 0 ? ppi / 25.4 : 0);

/** 保留一位小数 */
export const fmt = (n: number): number => Math.round(n * 10) / 10;

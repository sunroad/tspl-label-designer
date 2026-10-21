import type { LabelElement, LabelSettings } from './types';
import { mm2d } from './lib/units';

// 标签整体尺寸为 mm（SIZE/GAP 指令单位）；dpi 用于把下面的演示坐标/尺寸从 mm 折算成点
const DPI = 203;

export const DEFAULT_LABEL: LabelSettings = {
  width: 60, height: 40, gap: 3, printOffsetX: 0, printOffsetY: 0,
  speed: 4, density: 10, direction: 0, copies: 1, dpi: DPI,
};

// 元素坐标与尺寸一律以「点(dot)」存储，与 TSPL 指令数值 1:1。
// 演示默认值按 203 DPI 由 mm 折算（约 8 点/mm），仅作视觉参照。
export const DEFAULT_ELEMENTS: LabelElement[] = [
  {
    id: 'e1', type: 'text', x: mm2d(4, DPI), y: mm2d(4, DPI), font: 'TSS24.BF2', rotation: 0,
    xMult: 1, yMult: 1, content: '产品名称',
  },
  {
    id: 'e2', type: 'barcode', x: mm2d(4, DPI), y: mm2d(12, DPI), codeType: '128', height: mm2d(9, DPI),
    humanReadable: 1, rotation: 0, narrow: 2, wide: 3, content: '6901234567890',
  },
  {
    id: 'e3', type: 'qrcode', x: mm2d(30, DPI), y: mm2d(4, DPI), ecc: 'M', cellWidth: 4,
    rotation: 0, content: 'https://example.com',
  },
  {
    id: 'e4', type: 'line', x: mm2d(4, DPI), y: mm2d(24, DPI), width: mm2d(20, DPI), height: mm2d(0.4, DPI), rotation: 0,
  },
  {
    id: 'e5', type: 'box', x: mm2d(44, DPI), y: mm2d(24, DPI), width: mm2d(12, DPI), height: mm2d(9, DPI), thickness: mm2d(0.3, DPI), rotation: 0,
  },
];

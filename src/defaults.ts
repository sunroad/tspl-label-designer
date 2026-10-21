import type { LabelElement, LabelSettings } from './types';

export const DEFAULT_LABEL: LabelSettings = {
  width: 60, height: 40, gap: 3, speed: 4, density: 10, direction: 0, copies: 1,
};

export const DEFAULT_ELEMENTS: LabelElement[] = [
  {
    id: 'e1', type: 'text', x: 4, y: 4, font: 'TST24.BF2', rotation: 0,
    xMult: 1, yMult: 1, content: '产品名称',
  },
  {
    id: 'e2', type: 'barcode', x: 4, y: 12, codeType: '128', height: 9,
    humanReadable: 1, rotation: 0, narrow: 2, wide: 3, content: '6901234567890',
  },
  {
    id: 'e3', type: 'qrcode', x: 30, y: 4, ecc: 'M', cellWidth: 4,
    rotation: 0, content: 'https://example.com',
  },
  {
    id: 'e4', type: 'line', x: 4, y: 24, width: 20, height: 0.4, rotation: 0,
  },
  {
    id: 'e5', type: 'box', x: 44, y: 24, width: 12, height: 9, thickness: 0.3, rotation: 0,
  },
];

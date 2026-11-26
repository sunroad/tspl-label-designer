import { expect, it } from 'vitest';
import { mm2d } from './units';
import { DEFAULT_LABEL } from '../defaults';
import type { LabelElement } from '../types';
import { generateTSPL, getBox } from './tspl';

const qr: Extract<LabelElement, { type: 'qrcode' }> = {
  id: 'qr-test', type: 'qrcode', x: 36, y: 295,
  ecc: 'H', cellWidth: 5, rotation: 0, content: 'MU2610220001',
};

it('二维码输入 5 点时按 4 点预览，导出仍保留 5 点', () => {
  expect(getBox(qr)).toEqual({ w: 4 * 29, h: 4 * 29 });
  expect(generateTSPL(DEFAULT_LABEL, [qr])).toContain('QRCODE 36,295,H,5,A,0,"MU2610220001"');
});

it('二维码模块宽度为 1 点时预览至少保留 1 点', () => {
  expect(getBox({ ...qr, cellWidth: 1 })).toEqual({ w: 29, h: 29 });
});

it('可读条码的包围盒包含下方文字，条纹高度仍按原值导出', () => {
  const barcode: Extract<LabelElement, { type: 'barcode' }> = {
    id: 'barcode-test', type: 'barcode', x: 10, y: 20, codeType: '128',
    height: 64, humanReadable: 1, rotation: 0, narrow: 2, wide: 3, content: '1234567890',
  };
  expect(getBox(barcode, 203).h).toBe(64 + mm2d(3, 203));
  expect(getBox({ ...barcode, humanReadable: 0 }, 203).h).toBe(64);
  expect(generateTSPL(DEFAULT_LABEL, [barcode])).toContain('BARCODE 10,20,"128",64,1,0,2,3,"1234567890"');
});

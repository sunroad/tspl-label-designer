import { expect, it } from 'vitest';
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

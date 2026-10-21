import { describe, expect, it } from 'vitest';
import { DEFAULT_LABEL } from '../defaults';
import type { LabelElement } from '../types';
import { generateTSPL, getBox } from './tspl';

describe('TSPL 点参数', () => {
  it('将导出的坐标、终点和尺寸取整，并保留原始元素', () => {
    const elements: LabelElement[] = [
      { id: 't', type: 'text', x: 10.5, y: 20.5, font: '1', rotation: 0, xMult: 1, yMult: 1, content: 'A' },
      { id: 'b', type: 'box', x: 10.4, y: 20.4, width: 3.4, height: 4.4, thickness: 1.5, rotation: 0 },
      { id: 'q', type: 'qrcode', x: 1.5, y: 2.5, ecc: 'M', cellWidth: 3.5, rotation: 0, content: 'x' },
    ];
    const label = { ...DEFAULT_LABEL, printOffsetX: 1.5, printOffsetY: -2.5 };

    const lines = generateTSPL(label, elements).split('\n');

    expect(lines).toContain('REFERENCE 2,-2');
    expect(lines).toContain('TEXT 11,21,"1",0,1,1,"A"');
    expect(lines).toContain('BOX 10,20,14,25,2');
    expect(lines).toContain('QRCODE 2,3,M,4,A,0,"x"');
    expect(elements[1]).toMatchObject({ x: 10.4, width: 3.4, thickness: 1.5 });
  });
});

describe('点阵文字包围盒', () => {
  it('纯英数使用英数字高，混排使用中文行高', () => {
    const text: LabelElement = {
      id: 't', type: 'text', x: 0, y: 0, font: '3', rotation: 0,
      xMult: 1, yMult: 1, content: 'ABC',
    };

    expect(getBox(text)).toEqual({ w: 36, h: 12 });
    expect(getBox({ ...text, content: 'A中' })).toEqual({ w: 36, h: 24 });
    expect(getBox({ ...text, font: 'TSS24.BF2' })).toEqual({ w: 36, h: 24 });
  });
});

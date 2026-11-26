import { expect, it } from 'vitest';
import { DEFAULT_LABEL } from '../defaults';
import type { LabelElement } from '../types';
import { generateTSPL, getBox } from './tspl';
import { previewElement, resolvePreview, VARIABLE_TOKEN } from './variables';

it('变量仅改变预览内容和文字宽度，TSPL 导出保留占位符', () => {
  const text: LabelElement = { id: 'text', type: 'text', x: 0, y: 0, font: '1', rotation: 0, xMult: 1, yMult: 1, content: '单号：%order%' };
  const variables = [{ token: '%order%', preview: '1234567890' }];
  const shown = previewElement(text, variables);
  expect(shown).toMatchObject({ content: '单号：1234567890' });
  expect(getBox(shown).w).toBeGreaterThan(getBox(text).w);
  expect(generateTSPL(DEFAULT_LABEL, [text])).toContain('"单号：%order%"');
});

it('重复变量一次替换，未知变量和替换值中的占位符保持原样', () => {
  expect(resolvePreview('%a% / %a% / %unknown%', [{ token: '%a%', preview: '%other%' }]))
    .toBe('%other% / %other% / %unknown%');
});

it('自定义包围符号与旧格式同时预览，较长占位符优先且预览值不递归替换', () => {
  const variables = [
    { token: '%order%', preview: '旧格式' },
    { token: '##order##', preview: '新格式' },
    { token: '#%order#%', preview: '%order%' },
    { token: '#order#', preview: '短格式' },
  ];
  expect(resolvePreview('%order% / ##order## / #%order#% / #order# / ##missing##', variables))
    .toBe('旧格式 / 新格式 / %order% / 短格式 / ##missing##');
});

it('变量格式要求两侧包围符号一致且名称合法', () => {
  for (const token of ['%name%', '##name##', '#%name#%', '$order_2$', '.name.']) {
    expect(VARIABLE_TOKEN.test(token)).toBe(true);
  }
  for (const token of ['%name#', '##name#', '%2name%', 'name', '%%', 'a name']) {
    expect(VARIABLE_TOKEN.test(token)).toBe(false);
  }
});

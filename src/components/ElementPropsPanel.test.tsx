import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { TextElement } from '../types';
import ElementPropsPanel from './ElementPropsPanel';

it('为导入且未保存的字体显示当前选项', () => {
  const el: TextElement = {
    id: 't', type: 'text', x: 0, y: 0, font: 'MYFONT',
    rotation: 0, xMult: 1, yMult: 1, content: 'ABC',
  };
  const html = renderToStaticMarkup(
    <ElementPropsPanel el={el} open onToggle={() => {}} onChange={() => {}}
      onDuplicate={() => {}} onDelete={() => {}} />,
  );

  expect(html).toContain('<option value="MYFONT" selected="">');
});

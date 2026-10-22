import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { DEFAULT_LABEL } from '../defaults';
import LabelInfoPanel from './LabelInfoPanel';

const props = {
  label: DEFAULT_LABEL,
  printerOffset: { x: 30, y: 5 },
  open: true,
  onToggle: () => {},
  onChange: () => {},
  onPrinterOffsetChange: () => {},
  onPrinterToggle: () => {},
};

it('打印机分组展开时显示打印参数和校准偏移', () => {
  const html = renderToStaticMarkup(<LabelInfoPanel {...props} printerOpen />);

  expect(html).toContain('标签宽度 (mm)');
  expect(html).toContain('打印机设置');
  expect(html).toContain('打印机 X 偏移 (dot)');
  expect(html).toContain('打印速度 (IPS)');
  expect(html).toContain('打印头 DPI');
});

it('收起打印机分组仍显示标签尺寸', () => {
  const html = renderToStaticMarkup(<LabelInfoPanel {...props} printerOpen={false} />);

  expect(html).toContain('标签宽度 (mm)');
  expect(html).toContain('打印机设置');
  expect(html).not.toContain('TSPL X 偏移 (dot)');
  expect(html).not.toContain('打印机 X 偏移 (dot)');
  expect(html).not.toContain('打印速度 (IPS)');
});

it('收起标签分组不影响打印机设置', () => {
  const html = renderToStaticMarkup(<LabelInfoPanel {...props} open={false} printerOpen />);

  expect(html).not.toContain('标签宽度 (mm)');
  expect(html).toContain('打印机 X 偏移 (dot)');
  expect(html).toContain('打印速度 (IPS)');
});

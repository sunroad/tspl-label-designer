import { useState, type CSSProperties } from 'react';
import type { LabelElement } from '../types';
import { SectionHeader } from './ui';
import ElementIcon from './ElementIcon';

interface Props {
  elements: LabelElement[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onAdd: (type: LabelElement['type']) => void;
}

const ADD_ITEMS: { type: LabelElement['type']; label: string }[] = [
  { type: 'text', label: '文本' },
  { type: 'barcode', label: '条形码' },
  { type: 'qrcode', label: '二维码' },
  { type: 'barcode2d', label: '二维条码' },
  { type: 'line', label: '直线' },
  { type: 'box', label: '方框' },
  { type: 'ellipse', label: '椭圆' },
  { type: 'circle', label: '圆' },
  { type: 'arc', label: '圆弧' },
  { type: 'block', label: '填充块' },
  { type: 'reverse', label: '反白区' },
  { type: 'diagonal', label: '反斜线' },
  { type: 'image', label: '图像' },
];

const TYPE_LABEL: Record<LabelElement['type'], string> = {
  text: '文本', barcode: '条形码', qrcode: '二维码', barcode2d: '二维条码',
  line: '直线', box: '方框', ellipse: '椭圆', circle: '圆', arc: '圆弧',
  block: '填充块', reverse: '反白区', diagonal: '反斜线', image: '图像',
};

// 九宫格按钮样式：图标在上、标签在下，竖直居中
const gridBtnStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '8px 2px', borderRadius: 6, border: '1px solid #d0d5dd',
  background: '#fff', cursor: 'pointer', color: '#1d2939',
};

export default function ElementLibrary({ elements, selectedIds, onSelect, onAdd }: Props) {
  // 添加元素与元素列表各自可折叠（与右侧属性栏行为一致）
  const [addOpen, setAddOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  return (
    <div style={{ width: 220, background: '#fff', borderRight: '1px solid #e4e7ec', padding: 12, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* 添加元素：九宫格排布，可折叠 */}
      <div style={{ flex: 'none' }}>
        <SectionHeader title="添加元素" open={addOpen} onToggle={() => setAddOpen((o) => !o)} />
      </div>
      {addOpen && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {ADD_ITEMS.map(({ type, label }) => (
              <button key={type} style={gridBtnStyle} onClick={() => onAdd(type)}>
                <span style={{ color: '#475467', lineHeight: 0 }}><ElementIcon type={type} /></span>
                <span style={{ fontSize: 11, marginTop: 5 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* 元素列表：可折叠，与添加元素平分空间 */}
      <div style={{ flex: 'none' }}>
        <SectionHeader title="元素列表" open={listOpen} onToggle={() => setListOpen((o) => !o)} style={{ marginTop: 14 }} />
      </div>
      {listOpen && (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {elements.length === 0 && <div style={{ fontSize: 12, color: '#98a2b3' }}>（空）</div>}
          {elements.map((e) => (
            <div key={e.id} onClick={() => onSelect(e.id)}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '5px 8px', borderRadius: 6, marginBottom: 4, fontSize: 12, cursor: 'pointer',
                background: selectedIds.includes(e.id) ? '#eaf1ff' : '#f8f9fb',
                border: selectedIds.includes(e.id) ? '1px solid #b6cfff' : '1px solid transparent',
              }}>
              <span style={{ display: 'flex', flex: 'none', marginRight: 6, color: '#475467' }}>
                <ElementIcon type={e.type} size={14} />
              </span>
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                {TYPE_LABEL[e.type]}
                {'content' in e && <span style={{ color: '#98a2b3', marginLeft: 6 }}>{e.content}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

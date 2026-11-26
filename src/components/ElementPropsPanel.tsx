import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { LabelElement, Barcode2dElement, ImageElement } from '../types';
import { Field, Num, Sel, SectionHeader, btnStyle, iconBtnStyle } from './ui';
import { BARCODE_TYPES, BARCODE2D_TYPES, ECCS, FONTS, IMAGE_FORMATS, ROTATIONS, loadCustomFonts, addCustomFont } from '../lib/fonts';
import type { VariableDefinition } from '../lib/variables';

interface Props {
  el: LabelElement | null;
  variables?: VariableDefinition[];
  selectedCount?: number;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<LabelElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const TYPE_LABEL: Record<LabelElement['type'], string> = {
  text: '文本', barcode: '条形码', qrcode: '二维码', barcode2d: '二维条码',
  line: '直线', box: '方框', ellipse: '椭圆', circle: '圆', arc: '圆弧',
  block: '填充块', reverse: '反白区', diagonal: '反斜线', image: '图像',
};

/** 字体选择器：内置 + 自定义字体下拉，末尾提供「+ 添加自定义字体」入口 */
function FontPicker({ value, onChange }: { value: string; onChange: (font: string) => void }) {
  // 自定义字体列表（状态，随添加/持久化刷新）
  const [custom, setCustom] = useState<string[]>(() => loadCustomFonts());
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const known = [...FONTS, ...custom.map((n) => ({ value: n, label: `${n} (自定义)` }))];
  // 导入的字体可能尚未加入本地列表，仍需显示当前真实值。
  const options = value && !known.some((option) => option.value === value)
    ? [...known, { value, label: `${value} (导入)` }]
    : known;

  const commitAdd = () => {
    const name = draft.trim();
    if (!name) { setAdding(false); setDraft(''); return; }
    setCustom(addCustomFont(name));
    onChange(name); // 添加后直接选中新字体
    setAdding(false);
    setDraft('');
  };

  return (
    <div>
      <Sel value={value} options={[...options, { value: '__add__', label: '＋ 添加自定义字体…' }]}
        onChange={(font) => { if (font === '__add__') { setAdding(true); setDraft(''); } else onChange(font); }} />
      {adding && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            autoFocus
            placeholder="字体名，如 TST24.BF2"
            style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') { setAdding(false); setDraft(''); } }}
          />
          <button style={{ ...btnStyle, fontSize: 12, padding: '3px 10px' }} onClick={commitAdd}>添加</button>
          <button style={{ ...btnStyle, fontSize: 12, padding: '3px 8px', color: '#667085' }} onClick={() => { setAdding(false); setDraft(''); }}>取消</button>
        </div>
      )}
    </div>
  );
}

function ContentField({ value, variables, onChange }: { value: string; variables: VariableDefinition[]; onChange: (value: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return <Field name="内容">
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input aria-label="内容" style={{ width: '100%', minWidth: 0, padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
        value={value} onChange={(e) => onChange(e.target.value)} />
      {variables.length > 0 && <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button type="button" title="插入变量" aria-label="插入变量" aria-expanded={menuOpen}
          style={iconBtnStyle} onClick={() => setMenuOpen((open) => !open)}>
          <Plus size={16} strokeWidth={1.8} />
        </button>
        {menuOpen && <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, marginTop: 4,
          minWidth: 120, maxHeight: 200, overflowY: 'auto', background: '#fff', border: '1px solid #d0d5dd',
          borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.12)' }}>
          {variables.map(({ token }) => <button key={token} type="button"
            style={{ display: 'block', width: '100%', padding: '6px 10px', textAlign: 'left', border: 0,
              background: 'transparent', color: '#1d2939', cursor: 'pointer', fontSize: 13 }}
            onClick={() => { onChange(value + token); setMenuOpen(false); }}>{token}</button>)}
        </div>}
      </div>}
    </div>
  </Field>;
}

export default function ElementPropsPanel({ el, variables = [], open, onToggle, onChange, onDuplicate, onDelete, selectedCount }: Props) {
  return (
    <div className="section-group">
      <SectionHeader title="元素属性设置" open={open} onToggle={onToggle} />
      {open && (
        <div className="section-content">
          {!el && <div style={{ fontSize: 12, color: '#98a2b3' }}>{selectedCount && selectedCount > 1 ? `已选中 ${selectedCount} 个元素，可在顶部工具栏对齐。` : '点击画布中的元素查看并编辑属性。'}</div>}
          {el && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{TYPE_LABEL[el.type]}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...btnStyle, fontSize: 12, padding: '3px 8px' }} onClick={onDuplicate}>复制</button>
                  <button style={{ ...btnStyle, fontSize: 12, padding: '3px 8px', color: '#b42318' }} onClick={onDelete}>删除</button>
                </span>
              </div>

              <Field name="X (点)"><Num value={el.x} onChange={(v) => onChange({ x: v })} step={0.1} /></Field>
              <Field name="Y (点)"><Num value={el.y} onChange={(v) => onChange({ y: v })} step={0.1} /></Field>

              {el.type === 'text' && (
                <>
                  <ContentField value={el.content} variables={variables} onChange={(content) => onChange({ content })} />
                  <Field name="字体">
                    <FontPicker value={el.font} onChange={(font) => onChange({ font })} />
                  </Field>
                  <Field name="横向放大 (xMult)"><Num value={el.xMult} onChange={(v) => onChange({ xMult: v })} step={0.5} /></Field>
                  <Field name="纵向放大 (yMult)"><Num value={el.yMult} onChange={(v) => onChange({ yMult: v })} step={0.5} /></Field>
                </>
              )}

              {el.type === 'barcode' && (
                <>
                  <ContentField value={el.content} variables={variables} onChange={(content) => onChange({ content })} />
                  <Field name="码制">
                    <Sel value={el.codeType} options={BARCODE_TYPES} onChange={(codeType) => onChange({ codeType })} />
                  </Field>
                  <Field name="高度 (点)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                  <Field name="可读字符">
                    <Sel value={el.humanReadable} options={[{ value: 1, label: '显示 (1)' }, { value: 0, label: '隐藏 (0)' }]}
                      onChange={(v) => onChange({ humanReadable: parseInt(v) })} />
                  </Field>
                  <Field name="窄条宽 (点)"><Num value={el.narrow} onChange={(v) => onChange({ narrow: v })} /></Field>
                  <Field name="宽条宽 (点)"><Num value={el.wide} onChange={(v) => onChange({ wide: v })} /></Field>
                </>
              )}

              {el.type === 'qrcode' && (
                <>
                  <ContentField value={el.content} variables={variables} onChange={(content) => onChange({ content })} />
                  <Field name="纠错等级"><Sel value={el.ecc} onChange={(v) => onChange({ ecc: v })} options={ECCS} /></Field>
                  <Field name="模块宽度 (点)"><Num value={el.cellWidth} onChange={(v) => onChange({ cellWidth: v })} min={1} max={10} /></Field>
                </>
              )}

              {el.type === 'line' && (
                <>
                  <Field name="长度 (点)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="粗细 (点)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'box' && (
                <>
                  <Field name="宽 (点)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (点)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                  <Field name="线宽 (点)"><Num value={el.thickness} onChange={(v) => onChange({ thickness: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'barcode2d' && (
                <>
                  <ContentField value={el.content} variables={variables} onChange={(content) => onChange({ content })} />
                  <Field name="码制">
                    <Sel value={el.codeType} options={BARCODE2D_TYPES}
                      onChange={(codeType) => onChange({ codeType: codeType as Barcode2dElement['codeType'] })} />
                  </Field>
                  <Field name="宽 (点)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (点)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                </>
              )}

              {el.type === 'ellipse' && (
                <>
                  <Field name="宽 (点)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (点)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                  <Field name="线宽 (点)"><Num value={el.thickness} onChange={(v) => onChange({ thickness: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'circle' && (
                <>
                  <Field name="直径 (点)"><Num value={el.diameter} onChange={(v) => onChange({ diameter: v })} step={0.5} /></Field>
                  <Field name="线宽 (点)"><Num value={el.thickness} onChange={(v) => onChange({ thickness: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'arc' && (
                <>
                  <Field name="宽 (点)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (点)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                  <Field name="起始角度 (0-360)"><Num value={el.startAngle} onChange={(v) => onChange({ startAngle: v })} /></Field>
                  <Field name="扫过角度 (0-360)"><Num value={el.sweepAngle} onChange={(v) => onChange({ sweepAngle: v })} /></Field>
                  <Field name="线宽 (点)"><Num value={el.thickness} onChange={(v) => onChange({ thickness: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'block' && (
                <>
                  <Field name="宽 (点)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (点)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                </>
              )}

              {el.type === 'reverse' && (
                <>
                  <Field name="宽 (点)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (点)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                </>
              )}

              {el.type === 'diagonal' && (
                <>
                  <Field name="横向长度 (点)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="纵向高度 (点)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                  <Field name="线宽 (点)"><Num value={el.thickness} onChange={(v) => onChange({ thickness: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'image' && (
                <>
                  <Field name="文件名">
                    <input style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.fileName} onChange={(e) => onChange({ fileName: e.target.value })} />
                  </Field>
                  <Field name="格式">
                    <Sel value={el.format} options={IMAGE_FORMATS}
                      onChange={(format) => onChange({ format: format as ImageElement['format'] })} />
                  </Field>
                  {el.format === 'BMP' && (
                    <>
                      <Field name="宽 (点)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                      <Field name="高 (点)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                    </>
                  )}
                </>
              )}

              <Field name="旋转角度"><Sel value={el.rotation ?? 0} onChange={(v) => onChange({ rotation: parseInt(v) })} options={ROTATIONS} /></Field>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

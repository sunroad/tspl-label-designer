import type { LabelElement, Barcode2dElement, ImageElement } from '../types';
import { Field, Num, Sel, SectionHeader, btnStyle } from './ui';
import { BARCODE_TYPES, BARCODE2D_TYPES, ECCS, FONTS, IMAGE_FORMATS, ROTATIONS } from '../lib/fonts';

interface Props {
  el: LabelElement | null;
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

export default function ElementPropsPanel({ el, open, onToggle, onChange, onDuplicate, onDelete, selectedCount }: Props) {
  return (
    <div>
      <SectionHeader title="元素属性设置" open={open} onToggle={onToggle} style={{ margin: '14px 0 10px' }} />
      {open && (
        <>
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

              <Field name="X (mm)"><Num value={el.x} onChange={(v) => onChange({ x: v })} step={0.1} /></Field>
              <Field name="Y (mm)"><Num value={el.y} onChange={(v) => onChange({ y: v })} step={0.1} /></Field>

              {el.type === 'text' && (
                <>
                  <Field name="内容">
                    <input style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.content} onChange={(e) => onChange({ content: e.target.value })} />
                  </Field>
                  <Field name="字体">
                    <select style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.font} onChange={(e) => onChange({ font: e.target.value })}>
                      {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </Field>
                  <Field name="横向放大 (xMult)"><Num value={el.xMult} onChange={(v) => onChange({ xMult: v })} step={0.5} /></Field>
                  <Field name="纵向放大 (yMult)"><Num value={el.yMult} onChange={(v) => onChange({ yMult: v })} step={0.5} /></Field>
                </>
              )}

              {el.type === 'barcode' && (
                <>
                  <Field name="内容">
                    <input style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.content} onChange={(e) => onChange({ content: e.target.value })} />
                  </Field>
                  <Field name="码制">
                    <select style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.codeType} onChange={(e) => onChange({ codeType: e.target.value })}>
                      {BARCODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field name="高度 (mm)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                  <Field name="可读字符">
                    <select style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.humanReadable} onChange={(e) => onChange({ humanReadable: parseInt(e.target.value) })}>
                      <option value={1}>显示 (1)</option>
                      <option value={0}>隐藏 (0)</option>
                    </select>
                  </Field>
                  <Field name="窄条宽 (点)"><Num value={el.narrow} onChange={(v) => onChange({ narrow: v })} /></Field>
                  <Field name="宽条宽 (点)"><Num value={el.wide} onChange={(v) => onChange({ wide: v })} /></Field>
                </>
              )}

              {el.type === 'qrcode' && (
                <>
                  <Field name="内容">
                    <input style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.content} onChange={(e) => onChange({ content: e.target.value })} />
                  </Field>
                  <Field name="纠错等级"><Sel value={el.ecc} onChange={(v) => onChange({ ecc: v })} options={ECCS} /></Field>
                  <Field name="模块宽度 (点)"><Num value={el.cellWidth} onChange={(v) => onChange({ cellWidth: v })} min={1} max={10} /></Field>
                </>
              )}

              {el.type === 'line' && (
                <>
                  <Field name="长度 (mm)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="粗细 (mm)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'box' && (
                <>
                  <Field name="宽 (mm)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (mm)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                  <Field name="线宽 (mm)"><Num value={el.thickness} onChange={(v) => onChange({ thickness: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'barcode2d' && (
                <>
                  <Field name="内容">
                    <input style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.content} onChange={(e) => onChange({ content: e.target.value })} />
                  </Field>
                  <Field name="码制">
                    <select style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.codeType} onChange={(e) => onChange({ codeType: e.target.value as Barcode2dElement['codeType'] })}>
                      {BARCODE2D_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field name="宽 (mm)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (mm)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                </>
              )}

              {el.type === 'ellipse' && (
                <>
                  <Field name="宽 (mm)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (mm)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                  <Field name="线宽 (mm)"><Num value={el.thickness} onChange={(v) => onChange({ thickness: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'circle' && (
                <>
                  <Field name="直径 (mm)"><Num value={el.diameter} onChange={(v) => onChange({ diameter: v })} step={0.5} /></Field>
                  <Field name="线宽 (mm)"><Num value={el.thickness} onChange={(v) => onChange({ thickness: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'arc' && (
                <>
                  <Field name="宽 (mm)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (mm)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                  <Field name="起始角度 (0-360)"><Num value={el.startAngle} onChange={(v) => onChange({ startAngle: v })} /></Field>
                  <Field name="扫过角度 (0-360)"><Num value={el.sweepAngle} onChange={(v) => onChange({ sweepAngle: v })} /></Field>
                  <Field name="线宽 (mm)"><Num value={el.thickness} onChange={(v) => onChange({ thickness: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'block' && (
                <>
                  <Field name="宽 (mm)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (mm)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                </>
              )}

              {el.type === 'reverse' && (
                <>
                  <Field name="宽 (mm)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="高 (mm)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                </>
              )}

              {el.type === 'diagonal' && (
                <>
                  <Field name="横向长度 (mm)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                  <Field name="纵向高度 (mm)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                  <Field name="线宽 (mm)"><Num value={el.thickness} onChange={(v) => onChange({ thickness: v })} step={0.1} /></Field>
                </>
              )}

              {el.type === 'image' && (
                <>
                  <Field name="文件名">
                    <input style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.fileName} onChange={(e) => onChange({ fileName: e.target.value })} />
                  </Field>
                  <Field name="格式">
                    <select style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, boxSizing: 'border-box', color: '#1d2939' }}
                      value={el.format} onChange={(e) => onChange({ format: e.target.value as ImageElement['format'] })}>
                      {IMAGE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                  {el.format === 'BMP' && (
                    <>
                      <Field name="宽 (mm)"><Num value={el.width} onChange={(v) => onChange({ width: v })} step={0.5} /></Field>
                      <Field name="高 (mm)"><Num value={el.height} onChange={(v) => onChange({ height: v })} step={0.5} /></Field>
                    </>
                  )}
                </>
              )}

              <Field name="旋转角度"><Sel value={el.rotation ?? 0} onChange={(v) => onChange({ rotation: parseInt(v) })} options={ROTATIONS} /></Field>
            </div>
          )}
        </>
      )}
    </div>
  );
}

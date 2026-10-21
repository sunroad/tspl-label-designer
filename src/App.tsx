import { useState } from 'react';
import type { LabelElement, LabelSettings } from './types';
import { DEFAULT_ELEMENTS, DEFAULT_LABEL } from './defaults';
import { generateTSPL, getBox } from './lib/tspl';
import { parseTSPL } from './lib/parse';
import { fmt } from './lib/units';
import ElementLibrary from './components/ElementLibrary';
import Canvas from './components/Canvas';
import LabelInfoPanel from './components/LabelInfoPanel';
import ElementPropsPanel from './components/ElementPropsPanel';
import AlignToolbar, { type AlignMode } from './components/AlignToolbar';
import TsplModal from './components/TsplModal';
import ImportModal from './components/ImportModal';
import { btnStyle } from './components/ui';

let uid = 10000;
const nid = () => 'e' + uid++;

export default function App() {
  const [label, setLabel] = useState<LabelSettings>(DEFAULT_LABEL);
  const [elements, setElements] = useState<LabelElement[]>(DEFAULT_ELEMENTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(4);
  const [showTSPL, setShowTSPL] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [labelInfoOpen, setLabelInfoOpen] = useState(true);
  const [elPropsOpen, setElPropsOpen] = useState(true);

  const selEl = selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) ?? null : null;
  const tsp = generateTSPL(label, elements);

  const updateEl = (id: string, patch: Partial<LabelElement>) =>
    setElements((els) => els.map((e) => (e.id === id ? ({ ...e, ...patch } as LabelElement) : e)));

  const removeEl = (id: string) => {
    setElements((els) => els.filter((e) => e.id !== id));
    setSelectedIds((ids) => ids.filter((x) => x !== id));
  };

  const duplicateEl = (id: string) => {
    const src = elements.find((e) => e.id === id);
    if (!src) return;
    const copy = { ...src, id: nid(), x: fmt(src.x + 2), y: fmt(src.y + 2) } as LabelElement;
    setElements((els) => {
      const i = els.findIndex((e) => e.id === id);
      return [...els.slice(0, i + 1), copy, ...els.slice(i + 1)];
    });
    setSelectedIds([copy.id]);
  };

  const addElement = (type: LabelElement['type']) => {
    const base = { id: nid(), x: fmt(label.width / 2 - 8), y: fmt(label.height / 2 - 4) };
    let el: LabelElement;
    switch (type) {
      case 'text': el = { ...base, type, font: '1', rotation: 0, xMult: 1, yMult: 1, content: '文本' }; break;
      case 'barcode': el = { ...base, type, codeType: '128', height: 8, humanReadable: 1, rotation: 0, narrow: 2, wide: 3, content: '1234567890' }; break;
      case 'qrcode': el = { ...base, type, ecc: 'M', cellWidth: 4, rotation: 0, content: 'https://' }; break;
      case 'barcode2d': el = { ...base, type, codeType: 'PDF417', width: 24, height: 12, rotation: 0, content: 'PDF417' }; break;
      case 'line': el = { ...base, type, width: 20, height: 0.4, rotation: 0 }; break;
      case 'box': el = { ...base, type, width: 16, height: 10, thickness: 0.3, rotation: 0 }; break;
      case 'ellipse': el = { ...base, type, width: 16, height: 10, thickness: 0.3, rotation: 0 }; break;
      case 'circle': el = { ...base, type, diameter: 10, thickness: 0.3, rotation: 0 }; break;
      case 'arc': el = { ...base, type, width: 16, height: 16, startAngle: 0, sweepAngle: 90, thickness: 0.3, rotation: 0 }; break;
      case 'block': el = { ...base, type, width: 16, height: 10, rotation: 0 }; break;
      case 'reverse': el = { ...base, type, width: 16, height: 10, rotation: 0 }; break;
      case 'diagonal': el = { ...base, type, width: 16, height: 10, thickness: 0.3, rotation: 0 }; break;
      case 'image': el = { ...base, type, fileName: 'LOGO.BMP', width: 20, height: 20, format: 'BMP', rotation: 0 }; break;
    }
    setElements((els) => [...els, el]);
    setSelectedIds([el.id]);
  };

  // 解析 TSPL 并覆盖当前标签内容（导入与「应用」共用）
  const applyTSP = (text: string) => {
    if (!text.trim()) return;
    const r = parseTSPL(text);
    setLabel(r.label);
    setElements(r.elements);
    setSelectedIds([]);
    // eslint-disable-next-line no-console
    if (r.errors.length) console.warn('TSPL 应用提示：', r.errors);
  };

  const doImport = (text: string) => {
    applyTSP(text);
    setShowImport(false);
  };

  // 多选元素对齐：按各元素包围盒计算目标坐标，一次性不可变更新
  const alignSelected = (mode: AlignMode) => {
    if (selectedIds.length < 2) return;
    const sel = elements.filter((e) => selectedIds.includes(e.id));
    const boxes = sel.map((e) => ({ e, b: getBox(e) }));
    const minX = Math.min(...boxes.map(({ e }) => e.x));
    const minY = Math.min(...boxes.map(({ e }) => e.y));
    const maxX = Math.max(...boxes.map(({ e, b }) => e.x + b.w));
    const maxY = Math.max(...boxes.map(({ e, b }) => e.y + b.h));
    const target = new Map<string, { x: number; y: number }>();
    for (const { e, b } of boxes) {
      let x = e.x;
      let y = e.y;
      switch (mode) {
        case 'left': x = minX; break;
        case 'hcenter': x = (minX + maxX - b.w) / 2; break;
        case 'right': x = maxX - b.w; break;
        case 'top': y = minY; break;
        case 'vcenter': y = (minY + maxY - b.h) / 2; break;
        case 'bottom': y = maxY - b.h; break;
      }
      target.set(e.id, { x: fmt(x), y: fmt(y) });
    }
    setElements((els) => els.map((e) => {
      const p = target.get(e.id);
      return p ? ({ ...e, x: p.x, y: p.y } as LabelElement) : e;
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f6f8', color: '#1d2939' }}>
      {/* 顶栏 */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e4e7ec' }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          TSPL 标签设计器
        </div>
        {/* 缩放 + 对齐工具栏：合并为一组，居中 */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={btnStyle} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>−</button>
          <span style={{ fontSize: 12, color: '#667085' }}>缩放 {zoom}px/mm</span>
          <button style={btnStyle} onClick={() => setZoom((z) => z + 0.5)}>＋</button>
          <span style={{ width: 1, height: 20, background: '#e4e7ec' }} />
          <AlignToolbar disabled={selectedIds.length < 2} onAlign={alignSelected} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={btnStyle} onClick={() => setShowImport(true)}>导入 TSPL</button>
          <button style={btnStyle} onClick={() => setShowTSPL(true)}>查看 / 复制 TSPL</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ElementLibrary
          elements={elements}
          selectedIds={selectedIds}
          onSelect={(id) => setSelectedIds([id])}
          onAdd={addElement}
        />
        <Canvas
          label={label}
          elements={elements}
          selectedIds={selectedIds}
          zoom={zoom}
          onSelect={setSelectedIds}
          onMove={(updates) =>
            setElements((els) => els.map((e) => {
              const u = updates.find((x) => x.id === e.id);
              return u ? ({ ...e, x: u.x, y: u.y } as LabelElement) : e;
            }))
          }
        />
        {/* 右栏 */}
        <div style={{ width: 280, background: '#fff', borderLeft: '1px solid #e4e7ec', padding: 14, overflowY: 'auto' }}>
          <LabelInfoPanel
            label={label}
            open={labelInfoOpen}
            onToggle={() => setLabelInfoOpen((o) => !o)}
            onChange={(patch) => setLabel((l) => ({ ...l, ...patch }))}
          />
          <ElementPropsPanel
            el={selEl}
            selectedCount={selectedIds.length}
            open={elPropsOpen}
            onToggle={() => setElPropsOpen((o) => !o)}
            onChange={(patch) => selEl && updateEl(selEl.id, patch)}
            onDuplicate={() => selEl && duplicateEl(selEl.id)}
            onDelete={() => selEl && removeEl(selEl.id)}
          />
        </div>
      </div>

      {showTSPL && <TsplModal tsp={tsp} onApply={(t) => { applyTSP(t); setShowTSPL(false); }} onClose={() => setShowTSPL(false)} />}
      {showImport && (
        <ImportModal
          initialText={tsp}
          onImport={doImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

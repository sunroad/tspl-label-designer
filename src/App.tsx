import { useEffect, useState } from 'react';
import type { LabelElement, LabelSettings, PrinterOffset } from './types';
import { DEFAULT_ELEMENTS, DEFAULT_LABEL } from './defaults';
import { generateTSPL, getBox } from './lib/tspl';
import { parseTSPL } from './lib/parse';
import { fmt, mm2d, ppiToZoom } from './lib/units';
import ElementLibrary from './components/ElementLibrary';
import Canvas from './components/Canvas';
import LabelInfoPanel from './components/LabelInfoPanel';
import ElementPropsPanel from './components/ElementPropsPanel';
import AlignToolbar, { type AlignMode } from './components/AlignToolbar';
import TsplModal from './components/TsplModal';
import ImportModal from './components/ImportModal';
import CalibrateModal from './components/CalibrateModal';
import { btnStyle, iconBtnStyle } from './components/ui';

let uid = 10000;
const nid = () => 'e' + uid++;

// 屏幕 PPI 持久化 key；屏幕是稳定硬件属性，属「设置」类，刷新后保留 1:1 校准
const PPI_KEY = 'tspl:screenPpi';
const PRINTER_OFFSET_KEY = 'tspl:printerOffset';

function readPrinterOffset(): PrinterOffset {
  try {
    const value = JSON.parse(localStorage.getItem(PRINTER_OFFSET_KEY) ?? '{}');
    return {
      x: Number.isFinite(value?.x) ? value.x : 0,
      y: Number.isFinite(value?.y) ? value.y : 0,
    };
  } catch {
    return { x: 0, y: 0 };
  }
}

/** 读取已存屏幕 PPI，未校准/异常时返回 0 */
function readScreenPpi(): number {
  try {
    const v = parseInt(localStorage.getItem(PPI_KEY) ?? '', 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

// 侧栏折叠把手：一条窄竖条，点击收起/展开对应侧栏
function Rail({ side, onClick, children }: { side: 'left' | 'right'; onClick: () => void; children: string }) {
  return (
    <div
      onClick={onClick}
      title={side === 'left' ? '收起左侧栏' : '收起右侧栏'}
      style={{
        width: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff', color: '#667085', fontSize: 12, userSelect: 'none', flex: '0 0 auto',
        ...(side === 'left' ? { borderRight: '1px solid #e4e7ec' } : { borderLeft: '1px solid #e4e7ec' }),
      }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [label, setLabel] = useState<LabelSettings>(DEFAULT_LABEL);
  const [printerOffset, setPrinterOffset] = useState<PrinterOffset>(readPrinterOffset);
  const [elements, setElements] = useState<LabelElement[]>(DEFAULT_ELEMENTS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // 已校准的屏幕 PPI（0=未校准）；zoom 初始取 1:1 倍率，未校准则用默认 4px/mm
  const [screenPpi, setScreenPpi] = useState<number>(() => readScreenPpi());
  const [zoom, setZoom] = useState<number>(() => ppiToZoom(readScreenPpi()) || 4);
  const [showTSPL, setShowTSPL] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [labelInfoOpen, setLabelInfoOpen] = useState(true);
  const [elPropsOpen, setElPropsOpen] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showRuler, setShowRuler] = useState(true);

  useEffect(() => {
    try { localStorage.setItem(PRINTER_OFFSET_KEY, JSON.stringify(printerOffset)); } catch { /* 无法使用存储时仍可在本次会话调整 */ }
  }, [printerOffset]);

  // 应用屏幕校准：反推的 PPI → 1:1 倍率，并持久化
  const applyCalibration = (ppi: number) => {
    const z = ppiToZoom(ppi);
    if (z <= 0) return;
    setScreenPpi(ppi);
    setZoom(z);
    try { localStorage.setItem(PPI_KEY, String(Math.round(ppi))); } catch { /* 隐私模式下写入可能失败，忽略 */ }
    setShowCalibrate(false);
  };

  // 恢复默认虚拟倍率 4px/mm，并清除已存 PPI
  const resetCalibration = () => {
    setScreenPpi(0);
    setZoom(4);
    try { localStorage.removeItem(PPI_KEY); } catch { /* 同上 */ }
  };

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
    // 复制后向右下偏移 2mm（换算为点），与元素点存储一致
    const off = mm2d(2, label.dpi);
    const copy = { ...src, id: nid(), x: src.x + off, y: src.y + off } as LabelElement;
    setElements((els) => {
      const i = els.findIndex((e) => e.id === id);
      return [...els.slice(0, i + 1), copy, ...els.slice(i + 1)];
    });
    setSelectedIds([copy.id]);
  };

  const addElement = (type: LabelElement['type']) => {
    // 元素坐标/尺寸一律以「点(dot)」存储；这里把 mm 默认值按当前 DPI 折算成点
    const D = label.dpi;
    const d = (mm: number): number => mm2d(mm, D);
    const base = { id: nid(), x: d(label.width / 2 - 8), y: d(label.height / 2 - 4) };
    let el: LabelElement;
    switch (type) {
      case 'text': el = { ...base, type, font: '1', rotation: 0, xMult: 1, yMult: 1, content: '文本' }; break;
      case 'barcode': el = { ...base, type, codeType: '128', height: d(8), humanReadable: 1, rotation: 0, narrow: 2, wide: 3, content: '1234567890' }; break;
      case 'qrcode': el = { ...base, type, ecc: 'M', cellWidth: 4, rotation: 0, content: 'https://' }; break;
      case 'barcode2d': el = { ...base, type, codeType: 'PDF417', width: d(24), height: d(12), rotation: 0, content: 'PDF417' }; break;
      case 'line': el = { ...base, type, width: d(20), height: d(0.4), rotation: 0 }; break;
      case 'box': el = { ...base, type, width: d(16), height: d(10), thickness: d(0.3), rotation: 0 }; break;
      case 'ellipse': el = { ...base, type, width: d(16), height: d(10), thickness: d(0.3), rotation: 0 }; break;
      case 'circle': el = { ...base, type, diameter: d(10), thickness: d(0.3), rotation: 0 }; break;
      case 'arc': el = { ...base, type, width: d(16), height: d(16), startAngle: 0, sweepAngle: 90, thickness: d(0.3), rotation: 0 }; break;
      case 'block': el = { ...base, type, width: d(16), height: d(10), rotation: 0 }; break;
      case 'reverse': el = { ...base, type, width: d(16), height: d(10), rotation: 0 }; break;
      case 'diagonal': el = { ...base, type, width: d(16), height: d(10), thickness: d(0.3), rotation: 0 }; break;
      case 'image': el = { ...base, type, fileName: 'LOGO.BMP', width: d(20), height: d(20), format: 'BMP', rotation: 0 }; break;
    }
    setElements((els) => [...els, el]);
    setSelectedIds([el.id]);
  };

  // 解析 TSPL 并覆盖当前标签内容（导入与「应用」共用）
  const applyTSP = (text: string) => {
    if (!text.trim()) return;
    const r = parseTSPL(text, label.dpi);
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
    const boxes = sel.map((e) => ({ e, b: getBox(e, label.dpi) }));
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
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button title="缩小" style={iconBtnStyle} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>−</button>
          <span style={{ fontSize: 12, color: '#667085', minWidth: 92 }}>缩放 {zoom.toFixed(2)}px/mm</span>
          <button title="放大" style={iconBtnStyle} onClick={() => setZoom((z) => z + 0.5)}>＋</button>
          <button title="校准" style={iconBtnStyle} onClick={() => setShowCalibrate(true)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="8" cy="8" r="4.5" />
              <line x1="12.2" y1="12.2" x2="15" y2="15" />
            </svg>
          </button>
          <span style={{ width: 1, height: 20, background: '#e4e7ec' }} />
          <AlignToolbar disabled={selectedIds.length < 2} onAlign={alignSelected} />
          <span style={{ width: 1, height: 20, background: '#e4e7ec' }} />
          <button title="标尺" style={iconBtnStyle} onClick={() => setShowRuler((v) => !v)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="2.5" y="2.5" width="11" height="11" />
              <line x1="6" y1="2.5" x2="6" y2="6.5" />
              <line x1="9.5" y1="2.5" x2="9.5" y2="5" />
              <line x1="2.5" y1="6" x2="6.5" y2="6" />
              <line x1="2.5" y1="9.5" x2="5" y2="9.5" />
            </svg>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={btnStyle} onClick={() => setShowImport(true)}>导入 TSPL</button>
          <button style={btnStyle} onClick={() => setShowTSPL(true)}>查看 / 复制 TSPL</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {leftOpen && (
          <ElementLibrary
            elements={elements}
            selectedIds={selectedIds}
            onSelect={(id) => setSelectedIds([id])}
            onAdd={addElement}
          />
        )}
        <Rail side="left" onClick={() => setLeftOpen((o) => !o)}>{leftOpen ? '◀' : '▶'}</Rail>
        <Canvas
          label={label}
          printerOffset={printerOffset}
          elements={elements}
          selectedIds={selectedIds}
          zoom={zoom}
          showRuler={showRuler}
          onSelect={setSelectedIds}
          onMove={(updates) =>
            setElements((els) => els.map((e) => {
              const u = updates.find((x) => x.id === e.id);
              return u ? ({ ...e, x: u.x, y: u.y } as LabelElement) : e;
            }))
          }
        />
        <Rail side="right" onClick={() => setRightOpen((o) => !o)}>{rightOpen ? '▶' : '◀'}</Rail>
        {/* 右栏 */}
        {rightOpen && (
          <div style={{ width: 280, background: '#fff', borderLeft: '1px solid #e4e7ec', padding: 14, overflowY: 'auto' }}>
            <LabelInfoPanel
              label={label}
              printerOffset={printerOffset}
              open={labelInfoOpen}
              onToggle={() => setLabelInfoOpen((o) => !o)}
              onChange={(patch) => setLabel((l) => ({ ...l, ...patch }))}
              onPrinterOffsetChange={(patch) => setPrinterOffset((offset) => ({ ...offset, ...patch }))}
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
        )}
      </div>

      {showTSPL && <TsplModal tsp={tsp} onApply={(t) => { applyTSP(t); setShowTSPL(false); }} onClose={() => setShowTSPL(false)} />}
      {showImport && (
        <ImportModal
          initialText={tsp}
          onImport={doImport}
          onClose={() => setShowImport(false)}
        />
      )}
      {showCalibrate && (
        <CalibrateModal
          savedPpi={screenPpi}
          onApply={applyCalibration}
          onReset={resetCalibration}
          onClose={() => setShowCalibrate(false)}
        />
      )}
    </div>
  );
}

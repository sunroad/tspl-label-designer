import { useEffect, useId, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Undo2, Redo2, FilePlus2, FileInput, CodeXml, Columns3, PanelLeft, PanelRight, Square, RulerDimensionLine } from 'lucide-react';
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
import { iconBtnStyle } from './components/ui';
import VariablePanel from './components/VariablePanel';
import { loadVariables, previewElement, saveVariables, type VariableDefinition } from './lib/variables';

type Document = { label: LabelSettings; elements: LabelElement[]; variables: VariableDefinition[] };
type History = { present: Document; past: Document[]; future: Document[]; dragging: boolean };
type HistoryAction =
  | { type: 'edit'; change: (document: Document) => Document; drag?: boolean }
  | { type: 'endDrag' } | { type: 'undo' } | { type: 'redo' };

function historyReducer(state: History, action: HistoryAction): History {
  if (action.type === 'endDrag') return state.dragging ? { ...state, dragging: false } : state;
  if (action.type === 'undo') {
    if (!state.past.length) return state;
    return { present: state.past[state.past.length - 1], past: state.past.slice(0, -1),
      future: [state.present, ...state.future].slice(0, 30), dragging: false };
  }
  if (action.type === 'redo') {
    if (!state.future.length) return state;
    return { present: state.future[0], past: [...state.past, state.present].slice(-30),
      future: state.future.slice(1), dragging: false };
  }
  const next = action.change(state.present);
  if (next === state.present) return state;
  return { present: next, past: action.drag && state.dragging ? state.past : [...state.past, state.present].slice(-30),
    future: [], dragging: !!action.drag };
}

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

export default function App() {
  const [history, dispatch] = useReducer(historyReducer, undefined, (): History => ({
    present: { label: DEFAULT_LABEL, elements: DEFAULT_ELEMENTS, variables: loadVariables() },
    past: [], future: [], dragging: false,
  }));
  const { label, elements, variables } = history.present;
  const [printerOffset, setPrinterOffset] = useState<PrinterOffset>(readPrinterOffset);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const copiedElementsRef = useRef<LabelElement[]>([]);
  const pasteCountRef = useRef(0);
  const nudgingRef = useRef(false);
  // 已校准的屏幕 PPI（0=未校准）；zoom 初始取 1:1 倍率，未校准则用默认 4px/mm
  const [screenPpi, setScreenPpi] = useState<number>(() => readScreenPpi());
  const [zoom, setZoom] = useState<number>(() => ppiToZoom(readScreenPpi()) || 4);
  const [showTSPL, setShowTSPL] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [labelInfoOpen, setLabelInfoOpen] = useState(true);
  const [printerSettingsOpen, setPrinterSettingsOpen] = useState(false);
  const [elPropsOpen, setElPropsOpen] = useState(true);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [compactToolbar, setCompactToolbar] = useState(() => window.matchMedia('(max-width: 799px)').matches);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const toolbarMenuRef = useRef<HTMLDetailsElement>(null);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [viewMenuPosition, setViewMenuPosition] = useState({ top: 0, left: 0 });
  const viewButtonRef = useRef<HTMLButtonElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuId = useId();
  const [showRuler, setShowRuler] = useState(true);

  useEffect(() => {
    try { localStorage.setItem(PRINTER_OFFSET_KEY, JSON.stringify(printerOffset)); } catch { /* 无法使用存储时仍可在本次会话调整 */ }
  }, [printerOffset]);

  useEffect(() => { saveVariables(variables); }, [variables]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 799px)');
    const update = () => { setCompactToolbar(media.matches); setToolbarOpen(false); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!compactToolbar || !toolbarOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!toolbarMenuRef.current?.contains(event.target as Node)) setToolbarOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setToolbarOpen(false); toolbarMenuRef.current?.querySelector('summary')?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, [compactToolbar, toolbarOpen]);
  useEffect(() => {
    if (!viewMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!viewButtonRef.current?.contains(event.target as Node) && !viewMenuRef.current?.contains(event.target as Node)) setViewMenuOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setViewMenuOpen(false); viewButtonRef.current?.focus(); }
    };
    const closeOnScroll = (event: Event) => {
      if (!viewMenuRef.current?.contains(event.target as Node)) setViewMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    document.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
      document.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
    };
  }, [viewMenuOpen]);

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
  const previewElements = elements.map((el) => previewElement(el, variables));

  const updateEl = (id: string, patch: Partial<LabelElement>) =>
    dispatch({ type: 'edit', change: (doc) => ({ ...doc, elements: doc.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as LabelElement) : e)) }) });

  const removeSelected = () => {
    if (!selectedIds.length) return;
    const ids = new Set(selectedIds);
    dispatch({ type: 'edit', change: (doc) => {
      const remaining = doc.elements.filter((e) => !ids.has(e.id));
      return remaining.length === doc.elements.length ? doc : { ...doc, elements: remaining };
    } });
    setSelectedIds([]);
  };

  const undo = () => { dispatch({ type: 'undo' }); setSelectedIds([]); };
  const redo = () => { dispatch({ type: 'redo' }); setSelectedIds([]); };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || showTSPL || showImport || showCalibrate) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]')) return;

      const key = event.key.toLowerCase();
      const modifier = (event.metaKey || event.ctrlKey) && !event.altKey;
      if (modifier && key === 'a' && !event.shiftKey && elements.length) {
        setSelectedIds(elements.map((el) => el.id));
      } else if (modifier && key === 'c' && !event.shiftKey && selectedIds.length) {
        copiedElementsRef.current = elements.filter((el) => selectedIds.includes(el.id));
        pasteCountRef.current = 0;
      } else if (modifier && key === 'v' && !event.shiftKey && copiedElementsRef.current.length) {
        const offset = mm2d(2 * ++pasteCountRef.current, label.dpi);
        const copies = copiedElementsRef.current.map((el) => ({ ...el, id: nid(), x: el.x + offset, y: el.y + offset } as LabelElement));
        dispatch({ type: 'edit', change: (doc) => ({ ...doc, elements: [...doc.elements, ...copies] }) });
        setSelectedIds(copies.map((el) => el.id));
      } else if (modifier && key === 'z' && !event.shiftKey && history.past.length) {
        undo();
      } else if (modifier && ((key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey)) && history.future.length) {
        redo();
      } else if (!modifier && !event.metaKey && !event.ctrlKey && !event.altKey &&
                 (key === 'delete' || key === 'backspace') && selectedIds.length) {
        removeSelected();
      } else if (!modifier && !event.metaKey && !event.ctrlKey && !event.altKey && selectedIds.length &&
                 (key === 'arrowleft' || key === 'arrowright' || key === 'arrowup' || key === 'arrowdown')) {
        const step = event.shiftKey ? 10 : 1;
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
        const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
        const ids = new Set(selectedIds);
        nudgingRef.current = true;
        dispatch({ type: 'edit', drag: true, change: (doc) => ({ ...doc,
          elements: doc.elements.map((el) => ids.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el),
        }) });
      } else {
        return;
      }
      event.preventDefault();
    };
    const endNudge = () => {
      if (!nudgingRef.current) return;
      nudgingRef.current = false;
      dispatch({ type: 'endDrag' });
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.startsWith('Arrow')) endNudge();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', endNudge);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', endNudge);
    };
  }, [selectedIds, elements, label.dpi, history.past.length, history.future.length, showTSPL, showImport, showCalibrate]);

  const duplicateEl = (id: string) => {
    const src = elements.find((e) => e.id === id);
    if (!src) return;
    // 复制后向右下偏移 2mm（换算为点），与元素点存储一致
    const off = mm2d(2, label.dpi);
    const copy = { ...src, id: nid(), x: src.x + off, y: src.y + off } as LabelElement;
    dispatch({ type: 'edit', change: (doc) => {
      const i = doc.elements.findIndex((e) => e.id === id);
      return { ...doc, elements: [...doc.elements.slice(0, i + 1), copy, ...doc.elements.slice(i + 1)] };
    } });
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
    dispatch({ type: 'edit', change: (doc) => ({ ...doc, elements: [...doc.elements, el] }) });
    setSelectedIds([el.id]);
  };

  // 解析 TSPL 并覆盖当前标签内容（导入与「应用」共用）
  const applyTSP = (text: string) => {
    if (!text.trim()) return;
    const r = parseTSPL(text, label.dpi);
    dispatch({ type: 'edit', change: (doc) => ({ ...doc, label: r.label, elements: r.elements }) });
    setSelectedIds([]);
    // eslint-disable-next-line no-console
    if (r.errors.length) console.warn('TSPL 应用提示：', r.errors);
  };

  const doImport = (text: string) => {
    applyTSP(text);
    setShowImport(false);
  };

  // 多选元素对齐与分散：按预览包围盒计算位置，一次性不可变更新
  const alignSelected = (mode: AlignMode) => {
    if (selectedIds.length < 2) return;
    const sel = elements.filter((e) => selectedIds.includes(e.id));
    const boxes = sel.map((e) => ({ e, b: getBox(previewElement(e, variables), label.dpi) }));
    const minX = Math.min(...boxes.map(({ e }) => e.x));
    const minY = Math.min(...boxes.map(({ e }) => e.y));
    const maxX = Math.max(...boxes.map(({ e, b }) => e.x + b.w));
    const maxY = Math.max(...boxes.map(({ e, b }) => e.y + b.h));
    const target = new Map<string, { x: number; y: number }>();
    if (mode === 'distributeH' || mode === 'distributeV') {
      if (boxes.length < 3) return;
      const horizontal = mode === 'distributeH';
      const sorted = [...boxes].sort((a, b) => (horizontal ? a.e.x - b.e.x : a.e.y - b.e.y));
      const start = horizontal ? sorted[0].e.x : sorted[0].e.y;
      const last = sorted[sorted.length - 1];
      const end = horizontal ? last.e.x + last.b.w : last.e.y + last.b.h;
      const totalSize = sorted.reduce((sum, { b }) => sum + (horizontal ? b.w : b.h), 0);
      const gap = (end - start - totalSize) / (sorted.length - 1);
      let cursor = start;
      for (const { e, b } of sorted) {
        target.set(e.id, { x: horizontal ? fmt(cursor) : e.x, y: horizontal ? e.y : fmt(cursor) });
        cursor += (horizontal ? b.w : b.h) + gap;
      }
    } else {
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
    }
    dispatch({ type: 'edit', change: (doc) => {
      let changed = false;
      const aligned = doc.elements.map((e) => {
        const p = target.get(e.id);
        if (!p || (p.x === e.x && p.y === e.y)) return e;
        changed = true;
        return { ...e, x: p.x, y: p.y } as LabelElement;
      });
      return changed ? { ...doc, elements: aligned } : doc;
    } });
  };

  const editingTools = (
    <div className="toolbar-editing">
      <button type="button" aria-label="撤销" disabled={!history.past.length} style={{ ...iconBtnStyle, opacity: history.past.length ? 1 : 0.4 }} onClick={undo}><Undo2 size={16} strokeWidth={1.8} /></button>
      <button type="button" aria-label="重做" disabled={!history.future.length} style={{ ...iconBtnStyle, opacity: history.future.length ? 1 : 0.4 }} onClick={redo}><Redo2 size={16} strokeWidth={1.8} /></button>
      <span className="toolbar-divider" />
      <button aria-label="缩小" style={iconBtnStyle} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>−</button>
      <span data-tooltip="当前缩放比例（像素/毫米）" style={{ fontSize: 12, color: '#667085', minWidth: 78 }}>{zoom.toFixed(2)} px/mm</span>
      <button aria-label="放大" style={iconBtnStyle} onClick={() => setZoom((z) => z + 0.5)}>＋</button>
      <button aria-label="校准屏幕比例" style={iconBtnStyle} onClick={() => setShowCalibrate(true)}>
        <RulerDimensionLine size={16} strokeWidth={1.8} />
      </button>
      <span className="toolbar-divider" />
      <AlignToolbar disabled={selectedIds.length < 2} selectedCount={selectedIds.length} onAlign={alignSelected} />
      <span className="toolbar-divider" />
      <button type="button" aria-label={showRuler ? '关闭标尺' : '开启标尺'} aria-pressed={showRuler} style={iconBtnStyle} onClick={() => setShowRuler((v) => !v)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <rect x="2.5" y="2.5" width="11" height="11" />
          <line x1="6" y1="2.5" x2="6" y2="6.5" />
          <line x1="9.5" y1="2.5" x2="9.5" y2="5" />
          <line x1="2.5" y1="6" x2="6.5" y2="6" />
          <line x1="2.5" y1="9.5" x2="5" y2="9.5" />
          {!showRuler && <line x1="1" y1="15" x2="15" y2="1" strokeWidth="2" />}
        </svg>
      </button>
    </div>
  );
  const viewMode = leftOpen && rightOpen ? 'both' : leftOpen ? 'left' : rightOpen ? 'right' : 'none';
  const viewLabel = viewMode === 'both' ? '双侧面板' : viewMode === 'left' ? '仅左侧面板' : viewMode === 'right' ? '仅右侧面板' : '仅画布';
  const chooseView = (mode: 'both' | 'left' | 'right' | 'none') => {
    setLeftOpen(mode === 'both' || mode === 'left');
    setRightOpen(mode === 'both' || mode === 'right');
    setViewMenuOpen(false);
    setToolbarOpen(false);
    viewButtonRef.current?.focus();
  };
  const toggleViewMenu = () => {
    if (viewMenuOpen) { setViewMenuOpen(false); return; }
    const rect = viewButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = 116;
    setViewMenuPosition({ top: window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight ? rect.top - menuHeight - 4 : rect.bottom + 4,
      left: Math.max(4, Math.min(rect.right - 160, window.innerWidth - 164)) });
    setViewMenuOpen(true);
  };

  const documentActions = (
    <div className="toolbar-actions">
      <button type="button" aria-label="新建空白" style={iconBtnStyle} onClick={() => {
        dispatch({ type: 'edit', change: (doc) => doc.elements.length || doc.label !== DEFAULT_LABEL
          ? { ...doc, label: DEFAULT_LABEL, elements: [] } : doc });
        setSelectedIds([]);
      }}><FilePlus2 size={16} strokeWidth={1.8} /></button>
      <button type="button" aria-label="导入 TSPL" style={iconBtnStyle} onClick={() => setShowImport(true)}><FileInput size={16} strokeWidth={1.8} /></button>
      <button type="button" aria-label="查看 / 复制 TSPL" style={iconBtnStyle} onClick={() => setShowTSPL(true)}><CodeXml size={16} strokeWidth={1.8} /></button>
      <span className="toolbar-divider" />
      <button ref={viewButtonRef} type="button" aria-label={`选择视图，当前${viewLabel}`}
        aria-haspopup="menu" aria-expanded={viewMenuOpen} aria-controls={viewMenuOpen ? viewMenuId : undefined}
        style={iconBtnStyle} onClick={toggleViewMenu}>
        {viewMode === 'left' ? <PanelLeft size={16} strokeWidth={1.8} /> : viewMode === 'right' ? <PanelRight size={16} strokeWidth={1.8} /> : viewMode === 'none' ? <Square size={16} strokeWidth={1.8} /> : <Columns3 size={16} strokeWidth={1.8} />}
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f6f8', color: '#1d2939' }}>
      {/* 顶栏 */}
      <div className="app-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}><img src="favicon.svg" width={24} height={24} alt="" />TSPL 标签设计器</div>
        {compactToolbar ? (
          <details ref={toolbarMenuRef} className="toolbar-menu" open={toolbarOpen} onToggle={(event) => setToolbarOpen(event.currentTarget.open)}>
            <summary aria-label="展开工具栏"><Menu size={18} /> 操作</summary>
            <div className="toolbar-menu-content" onClick={(event) => {
              if ((event.target as HTMLElement).closest('.toolbar-actions button:not([aria-haspopup="menu"])')) setToolbarOpen(false);
            }}>
              {editingTools}
              {documentActions}
            </div>
          </details>
        ) : (
          <>
            {editingTools}
            {documentActions}
          </>
        )}
      {viewMenuOpen && createPortal(
        <div ref={viewMenuRef} id={viewMenuId} role="menu" aria-label="选择视图" className="view-menu" style={viewMenuPosition}>
          {([['both', '双侧面板', Columns3], ['left', '仅左侧面板', PanelLeft], ['right', '仅右侧面板', PanelRight], ['none', '仅画布（收起两侧）', Square]] as const).map(([mode, name, Icon]) =>
            <button key={mode} type="button" role="menuitemradio" aria-checked={viewMode === mode}
              onClick={() => chooseView(mode)}><Icon size={16} strokeWidth={1.8} />{name}</button>)}
        </div>, document.body)}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {leftOpen && (
          <ElementLibrary
            elements={elements}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onAdd={addElement}
          />
        )}
        <Canvas
          label={label}
          printerOffset={printerOffset}
          elements={previewElements}
          selectedIds={selectedIds}
          zoom={zoom}
          onZoomChange={setZoom}
          showRuler={showRuler}
          onSelect={setSelectedIds}
          onMove={(updates) => dispatch({ type: 'edit', drag: true, change: (doc) => {
            const positions = new Map(updates.map(({ id, x, y }) => [id, { x, y }]));
            let changed = false;
            const moved = doc.elements.map((e) => {
              const p = positions.get(e.id);
              if (!p || (p.x === e.x && p.y === e.y)) return e;
              changed = true;
              return { ...e, x: p.x, y: p.y } as LabelElement;
            });
            return changed ? { ...doc, elements: moved } : doc;
          } })}
          onMoveEnd={() => dispatch({ type: 'endDrag' })}
        />
        {/* 右栏 */}
        {rightOpen && (
          <div style={{ width: 280, background: '#fff', borderLeft: '1px solid #e4e7ec', padding: 14, overflowY: 'auto' }}>
            <LabelInfoPanel
              label={label}
              printerOffset={printerOffset}
              open={labelInfoOpen}
              printerOpen={printerSettingsOpen}
              onToggle={() => setLabelInfoOpen((o) => !o)}
              onPrinterToggle={() => setPrinterSettingsOpen((o) => !o)}
              onChange={(patch) => dispatch({ type: 'edit', change: (doc) => ({ ...doc, label: { ...doc.label, ...patch } }) })}
              onPrinterOffsetChange={(patch) => setPrinterOffset((offset) => ({ ...offset, ...patch }))}
            />
            <VariablePanel variables={variables} open={variablesOpen} onToggle={() => setVariablesOpen((o) => !o)}
              onChange={(next, rename) => dispatch({ type: 'edit', change: (doc) => ({ ...doc, variables: next,
                elements: rename ? doc.elements.map((el) => 'content' in el && el.content.includes(rename[0])
                  ? { ...el, content: el.content.split(rename[0]).join(rename[1]) } : el) : doc.elements,
              }) })} />
            <ElementPropsPanel
              el={selEl}
              variables={variables}
              selectedCount={selectedIds.length}
              open={elPropsOpen}
              onToggle={() => setElPropsOpen((o) => !o)}
              onChange={(patch) => selEl && updateEl(selEl.id, patch)}
              onDuplicate={() => selEl && duplicateEl(selEl.id)}
              onDelete={removeSelected}
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

import React from 'react';
import type { LabelElement, LabelSettings, PrinterOffset } from '../types';
import { mm2d, d2mm, fmt } from '../lib/units';
import { getBox } from '../lib/tspl';
import { rotatedAabb, snapRect, unionRects, type Guide, type Rect } from '../lib/guides';
import ElementRenderer from './ElementRenderer';
import Ruler from './Ruler';

/** 一次拖拽移动后，需要更新的元素绝对坐标 */
interface MoveUpdate {
  id: string;
  x: number;
  y: number;
}

interface Props {
  label: LabelSettings;
  printerOffset: PrinterOffset;
  elements: LabelElement[];
  selectedIds: string[];
  zoom: number;
  showRuler: boolean;
  onZoomChange: (zoom: number) => void;
  onSelect: (ids: string[]) => void;
  onMove: (updates: MoveUpdate[]) => void;
  onMoveEnd: () => void;
}

/** 吸附阈值：约 6 屏幕像素对应的点(dot)数 */
const snapThresholdDots = (zoom: number, dpi: number): number =>
  Math.max(1, mm2d(6 / zoom, dpi));

function labelCanvasRect(label: LabelSettings): Rect {
  return {
    x: 0,
    y: 0,
    w: mm2d(label.width, label.dpi),
    h: mm2d(label.height, label.dpi),
  };
}

export default function Canvas({
  label, printerOffset, elements, selectedIds, zoom, showRuler, onSelect, onMove, onMoveEnd, onZoomChange,
}: Props) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLDivElement>(null);
  const fitToView = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const availableWidth = viewport.clientWidth - 40 - 48 - (showRuler ? 48 : 0);
    const availableHeight = viewport.clientHeight - 40 - 48 - (showRuler ? 40 : 0)
      - (footerRef.current?.offsetHeight ?? 0) - 8;
    if (availableWidth > 0 && availableHeight > 0) {
      onZoomChange(Math.min(availableWidth / label.width, availableHeight / label.height));
    }
  };
  const dragRef = React.useRef<{ ids: string[]; origins: Map<string, { x: number; y: number }>; px: number; py: number; clickId: string | null; moved: boolean } | null>(null);
  const marqueeRef = React.useRef<{ pointerId: number; x: number; y: number; initial: string[] } | null>(null);
  const [marquee, setMarquee] = React.useState<Rect | null>(null);

  const canvasPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(W, e.clientX - bounds.left)),
      y: Math.max(0, Math.min(H, e.clientY - bounds.top)) };
  };

  const onCanvasDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    e.preventDefault();
    const { x, y } = canvasPoint(e);
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    marqueeRef.current = { pointerId: e.pointerId, x, y, initial: additive ? selectedIds : [] };
    setMarquee(null);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onCanvasMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const start = marqueeRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const point = canvasPoint(e);
    setMarquee({ x: Math.min(start.x, point.x), y: Math.min(start.y, point.y),
      w: Math.abs(point.x - start.x), h: Math.abs(point.y - start.y) });
  };

  const onCanvasEnd = (e: React.PointerEvent<SVGSVGElement>) => {
    const start = marqueeRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const point = canvasPoint(e);
    const area = { x: Math.min(start.x, point.x), y: Math.min(start.y, point.y),
      w: Math.abs(point.x - start.x), h: Math.abs(point.y - start.y) };
    if (e.type === 'pointerup' && area.w + area.h > 3) {
      const hits = elements.filter((el) => {
        const box = getBox(el, label.dpi);
        const bounds = rotatedAabb(offsetX + d2mm(el.x, label.dpi) * zoom,
          offsetY + d2mm(el.y, label.dpi) * zoom, d2mm(box.w, label.dpi) * zoom,
          d2mm(box.h, label.dpi) * zoom, el.rotation ?? 0);
        return bounds.x <= area.x + area.w && bounds.x + bounds.w >= area.x &&
          bounds.y <= area.y + area.h && bounds.y + bounds.h >= area.y;
      }).map((el) => el.id);
      onSelect([...new Set([...start.initial, ...hits])]);
    } else if (e.type === 'pointerup') {
      onSelect(start.initial);
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
    marqueeRef.current = null;
    setMarquee(null);
  };
  const [guides, setGuides] = React.useState<Guide[]>([]);

  const onPointerDown = (e: React.PointerEvent, el: LabelElement) => {
    if (e.button !== 0) return;
    e.preventDefault(); // 阻止 SVG 文本在拖拽开始时触发浏览器原生选中
    e.stopPropagation();
    // Cmd/Ctrl + 点击：切换该元素的多选状态；普通点击：单选
    const meta = e.metaKey || e.ctrlKey;
    const next = meta
      ? (selectedIds.includes(el.id) ? selectedIds.filter((id) => id !== el.id) : [...selectedIds, el.id])
      : (selectedIds.includes(el.id) ? selectedIds : [el.id]);
    if (next !== selectedIds) onSelect(next);
    // 拖拽移动「点击后仍处于选中态」的元素组，记录各自初始坐标
    const dragIds = next.includes(el.id) ? next : [];
    const origins = new Map<string, { x: number; y: number }>();
    for (const id of dragIds) {
      const o = elements.find((x) => x.id === id);
      if (o) origins.set(id, { x: o.x, y: o.y });
    }
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { ids: dragIds, origins, px: e.clientX, py: e.clientY,
      clickId: !meta && selectedIds.length > 1 && selectedIds.includes(el.id) ? el.id : null, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.ids.length === 0) return;
    if (d.clickId && !d.moved) {
      if (Math.hypot(e.clientX - d.px, e.clientY - d.py) <= 3) return;
      d.moved = true;
    }
    // 像素位移 → mm → 点(dot)，与元素点存储保持一致
    const dxmm = (e.clientX - d.px) / zoom;
    const dymm = (e.clientY - d.py) / zoom;
    let dx = mm2d(dxmm, label.dpi);
    let dy = mm2d(dymm, label.dpi);

    const dragSet = new Set(d.ids);
    const movingRects: Rect[] = [];
    for (const id of d.ids) {
      const o = d.origins.get(id);
      const el = elements.find((x) => x.id === id);
      if (!o || !el) continue;
      const b = getBox(el, label.dpi);
      movingRects.push(rotatedAabb(o.x + dx, o.y + dy, b.w, b.h, el.rotation ?? 0));
    }
    const group = unionRects(movingRects);
    if (group) {
      const targets: Rect[] = [
        labelCanvasRect(label),
        ...elements
          .filter((el) => !dragSet.has(el.id))
          .map((el) => {
            const b = getBox(el, label.dpi);
            return rotatedAabb(el.x, el.y, b.w, b.h, el.rotation ?? 0);
          }),
      ];
      const snap = snapRect(group, targets, snapThresholdDots(zoom, label.dpi));
      dx += snap.dx;
      dy += snap.dy;
      setGuides(snap.guides);
    } else {
      setGuides([]);
    }

    const updates: MoveUpdate[] = d.ids.map((id) => {
      const o = d.origins.get(id)!;
      return { id, x: fmt(o.x + dx), y: fmt(o.y + dy) };
    });
    onMove(updates);
  };

  const endDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch {}
    if (e.type === 'pointerup' && drag.clickId && !drag.moved) onSelect([drag.clickId]);
    onMoveEnd();
    dragRef.current = null;
    setGuides([]);
  };

  const W = label.width * zoom;
  const H = label.height * zoom;
  const offsetX = (label.printOffsetX + printerOffset.x) * zoom * 25.4 / label.dpi;
  const offsetY = (label.printOffsetY + printerOffset.y) * zoom * 25.4 / label.dpi;
  const R = 20; // 上下水平标尺厚度（px）：容纳刻度线 8 + 数字高 9
  const RV = 24; // 左右垂直标尺厚度（px）：容纳长刻度线 8 + 空隙 3 + 两位数宽约 11
  const guideLines = guides.length > 0 && (
    <g pointerEvents="none">
      {guides.map((g) => {
        if (g.orientation === 'v') {
          const x = offsetX + d2mm(g.pos, label.dpi) * zoom;
          return (
            <line key={`v-${g.pos}`} x1={x} y1={0} x2={x} y2={H}
              stroke="#e11d48" strokeWidth={1} strokeDasharray="4 3" />
          );
        }
        const y = offsetY + d2mm(g.pos, label.dpi) * zoom;
        return (
          <line key={`h-${g.pos}`} x1={0} y1={y} x2={W} y2={y}
            stroke="#e11d48" strokeWidth={1} strokeDasharray="4 3" />
        );
      })}
    </g>
  );

  const svgBody = (
    <>
      <g transform={`translate(${offsetX} ${offsetY})`}>
        {elements.map((el) => (
          <ElementRenderer key={el.id} el={el} zoom={zoom} dpi={label.dpi} selected={selectedIds.includes(el.id)}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={endDrag} onPointerCancel={endDrag} />
        ))}
      </g>
      {guideLines}
      {marquee && <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h}
        fill="rgba(29, 78, 216, 0.12)" stroke="#1d4ed8" strokeWidth={1} strokeDasharray="4 3"
        pointerEvents="none" />}
    </>
  );

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative' }}>
      <button type="button" title="适应画布" aria-label="适应画布" onClick={fitToView}
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, width: 30, height: 30,
          display: 'grid', placeItems: 'center', border: '1px solid #d0d5dd', borderRadius: 6,
          background: '#fff', color: '#475467', cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M6 2H2v4m8-4h4v4M2 10v4h4m8-4v4h-4" />
          <path d="M6 6 2 2m8 4 4-4M6 10l-4 4m8-4 4 4" />
        </svg>
      </button>
      <div ref={viewportRef} style={{ width: '100%', height: '100%', overflow: 'auto', padding: 20, display: 'flex' }}>
      <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* 灰色衬底包住整个 3×3 栅格：四角占位，四周标尺，中央画布；标尺与画布边缘精确对齐 */}
        <div style={{ background: '#dfe3ea', padding: 24, borderRadius: 8, boxShadow: 'inset 0 1px 4px rgba(0,0,0,.08)' }}>
          {showRuler ? (
            <div style={{ display: 'grid', gridTemplateColumns: `${RV}px auto ${RV}px`, gridTemplateRows: `${R}px auto ${R}px` }}>
              {/* 四角空白占位，与标尺同色 */}
              <div style={{ background: '#eef1f5' }} />
              <Ruler orientation="horizontal" lengthMm={label.width} zoom={zoom} thickness={R} />
              <div style={{ background: '#eef1f5' }} />
              <Ruler orientation="vertical" lengthMm={label.height} zoom={zoom} thickness={RV} />
              <svg width={W} height={H}
                style={{ display: 'block', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.15)', touchAction: 'none' }}
                onPointerDown={onCanvasDown} onPointerMove={onCanvasMove}
                onPointerUp={onCanvasEnd} onPointerCancel={onCanvasEnd}>
                {svgBody}
              </svg>
              <Ruler orientation="vertical" lengthMm={label.height} zoom={zoom} thickness={RV} flip />
              <div style={{ background: '#eef1f5' }} />
              <Ruler orientation="horizontal" lengthMm={label.width} zoom={zoom} thickness={R} flip />
              <div style={{ background: '#eef1f5' }} />
            </div>
          ) : (
            <svg width={W} height={H}
              style={{ display: 'block', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.15)', touchAction: 'none' }}
              onPointerDown={onCanvasDown} onPointerMove={onCanvasMove}
              onPointerUp={onCanvasEnd} onPointerCancel={onCanvasEnd}>
              {svgBody}
            </svg>
          )}
        </div>
        <div ref={footerRef} style={{ fontSize: 11, color: '#98a2b3', marginTop: 8 }}>
          {fmt(label.width)} × {fmt(label.height)} mm · {label.dpi} DPI = {mm2d(label.width, label.dpi)} × {mm2d(label.height, label.dpi)} 点
        </div>
      </div>
    </div>
    </div>
  );
}

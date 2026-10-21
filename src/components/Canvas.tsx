import React from 'react';
import type { LabelElement, LabelSettings } from '../types';
import { mm2d, fmt } from '../lib/units';
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
  elements: LabelElement[];
  selectedIds: string[];
  zoom: number;
  showRuler: boolean;
  onSelect: (ids: string[]) => void;
  onMove: (updates: MoveUpdate[]) => void;
}

export default function Canvas({
  label, elements, selectedIds, zoom, showRuler, onSelect, onMove,
}: Props) {
  const dragRef = React.useRef<{ ids: string[]; origins: Map<string, { x: number; y: number }>; px: number; py: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent, el: LabelElement) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    // Cmd/Ctrl + 点击：切换该元素的多选状态；普通点击：单选
    const meta = e.metaKey || e.ctrlKey;
    const next = meta
      ? (selectedIds.includes(el.id) ? selectedIds.filter((id) => id !== el.id) : [...selectedIds, el.id])
      : [el.id];
    onSelect(next);
    // 拖拽移动「点击后仍处于选中态」的元素组，记录各自初始坐标
    const dragIds = next.includes(el.id) ? next : [];
    const origins = new Map<string, { x: number; y: number }>();
    for (const id of dragIds) {
      const o = elements.find((x) => x.id === id);
      if (o) origins.set(id, { x: o.x, y: o.y });
    }
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { ids: dragIds, origins, px: e.clientX, py: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.ids.length === 0) return;
    // 像素位移 → mm → 点(dot)，与元素点存储保持一致
    const dxmm = (e.clientX - d.px) / zoom;
    const dymm = (e.clientY - d.py) / zoom;
    const dx = mm2d(dxmm, label.dpi);
    const dy = mm2d(dymm, label.dpi);
    const updates: MoveUpdate[] = d.ids.map((id) => {
      const o = d.origins.get(id)!;
      return { id, x: fmt(o.x + dx), y: fmt(o.y + dy) };
    });
    onMove(updates);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch {}
      dragRef.current = null;
    }
  };

  const W = label.width * zoom;
  const H = label.height * zoom;
  const R = 20; // 上下水平标尺厚度（px）：容纳刻度线 8 + 数字高 9
  const RV = 24; // 左右垂直标尺厚度（px）：容纳长刻度线 8 + 空隙 3 + 两位数宽约 11

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex' }}>
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
                style={{ display: 'block', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.15)' }}
                onPointerDown={() => onSelect([])}>
                {elements.map((el) => (
                  <ElementRenderer key={el.id} el={el} zoom={zoom} dpi={label.dpi} selected={selectedIds.includes(el.id)}
                    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
                ))}
              </svg>
              <Ruler orientation="vertical" lengthMm={label.height} zoom={zoom} thickness={RV} flip />
              <div style={{ background: '#eef1f5' }} />
              <Ruler orientation="horizontal" lengthMm={label.width} zoom={zoom} thickness={R} flip />
              <div style={{ background: '#eef1f5' }} />
            </div>
          ) : (
            <svg width={W} height={H}
              style={{ display: 'block', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.15)' }}
              onPointerDown={() => onSelect([])}>
              {elements.map((el) => (
                <ElementRenderer key={el.id} el={el} zoom={zoom} dpi={label.dpi} selected={selectedIds.includes(el.id)}
                  onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
              ))}
            </svg>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#98a2b3', marginTop: 8 }}>
          {fmt(label.width)} × {fmt(label.height)} mm · {label.dpi} DPI = {mm2d(label.width, label.dpi)} × {mm2d(label.height, label.dpi)} 点
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import type { LabelElement } from '../types';
import { getBox } from '../lib/tspl';
import { DOT_FONTS, isCJK, isCJKDotFont } from '../lib/fonts';
import { dotMatrix } from '../lib/asciiDot';
import { d2mm as baseD2mm } from '../lib/units';
import { barcodeBars, qrBlackCells, matrixBlackCells } from './preview';

interface Props {
  el: LabelElement;
  zoom: number;
  dpi: number;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, el: LabelElement) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

export default function ElementRenderer({
  el, zoom, dpi, selected, onPointerDown, onPointerMove, onPointerUp,
}: Props) {
  // getBox 返回「点(dot)」；先 d2mm 换算成 mm，再乘 zoom(px/mm) 得画布像素
  const { w, h } = getBox(el, dpi);
  const d2mm = (dots: number): number => baseD2mm(dots, dpi);
  const wp = d2mm(w) * zoom;
  const hp = d2mm(h) * zoom;

  let inner: React.ReactNode = null;
  if (el.type === 'text') {
    const f = DOT_FONTS[el.font];
    if (f) {
      // 点阵字体：每个单元固定宽 f[0] 点、高 f[1] 点。
      // 中文点阵字体（.BF2）全角占 2 单元、半角占 1 单元；英数字体 1–5 一律 1 单元/字符。
      const cellW = d2mm(f[0]) * zoom;
      const cellH = d2mm(f[1]) * zoom;
      const dot = d2mm(1) * zoom; // 单点(dot)对应的屏幕像素边长
      const cjk = isCJKDotFont(el.font);
      const builtin = !cjk; // 内置 2–5 英数字体（非中文点阵）
      let x = 0;
      const cells = Array.from(el.content).map((ch, i) => {
        const units = cjk && isCJK(ch) ? 2 : 1;
        let node: React.ReactNode;
        if (builtin) {
          // 内置 2–5：可打印 ASCII 用程序点阵化逐点画块；非 ASCII 回退到压宽方案
          const m = dotMatrix(el.font, ch);
          if (m) {
            const rects: React.ReactNode[] = [];
            m.forEach((row, r) =>
              row.forEach((on, c) => {
                if (on) rects.push(<rect key={`${i}-${r}-${c}`} x={x + c * dot} y={r * dot} width={dot} height={dot} fill="#111" />);
              }),
            );
            node = <g key={i}>{rects}</g>;
          } else {
            node = (
              <text key={i} x={x} y={0} dominantBaseline="hanging"
                textLength={units * cellW} lengthAdjust="spacingAndGlyphs"
                style={{ fontSize: cellH, fill: '#111', fontFamily: 'monospace' }}>
                {ch}
              </text>
            );
          }
        } else {
          // 中文点阵字体（内置 0/1、.BF2）：全角/半角按单元宽压到真实点阵宽度（避免中文被方形放大）
          node = (
            <text key={i} x={x} y={0} dominantBaseline="hanging"
              textLength={units * cellW} lengthAdjust="spacingAndGlyphs"
              style={{ fontSize: cellH, fill: '#111', fontFamily: 'monospace' }}>
              {ch}
            </text>
          );
        }
        x += units * cellW;
        return node;
      });
      // 横向/纵向放大倍数分别作用于宽、高
      inner = <g transform={`scale(${el.xMult || 1} ${el.yMult || 1})`}>{cells}</g>;
    } else {
      // 自定义 / TTF：等比字体，字高按 3mm 基准估算（与 getBox 一致）
      const h = 3 * zoom;
      inner = (
        <g transform={`scale(${el.xMult || 1} ${el.yMult || 1})`}>
          <text x={0} y={0} dominantBaseline="hanging"
            style={{ fontSize: h, fill: '#111', fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {el.content}
          </text>
        </g>
      );
    }
  } else if (el.type === 'barcode') {
    inner = (
      <g>
        {barcodeBars(el.content, wp).map(([x, bw], i) => (
          <rect key={i} x={x} y={0} width={bw} height={hp} fill="#111" />
        ))}
        {el.humanReadable === 1 && (
          <text x={wp / 2} y={hp + 10} textAnchor="middle"
            style={{ fontSize: 9, fill: '#111', fontFamily: 'monospace' }}>
            {el.content}
          </text>
        )}
      </g>
    );
  } else if (el.type === 'qrcode') {
    const cell = wp / 21;
    inner = (
      <g>
        {qrBlackCells(el.content, 21).map(([r, c], i) => (
          <rect key={i} x={c * cell} y={r * cell} width={cell} height={cell} fill="#111" />
        ))}
      </g>
    );
  } else if (el.type === 'line') {
    inner = <rect x={0} y={0} width={wp} height={Math.max(hp, 1)} fill="#111" />;
  } else if (el.type === 'box') {
    const t = Math.max(d2mm(el.thickness) * zoom, 1);
    inner = <rect x={0} y={0} width={wp} height={hp} fill="none" stroke="#111" strokeWidth={t} />;
  } else if (el.type === 'ellipse') {
    const t = Math.max(d2mm(el.thickness) * zoom, 1);
    inner = <ellipse cx={wp / 2} cy={hp / 2} rx={wp / 2} ry={hp / 2} fill="none" stroke="#111" strokeWidth={t} />;
  } else if (el.type === 'circle') {
    const t = Math.max(d2mm(el.thickness) * zoom, 1);
    inner = <circle cx={wp / 2} cy={hp / 2} r={wp / 2} fill="none" stroke="#111" strokeWidth={t} />;
  } else if (el.type === 'block') {
    inner = <rect x={0} y={0} width={wp} height={hp} fill="#111" />;
  } else if (el.type === 'reverse') {
    // 反白区：预览用半透明斜线填充示意（实际打印时区域内黑白反转）
    inner = (
      <g>
        <rect x={0} y={0} width={wp} height={hp} fill="#94a3b8" fillOpacity={0.3} />
        <line x1={0} y1={0} x2={wp} y2={hp} stroke="#64748b" strokeWidth={1} />
      </g>
    );
  } else if (el.type === 'diagonal') {
    const t = Math.max(d2mm(el.thickness) * zoom, 1);
    inner = <line x1={0} y1={0} x2={wp} y2={hp} stroke="#111" strokeWidth={t} />;
  } else if (el.type === 'arc') {
    // 圆弧：以 width/height 外接矩形的中心为椭圆心，按起始/扫过角计算起点终点
    const t = Math.max(d2mm(el.thickness) * zoom, 1);
    const rx = wp / 2, ry = hp / 2, cx = rx, cy = ry;
    const a1 = (el.startAngle * Math.PI) / 180;
    const a2 = ((el.startAngle + el.sweepAngle) * Math.PI) / 180;
    const x1 = cx + rx * Math.cos(a1), y1 = cy + ry * Math.sin(a1);
    const x2 = cx + rx * Math.cos(a2), y2 = cy + ry * Math.sin(a2);
    const largeArc = Math.abs(el.sweepAngle) > 180 ? 1 : 0;
    const sweep = el.sweepAngle >= 0 ? 1 : 0;
    inner = (
      <path d={`M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} ${sweep} ${x2} ${y2}`}
        fill="none" stroke="#111" strokeWidth={t} />
    );
  } else if (el.type === 'image') {
    // 位图占位：带交叉对角线与文件名的占位框，不真实渲染图片内容
    inner = (
      <g>
        <rect x={0} y={0} width={wp} height={hp} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} />
        <line x1={0} y1={0} x2={wp} y2={hp} stroke="#cbd5e1" strokeWidth={1} />
        <line x1={wp} y1={0} x2={0} y2={hp} stroke="#cbd5e1" strokeWidth={1} />
        <text x={wp / 2} y={hp / 2} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: Math.max(8, Math.min(wp, hp) * 0.18), fill: '#64748b', fontFamily: 'monospace' }}>
          {el.fileName}
        </text>
      </g>
    );
  } else if (el.type === 'barcode2d') {
    // 二维条码示意：PDF417 偏宽，其余为方形点阵
    const cols = el.codeType === 'PDF417' ? 24 : 16;
    const rows = el.codeType === 'PDF417' ? 12 : 16;
    const cw = wp / cols, ch = hp / rows;
    inner = (
      <g>
        {matrixBlackCells(el.content, cols, rows).map(([r, c], i) => (
          <rect key={i} x={c * cw} y={r * ch} width={cw} height={ch} fill="#111" />
        ))}
      </g>
    );
  }

  return (
    <g
      key={el.id}
      transform={`translate(${d2mm(el.x) * zoom},${d2mm(el.y) * zoom}) rotate(${el.rotation ?? 0} ${wp / 2} ${hp / 2})`}
      onPointerDown={(e) => onPointerDown(e, el)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ cursor: 'move' }}
    >
      {inner}
      {selected && (
        <rect x={-2} y={-2} width={wp + 4} height={hp + 4}
          fill="none" stroke="#1d4ed8" strokeWidth={1} strokeDasharray="4 3" />
      )}
    </g>
  );
}

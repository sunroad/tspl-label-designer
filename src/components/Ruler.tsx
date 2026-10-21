import React from 'react';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  /** 该方向标签长度，单位 mm */
  lengthMm: number;
  /** 缩放，单位 px/mm */
  zoom: number;
  /** 标尺厚度，单位 px */
  thickness: number;
  /** 数字/刻度线朝向：false=上/左（默认，刻度线贴画布、数字在外侧），true=下/右 */
  flip?: boolean;
}

// 相邻刻度线的最小像素间距；据此从 1/2/5/10…mm 中自动选择“漂亮”的细分步长
const MIN_TICK_PX = 4;
const NICE_STEPS = [1, 2, 5, 10, 20, 50, 100];
// 数字与长刻度线末端的像素空隙，避免两者重叠
const TEXT_GAP_PX = 3;

/**
 * 毫米刻度尺：细刻度不标数字，长刻度（细分步长的 5 倍）标注 mm 数值。
 * 刻度线紧贴画布边向外伸，数字位于标尺带外侧，随缩放自适应密度。
 */
export default function Ruler({ orientation, lengthMm, zoom, thickness, flip = false }: RulerProps) {
  const minor = NICE_STEPS.find((s) => s * zoom >= MIN_TICK_PX) ?? 100;
  const major = minor * 5; // 长刻度 + 数字的间隔（mm）
  const count = Math.floor(lengthMm / minor);
  const horizontal = orientation === 'horizontal';

  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= count; i++) {
    const mm = i * minor;
    const isMajor = Math.abs(mm % major) < 1e-6;
    const p = mm * zoom; // 沿标尺方向的像素位置
    const tickLen = isMajor ? 8 : 4; // 刻度线长度（px）

    if (horizontal) {
      // 刻度线贴画布边：top 贴底部(y=thickness)向上伸，bottom 贴顶部(y=0)向下伸
      const y0 = flip ? 0 : thickness;
      const y1 = flip ? tickLen : thickness - tickLen;
      ticks.push(
        <line key={i} x1={p} y1={y0} x2={p} y2={y1} stroke="#98a2b3" strokeWidth={1} />,
      );
      if (isMajor) {
        // 边缘刻度数字向内偏移，避免超出标尺带被裁切；其余居中
        const isStart = i === 0;
        const isEnd = i === count;
        const anchor = isStart ? 'start' : isEnd ? 'end' : 'middle';
        ticks.push(
          <text key={`t${i}`} x={p}
            y={flip ? thickness - 2 : 2}
            textAnchor={anchor}
            dominantBaseline={flip ? 'alphabetic' : 'hanging'}
            style={{ fontSize: 9, fill: '#667085', fontFamily: 'monospace' }}>
            {mm}
          </text>,
        );
      }
    } else {
      // 刻度线贴画布边：left 贴右边(x=thickness)向左伸，right 贴左边(x=0)向右伸
      const x0 = flip ? 0 : thickness;
      const x1 = flip ? tickLen : thickness - tickLen;
      ticks.push(
        <line key={i} x1={x0} y1={p} x2={x1} y2={p} stroke="#98a2b3" strokeWidth={1} />,
      );
      if (isMajor) {
        // 数字沿 y 轴分布：顶部/底部刻度向内偏移半个字号，防上下裁切
        const isStart = i === 0;
        const isEnd = i === count;
        const yOff = isStart ? 5 : isEnd ? -5 : 0;
        // 数字贴长刻度线末端再留 2px 空隙（isMajor 时 tickLen=8），避免与刻度线重叠
        const textX = flip ? tickLen + TEXT_GAP_PX : thickness - tickLen - TEXT_GAP_PX;
        ticks.push(
          <text key={`t${i}`}
            x={textX}
            y={p + yOff}
            textAnchor={flip ? 'start' : 'end'}
            dominantBaseline="central"
            style={{ fontSize: 9, fill: '#667085', fontFamily: 'monospace' }}>
            {mm}
          </text>,
        );
      }
    }
  }

  return (
    <svg
      width={horizontal ? lengthMm * zoom : thickness}
      height={horizontal ? thickness : lengthMm * zoom}
      style={{ display: 'block', background: '#eef1f5' }}
    >
      {ticks}
    </svg>
  );
}

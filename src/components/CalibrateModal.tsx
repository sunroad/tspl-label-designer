import { useState } from 'react';
import { btnStyle, btnPrimaryStyle, Field, Num } from './ui';
import { measurePpi, ppiToZoom, fmt } from '../lib/units';

// 测量条固定 CSS 像素长度；用户用真实尺子量出它在屏幕上的物理 mm 长，反推屏幕 PPI
const BAR_PX = 400;

interface Props {
  /** 已保存的屏幕 PPI（0=未校准），用于回显 */
  savedPpi: number;
  /** 应用 1:1：传入反推出的 PPI，由父组件持久化并设 zoom */
  onApply: (ppi: number) => void;
  /** 恢复默认 4px/mm 虚拟倍率，并清除已存 PPI */
  onReset: () => void;
  onClose: () => void;
}

export default function CalibrateModal({ savedPpi, onApply, onReset, onClose }: Props) {
  // 用户量得的测量条真实长度（mm）
  const [mm, setMm] = useState(100);
  // 依据当前输入实时预览反推的 PPI 与 1:1 倍率
  const ppi = measurePpi(BAR_PX, mm);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 560, maxWidth: '92vw', maxHeight: '84vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e4e7ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>屏幕校准（物理 1:1）</span>
          <button style={btnStyle} onClick={onClose}>关闭</button>
        </div>

        <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
          <div style={{ fontSize: 12, color: '#667085', lineHeight: 1.7 }}>
            用一把真实尺子贴在屏幕上，量出下方黑色测量条的物理长度，填入「实测长度」，点「应用 1:1」。
            之后画布将按真实尺寸显示（屏幕 1mm = 打印 1mm）。
          </div>

          {/* 固定像素长的测量条：物理长度仅取决于屏幕 PPI，与当前 zoom 无关 */}
          <div style={{ margin: '16px 0', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#98a2b3', marginBottom: 8 }}>
              测量条（CSS 固定 {BAR_PX}px）
            </div>
            <div style={{ height: 14, width: BAR_PX, background: '#111', borderRadius: 2 }} />
          </div>

          <Field name="实测长度 (mm)">
            <Num value={mm} onChange={(v) => setMm(v)} min={1} />
          </Field>

          {ppi > 0 && (
            <div style={{ fontSize: 12, color: '#475467', marginTop: 4 }}>
              反推屏幕 PPI ≈ {Math.round(ppi)}，1:1 倍率 ≈ {fmt(ppiToZoom(ppi))} px/mm
              {savedPpi > 0 && <span style={{ color: '#98a2b3' }}>（当前已存 {Math.round(savedPpi)} PPI）</span>}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid #e4e7ec', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button style={btnStyle} onClick={onReset}>恢复默认 4px/mm</button>
          <button style={btnPrimaryStyle} disabled={ppi <= 0} onClick={() => onApply(ppi)}>应用 1:1</button>
        </div>
      </div>
    </div>
  );
}

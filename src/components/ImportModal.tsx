import { useState } from 'react';
import { btnStyle, btnPrimaryStyle } from './ui';

interface Props {
  initialText: string;
  onImport: (text: string) => void;
  onClose: () => void;
}

export default function ImportModal({ initialText, onImport, onClose }: Props) {
  const [text, setText] = useState(initialText);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 620, maxWidth: '92vw', maxHeight: '84vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e4e7ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>导入 TSPL 指令</span>
          <button style={btnStyle} onClick={onClose}>关闭</button>
        </div>
        <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
            style={{ width: '100%', height: 260, padding: 12, borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: 1.6, boxSizing: 'border-box', resize: 'vertical' }} />
          <div style={{ fontSize: 11, color: '#98a2b3', marginTop: 8 }}>支持导入：SIZE / GAP / SPEED / DENSITY / DIRECTION / PRINT / TEXT / BARCODE / QRCODE / BAR / BOX / ELLIPSE / CIRCLE / ARC / BLOCK / REVERSE / DIAGONAL / PUTBMP / PUTPCX / PDF417 / DMATRIX / AZTEC / MAXICODE。位置与尺寸均按「点(dot)」原样存储，与 TSPL 指令数值 1:1；仅 SIZE/GAP 使用 mm。其余指令会提示跳过。</div>
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid #e4e7ec', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button style={btnStyle} onClick={onClose}>取消</button>
          <button style={btnPrimaryStyle} onClick={() => onImport(text)}>导入</button>
        </div>
      </div>
    </div>
  );
}

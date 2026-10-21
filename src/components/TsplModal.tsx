import { useState } from 'react';
import { btnStyle, btnPrimaryStyle } from './ui';
import TsplEditor from './TsplEditor';

interface Props {
  tsp: string;
  onApply?: (text: string) => void;
  onClose: () => void;
}

export default function TsplModal({ tsp, onApply, onClose }: Props) {
  // 代码可编辑：复制/下载/应用均基于编辑后的内容
  const [text, setText] = useState(tsp);
  const [copyState, setCopyState] = useState('复制');

  const doCopy = async () => {
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    };
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = fallback();
    setCopyState(ok ? '已复制 ✓' : '请手动复制');
    setTimeout(() => setCopyState('复制'), ok ? 1500 : 2000);
  };

  const download = () => {
    const b = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'label.tspl';
    a.click();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 620, maxWidth: '92vw', height: '84vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e4e7ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700 }}>TSPL 指令（可直接编辑）</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button style={btnPrimaryStyle} onClick={doCopy}>{copyState}</button>
            <button style={btnStyle} onClick={download}>下载 .tspl</button>
            {onApply && <button style={btnStyle} onClick={() => onApply(text)}>应用</button>}
            <button style={btnStyle} onClick={onClose}>关闭</button>
          </span>
        </div>
        <TsplEditor value={text} onChange={setText} />
      </div>
    </div>
  );
}

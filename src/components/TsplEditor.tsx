import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { highlightTSPL, TSPL_COMMANDS } from '../lib/tsplSyntax';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

// pre 与 textarea 必须使用完全一致的排版参数，保证高亮层与输入层像素级对齐
const EDITOR_FONT: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
  lineHeight: 1.6,
  whiteSpace: 'pre',
  padding: 12,
};

const COMMAND_LABELS = TSPL_COMMANDS.map((c) => c.label);

export default function TsplEditor({ value, onChange }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  // 补全候选：list 为待选指令，active 为当前高亮下标
  const [suggest, setSuggest] = useState<{ list: string[]; active: number } | null>(null);

  // 输入层滚动时同步高亮层，保持两层对齐
  const syncScroll = () => {
    const ta = taRef.current;
    const pre = preRef.current;
    if (ta && pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);
    // 光标所在行行首若为纯大写字母/数字序列，则视为指令前缀，弹出补全
    const pos = e.target.selectionStart;
    const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
    const prefix = v.slice(lineStart, pos);
    const m = prefix.match(/^([A-Z][A-Z0-9]*)$/);
    const list = m ? COMMAND_LABELS.filter((c) => c.startsWith(m[1]) && c !== m[1]) : [];
    setSuggest(list.length ? { list, active: 0 } : null);
  };

  // 用选中的指令替换行首前缀，并把光标移到指令之后
  const applyCompletion = (label: string) => {
    const ta = taRef.current;
    const pos = ta ? ta.selectionStart : value.length;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    const next = value.slice(0, lineStart) + label + value.slice(pos);
    onChange(next);
    setSuggest(null);
    requestAnimationFrame(() => {
      if (ta) {
        const p = lineStart + label.length;
        ta.selectionStart = ta.selectionEnd = p;
      }
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!suggest) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggest((s) => (s ? { ...s, active: (s.active + 1) % s.list.length } : s));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggest((s) => (s ? { ...s, active: (s.active - 1 + s.list.length) % s.list.length } : s));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applyCompletion(suggest.list[suggest.active]);
    } else if (e.key === 'Escape') {
      setSuggest(null);
    }
  };

  return (
    <div style={{ position: 'relative', flex: 1, margin: 16, minHeight: 0, borderRadius: 8, border: '1px solid #d0d5dd', background: '#fff', overflow: 'hidden' }}>
      {/* 高亮层（底层，只读，随输入层滚动同步） */}
      <pre ref={preRef} aria-hidden
        dangerouslySetInnerHTML={{ __html: highlightTSPL(value) + '\n' }}
        style={{ position: 'absolute', inset: 0, margin: 0, border: 'none', overflow: 'hidden', color: '#1d2939', ...EDITOR_FONT }} />
      {/* 输入层（顶层，文字透明仅保留光标，真实交互都在这里） */}
      <textarea ref={taRef} value={value} onChange={handleChange} onKeyDown={onKeyDown} onScroll={syncScroll}
        spellCheck={false}
        style={{ position: 'absolute', inset: 0, margin: 0, border: 'none', resize: 'none', background: 'transparent', color: 'transparent', caretColor: '#1d2939', ...EDITOR_FONT }} />
      {/* 指令补全下拉 */}
      {suggest && (
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, background: '#fff', border: '1px solid #d0d5dd', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.12)', overflow: 'hidden', minWidth: 220 }}>
          {suggest.list.map((c, i) => (
            <div key={c}
              onMouseEnter={() => setSuggest((s) => (s ? { ...s, active: i } : s))}
              onMouseDown={(e) => { e.preventDefault(); applyCompletion(c); }}
              style={{ padding: '5px 12px', fontSize: 13, cursor: 'pointer', color: '#1d2939', background: i === suggest.active ? '#eaf1ff' : '#fff' }}>
              <span style={{ fontWeight: 600 }}>{c}</span>
              <span style={{ color: '#98a2b3', marginLeft: 8, fontSize: 12 }}>{TSPL_COMMANDS.find((x) => x.label === c)?.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

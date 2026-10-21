import type { CSSProperties } from 'react';

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

interface Props {
  disabled: boolean;
  onAlign: (mode: AlignMode) => void;
}

const iconBtnStyle: CSSProperties = {
  width: 26, height: 26, padding: 0, borderRadius: 5,
  border: '1px solid #d0d5dd', background: '#fff', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#1d2939',
};

/** 16×16 对齐图标，fill 继承按钮文字色 */
const ICONS: Record<AlignMode, { title: string; node: React.ReactNode }> = {
  left: {
    title: '左对齐',
    node: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="2" width="2" height="12" />
        <rect x="5" y="4" width="9" height="2" />
        <rect x="5" y="8" width="6" height="2" />
        <rect x="5" y="12" width="4" height="2" />
      </svg>
    ),
  },
  hcenter: {
    title: '水平居中',
    node: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <rect x="7" y="2" width="2" height="12" />
        <rect x="2.5" y="4" width="11" height="2" />
        <rect x="4" y="8" width="8" height="2" />
        <rect x="5.5" y="12" width="5" height="2" />
      </svg>
    ),
  },
  right: {
    title: '右对齐',
    node: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <rect x="12" y="2" width="2" height="12" />
        <rect x="2" y="4" width="9" height="2" />
        <rect x="5" y="8" width="6" height="2" />
        <rect x="7" y="12" width="4" height="2" />
      </svg>
    ),
  },
  top: {
    title: '顶对齐',
    node: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="2" width="12" height="2" />
        <rect x="4" y="5" width="2" height="9" />
        <rect x="8" y="5" width="2" height="6" />
        <rect x="11" y="5" width="2" height="4" />
      </svg>
    ),
  },
  vcenter: {
    title: '垂直居中',
    node: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="7" width="12" height="2" />
        <rect x="4" y="3.5" width="2" height="9" />
        <rect x="8" y="5" width="2" height="6" />
        <rect x="11" y="6" width="2" height="4" />
      </svg>
    ),
  },
  bottom: {
    title: '底对齐',
    node: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <rect x="2" y="12" width="12" height="2" />
        <rect x="4" y="2" width="2" height="9" />
        <rect x="8" y="5" width="2" height="6" />
        <rect x="11" y="7" width="2" height="4" />
      </svg>
    ),
  },
};

const ORDER: AlignMode[] = ['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom'];

export default function AlignToolbar({ disabled, onAlign }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: disabled ? 0.4 : 1 }}>
      {ORDER.map((mode, i) => (
        <button
          key={mode}
          title={ICONS[mode].title}
          disabled={disabled}
          style={{ ...iconBtnStyle, cursor: disabled ? 'not-allowed' : 'pointer', ...(i === 3 ? { marginLeft: 6 } : {}) }}
          onClick={() => onAlign(mode)}
        >
          {ICONS[mode].node}
        </button>
      ))}
    </div>
  );
}

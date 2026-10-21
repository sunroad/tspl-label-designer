import type { CSSProperties, ReactNode } from 'react';

export const btnStyle: CSSProperties = {
  padding: '6px 12px', borderRadius: 6, border: '1px solid #d0d5dd',
  background: '#fff', cursor: 'pointer', fontSize: 13, color: '#1d2939',
};

export const btnPrimaryStyle: CSSProperties = {
  ...btnStyle, background: '#1d4ed8', borderColor: '#1d4ed8', color: '#fff',
};

export const inputStyle: CSSProperties = {
  width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #d0d5dd',
  fontSize: 13, boxSizing: 'border-box', color: '#1d2939',
};

export const fieldLabelStyle: CSSProperties = {
  fontSize: 12, color: '#667085', marginBottom: 3, display: 'block',
};

export function Field({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={fieldLabelStyle}>{name}</label>
      {children}
    </div>
  );
}

export function Num({
  value, onChange, step = 1, min, max,
}: {
  value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number;
}) {
  return (
    <input
      type="number" step={step} min={min} max={max} value={value} style={inputStyle}
      onChange={(e) => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
    />
  );
}

export function Sel({
  value, onChange, options,
}: {
  value: string | number; onChange: (v: string) => void; options: (string | number)[];
}) {
  return (
    <select style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/** 可折叠区块标题 */
export function SectionHeader({
  title, open, onToggle, style,
}: {
  title: string; open: boolean; onToggle: () => void; style?: CSSProperties;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: 'pointer', userSelect: 'none', fontSize: 12, fontWeight: 700,
        color: '#475467', marginBottom: open ? 10 : 0, paddingBottom: 6,
        borderBottom: '1px solid #e4e7ec', ...style,
      }}
    >
      <span>{title}</span>
      <span style={{ color: '#98a2b3', fontSize: 13 }}>{open ? '▾' : '▸'}</span>
    </div>
  );
}

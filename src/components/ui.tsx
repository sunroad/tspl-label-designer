import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';

export const btnStyle: CSSProperties = {
  padding: '6px 12px', borderRadius: 6, border: '1px solid #d0d5dd',
  background: '#fff', cursor: 'pointer', fontSize: 13, color: '#1d2939',
};

/** 方形图标按钮：工具栏（缩放/校准/标尺/对齐）统一使用 */
export const iconBtnStyle: CSSProperties = {
  width: 26, height: 26, padding: 0, borderRadius: 5,
  border: '1px solid #d0d5dd', background: '#fff', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#1d2939',
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
  value: string | number; onChange: (v: string) => void;
  options: (string | number | { value: string | number; label: string })[];
}) {
  const items = options.map((option) => typeof option === 'object' ? option : { value: option, label: String(option) });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = items.findIndex((item) => String(item.value) === String(value));

  const show = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const height = Math.min(items.length * 33 + 8, 220);
    const above = window.innerHeight - rect.bottom < height && rect.top > window.innerHeight - rect.bottom;
    setPosition({ position: 'fixed', left: rect.left, width: rect.width,
      ...(above ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) });
    setActive(Math.max(selected, 0));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const scrolled = (event: Event) => { if (!menu.current?.contains(event.target as Node)) setOpen(false); };
    const resized = () => setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('scroll', scrolled, true);
    window.addEventListener('resize', resized);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('scroll', scrolled, true);
      window.removeEventListener('resize', resized);
    };
  }, [open]);

  const choose = (index: number) => {
    onChange(String(items[index].value));
    setOpen(false);
    trigger.current?.focus();
  };

  return <>
    <button ref={trigger} type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      style={{ ...inputStyle, background: '#fff', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
      onClick={() => open ? setOpen(false) : show()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (!open) show();
          else setActive((current) => (current + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length);
        } else if ((event.key === 'Enter' || event.key === ' ') && open) {
          event.preventDefault(); choose(active);
        } else if (event.key === 'Home' && open) { event.preventDefault(); setActive(0); }
        else if (event.key === 'End' && open) { event.preventDefault(); setActive(items.length - 1); }
      }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected >= 0 ? items[selected].label : String(value)}</span>
      <span aria-hidden="true" style={{ color: '#667085', flexShrink: 0 }}>▾</span>
    </button>
    {open && createPortal(<div ref={menu} id={listId} role="listbox" aria-activedescendant={`${listId}-${active}`}
      style={{ ...position, zIndex: 100, maxHeight: 220, overflowY: 'auto', padding: 4, border: '1px solid #d0d5dd', borderRadius: 6, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,.14)' }}>
      {items.map((item, index) => <button key={String(item.value)} id={`${listId}-${index}`} type="button" role="option"
        aria-selected={index === selected} tabIndex={-1}
        style={{ display: 'block', width: '100%', padding: '7px 8px', border: 0, borderRadius: 4, textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#1d2939', background: index === active ? '#edf3ff' : 'transparent' }}
        onPointerMove={() => setActive(index)} onClick={() => choose(index)}>{item.label}</button>)}
    </div>, document.body)}
  </>;
}

/** 可折叠区块标题 */
export function SectionHeader({
  title, open, onToggle,
}: {
  title: string; open: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="section-header"
      aria-expanded={open}
      onClick={onToggle}
      style={{ borderBottom: open ? '1px solid #d9e5ff' : 'none' }}
    >
      <span>{title}</span>
      <span className="section-header-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
    </button>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { iconBtnStyle } from './ui';

export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'distributeH' | 'distributeV';

interface Props {
  disabled: boolean;
  selectedCount: number;
  onAlign: (mode: AlignMode) => void;
}

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
  distributeH: {
    title: '横向分散',
    node: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="2" width="2" height="12" /><rect x="4" y="5" width="2" height="6" />
      <rect x="7" y="4" width="2" height="8" /><rect x="10" y="5" width="2" height="6" />
      <rect x="13" y="2" width="2" height="12" />
    </svg>,
  },
  distributeV: {
    title: '纵向分散',
    node: <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="2" y="1" width="12" height="2" /><rect x="5" y="4" width="6" height="2" />
      <rect x="4" y="7" width="8" height="2" /><rect x="5" y="10" width="6" height="2" />
      <rect x="2" y="13" width="12" height="2" />
    </svg>,
  },
};

const ORDER: AlignMode[] = ['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom', 'distributeH', 'distributeV'];

export default function AlignToolbar({ disabled, selectedCount, onAlign }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const scrolled = (event: Event) => { if (!menu.current?.contains(event.target as Node)) setOpen(false); };
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('scroll', scrolled, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('scroll', scrolled, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const height = ORDER.length * 32 + 8;
    const above = window.innerHeight - rect.bottom < height && rect.top > window.innerHeight - rect.bottom;
    setPosition({ position: 'fixed', left: Math.max(4, Math.min(rect.left, window.innerWidth - 148)),
      ...(above ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) });
    setOpen(true);
  };

  return <>
    <button ref={trigger} type="button" title="对齐与分散" aria-label="对齐与分散" aria-haspopup="menu"
      aria-expanded={open} aria-controls={open ? menuId : undefined} disabled={disabled}
      style={{ ...iconBtnStyle, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      onClick={toggle} onKeyDown={(event) => {
        if (event.key === 'Escape' && open) { setOpen(false); event.preventDefault(); }
        if (event.key === 'ArrowDown' && !disabled) {
          event.preventDefault();
          if (!open) toggle();
          requestAnimationFrame(() => menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
        }
      }}>
      {ICONS.left.node}
    </button>
    {open && !disabled && createPortal(
      <div ref={menu} id={menuId} role="menu" aria-label="对齐与分散" style={{ ...position, zIndex: 100,
        width: 144, maxHeight: 'calc(100vh - 8px)', overflowY: 'auto', padding: 4, border: '1px solid #d0d5dd',
        borderRadius: 6, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,.14)' }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
          }
        }}>
        {ORDER.map((mode, index) => {
          const unavailable = selectedCount < 3 && (mode === 'distributeH' || mode === 'distributeV');
          return <button key={mode} type="button" role="menuitem" disabled={unavailable}
            style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', height: 32, padding: '0 8px',
              border: 0, borderTop: index === 6 ? '1px solid #e4e7ec' : 0, background: 'transparent',
              textAlign: 'left', fontSize: 13, color: '#1d2939', opacity: unavailable ? 0.4 : 1,
              cursor: unavailable ? 'not-allowed' : 'pointer' }}
            onClick={() => { onAlign(mode); setOpen(false); trigger.current?.focus(); }}>
            {ICONS[mode].node}{ICONS[mode].title}
          </button>;
        })}
      </div>, document.body)}
  </>;
}

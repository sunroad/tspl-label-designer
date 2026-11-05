import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Barcode, Circle, Ellipse, Image, Minus, QrCode, Slash,
  Square, Type, Grid2X2,
} from 'lucide-react';
import type { ElementType } from '../types';

// 这三种元素用实际形状表示，避免与空心方框、圆形混淆。
function ArcIcon({ size, strokeWidth, ...props }: LucideProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true" {...props}>
    <path d="M4 19a8 8 0 0 1 15-6" />
  </svg>;
}

function BlockIcon({ size, ...props }: LucideProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <rect x="4" y="7" width="16" height="10" rx="1" />
  </svg>;
}

function ReverseIcon({ size, strokeWidth, ...props }: LucideProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" {...props}>
    <rect x="3" y="5" width="18" height="14" rx="1" />
    <path d="M12 5v14" />
    <path d="M12 5h8v14h-8z" fill="currentColor" stroke="none" />
  </svg>;
}

// 添加区与元素列表共用同一组图标，保证元素类型一眼可辨。
const ICONS: Record<ElementType, ComponentType<LucideProps>> = {
  text: Type,
  barcode: Barcode,
  qrcode: QrCode,
  barcode2d: Grid2X2,
  line: Minus,
  box: Square,
  ellipse: Ellipse,
  circle: Circle,
  arc: ArcIcon,
  block: BlockIcon,
  reverse: ReverseIcon,
  diagonal: Slash,
  image: Image,
};

interface Props {
  type: ElementType;
  size?: number;
}

export default function ElementIcon({ type, size = 20 }: Props) {
  const Icon = ICONS[type];
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}

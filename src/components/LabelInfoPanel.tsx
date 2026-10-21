import type { LabelSettings } from '../types';
import { Field, Num, Sel, SectionHeader } from './ui';

interface Props {
  label: LabelSettings;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<LabelSettings>) => void;
}

export default function LabelInfoPanel({ label, open, onToggle, onChange }: Props) {
  return (
    <div>
      <SectionHeader title="标签信息设置" open={open} onToggle={onToggle} />
      {open && (
        <div>
          <Field name="标签宽度 (mm)"><Num value={label.width} onChange={(v) => onChange({ width: v })} min={1} /></Field>
          <Field name="标签高度 (mm)"><Num value={label.height} onChange={(v) => onChange({ height: v })} min={1} /></Field>
          <Field name="间隙 (mm)"><Num value={label.gap} onChange={(v) => onChange({ gap: v })} min={0} /></Field>
          <Field name="打印速度 (IPS)"><Num value={label.speed} onChange={(v) => onChange({ speed: v })} min={1} /></Field>
          <Field name="打印浓度"><Num value={label.density} onChange={(v) => onChange({ density: v })} min={0} max={15} /></Field>
          <Field name="打印方向">
            <Sel value={label.direction} onChange={(v) => onChange({ direction: parseInt(v) })} options={[0, 1]} />
          </Field>
          <Field name="打印份数"><Num value={label.copies} onChange={(v) => onChange({ copies: v })} min={1} /></Field>
          <Field name="打印头 DPI">
            <Sel value={label.dpi} onChange={(v) => onChange({ dpi: parseInt(v) })} options={[203, 300, 600]} />
          </Field>
        </div>
      )}
    </div>
  );
}

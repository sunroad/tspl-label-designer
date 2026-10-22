import type { LabelSettings, PrinterOffset } from '../types';
import { Field, Num, Sel, SectionHeader } from './ui';

interface Props {
  label: LabelSettings;
  printerOffset: PrinterOffset;
  open: boolean;
  printerOpen: boolean;
  onToggle: () => void;
  onPrinterToggle: () => void;
  onChange: (patch: Partial<LabelSettings>) => void;
  onPrinterOffsetChange: (patch: Partial<PrinterOffset>) => void;
}

export default function LabelInfoPanel({ label, printerOffset, open, printerOpen, onToggle, onPrinterToggle, onChange, onPrinterOffsetChange }: Props) {
  return (
    <div>
      <SectionHeader title="标签信息设置" open={open} onToggle={onToggle} />
      {open && (
        <div>
          <Field name="标签宽度 (mm)"><Num value={label.width} onChange={(v) => onChange({ width: v })} min={1} /></Field>
          <Field name="标签高度 (mm)"><Num value={label.height} onChange={(v) => onChange({ height: v })} min={1} /></Field>
          <Field name="间隙 (mm)"><Num value={label.gap} onChange={(v) => onChange({ gap: v })} min={0} /></Field>
        </div>
      )}
      <SectionHeader title="打印机设置" open={printerOpen} onToggle={onPrinterToggle} style={{ marginTop: 14 }} />
      {printerOpen && (
        <div>
          <Field name="TSPL X 偏移 (dot)"><Num value={label.printOffsetX} onChange={(v) => onChange({ printOffsetX: v })} /></Field>
          <Field name="TSPL Y 偏移 (dot)"><Num value={label.printOffsetY} onChange={(v) => onChange({ printOffsetY: v })} /></Field>
          <Field name="打印机 X 偏移 (dot)"><Num value={printerOffset.x} onChange={(v) => onPrinterOffsetChange({ x: v })} /></Field>
          <Field name="打印机 Y 偏移 (dot)"><Num value={printerOffset.y} onChange={(v) => onPrinterOffsetChange({ y: v })} /></Field>
          <div style={{ fontSize: 11, color: '#667085', margin: '-4px 0 10px' }}>打印机偏移仅校准预览，不写入 TSPL；正值向右、向下。</div>
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

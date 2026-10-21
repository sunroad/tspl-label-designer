import type { LabelElement, LabelSettings } from '../types';
import { DOT_FONTS, displayWidth, textWidthDots } from './fonts';
import { mm2d, fmt } from './units';

/** 估算元素包围盒，单位「点(dot)」，与 TSPL 指令数值 1:1；dpi 仅用于非点阵字体的 mm→点估算 */
export function getBox(el: LabelElement, dpi: number = 203): { w: number; h: number } {
  switch (el.type) {
    case 'text': {
      const f = DOT_FONTS[el.font];
      if (f) {
        return {
          // 内置 0–5：中英分档宽高累加；.BF2：半角/全角单元累加
          w: textWidthDots(el.content, el.font) * (el.xMult || 1),
          h: f[1] * (el.yMult || 1),
        };
      }
      // 非点阵（TrueType/TTF）无固定点阵，按 3mm 字高折算为点
      const h = mm2d(3, dpi) * (el.yMult || 1);
      return { w: Math.max(4, displayWidth(el.content) * h * 0.62 * (el.xMult || 1)), h };
    }
    case 'barcode': {
      let perChar = el.narrow * 11 * 0.85;
      if (/^EAN|UPCA|UPCE/.test(el.codeType)) perChar = el.narrow * 8.2;
      return { w: Math.max(10, el.content.length * perChar), h: el.height };
    }
    case 'qrcode': {
      const s = el.cellWidth * 29;
      return { w: s, h: s };
    }
    case 'line':
      return { w: el.width, h: el.height };
    case 'box':
    case 'ellipse':
    case 'block':
    case 'reverse':
    case 'diagonal':
    case 'arc':
    case 'image':
    case 'barcode2d':
      return { w: el.width, h: el.height };
    case 'circle':
      return { w: el.diameter, h: el.diameter };
    default:
      return { w: 10, h: 10 };
  }
}

/** 将画布元素翻译为 TSPL 指令文本；除 SIZE/GAP 用 mm 外，所有位置与尺寸均为点(dot)，原样输出 */
export function generateTSPL(label: LabelSettings, elements: LabelElement[]): string {
  const L: string[] = [];
  L.push(`SIZE ${fmt(label.width)} mm,${fmt(label.height)} mm`);
  L.push(`GAP ${fmt(label.gap)} mm,0 mm`);
  L.push(`SPEED ${label.speed}`);
  L.push(`DENSITY ${label.density}`);
  L.push(`DIRECTION ${label.direction}`);
  L.push(`REFERENCE ${label.printOffsetX},${label.printOffsetY}`);
  L.push(`CLS`);

  for (const el of elements) {
    switch (el.type) {
      case 'text':
        L.push(
          `TEXT ${el.x},${el.y},"${el.font}",${el.rotation ?? 0},${el.xMult},${el.yMult},"${el.content}"`
        );
        break;
      case 'barcode':
        L.push(
          `BARCODE ${el.x},${el.y},"${el.codeType}",${el.height},${el.humanReadable},${el.rotation ?? 0},${el.narrow},${el.wide},"${el.content}"`
        );
        break;
      case 'qrcode':
        L.push(
          `QRCODE ${el.x},${el.y},${el.ecc},${el.cellWidth},A,${el.rotation ?? 0},"${el.content}"`
        );
        break;
      case 'line':
        L.push(`BAR ${el.x},${el.y},${el.width},${el.height}`);
        break;
      case 'box':
        L.push(`BOX ${el.x},${el.y},${el.x + el.width},${el.y + el.height},${el.thickness}`);
        break;
      case 'ellipse':
        L.push(`ELLIPSE ${el.x},${el.y},${el.width},${el.height},${el.thickness}`);
        break;
      case 'circle':
        L.push(`CIRCLE ${el.x},${el.y},${el.diameter},${el.thickness}`);
        break;
      case 'arc':
        L.push(`ARC ${el.x},${el.y},${el.width},${el.height},${el.startAngle},${el.sweepAngle},${el.thickness}`);
        break;
      case 'block':
        L.push(`BLOCK ${el.x},${el.y},${el.x + el.width},${el.y + el.height}`);
        break;
      case 'reverse':
        L.push(`REVERSE ${el.x},${el.y},${el.x + el.width},${el.y + el.height}`);
        break;
      case 'diagonal':
        L.push(`DIAGONAL ${el.x},${el.y},${el.width},${el.height},${el.thickness}`);
        break;
      case 'image':
        // PCX 不带宽高；BMP 带宽高（均为点）
        if (el.format === 'PCX') {
          L.push(`PUTPCX ${el.x},${el.y},"${el.fileName}"`);
        } else {
          L.push(`PUTBMP ${el.x},${el.y},"${el.fileName}",${el.width},${el.height}`);
        }
        break;
      case 'barcode2d':
        switch (el.codeType) {
          case 'PDF417':
            L.push(`PDF417 ${el.x},${el.y},${el.width},${el.height},${el.rotation ?? 0},"${el.content}"`);
            break;
          case 'DMATRIX':
            L.push(`DMATRIX ${el.x},${el.y},${el.width},${el.height},a1,"${el.content}"`);
            break;
          case 'AZTEC':
            L.push(`AZTEC ${el.x},${el.y},${el.rotation ?? 0},0,0,0,0,0,0,"${el.content}"`);
            break;
          case 'MAXICODE':
            L.push(`MAXICODE ${el.x},${el.y},4,"${el.content}"`);
            break;
        }
        break;
    }
  }

  L.push(`PRINT ${label.copies},1`);
  return L.join('\n');
}

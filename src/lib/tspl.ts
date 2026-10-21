import type { LabelElement, LabelSettings } from '../types';
import { DOT_FONTS, displayWidth } from './fonts';
import { mm2d, fmt } from './units';

/** 估算元素在 mm 坐标系下的包围盒尺寸，用于画布预览与命中 */
export function getBox(el: LabelElement): { w: number; h: number } {
  switch (el.type) {
    case 'text': {
      const f = DOT_FONTS[el.font];
      if (f) {
        return {
          w: displayWidth(el.content) * (f[0] / 8) * (el.xMult || 1),
          h: (f[1] / 8) * (el.yMult || 1),
        };
      }
      const h = 3 * (el.yMult || 1);
      return { w: Math.max(4, displayWidth(el.content) * h * 0.62 * (el.xMult || 1)), h };
    }
    case 'barcode': {
      let perChar = (el.narrow / 8) * 11 * 0.85;
      if (/^EAN|UPCA|UPCE/.test(el.codeType)) perChar = (el.narrow / 8) * 8.2;
      return { w: Math.max(10, el.content.length * perChar), h: el.height };
    }
    case 'qrcode': {
      const side = (el.cellWidth / 8) * 29;
      return { w: side, h: side };
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

/** 将画布元素树翻译为 TSPL 指令文本 */
export function generateTSPL(label: LabelSettings, elements: LabelElement[]): string {
  const L: string[] = [];
  // SIZE / GAP 单位为 mm；元素坐标、条码高度等为点(dot)
  L.push(`SIZE ${fmt(label.width)} mm,${fmt(label.height)} mm`);
  L.push(`GAP ${fmt(label.gap)} mm,0 mm`);
  L.push(`SPEED ${label.speed}`);
  L.push(`DENSITY ${label.density}`);
  L.push(`DIRECTION ${label.direction}`);
  L.push(`CLS`);

  for (const el of elements) {
    switch (el.type) {
      case 'text':
        L.push(
          `TEXT ${mm2d(el.x)},${mm2d(el.y)},"${el.font}",${el.rotation ?? 0},${el.xMult},${el.yMult},"${el.content}"`
        );
        break;
      case 'barcode':
        L.push(
          `BARCODE ${mm2d(el.x)},${mm2d(el.y)},"${el.codeType}",${mm2d(el.height)},${el.humanReadable},${el.rotation ?? 0},${el.narrow},${el.wide},"${el.content}"`
        );
        break;
      case 'qrcode':
        L.push(
          `QRCODE ${mm2d(el.x)},${mm2d(el.y)},${el.ecc},${el.cellWidth},A,${el.rotation ?? 0},"${el.content}"`
        );
        break;
      case 'line':
        L.push(`BAR ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.width)},${mm2d(el.height)}`);
        break;
      case 'box':
        L.push(
          `BOX ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.x + el.width)},${mm2d(el.y + el.height)},${mm2d(el.thickness)}`
        );
        break;
      // —— 以下为补齐的 TSPL 元素类指令 ——
      case 'ellipse':
        L.push(`ELLIPSE ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.width)},${mm2d(el.height)},${mm2d(el.thickness)}`);
        break;
      case 'circle':
        L.push(`CIRCLE ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.diameter)},${mm2d(el.thickness)}`);
        break;
      case 'arc':
        L.push(`ARC ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.width)},${mm2d(el.height)},${el.startAngle},${el.sweepAngle},${mm2d(el.thickness)}`);
        break;
      case 'block':
        L.push(`BLOCK ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.x + el.width)},${mm2d(el.y + el.height)}`);
        break;
      case 'reverse':
        L.push(`REVERSE ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.x + el.width)},${mm2d(el.y + el.height)}`);
        break;
      case 'diagonal':
        L.push(`DIAGONAL ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.width)},${mm2d(el.height)},${mm2d(el.thickness)}`);
        break;
      case 'image':
        // PCX 不带宽高；BMP 带宽高
        if (el.format === 'PCX') {
          L.push(`PUTPCX ${mm2d(el.x)},${mm2d(el.y)},"${el.fileName}"`);
        } else {
          L.push(`PUTBMP ${mm2d(el.x)},${mm2d(el.y)},"${el.fileName}",${mm2d(el.width)},${mm2d(el.height)}`);
        }
        break;
      case 'barcode2d':
        switch (el.codeType) {
          case 'PDF417':
            L.push(`PDF417 ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.width)},${mm2d(el.height)},${el.rotation ?? 0},"${el.content}"`);
            break;
          case 'DMATRIX':
            L.push(`DMATRIX ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.width)},${mm2d(el.height)},a1,"${el.content}"`);
            break;
          case 'AZTEC':
            L.push(`AZTEC ${mm2d(el.x)},${mm2d(el.y)},${el.rotation ?? 0},0,0,0,0,0,0,"${el.content}"`);
            break;
          case 'MAXICODE':
            L.push(`MAXICODE ${mm2d(el.x)},${mm2d(el.y)},4,"${el.content}"`);
            break;
        }
        break;
    }
  }

  L.push(`PRINT ${label.copies},1`);
  return L.join('\n');
}

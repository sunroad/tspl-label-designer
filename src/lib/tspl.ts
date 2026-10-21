import type { LabelElement, LabelSettings } from '../types';
import { DOT_FONTS, charDotSize, displayWidth, textWidthDots } from './fonts';
import { mm2d, fmt } from './units';

/** 估算元素包围盒，单位「点(dot)」，与 TSPL 指令数值 1:1；dpi 仅用于非点阵字体的 mm→点估算 */
export function getBox(el: LabelElement, dpi: number = 203): { w: number; h: number } {
  switch (el.type) {
    case 'text': {
      const f = DOT_FONTS[el.font];
      if (f) {
        return {
          // 内置字体纯英数按英数字高；混排和 .BF2 按中文行高
          w: textWidthDots(el.content, el.font) * (el.xMult || 1),
          h: (Array.from(el.content).some((ch) => charDotSize(el.font, ch)?.[1] === f[1])
            ? f[1] : charDotSize(el.font, 'A')?.[1] ?? f[1]) * (el.yMult || 1),
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

// 打印机点参数要求整数；仅在生成指令时取整，画布坐标仍保留编辑精度。
const dot = (value: number): number => Math.round(value);

/** 将画布元素翻译为 TSPL 指令文本；SIZE/GAP 用 mm，点参数在输出时取整 */
export function generateTSPL(label: LabelSettings, elements: LabelElement[]): string {
  const L: string[] = [];
  L.push(`SIZE ${fmt(label.width)} mm,${fmt(label.height)} mm`);
  L.push(`GAP ${fmt(label.gap)} mm,0 mm`);
  L.push(`SPEED ${label.speed}`);
  L.push(`DENSITY ${label.density}`);
  L.push(`DIRECTION ${label.direction}`);
  L.push(`REFERENCE ${dot(label.printOffsetX)},${dot(label.printOffsetY)}`);
  L.push(`CLS`);

  for (const el of elements) {
    switch (el.type) {
      case 'text':
        L.push(
          `TEXT ${dot(el.x)},${dot(el.y)},"${el.font}",${el.rotation ?? 0},${el.xMult},${el.yMult},"${el.content}"`
        );
        break;
      case 'barcode':
        L.push(
          `BARCODE ${dot(el.x)},${dot(el.y)},"${el.codeType}",${dot(el.height)},${el.humanReadable},${el.rotation ?? 0},${dot(el.narrow)},${dot(el.wide)},"${el.content}"`
        );
        break;
      case 'qrcode':
        L.push(
          `QRCODE ${dot(el.x)},${dot(el.y)},${el.ecc},${dot(el.cellWidth)},A,${el.rotation ?? 0},"${el.content}"`
        );
        break;
      case 'line':
        L.push(`BAR ${dot(el.x)},${dot(el.y)},${dot(el.width)},${dot(el.height)}`);
        break;
      case 'box':
        L.push(`BOX ${dot(el.x)},${dot(el.y)},${dot(el.x + el.width)},${dot(el.y + el.height)},${dot(el.thickness)}`);
        break;
      case 'ellipse':
        L.push(`ELLIPSE ${dot(el.x)},${dot(el.y)},${dot(el.width)},${dot(el.height)},${dot(el.thickness)}`);
        break;
      case 'circle':
        L.push(`CIRCLE ${dot(el.x)},${dot(el.y)},${dot(el.diameter)},${dot(el.thickness)}`);
        break;
      case 'arc':
        L.push(`ARC ${dot(el.x)},${dot(el.y)},${dot(el.width)},${dot(el.height)},${el.startAngle},${el.sweepAngle},${dot(el.thickness)}`);
        break;
      case 'block':
        L.push(`BLOCK ${dot(el.x)},${dot(el.y)},${dot(el.x + el.width)},${dot(el.y + el.height)}`);
        break;
      case 'reverse':
        L.push(`REVERSE ${dot(el.x)},${dot(el.y)},${dot(el.x + el.width)},${dot(el.y + el.height)}`);
        break;
      case 'diagonal':
        L.push(`DIAGONAL ${dot(el.x)},${dot(el.y)},${dot(el.width)},${dot(el.height)},${dot(el.thickness)}`);
        break;
      case 'image':
        // PCX 不带宽高；BMP 带宽高（均为点）
        if (el.format === 'PCX') {
          L.push(`PUTPCX ${dot(el.x)},${dot(el.y)},"${el.fileName}"`);
        } else {
          L.push(`PUTBMP ${dot(el.x)},${dot(el.y)},"${el.fileName}",${dot(el.width)},${dot(el.height)}`);
        }
        break;
      case 'barcode2d':
        switch (el.codeType) {
          case 'PDF417':
            L.push(`PDF417 ${dot(el.x)},${dot(el.y)},${dot(el.width)},${dot(el.height)},${el.rotation ?? 0},"${el.content}"`);
            break;
          case 'DMATRIX':
            L.push(`DMATRIX ${dot(el.x)},${dot(el.y)},${dot(el.width)},${dot(el.height)},a1,"${el.content}"`);
            break;
          case 'AZTEC':
            L.push(`AZTEC ${dot(el.x)},${dot(el.y)},${el.rotation ?? 0},0,0,0,0,0,0,"${el.content}"`);
            break;
          case 'MAXICODE':
            L.push(`MAXICODE ${dot(el.x)},${dot(el.y)},4,"${el.content}"`);
            break;
        }
        break;
    }
  }

  L.push(`PRINT ${label.copies},1`);
  return L.join('\n');
}

import type { LabelElement, LabelSettings } from '../types';
import { newId } from './id';
import { d2mm, fmt } from './units';

const num = (v: string): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** 去掉 "mm" 后缀取数字（mm 单位） */
const parseMM = (v: string): number => num(String(v).replace(/mm/i, '').trim());

export interface ParseResult {
  label: LabelSettings;
  elements: LabelElement[];
  errors: string[];
}

const SKIPPED_CMDS = [
  'CLS', 'REFERENCE', 'REFLECT', 'CODEPAGE', 'SHIFT', 'OFFSET', 'SET',
  'DOWNLOAD', 'EOP',
];

/** 解析 TSPL 指令，还原为标签设置与元素列表 */
export function parseTSPL(src: string): ParseResult {
  const errors: string[] = [];
  const elements: LabelElement[] = [];
  const label: LabelSettings = {
    width: 60, height: 40, gap: 3, speed: 4, density: 10, direction: 0, copies: 1,
  };

  const lines = String(src)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const m = line.match(/^(\w+)\s+(.*)$/);
    if (!m) {
      errors.push(`无法解析: ${line}`);
      continue;
    }
    const cmd = m[1].toUpperCase();
    const rest = m[2];
    const args = rest.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));

    switch (cmd) {
      case 'SIZE':
        label.width = parseMM(args[0]);
        label.height = parseMM(args[1]);
        break;
      case 'GAP':
        label.gap = parseMM(args[0]);
        break;
      case 'SPEED':
        label.speed = num(args[0]);
        break;
      case 'DENSITY':
        label.density = num(args[0]);
        break;
      case 'DIRECTION':
        label.direction = num(args[0]);
        break;
      case 'PRINT':
        label.copies = num(args[0]);
        break;
      case 'TEXT':
        elements.push({
          id: newId(), type: 'text',
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          font: args[2], rotation: num(args[3]),
          xMult: num(args[4]), yMult: num(args[5]),
          content: args[6] ?? '',
        });
        break;
      case 'BARCODE':
        elements.push({
          id: newId(), type: 'barcode',
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          codeType: args[2], height: fmt(d2mm(num(args[3]))),
          humanReadable: num(args[4]), rotation: num(args[5]),
          narrow: num(args[6]), wide: num(args[7]),
          content: args[8] ?? '',
        });
        break;
      case 'QRCODE':
        elements.push({
          id: newId(), type: 'qrcode',
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          ecc: (args[2] ?? 'M').toUpperCase(), cellWidth: num(args[3]),
          rotation: num(args[5]), content: args[6] ?? '',
        });
        break;
      case 'BAR':
        elements.push({
          id: newId(), type: 'line',
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          width: fmt(d2mm(num(args[2]))), height: fmt(d2mm(num(args[3]))),
          rotation: 0,
        });
        break;
      case 'BOX': {
        const x1 = num(args[0]), y1 = num(args[1]);
        const x2 = num(args[2]), y2 = num(args[3]);
        const t = num(args[4]) || 1;
        elements.push({
          id: newId(), type: 'box',
          x: fmt(d2mm(x1)), y: fmt(d2mm(y1)),
          width: fmt(d2mm(x2 - x1)), height: fmt(d2mm(y2 - y1)),
          thickness: fmt(d2mm(t)), rotation: 0,
        });
        break;
      }
      // —— 以下为补齐的 TSPL 元素类指令解析 ——
      case 'ELLIPSE':
        elements.push({
          id: newId(), type: 'ellipse',
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          width: fmt(d2mm(num(args[2]))), height: fmt(d2mm(num(args[3]))),
          thickness: fmt(d2mm(num(args[4]))), rotation: 0,
        });
        break;
      case 'CIRCLE':
        elements.push({
          id: newId(), type: 'circle',
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          diameter: fmt(d2mm(num(args[2]))), thickness: fmt(d2mm(num(args[3]))), rotation: 0,
        });
        break;
      case 'ARC':
        elements.push({
          id: newId(), type: 'arc',
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          width: fmt(d2mm(num(args[2]))), height: fmt(d2mm(num(args[3]))),
          startAngle: num(args[4]), sweepAngle: num(args[5]), thickness: fmt(d2mm(num(args[6]))), rotation: 0,
        });
        break;
      case 'BLOCK': {
        const x1 = num(args[0]), y1 = num(args[1]);
        elements.push({
          id: newId(), type: 'block',
          x: fmt(d2mm(x1)), y: fmt(d2mm(y1)),
          width: fmt(d2mm(num(args[2]) - x1)), height: fmt(d2mm(num(args[3]) - y1)), rotation: 0,
        });
        break;
      }
      case 'REVERSE': {
        const x1 = num(args[0]), y1 = num(args[1]);
        elements.push({
          id: newId(), type: 'reverse',
          x: fmt(d2mm(x1)), y: fmt(d2mm(y1)),
          width: fmt(d2mm(num(args[2]) - x1)), height: fmt(d2mm(num(args[3]) - y1)), rotation: 0,
        });
        break;
      }
      case 'DIAGONAL':
        elements.push({
          id: newId(), type: 'diagonal',
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          width: fmt(d2mm(num(args[2]))), height: fmt(d2mm(num(args[3]))),
          thickness: fmt(d2mm(num(args[4]))), rotation: 0,
        });
        break;
      case 'PUTBMP':
        elements.push({
          id: newId(), type: 'image',
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          fileName: args[2] || 'IMG.BMP', width: fmt(d2mm(num(args[3]))), height: fmt(d2mm(num(args[4]))),
          format: 'BMP', rotation: 0,
        });
        break;
      case 'PUTPCX':
        elements.push({
          id: newId(), type: 'image',
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          fileName: args[2] || 'IMG.PCX', width: 20, height: 20,
          format: 'PCX', rotation: 0,
        });
        break;
      case 'PDF417':
      case 'DMATRIX':
      case 'AZTEC':
      case 'MAXICODE': {
        const codeType = cmd as 'PDF417' | 'DMATRIX' | 'AZTEC' | 'MAXICODE';
        // 内容取最后一个参数；宽高仅 PDF417/DMATRIX 携带，其余给默认
        const content = args[args.length - 1] ?? '';
        let width = 20, height = 20, rotation = 0;
        if (codeType === 'PDF417' || codeType === 'DMATRIX') {
          width = fmt(d2mm(num(args[2])));
          height = fmt(d2mm(num(args[3])));
          rotation = codeType === 'PDF417' ? num(args[4]) : 0;
        } else if (codeType === 'AZTEC') {
          rotation = num(args[2]);
        }
        elements.push({
          id: newId(), type: 'barcode2d', codeType,
          x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))),
          width, height, content, rotation,
        });
        break;
      }
      default:
        if (SKIPPED_CMDS.includes(cmd)) {
          errors.push(`暂不支持导入指令: ${cmd}（已跳过）`);
        } else {
          errors.push(`未知指令已跳过: ${cmd}`);
        }
    }
  }

  return { label, elements, errors };
}

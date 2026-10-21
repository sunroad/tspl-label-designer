import type { LabelElement, LabelSettings } from '../types';
import { newId } from './id';

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

/** 解析 TSPL 指令；SIZE/GAP 为 mm，其余位置与尺寸参数原样保留为点(dot)，不做换算 */
export function parseTSPL(src: string, dpi: number = 203): ParseResult {
  const errors: string[] = [];
  const elements: LabelElement[] = [];
  const label: LabelSettings = {
    width: 60, height: 40, gap: 3, speed: 4, density: 10, direction: 0, copies: 1, dpi,
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
          x: num(args[0]), y: num(args[1]),
          font: args[2], rotation: num(args[3]),
          xMult: num(args[4]), yMult: num(args[5]),
          content: args[6] ?? '',
        });
        break;
      case 'BARCODE':
        elements.push({
          id: newId(), type: 'barcode',
          x: num(args[0]), y: num(args[1]),
          codeType: args[2], height: num(args[3]),
          humanReadable: num(args[4]), rotation: num(args[5]),
          narrow: num(args[6]), wide: num(args[7]),
          content: args[8] ?? '',
        });
        break;
      case 'QRCODE':
        elements.push({
          id: newId(), type: 'qrcode',
          x: num(args[0]), y: num(args[1]),
          ecc: (args[2] ?? 'M').toUpperCase(), cellWidth: num(args[3]),
          rotation: num(args[5]), content: args[6] ?? '',
        });
        break;
      case 'BAR':
        elements.push({
          id: newId(), type: 'line',
          x: num(args[0]), y: num(args[1]),
          width: num(args[2]), height: num(args[3]),
          rotation: 0,
        });
        break;
      case 'BOX': {
        const x1 = num(args[0]), y1 = num(args[1]);
        elements.push({
          id: newId(), type: 'box',
          x: x1, y: y1,
          width: num(args[2]) - x1, height: num(args[3]) - y1,
          thickness: num(args[4]) || 1, rotation: 0,
        });
        break;
      }
      case 'ELLIPSE':
        elements.push({
          id: newId(), type: 'ellipse',
          x: num(args[0]), y: num(args[1]),
          width: num(args[2]), height: num(args[3]),
          thickness: num(args[4]), rotation: 0,
        });
        break;
      case 'CIRCLE':
        elements.push({
          id: newId(), type: 'circle',
          x: num(args[0]), y: num(args[1]),
          diameter: num(args[2]), thickness: num(args[3]), rotation: 0,
        });
        break;
      case 'ARC':
        elements.push({
          id: newId(), type: 'arc',
          x: num(args[0]), y: num(args[1]),
          width: num(args[2]), height: num(args[3]),
          startAngle: num(args[4]), sweepAngle: num(args[5]), thickness: num(args[6]), rotation: 0,
        });
        break;
      case 'BLOCK': {
        const x1 = num(args[0]), y1 = num(args[1]);
        elements.push({
          id: newId(), type: 'block',
          x: x1, y: y1,
          width: num(args[2]) - x1, height: num(args[3]) - y1, rotation: 0,
        });
        break;
      }
      case 'REVERSE': {
        const x1 = num(args[0]), y1 = num(args[1]);
        elements.push({
          id: newId(), type: 'reverse',
          x: x1, y: y1,
          width: num(args[2]) - x1, height: num(args[3]) - y1, rotation: 0,
        });
        break;
      }
      case 'DIAGONAL':
        elements.push({
          id: newId(), type: 'diagonal',
          x: num(args[0]), y: num(args[1]),
          width: num(args[2]), height: num(args[3]),
          thickness: num(args[4]), rotation: 0,
        });
        break;
      case 'PUTBMP':
        elements.push({
          id: newId(), type: 'image',
          x: num(args[0]), y: num(args[1]),
          fileName: args[2] || 'IMG.BMP', width: num(args[3]), height: num(args[4]),
          format: 'BMP', rotation: 0,
        });
        break;
      case 'PUTPCX':
        elements.push({
          id: newId(), type: 'image',
          x: num(args[0]), y: num(args[1]),
          fileName: args[2] || 'IMG.PCX', width: 200, height: 200,
          format: 'PCX', rotation: 0,
        });
        break;
      case 'PDF417':
      case 'DMATRIX':
      case 'AZTEC':
      case 'MAXICODE': {
        const codeType = cmd as 'PDF417' | 'DMATRIX' | 'AZTEC' | 'MAXICODE';
        const content = args[args.length - 1] ?? '';
        // 仅 PDF417/DMATRIX 携带宽高；AZTEC/MAXICODE 无尺寸参数，给预览占位点值
        let width = 200, height = 200, rotation = 0;
        if (codeType === 'PDF417' || codeType === 'DMATRIX') {
          width = num(args[2]);
          height = num(args[3]);
          rotation = codeType === 'PDF417' ? num(args[4]) : 0;
        } else if (codeType === 'AZTEC') {
          rotation = num(args[2]);
        }
        elements.push({
          id: newId(), type: 'barcode2d', codeType,
          x: num(args[0]), y: num(args[1]),
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

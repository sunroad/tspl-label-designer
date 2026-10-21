// TSPL 指令定义与语法高亮（纯函数，无依赖）

export interface TsplCommand {
  label: string;
  detail: string;
}

/** TSPL 指令清单，label 用于补全，detail 用于补全提示 */
export const TSPL_COMMANDS: TsplCommand[] = [
  { label: 'SIZE', detail: '标签尺寸：宽 mm, 高 mm' },
  { label: 'GAP', detail: '间隙：间距 mm, 偏移 mm' },
  { label: 'SPEED', detail: '打印速度（英寸/秒）' },
  { label: 'DENSITY', detail: '打印浓度 0-15' },
  { label: 'DIRECTION', detail: '打印方向 0 / 1' },
  { label: 'CLS', detail: '清除打印缓冲区' },
  { label: 'TEXT', detail: '文本：x, y, 字体, 旋转, 宽倍, 高倍, 内容' },
  { label: 'BARCODE', detail: '条形码：x, y, 码制, 高度, 可读, 旋转, 窄, 宽, 内容' },
  { label: 'QRCODE', detail: '二维码：x, y, 纠错, 模块宽, 旋转, 内容' },
  { label: 'BAR', detail: '直线：x1, y1, x2, y2, 粗细' },
  { label: 'BOX', detail: '方框：x1, y1, x2, y2, 线宽' },
  { label: 'ELLIPSE', detail: '椭圆：x, y, 宽, 高, 线宽' },
  { label: 'CIRCLE', detail: '圆：x, y, 直径, 线宽' },
  { label: 'ARC', detail: '圆弧：x, y, 宽, 高, 起始角, 扫过角, 线宽' },
  { label: 'BLOCK', detail: '填充块：x1, y1, x2, y2' },
  { label: 'REVERSE', detail: '反白区：x1, y1, x2, y2' },
  { label: 'DIAGONAL', detail: '反斜线：x, y, 宽, 高, 线宽' },
  { label: 'PUTBMP', detail: '位图：x, y, 文件名, 宽, 高' },
  { label: 'PUTPCX', detail: 'PCX 图像：x, y, 文件名' },
  { label: 'PDF417', detail: 'PDF417 二维条码' },
  { label: 'DMATRIX', detail: 'DataMatrix 二维条码' },
  { label: 'AZTEC', detail: 'Aztec 二维条码' },
  { label: 'MAXICODE', detail: 'MaxiCode 二维条码' },
  { label: 'PRINT', detail: '打印：份数, 每份数量' },
];

const CMD_SET = new Set(TSPL_COMMANDS.map((c) => c.label));

// 高亮配色（与整体 UI 风格一致）
const CMD_COLOR = '#1d4ed8';
const STR_COLOR = '#067647';
const NUM_COLOR = '#b45309';
const PUNCT_COLOR = '#98a2b3';
const INVALID_COLOR = '#b42318';

/** 转义 HTML 特殊字符，防止代码内容注入 */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 将 TSPL 源码转为带高亮 span 的 HTML 字符串（供 overlay 高亮层渲染） */
export function highlightTSPL(text: string): string {
  return text.split('\n').map(highlightLine).join('\n');
}

function highlightLine(line: string): string {
  const parts: string[] = [];
  let idx = 0;
  // 行首指令：可带前导空格，大写字母/数字序列
  const m = line.match(/^(\s*)([A-Z][A-Z0-9]*)/);
  if (m) {
    parts.push(esc(m[1]));
    const cmd = m[2];
    const color = CMD_SET.has(cmd) ? CMD_COLOR : INVALID_COLOR;
    parts.push(`<span style="color:${color};font-weight:600">${esc(cmd)}</span>`);
    idx = m[0].length;
  }
  parts.push(highlightArgs(line.slice(idx)));
  return parts.join('');
}

/** 高亮参数部分：双引号字符串、数字、逗号 */
function highlightArgs(s: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"') {
      // 字符串：到下一个引号（含）
      const end = s.indexOf('"', i + 1);
      if (end === -1) {
        parts.push(`<span style="color:${STR_COLOR}">${esc(s.slice(i))}</span>`);
        break;
      }
      parts.push(`<span style="color:${STR_COLOR}">${esc(s.slice(i, end + 1))}</span>`);
      i = end + 1;
    } else if (ch >= '0' && ch <= '9') {
      const num = s.slice(i).match(/^\d+(?:\.\d+)?/)![0];
      parts.push(`<span style="color:${NUM_COLOR}">${num}</span>`);
      i += num.length;
    } else if (ch === ',') {
      parts.push(`<span style="color:${PUNCT_COLOR}">,</span>`);
      i += 1;
    } else {
      // 普通字符：累积到下一个特殊字符
      let j = i;
      while (j < s.length) {
        const c = s[j];
        if (c === '"' || c === ',' || (c >= '0' && c <= '9')) break;
        j += 1;
      }
      if (j === i) j += 1; // 保险，避免死循环
      parts.push(esc(s.slice(i, j)));
      i = j;
    }
  }
  return parts.join('');
}

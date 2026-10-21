export type ElementType =
  | 'text' | 'barcode' | 'qrcode' | 'line' | 'box'
  | 'ellipse' | 'circle' | 'block' | 'reverse' | 'diagonal' | 'arc'
  | 'image' | 'barcode2d';

export interface BaseElement {
  id: string;
  type: ElementType;
  /** 左上角 X，单位 mm */
  x: number;
  /** 左上角 Y，单位 mm */
  y: number;
  /** 旋转角度：0 / 90 / 180 / 270 */
  rotation?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  font: string;
  xMult: number;
  yMult: number;
  content: string;
}

export interface BarcodeElement extends BaseElement {
  type: 'barcode';
  codeType: string;
  /** 条码高度，单位 mm */
  height: number;
  /** 可读字符：0 隐藏 / 1 显示 */
  humanReadable: number;
  /** 窄条宽度，单位 点(dot) */
  narrow: number;
  /** 宽条宽度，单位 点(dot) */
  wide: number;
  content: string;
}

export interface QrElement extends BaseElement {
  type: 'qrcode';
  ecc: string;
  /** 模块宽度，单位 点(dot) */
  cellWidth: number;
  content: string;
}

export interface LineElement extends BaseElement {
  type: 'line';
  /** 长度，单位 mm */
  width: number;
  /** 粗细，单位 mm */
  height: number;
}

export interface BoxElement extends BaseElement {
  type: 'box';
  /** 宽，单位 mm */
  width: number;
  /** 高，单位 mm */
  height: number;
  /** 线宽，单位 mm */
  thickness: number;
}

/** 椭圆（ELLIPSE），width/height 为外接矩形的宽高 */
export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  width: number;
  height: number;
  /** 线宽，单位 mm */
  thickness: number;
}

/** 圆（CIRCLE），diameter 为直径 */
export interface CircleElement extends BaseElement {
  type: 'circle';
  diameter: number;
  /** 线宽，单位 mm */
  thickness: number;
}

/** 填充块（BLOCK），实心矩形 */
export interface BlockElement extends BaseElement {
  type: 'block';
  width: number;
  height: number;
}

/** 反白区域（REVERSE），矩形范围内反白显示 */
export interface ReverseElement extends BaseElement {
  type: 'reverse';
  width: number;
  height: number;
}

/** 反斜线（DIAGONAL），从左下到右上的斜线 */
export interface DiagonalElement extends BaseElement {
  type: 'diagonal';
  /** 横向长度，单位 mm */
  width: number;
  /** 纵向高度，单位 mm */
  height: number;
  /** 线宽，单位 mm */
  thickness: number;
}

/** 圆弧（ARC），width/height 为所在椭圆外接矩形的宽高 */
export interface ArcElement extends BaseElement {
  type: 'arc';
  width: number;
  height: number;
  /** 起始角度 0-360 */
  startAngle: number;
  /** 扫过角度 0-360 */
  sweepAngle: number;
  /** 线宽，单位 mm */
  thickness: number;
}

/** 位图/图像（PUTBMP / PUTPCX），引用打印机内存中的图片 */
export interface ImageElement extends BaseElement {
  type: 'image';
  /** 打印机内存中的图片文件名 */
  fileName: string;
  /** 显示宽，单位 mm */
  width: number;
  /** 显示高，单位 mm */
  height: number;
  format: 'BMP' | 'PCX';
}

/** 二维条码（PDF417 / DMATRIX / AZTEC / MAXICODE） */
export interface Barcode2dElement extends BaseElement {
  type: 'barcode2d';
  codeType: 'PDF417' | 'DMATRIX' | 'AZTEC' | 'MAXICODE';
  /** 显示宽，单位 mm */
  width: number;
  /** 显示高，单位 mm */
  height: number;
  content: string;
}

export type LabelElement =
  | TextElement
  | BarcodeElement
  | QrElement
  | LineElement
  | BoxElement
  | EllipseElement
  | CircleElement
  | BlockElement
  | ReverseElement
  | DiagonalElement
  | ArcElement
  | ImageElement
  | Barcode2dElement;

export interface LabelSettings {
  /** 标签宽度，单位 mm */
  width: number;
  /** 标签高度，单位 mm */
  height: number;
  /** 标签间隙，单位 mm */
  gap: number;
  /** 打印速度 (IPS) */
  speed: number;
  /** 打印浓度 */
  density: number;
  /** 打印方向 */
  direction: number;
  /** 打印份数 */
  copies: number;
}

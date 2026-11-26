import bwipjs from 'bwip-js/browser';
import type { Barcode2dElement, BarcodeElement, QrElement } from '../types';

type SymbolElement = BarcodeElement | QrElement | Barcode2dElement;

const linearTypes: Record<string, string> = {
  '128': 'code128', EAN128: 'gs1-128', '39': 'code39', '93': 'code93',
  EAN13: 'ean13', EAN8: 'ean8', UPCA: 'upca', UPCE: 'upce',
  CODABAR: 'rationalizedCodabar', ITF14: 'itf14', EAN14: 'ean14',
  '25': 'code2of5', MSI: 'msi', PLESSEY: 'plessey',
};

const matrixTypes: Record<Barcode2dElement['codeType'], string> = {
  PDF417: 'pdf417', DMATRIX: 'datamatrix', AZTEC: 'azteccode', MAXICODE: 'maxicode',
};

/** 返回可扫码的 SVG；无效内容不渲染伪码，留给用户修改输入。 */
export function symbolSvg(el: SymbolElement): string | null {
  if (!el.content) return null;
  const bcid = el.type === 'barcode' ? linearTypes[el.codeType]
    : el.type === 'qrcode' ? 'qrcode' : matrixTypes[el.codeType];
  if (!bcid) return null;
  try {
    return bwipjs.toSVG({
      bcid, text: el.content, scale: 1,
      ...(el.type === 'qrcode' ? { eclevel: el.ecc, padding: 4 } : {}),
      ...(el.type === 'barcode' ? { paddingwidth: 0 } : {}),
    });
  } catch {
    return null;
  }
}

/** 图片引用保留编码器的 SVG 路径、留白及点阵，不经过画布的形状插值。 */
export function symbolImage(el: SymbolElement): string | null {
  const svg = symbolSvg(el);
  return svg ? `data:image/svg+xml,${encodeURIComponent(svg)}` : null;
}

import { useState } from "react";

/* ================= 常量与工具 ================= */
const DPI = 203;
const DOTS_PER_MM = DPI / 25.4; // ≈ 8 点/mm
const mm2d = (mm) => Math.round(mm * DOTS_PER_MM);
const d2mm = (dots) => dots / DOTS_PER_MM;
const fmt = (n) => Math.round(n * 10) / 10;
const hashCode = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const lcg = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// TSPL 内置点阵字体：[宽, 高]（单位：点）
// 依据 TSC TSPL 手册：1=8×12, 2=12×20, 3=16×24, 4=24×32, 5=32×48；0 为 TSPL2 等比例 TrueType
const DOT_FONTS = { "1": [8, 12], "2": [12, 20], "3": [16, 24], "4": [24, 32], "5": [32, 48] };
const isCJK = (ch) => /[　-〿一-鿿＀-￯]/.test(ch);
const displayWidth = (s) => { let w = 0; for (const ch of s) w += isCJK(ch) ? 2 : 1; return w; };
const FONTS = [
  { value: "0", label: "内置 0 · TrueType (TSPL2)" },
  { value: "1", label: "内置 1 · 8×12" },
  { value: "2", label: "内置 2 · 12×20" },
  { value: "3", label: "内置 3 · 16×24" },
  { value: "4", label: "内置 4 · 24×32" },
  { value: "5", label: "内置 5 · 32×48" },
  { value: "TST24.BF2", label: "TST24.BF2 简体中文" },
  { value: "TSS24.BF2", label: "TSS24.BF2 繁体中文" },
  { value: "Arial", label: "Arial (TTF)" },
];
const BARCODE_TYPES = ["128", "EAN128", "39", "93", "EAN13", "EAN8", "UPCA", "UPCE", "CODABAR", "ITF14", "EAN14", "25", "MSI", "PLESSEY"];
const ROTATIONS = [0, 90, 180, 270];
const ECCS = ["L", "M", "Q", "H"];

let uid = 100;
const nid = () => "e" + uid++;

/* ================= 元素几何估算（mm） ================= */
function textBox(el) {
  const f = DOT_FONTS[el.font];
  if (f) return { w: displayWidth(el.content) * (f[0] / 8) * (el.xMult || 1), h: (f[1] / 8) * (el.yMult || 1) };
  const h = 3 * (el.yMult || 1);
  return { w: Math.max(4, displayWidth(el.content) * h * 0.62 * (el.xMult || 1)), h };
}
function barcodeBox(el) {
  let perChar = (el.narrow / 8) * 11 * 0.85;
  if (/^EAN|UPCA|UPCE/.test(el.codeType)) perChar = (el.narrow / 8) * 8.2;
  return { w: Math.max(10, el.content.length * perChar), h: el.height };
}
function qrBox(el) { const side = (el.cellWidth / 8) * 29; return { w: side, h: side }; }
function getBox(el) {
  switch (el.type) {
    case "text": return textBox(el);
    case "barcode": return barcodeBox(el);
    case "qrcode": return qrBox(el);
    case "line": return { w: el.width, h: el.height };
    case "box": return { w: el.width, h: el.height };
    default: return { w: 10, h: 10 };
  }
}

/* ================= 预览渲染 ================= */
function barcodeBars(content, wPx, hPx) {
  const rnd = lcg(hashCode(content)); const bars = [];
  let x = wPx * 0.04; let guard = 0;
  while (x < wPx * 0.96 && guard++ < 600) {
    const bw = Math.max(1, wPx * 0.012 + rnd() * wPx * 0.028);
    bars.push([x, bw]);
    x += bw + Math.max(1, wPx * 0.008 + rnd() * wPx * 0.02);
  }
  return bars;
}
function qrBlackCells(content, n = 21) {
  const cells = []; const rnd = lcg(hashCode(content));
  const finder = (r, c, fr, fc) => {
    if (r >= fr && r < fr + 7 && c >= fc && c < fc + 7) {
      const dr = r - fr, dc = c - fc;
      if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
      if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
      return false;
    }
    return null;
  };
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let on = finder(r, c, 0, 0);
    if (on === null) on = finder(r, c, 0, n - 7);
    if (on === null) on = finder(r, c, n - 7, 0);
    if (on === null) on = (r === 6 || c === 6) ? ((r + c) % 2 === 0) : rnd() < 0.45;
    if (on) cells.push([r, c]);
  }
  return cells;
}

/* ================= TSPL 导出 ================= */
function generateTSPL(label, elements) {
  const L = [];
  // SIZE / GAP 单位是 mm；元素坐标、条码高度等才是点（dot）
  L.push(`SIZE ${fmt(label.width)} mm,${fmt(label.height)} mm`);
  L.push(`GAP ${fmt(label.gap)} mm,0 mm`);
  L.push(`SPEED ${label.speed}`);
  L.push(`DENSITY ${label.density}`);
  L.push(`DIRECTION ${label.direction}`);
  L.push(`CLS`);
  for (const el of elements) {
    if (el.type === "text") L.push(`TEXT ${mm2d(el.x)},${mm2d(el.y)},"${el.font}",${el.rotation},${el.xMult},${el.yMult},"${el.content}"`);
    else if (el.type === "barcode") L.push(`BARCODE ${mm2d(el.x)},${mm2d(el.y)},"${el.codeType}",${mm2d(el.height)},${el.humanReadable},${el.rotation},${el.narrow},${el.wide},"${el.content}"`);
    else if (el.type === "qrcode") L.push(`QRCODE ${mm2d(el.x)},${mm2d(el.y)},${el.ecc},${el.cellWidth},A,${el.rotation},"${el.content}"`);
    else if (el.type === "line") L.push(`BAR ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.width)},${mm2d(el.height)}`);
    else if (el.type === "box") L.push(`BOX ${mm2d(el.x)},${mm2d(el.y)},${mm2d(el.x + el.width)},${mm2d(el.y + el.height)},${mm2d(el.thickness)}`);
  }
  L.push(`PRINT ${label.copies},1`);
  return L.join("\n");
}

/* ================= TSPL 解析（导入） ================= */
function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
function parseMM(v) {
  // 去掉 "mm" 后缀，取数字部分（mm 单位）
  const m = String(v).replace(/mm/i, "").trim();
  return num(m);
}
function parseTSPL(src) {
  const errors = [];
  const els = [];
  const label = { width: 60, height: 40, gap: 3, speed: 4, density: 10, direction: 0, copies: 1 };
  const lines = String(src).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^(\w+)\s+(.*)$/);
    if (!m) { errors.push(`无法解析: ${line}`); continue; }
    const cmd = m[1].toUpperCase();
    const rest = m[2];
    const args = rest.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    switch (cmd) {
      case "SIZE": label.width = parseMM(args[0]); label.height = parseMM(args[1]); break;
      case "GAP": label.gap = parseMM(args[0]); break;
      case "SPEED": label.speed = num(args[0]); break;
      case "DENSITY": label.density = num(args[0]); break;
      case "DIRECTION": label.direction = num(args[0]); break;
      case "PRINT": label.copies = num(args[0]); break;
      case "TEXT":
        els.push({ id: nid(), type: "text", x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))), font: args[2], rotation: num(args[3]), xMult: num(args[4]), yMult: num(args[5]), content: args[6] || "" });
        break;
      case "BARCODE":
        els.push({ id: nid(), type: "barcode", x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))), codeType: args[2], height: fmt(d2mm(num(args[3]))), humanReadable: num(args[4]), rotation: num(args[5]), narrow: num(args[6]), wide: num(args[7]), content: args[8] || "" });
        break;
      case "QRCODE":
        els.push({ id: nid(), type: "qrcode", x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))), ecc: (args[2] || "M").toUpperCase(), cellWidth: num(args[3]), rotation: num(args[5]), content: args[6] || "" });
        break;
      case "BAR":
        els.push({ id: nid(), type: "line", x: fmt(d2mm(num(args[0]))), y: fmt(d2mm(num(args[1]))), width: fmt(d2mm(num(args[2]))), height: fmt(d2mm(num(args[3]))), rotation: 0 });
        break;
      case "BOX": {
        const x1 = num(args[0]), y1 = num(args[1]), x2 = num(args[2]), y2 = num(args[3]), t = num(args[4]) || 1;
        els.push({ id: nid(), type: "box", x: fmt(d2mm(x1)), y: fmt(d2mm(y1)), width: fmt(d2mm(x2 - x1)), height: fmt(d2mm(y2 - y1)), thickness: fmt(d2mm(t)), rotation: 0 });
        break;
      }
      case "CLS":
      case "REFERENCE":
      case "REFLECT":
      case "CODEPAGE":
      case "SHIFT":
      case "REVERSE":
      case "OFFSET":
      case "SET":
      case "PUTBMP":
      case "PUTPCX":
      case "DOWNLOAD":
      case "EOP":
      case "ELLIPSE":
      case "CIRCLE":
      case "BLOCK":
        errors.push(`暂不支持导入指令: ${cmd}（已跳过）`);
        break;
      default:
        errors.push(`未知指令已跳过: ${cmd}`);
    }
  }
  return { label, elements: els, errors };
}

/* ================= 默认数据 ================= */
const defaultLabel = { width: 60, height: 40, gap: 3, speed: 4, density: 10, direction: 0, copies: 1 };
const defaultElements = [
  { id: "e1", type: "text", x: 4, y: 4, font: "TST24.BF2", rotation: 0, xMult: 1, yMult: 1, content: "产品名称" },
  { id: "e2", type: "barcode", x: 4, y: 12, codeType: "128", height: 9, humanReadable: 1, rotation: 0, narrow: 2, wide: 3, content: "6901234567890" },
  { id: "e3", type: "qrcode", x: 30, y: 4, ecc: "M", cellWidth: 4, rotation: 0, content: "https://example.com" },
  { id: "e4", type: "line", x: 4, y: 24, width: 20, height: 0.4 },
  { id: "e5", type: "box", x: 44, y: 24, width: 12, height: 9, thickness: 0.3 },
];

/* ================= UI 小组件 ================= */
const btn = { padding: "6px 12px", borderRadius: 6, border: "1px solid #d0d5dd", background: "#fff", cursor: "pointer", fontSize: 13, color: "#1d2939" };
const btnPrimary = { ...btn, background: "#1d4ed8", borderColor: "#1d4ed8", color: "#fff" };
const input = { width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #d0d5dd", fontSize: 13, boxSizing: "border-box", color: "#1d2939" };
const label = { fontSize: 12, color: "#667085", marginBottom: 3, display: "block" };

function Field({ name, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={label}>{name}</label>
      {children}
    </div>
  );
}
function Num({ value, onChange, step = 1, min }) {
  return <input type="number" step={step} min={min} value={value} style={input} onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))} />;
}
function Sel({ value, onChange, options }) {
  return (
    <select style={input} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* ================= 主组件 ================= */
export default function App() {
  const [label, setLabel] = useState(defaultLabel);
  const [elements, setElements] = useState(defaultElements);
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(4);
  const [drag, setDrag] = useState(null);
  const [showTSPL, setShowTSPL] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState(null);
  const [labelInfoOpen, setLabelInfoOpen] = useState(true);
  const [elPropsOpen, setElPropsOpen] = useState(true);

  const [copyState, setCopyState] = useState("复制");

  const doCopy = async (text) => {
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    };
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (e) { ok = false; }
    if (!ok) ok = fallback();
    if (ok) {
      setCopyState("已复制 ✓");
      setTimeout(() => setCopyState("复制"), 1500);
    } else {
      setCopyState("请手动复制");
      setTimeout(() => setCopyState("复制"), 2000);
    }
  };

  const doImport = () => {
    if (!importText.trim()) { setImportMsg({ type: "err", text: "请输入 TSPL 指令" }); return; }
    const r = parseTSPL(importText);
    setLabel(r.label);
    setElements(r.elements);
    setSelected(null);
    const extra = r.errors.length ? `；${r.errors.length} 条提示：${r.errors.slice(0, 3).join("；")}` : "";
    setImportMsg({ type: "ok", text: `导入成功：标签 ${fmt(r.label.width)}×${fmt(r.label.height)} mm，元素 ${r.elements.length} 个${extra}` });
  };

  const selEl = elements.find((e) => e.id === selected) || null;
  const upLabel = (patch) => setLabel((l) => ({ ...l, ...patch }));
  const updateEl = (id, patch) => setElements((els) => els.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEl = (id) => { setElements((els) => els.filter((e) => e.id !== id)); if (selected === id) setSelected(null); };
  const duplicateEl = (id) => {
    const src = elements.find((e) => e.id === id); if (!src) return;
    const copy = { ...src, id: nid(), x: fmt(src.x + 2), y: fmt(src.y + 2) };
    setElements((els) => { const i = els.findIndex((e) => e.id === id); return [...els.slice(0, i + 1), copy, ...els.slice(i + 1)]; });
    setSelected(copy.id);
  };
  const addElement = (type) => {
    const base = { id: nid(), type, x: fmt(label.width / 2 - 8), y: fmt(label.height / 2 - 4) };
    let el;
    if (type === "text") el = { ...base, font: "1", rotation: 0, xMult: 1, yMult: 1, content: "文本" };
    else if (type === "barcode") el = { ...base, codeType: "128", height: 8, humanReadable: 1, rotation: 0, narrow: 2, wide: 3, content: "1234567890" };
    else if (type === "qrcode") el = { ...base, ecc: "M", cellWidth: 4, rotation: 0, content: "https://" };
    else if (type === "line") el = { ...base, width: 20, height: 0.4 };
    else el = { ...base, width: 16, height: 10, thickness: 0.3 };
    setElements((els) => [...els, el]); setSelected(el.id);
  };

  const onDown = (e, el) => {
    if (e.button !== 0) return;
    e.stopPropagation(); setSelected(el.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: el.id, ox: el.x, oy: el.y, px: e.clientX, py: e.clientY });
  };
  const onMove = (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.px) / zoom, dy = (e.clientY - drag.py) / zoom;
    updateEl(drag.id, { x: fmt(drag.ox + dx), y: fmt(drag.oy + dy) });
  };
  const onUp = (e) => { if (drag) { try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} setDrag(null); } };

  const tsp = generateTSPL(label, elements);
  const W = label.width * zoom, H = label.height * zoom;

  const renderPreview = (el) => {
    const { w, h } = getBox(el);
    const wp = w * zoom, hp = h * zoom;
    let inner = null;
    if (el.type === "text") {
      const f = DOT_FONTS[el.font];
      const fs = (f ? (f[1] / 8) * (el.yMult || 1) : 3 * (el.yMult || 1)) * zoom;
      const wpx = (f ? (f[0] / 8) * (el.xMult || 1) : fs / zoom * 0.62) * zoom;
      inner = <text x={0} y={0} dominantBaseline="hanging" style={{ fontSize: fs, fill: "#111", fontFamily: "monospace", whiteSpace: "pre" }}>{el.content}</text>;
    } else if (el.type === "barcode") {
      inner = (
        <g>
          {barcodeBars(el.content, wp, hp).map(([x, bw], i) => <rect key={i} x={x} y={0} width={bw} height={hp} fill="#111" />)}
          {el.humanReadable === 1 && <text x={wp / 2} y={hp + 10} textAnchor="middle" style={{ fontSize: 9, fill: "#111", fontFamily: "monospace" }}>{el.content}</text>}
        </g>
      );
    } else if (el.type === "qrcode") {
      const cell = wp / 21;
      inner = <g>{qrBlackCells(el.content, 21).map(([r, c], i) => <rect key={i} x={c * cell} y={r * cell} width={cell} height={cell} fill="#111" />)}</g>;
    } else if (el.type === "line") {
      inner = <rect x={0} y={0} width={wp} height={Math.max(hp, 1)} fill="#111" />;
    } else if (el.type === "box") {
      const t = Math.max(el.thickness * zoom, 1);
      inner = <rect x={0} y={0} width={wp} height={hp} fill="none" stroke="#111" strokeWidth={t} />;
    }
    return (
      <g key={el.id}
        transform={`translate(${el.x * zoom},${el.y * zoom}) rotate(${el.rotation || 0} ${wp / 2} ${hp / 2})`}
        onPointerDown={(e) => onDown(e, el)} onPointerMove={onMove} onPointerUp={onUp}
        style={{ cursor: "move" }}>
        {inner}
        {selected === el.id && <rect x={-2} y={-2} width={wp + 4} height={hp + 4} fill="none" stroke="#1d4ed8" strokeWidth={1} strokeDasharray="4 3" />}
      </g>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif", background: "#f5f6f8", color: "#1d2939" }}>
      {/* 顶栏 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#fff", borderBottom: "1px solid #e4e7ec" }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>TSPL 标签设计器 <span style={{ fontWeight: 400, fontSize: 12, color: "#98a2b3" }}>可视化预览 · 导出 TSPL 指令</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn} onClick={() => { setImportText(tsp); setImportMsg(null); setShowImport(true); }}>导入 TSPL</button>
          <button style={btn} onClick={() => setShowTSPL(true)}>查看 / 复制 TSPL</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* 左栏：元素库 */}
        <div style={{ width: 180, background: "#fff", borderRight: "1px solid #e4e7ec", padding: 12, overflowY: "auto" }}>
          <div style={{ fontSize: 12, color: "#667085", marginBottom: 8 }}>添加元素</div>
          {[
            ["text", "文本"], ["barcode", "条形码"], ["qrcode", "二维码"], ["line", "直线"], ["box", "方框"],
          ].map(([t, n]) => (
            <button key={t} style={{ ...btn, display: "block", width: "100%", marginBottom: 6, textAlign: "left" }} onClick={() => addElement(t)}>＋ {n}</button>
          ))}
          <div style={{ fontSize: 12, color: "#667085", margin: "14px 0 8px" }}>元素列表</div>
          {elements.length === 0 && <div style={{ fontSize: 12, color: "#98a2b3" }}>（空）</div>}
          {elements.map((e) => (
            <div key={e.id} onClick={() => setSelected(e.id)}
              style={{ padding: "5px 8px", borderRadius: 6, marginBottom: 4, fontSize: 12, cursor: "pointer", background: selected === e.id ? "#eaf1ff" : "#f8f9fb", border: selected === e.id ? "1px solid #b6cfff" : "1px solid transparent" }}>
              {e.type === "text" ? "文本" : e.type === "barcode" ? "条形码" : e.type === "qrcode" ? "二维码" : e.type === "line" ? "直线" : "方框"}
              <span style={{ color: "#98a2b3", marginLeft: 6 }}>{e.content || ""}</span>
            </div>
          ))}
        </div>

        {/* 中栏：画布 */}
        <div style={{ flex: 1, overflow: "auto", padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <button style={btn} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>−</button>
            <span style={{ fontSize: 12, color: "#667085" }}>缩放 {zoom}px/mm</span>
            <button style={btn} onClick={() => setZoom((z) => z + 0.5)}>＋</button>
            <span style={{ fontSize: 11, color: "#98a2b3", marginLeft: 8 }}>提示：条码/二维码预览为示意，实际以打印机渲染为准</span>
          </div>
          <div style={{ background: "#dfe3ea", padding: 24, borderRadius: 8, boxShadow: "inset 0 1px 4px rgba(0,0,0,.08)" }}>
            <svg width={W} height={H} style={{ display: "block", background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,.15)" }}
              onPointerDown={() => setSelected(null)}>
              {elements.map(renderPreview)}
            </svg>
          </div>
          <div style={{ fontSize: 11, color: "#98a2b3", marginTop: 8 }}>{fmt(label.width)} × {fmt(label.height)} mm · 203 DPI = {mm2d(label.width)} × {mm2d(label.height)} 点</div>
        </div>

        {/* 右栏：属性 */}
        <div style={{ width: 280, background: "#fff", borderLeft: "1px solid #e4e7ec", padding: 14, overflowY: "auto" }}>
          {/* 标签信息设置 */}
          <div onClick={() => setLabelInfoOpen((o) => !o)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", fontSize: 12, fontWeight: 700, color: "#475467", marginBottom: labelInfoOpen ? 10 : 0, paddingBottom: 6, borderBottom: "1px solid #e4e7ec" }}>
            <span>标签信息设置</span>
            <span style={{ color: "#98a2b3", fontSize: 13 }}>{labelInfoOpen ? "▾" : "▸"}</span>
          </div>
          {labelInfoOpen && (
            <div>
              <Field name="标签宽度 (mm)"><Num value={label.width} onChange={(v) => upLabel({ width: v })} min={1} /></Field>
              <Field name="标签高度 (mm)"><Num value={label.height} onChange={(v) => upLabel({ height: v })} min={1} /></Field>
              <Field name="间隙 (mm)"><Num value={label.gap} onChange={(v) => upLabel({ gap: v })} min={0} /></Field>
              <Field name="打印速度 (IPS)"><Num value={label.speed} onChange={(v) => upLabel({ speed: v })} min={1} /></Field>
              <Field name="打印浓度"><Num value={label.density} onChange={(v) => upLabel({ density: v })} min={0} max={15} /></Field>
              <Field name="打印方向"><Sel value={label.direction} onChange={(v) => upLabel({ direction: parseInt(v) })} options={[0, 1]} /></Field>
              <Field name="打印份数"><Num value={label.copies} onChange={(v) => upLabel({ copies: v })} min={1} /></Field>
            </div>
          )}

          {/* 元素属性设置 */}
          <div onClick={() => setElPropsOpen((o) => !o)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", fontSize: 12, fontWeight: 700, color: "#475467", margin: "14px 0 10px", paddingBottom: 6, borderBottom: "1px solid #e4e7ec" }}>
            <span>元素属性设置</span>
            <span style={{ color: "#98a2b3", fontSize: 13 }}>{elPropsOpen ? "▾" : "▸"}</span>
          </div>
          {elPropsOpen && (<>
          {!selEl && <div style={{ fontSize: 12, color: "#98a2b3" }}>点击画布中的元素查看并编辑属性。</div>}
          {selEl && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{selEl.type === "text" ? "文本" : selEl.type === "barcode" ? "条形码" : selEl.type === "qrcode" ? "二维码" : selEl.type === "line" ? "直线" : "方框"}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button style={{ ...btn, fontSize: 12, padding: "3px 8px" }} onClick={() => duplicateEl(selEl.id)}>复制</button>
                  <button style={{ ...btn, fontSize: 12, padding: "3px 8px", color: "#b42318" }} onClick={() => removeEl(selEl.id)}>删除</button>
                </span>
              </div>

              <Field name="X (mm)"><Num value={selEl.x} onChange={(v) => updateEl(selEl.id, { x: v })} step={0.1} /></Field>
              <Field name="Y (mm)"><Num value={selEl.y} onChange={(v) => updateEl(selEl.id, { y: v })} step={0.1} /></Field>

              {selEl.type === "text" && (
                <>
                  <Field name="内容"><input style={input} value={selEl.content} onChange={(e) => updateEl(selEl.id, { content: e.target.value })} /></Field>
                  <Field name="字体"><select style={input} value={selEl.font} onChange={(e) => updateEl(selEl.id, { font: e.target.value })}>{FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select></Field>
                  <Field name="横向放大 (xMult)"><Num value={selEl.xMult} onChange={(v) => updateEl(selEl.id, { xMult: v })} step={0.5} /></Field>
                  <Field name="纵向放大 (yMult)"><Num value={selEl.yMult} onChange={(v) => updateEl(selEl.id, { yMult: v })} step={0.5} /></Field>
                </>
              )}
              {selEl.type === "barcode" && (
                <>
                  <Field name="内容"><input style={input} value={selEl.content} onChange={(e) => updateEl(selEl.id, { content: e.target.value })} /></Field>
                  <Field name="码制"><select style={input} value={selEl.codeType} onChange={(e) => updateEl(selEl.id, { codeType: e.target.value })}>{BARCODE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
                  <Field name="高度 (mm)"><Num value={selEl.height} onChange={(v) => updateEl(selEl.id, { height: v })} step={0.5} /></Field>
                  <Field name="可读字符"><select style={input} value={selEl.humanReadable} onChange={(e) => updateEl(selEl.id, { humanReadable: parseInt(e.target.value) })}><option value={1}>显示 (1)</option><option value={0}>隐藏 (0)</option></select></Field>
                  <Field name="窄条宽 (点)"><Num value={selEl.narrow} onChange={(v) => updateEl(selEl.id, { narrow: v })} /></Field>
                  <Field name="宽条宽 (点)"><Num value={selEl.wide} onChange={(v) => updateEl(selEl.id, { wide: v })} /></Field>
                </>
              )}
              {selEl.type === "qrcode" && (
                <>
                  <Field name="内容"><input style={input} value={selEl.content} onChange={(e) => updateEl(selEl.id, { content: e.target.value })} /></Field>
                  <Field name="纠错等级"><Sel value={selEl.ecc} onChange={(v) => updateEl(selEl.id, { ecc: v })} options={ECCS} /></Field>
                  <Field name="模块宽度 (点)"><Num value={selEl.cellWidth} onChange={(v) => updateEl(selEl.id, { cellWidth: v })} min={1} max={10} /></Field>
                </>
              )}
              {selEl.type === "line" && (
                <>
                  <Field name="长度 (mm)"><Num value={selEl.width} onChange={(v) => updateEl(selEl.id, { width: v })} step={0.5} /></Field>
                  <Field name="粗细 (mm)"><Num value={selEl.height} onChange={(v) => updateEl(selEl.id, { height: v })} step={0.1} /></Field>
                </>
              )}
              {selEl.type === "box" && (
                <>
                  <Field name="宽 (mm)"><Num value={selEl.width} onChange={(v) => updateEl(selEl.id, { width: v })} step={0.5} /></Field>
                  <Field name="高 (mm)"><Num value={selEl.height} onChange={(v) => updateEl(selEl.id, { height: v })} step={0.5} /></Field>
                  <Field name="线宽 (mm)"><Num value={selEl.thickness} onChange={(v) => updateEl(selEl.id, { thickness: v })} step={0.1} /></Field>
                </>
              )}

              <Field name="旋转角度"><Sel value={selEl.rotation || 0} onChange={(v) => updateEl(selEl.id, { rotation: parseInt(v) })} options={ROTATIONS} /></Field>
            </div>
          )}
          </>)}
        </div>
      </div>

      {/* 导入弹窗 */}
      {showImport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, width: 620, maxWidth: "92vw", maxHeight: "84vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e4e7ec", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>导入 TSPL 指令</span>
              <button style={btn} onClick={() => setShowImport(false)}>关闭</button>
            </div>
            <div style={{ padding: 16, overflow: "auto", flex: 1 }}>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} spellCheck={false}
                style={{ width: "100%", height: 260, padding: 12, borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.6, boxSizing: "border-box", resize: "vertical" }} />
              {importMsg && (
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 13, background: importMsg.type === "ok" ? "#ecfdf3" : "#fef3f2", color: importMsg.type === "ok" ? "#067647" : "#b42318", border: `1px solid ${importMsg.type === "ok" ? "#abefc6" : "#fecdca"}` }}>{importMsg.text}</div>
              )}
              <div style={{ fontSize: 11, color: "#98a2b3", marginTop: 8 }}>支持导入：SIZE / GAP / SPEED / DENSITY / DIRECTION / PRINT / TEXT / BARCODE / QRCODE / BAR / BOX。坐标按 203 DPI 点换算回 mm。其余指令会提示跳过。</div>
            </div>
            <div style={{ padding: "12px 18px", borderTop: "1px solid #e4e7ec", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={btn} onClick={() => setShowImport(false)}>取消</button>
              <button style={btnPrimary} onClick={doImport}>导入</button>
            </div>
          </div>
        </div>
      )}

      {/* TSPL 弹窗 */}
      {showTSPL && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, width: 620, maxWidth: "92vw", maxHeight: "84vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e4e7ec", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>TSPL 指令</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button style={btnPrimary} onClick={() => doCopy(tsp)}>{copyState}</button>
                <button style={btn} onClick={() => { const b = new Blob([tsp], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "label.tspl"; a.click(); }}>下载 .tspl</button>
                <button style={btn} onClick={() => setShowTSPL(false)}>关闭</button>
              </span>
            </div>
            <pre style={{ margin: 0, padding: 16, fontSize: 13, lineHeight: 1.6, overflow: "auto", flex: 1, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", whiteSpace: "pre-wrap" }}>{tsp}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

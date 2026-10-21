# TSPL 标签可视化设计器

一个纯前端的 TSPL（TSC 打印机指令语言）标签设计器。支持可视化拖拽设计、实时预览，以及 TSPL 指令的导出与导入。不依赖打印机连接。

## 功能

- **可视化画布**：按真实物理尺寸（203 DPI，mm ↔ 点换算）预览标签，支持鼠标拖拽移动元素
- **十三类元素**：文本、条形码、二维码、二维条码（PDF417/DataMatrix/Aztec/MaxiCode）、直线、方框、椭圆、圆、圆弧、填充块、反白区、反斜线、图像（BMP/PCX 占位）
- **属性编辑**：坐标、字体、码制、放大倍数、旋转角度等
- **标签信息设置**：标签宽高、间隙、打印速度、浓度、方向、份数（可折叠）
- **导出 TSPL**：一键查看、复制、下载 `.tspl` 指令文件
- **导入 TSPL**：粘贴现有指令，还原标签与元素

## 快速开始

```bash
npm install
npm run dev
```

构建产物：

```bash
npm run build   # 输出到 dist/
npm run preview # 预览构建产物
```

## 项目结构

```
src/
  main.tsx                  # 入口
  App.tsx                   # 主组件，状态管理
  types.ts                  # 元素与标签类型定义
  defaults.ts               # 默认标签/元素
  index.css                 # 全局样式
  lib/
    units.ts                # mm ↔ 点(dot) 换算
    fonts.ts                # 字体表 / 码制 / 旋转角度常量
    tspl.ts                 # 元素 → TSPL 指令生成 + 包围盒估算
    parse.ts                # TSPL 指令 → 元素解析
    tsplSyntax.ts           # TSPL 指令清单 + 语法高亮
    id.ts                   # 元素 ID 生成
  components/
    Canvas.tsx              # 画布（拖拽 + 缩放）
    ElementRenderer.tsx     # 单个元素渲染
    ElementLibrary.tsx      # 左侧元素库
    LabelInfoPanel.tsx      # 右侧「标签信息设置」
    ElementPropsPanel.tsx   # 右侧「元素属性设置」
    TsplModal.tsx           # 导出弹窗
    TsplEditor.tsx          # TSPL 代码编辑器（语法高亮 + 标签补全）
    ImportModal.tsx         # 导入弹窗
    ui.tsx                  # 基础 UI 组件
    preview.ts              # 条码/二维码示意渲染
```

## 单位约定

TSPL 中不同字段单位不同，本项目已统一处理：

| 字段 | 单位 |
| --- | --- |
| `SIZE` / `GAP` | mm |
| `TEXT` / `BARCODE` / `QRCODE` 坐标 | 点 (dot) |
| 条码高度、`BAR` / `BOX` 尺寸 | 点 (dot) |
| `SPEED` / `DENSITY` / `DIRECTION` | 无单位数值 |

## 内置字体

商米 V3 官方内置字体（含中文 GBK）与 TSC 通用英数字体并列列出：

| 字体 | 点阵 | 说明 |
| --- | --- | --- |
| 0 | 12×24 英数 + 24×24 中文 | 商米内置，GBK 中文 |
| 1 | 8×16 英数 + 16×16 中文 | 商米内置，GBK 中文 |
| 2 | 12×20 英数 | TSC 通用 |
| 3 | 16×24 英数 | TSC 通用 |
| 4 | 24×32 英数 | TSC 通用 |
| 5 | 32×48 英数 | TSC 通用 |
| TSS24.BF2 | 24×24 | 简体中文（GB 码） |
| TST24.BF2 | 24×24 | 繁体中文（Big5 码） |
| Arial | — | TTF 矢量 |

字体下拉框末尾可「＋ 添加自定义字体」，自定义字体名持久化到本地；点阵未知的自定义字体按 TTF 等比估算预览。

## 说明

- 条码与二维码在画布中为**示意图形**（种子随机生成），实际打印精度以打印机渲染为准
- 支持导入的指令：`SIZE` / `GAP` / `SPEED` / `DENSITY` / `DIRECTION` / `PRINT` / `TEXT` / `BARCODE` / `QRCODE` / `BAR` / `BOX` / `ELLIPSE` / `CIRCLE` / `ARC` / `BLOCK` / `REVERSE` / `DIAGONAL` / `PUTBMP` / `PUTPCX` / `PDF417` / `DMATRIX` / `AZTEC` / `MAXICODE`，其余指令导入时会提示跳过

## 技术栈

TypeScript · React 18 · Vite

import type { LabelElement } from '../types';

export interface VariableDefinition {
  token: string;
  preview: string;
}

export const VARIABLE_TOKEN = /^([!#$%&*+./:;=?@^|~-]{1,4})[A-Za-z_][A-Za-z0-9_]*\1$/;
const STORAGE_KEY = 'tspl:variables';

export function loadVariables(): VariableDefinition[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    const seen = new Set<string>();
    return stored.filter((item): item is VariableDefinition => {
      if (!item || typeof item.token !== 'string' || typeof item.preview !== 'string' ||
          !VARIABLE_TOKEN.test(item.token) || !item.preview.trim() || seen.has(item.token)) return false;
      seen.add(item.token);
      return true;
    });
  } catch {
    return [];
  }
}

export function saveVariables(variables: VariableDefinition[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(variables)); } catch { /* 存储不可用时仅保留本次会话 */ }
}

/** 从已解析的内容字段补齐变量，保留已有变量的预览值和顺序。 */
export function appendMissingVariables(elements: LabelElement[], variables: VariableDefinition[]): VariableDefinition[] {
  const seen = new Set(variables.map(({ token }) => token));
  const added: VariableDefinition[] = [];
  const tokens = /([!#$%&*+./:;=?@^|~-]{1,4})[A-Za-z_][A-Za-z0-9_]*\1/g;
  for (const el of elements) {
    if (!('content' in el)) continue;
    for (const match of el.content.matchAll(tokens)) {
      const token = match[0];
      if (seen.has(token)) continue;
      seen.add(token);
      added.push({ token, preview: '0' });
    }
  }
  return added.length ? [...variables, ...added] : variables;
}

/** 只替换已定义的占位符；未定义的内容保持原样，且替换值不再递归展开。 */
export function resolvePreview(content: string, variables: VariableDefinition[]): string {
  if (!variables.length) return content;
  const values = new Map(variables.map(({ token, preview }) => [token, preview]));
  const pattern = new RegExp([...values.keys()].sort((a, b) => b.length - a.length)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  return content.replace(pattern, (token) => values.get(token)!);
}

export function previewElement(el: LabelElement, variables: VariableDefinition[]): LabelElement {
  if ('content' in el) {
    const content = resolvePreview(el.content, variables);
    return content === el.content ? el : { ...el, content };
  }
  return el;
}

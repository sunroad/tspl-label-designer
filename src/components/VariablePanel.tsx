import { useRef, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { VariableDefinition } from '../lib/variables';
import { VARIABLE_TOKEN } from '../lib/variables';
import { btnPrimaryStyle, btnStyle, fieldLabelStyle, iconBtnStyle, inputStyle, SectionHeader } from './ui';

interface Props {
  variables: VariableDefinition[];
  open: boolean;
  onToggle: () => void;
  onChange: (variables: VariableDefinition[], rename?: [string, string]) => void;
}
export default function VariablePanel({ variables, open, onToggle, onChange }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  const selected = variables.find((item) => item.token === selectedToken);
  const reset = () => { setEditing(null); setToken(''); setPreview(''); setError(''); };
  const add = () => { reset(); dialogRef.current?.showModal(); };
  const edit = (item: VariableDefinition) => {
    setEditing(item.token); setToken(item.token); setPreview(item.preview); setError('');
    dialogRef.current?.showModal();
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const name = token.trim();
    if (!VARIABLE_TOKEN.test(name)) { setError('格式须为 包围符号+name+相同包围符号（如 %name%、##name##、#%name#%；名称以字母或下划线开头）'); return; }
    if (!preview.trim()) { setError('请输入预览值'); return; }
    if (variables.some((item) => item.token === name && item.token !== editing)) {
      setError('变量已存在'); return;
    }
    const value = { token: name, preview };
    onChange(editing === null ? [...variables, value] : variables.map((item) => item.token === editing ? value : item),
      editing !== null && editing !== name ? [editing, name] : undefined);
    if (editing !== null) setSelectedToken(name);
    dialogRef.current?.close();
  };

  return (
    <div className="section-group" style={{ marginTop: 12 }}>
      <SectionHeader title="变量管理" open={open} onToggle={onToggle} />
      {open && <div className="section-content">
        <div className="variable-toolbar" style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 8 }}>
          <button type="button" title="添加变量" aria-label="添加变量" style={{ ...iconBtnStyle, flexShrink: 0 }} onClick={add}>
            <Plus size={16} strokeWidth={1.8} />
          </button>
          <button type="button" title="编辑变量" aria-label="编辑选中变量" disabled={!selected} style={{ ...iconBtnStyle, flexShrink: 0 }} onClick={() => selected && edit(selected)}>
            <Pencil size={16} strokeWidth={1.8} />
          </button>
          <button type="button" title="删除变量" aria-label="删除选中变量" disabled={!selected} style={{ ...iconBtnStyle, flexShrink: 0, color: '#b42318' }} onClick={() => {
            if (!selected) return;
            onChange(variables.filter((item) => item.token !== selected.token));
            setSelectedToken(null);
          }}>
            <Trash2 size={16} strokeWidth={1.8} />
          </button>
        </div>
        <table className="variable-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: 36 }}>序号</th>
              <th scope="col">变量</th>
              <th scope="col">预览</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((item, index) => <tr key={item.token} tabIndex={0} aria-selected={selectedToken === item.token}
              onClick={() => setSelectedToken(item.token)}
              onDoubleClick={() => edit(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedToken(item.token); }
              }}>
              <td>{index + 1}</td>
              <td>{item.token}</td>
              <td>{item.preview}</td>
            </tr>)}
            {variables.length === 0 && <tr><td colSpan={3} style={{ padding: '12px 2px', color: '#667085', textAlign: 'center' }}>暂无变量</td></tr>}
          </tbody>
        </table>
      </div>}
      <dialog ref={dialogRef} aria-labelledby="variable-dialog-title" onClose={reset} style={{ width: 'min(360px, calc(100vw - 32px))', border: '1px solid #d0d5dd', borderRadius: 8, padding: 20, boxShadow: '0 12px 36px #10182833' }}>
        <h2 id="variable-dialog-title" style={{ fontSize: 16, margin: '0 0 16px' }}>{editing === null ? '添加变量' : '编辑变量'}</h2>
        <form onSubmit={save}>
          <label style={fieldLabelStyle} htmlFor="variable-token">变量格式（两侧使用相同符号）</label>
          <input id="variable-token" style={inputStyle} value={token} onChange={(e) => { setToken(e.target.value); setError(''); }} placeholder="%name% / ##name## / #%name#%" required />
          <div style={{ color: '#667085', fontSize: 12, marginTop: 5 }}>例如 %name%、##name##、#%name#%；名称以字母或下划线开头。</div>
          <label style={{ ...fieldLabelStyle, marginTop: 12 }} htmlFor="variable-preview">预览值（必填）</label>
          <input id="variable-preview" style={inputStyle} value={preview} onChange={(e) => { setPreview(e.target.value); setError(''); }} placeholder="画布上显示的示例数据" required />
          {error && <div role="alert" style={{ color: '#b42318', fontSize: 12, marginTop: 6 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
            <button type="button" style={btnStyle} onClick={() => dialogRef.current?.close()}>取消</button>
            <button type="submit" style={btnPrimaryStyle}>{editing === null ? '添加变量' : '保存变量'}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

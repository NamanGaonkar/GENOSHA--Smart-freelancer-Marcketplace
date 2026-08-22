import { useRef, useCallback, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Write here...', minHeight = 120 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCmd = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    handleChange();
  }, []);

  const handleChange = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // Convert empty content to empty string
      if (html === '<br>' || html === '<div><br></div>' || html === '<p><br></p>') {
        onChange('');
      } else {
        onChange(html);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab key for indent
    if (e.key === 'Tab') {
      e.preventDefault();
      execCmd('insertHTML', '&emsp;');
    }
  };

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 6,
    border: 'none',
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  });

  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid var(--border)',
      background: 'var(--bg-input)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '6px 10px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <button type="button" onClick={() => execCmd('bold')} style={btnStyle()} title="Bold (Ctrl+B)"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <Bold size={15} />
        </button>
        <button type="button" onClick={() => execCmd('italic')} style={btnStyle()} title="Italic (Ctrl+I)"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <Italic size={15} />
        </button>
        <button type="button" onClick={() => execCmd('underline')} style={btnStyle()} title="Underline (Ctrl+U)"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <Underline size={15} />
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
        <button type="button" onClick={() => execCmd('insertUnorderedList')} style={btnStyle()} title="Bullet List"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <List size={15} />
        </button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} style={btnStyle()} title="Numbered List"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <ListOrdered size={15} />
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleChange}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{
          minHeight,
          padding: '14px 16px',
          fontSize: 14,
          lineHeight: 1.7,
          color: 'var(--text)',
          outline: 'none',
          overflow: 'auto',
          maxHeight: 400,
        }}
        onFocus={(e) => {
          e.currentTarget.parentElement!.style.borderColor = 'var(--accent)';
        }}
        onBlur={(e) => {
          e.currentTarget.parentElement!.style.borderColor = 'var(--border)';
        }}
      />
      <style>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: var(--text-muted);
          pointer-events: none;
        }
        [data-placeholder]:focus:empty:before {
          content: attr(data-placeholder);
          color: var(--text-muted);
        }
        [data-placeholder] p, [data-placeholder] div, [data-placeholder] li {
          margin: 0 0 4px 0;
        }
        [data-placeholder] ul, [data-placeholder] ol {
          padding-left: 24px;
          margin: 4px 0;
        }
        [data-placeholder] b, [data-placeholder] strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

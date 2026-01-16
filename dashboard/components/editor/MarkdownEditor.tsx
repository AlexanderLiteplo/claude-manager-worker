'use client';

import { useMemo, useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export interface MarkdownEditorRef {
  textarea: HTMLTextAreaElement | null;
  focus: () => void;
  getSelection: () => { start: number; end: number };
}

// Syntax highlighting tokens
const HIGHLIGHT_PATTERNS = [
  // Headers
  { pattern: /^(#{1,6}\s.*)$/gm, className: 'md-header' },
  // Code blocks (multiline)
  { pattern: /(```[\s\S]*?```)/g, className: 'md-code-block' },
  // Inline code
  { pattern: /(`[^`\n]+`)/g, className: 'md-inline-code' },
  // Bold
  { pattern: /(\*\*[^*]+\*\*)/g, className: 'md-bold' },
  // Italic
  { pattern: /(\*[^*]+\*)/g, className: 'md-italic' },
  // Links
  { pattern: /(\[[^\]]+\]\([^)]+\))/g, className: 'md-link' },
  // Checkboxes (unchecked)
  { pattern: /(^\s*\[\s*\]\s)/gm, className: 'md-checkbox' },
  // Checkboxes (checked)
  { pattern: /(^\s*\[x\]\s)/gim, className: 'md-checkbox-checked' },
  // List items
  { pattern: /^([-*]\s)/gm, className: 'md-list-bullet' },
  // Numbered lists
  { pattern: /^(\d+\.\s)/gm, className: 'md-list-number' },
  // Horizontal rule
  { pattern: /^(---)$/gm, className: 'md-hr' },
  // Blockquotes
  { pattern: /^(>\s)/gm, className: 'md-blockquote' },
];

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(function MarkdownEditor(
  { value, onChange, onSelect, placeholder, className = '', disabled = false },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Expose ref methods
  useImperativeHandle(ref, () => ({
    textarea: textareaRef.current,
    focus: () => textareaRef.current?.focus(),
    getSelection: () => ({
      start: textareaRef.current?.selectionStart ?? 0,
      end: textareaRef.current?.selectionEnd ?? 0,
    }),
  }));

  // Generate highlighted HTML
  const highlightedHtml = useMemo(() => {
    return generateHighlightedHtml(value);
  }, [value]);

  // Sync scroll between textarea and highlight overlay
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
  }, []);

  // Apply scroll to highlight div
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollTop, scrollLeft]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // Handle tab key for indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, [value, onChange]);

  return (
    <div className={`markdown-editor relative ${className}`}>
      {/* Syntax highlighting overlay (behind textarea) */}
      <div
        ref={highlightRef}
        className="absolute inset-0 overflow-hidden pointer-events-none
          font-mono text-sm p-4 whitespace-pre-wrap break-words
          text-transparent"
        aria-hidden="true"
      >
        <pre
          className="m-0 font-mono text-sm whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </div>

      {/* Actual textarea (transparent text, visible caret) */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onSelect={onSelect}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        spellCheck={false}
        className="relative w-full h-full p-4 font-mono text-sm resize-none
          bg-transparent text-gray-900 dark:text-white
          caret-gray-900 dark:caret-white
          focus:outline-none
          [color:inherit] [background:transparent]"
        style={{
          // Make text visible but let highlighting show through
          WebkitTextFillColor: 'inherit',
          caretColor: 'currentColor',
        }}
      />

      {/* Styles for syntax highlighting */}
      <style jsx global>{`
        .markdown-editor .md-header {
          color: #3b82f6; /* blue-500 */
          font-weight: 600;
        }
        .markdown-editor .md-code-block {
          color: #10b981; /* emerald-500 */
          background-color: rgba(16, 185, 129, 0.1);
          border-radius: 4px;
        }
        .markdown-editor .md-inline-code {
          color: #f97316; /* orange-500 */
          background-color: rgba(249, 115, 22, 0.1);
          padding: 0 2px;
          border-radius: 2px;
        }
        .markdown-editor .md-bold {
          color: #8b5cf6; /* violet-500 */
          font-weight: 700;
        }
        .markdown-editor .md-italic {
          color: #ec4899; /* pink-500 */
          font-style: italic;
        }
        .markdown-editor .md-link {
          color: #0ea5e9; /* sky-500 */
          text-decoration: underline;
        }
        .markdown-editor .md-checkbox,
        .markdown-editor .md-checkbox-checked {
          color: #22c55e; /* green-500 */
        }
        .markdown-editor .md-list-bullet,
        .markdown-editor .md-list-number {
          color: #f59e0b; /* amber-500 */
          font-weight: 600;
        }
        .markdown-editor .md-hr {
          color: #6b7280; /* gray-500 */
        }
        .markdown-editor .md-blockquote {
          color: #6366f1; /* indigo-500 */
        }

        /* Dark mode adjustments */
        .dark .markdown-editor .md-header {
          color: #60a5fa; /* blue-400 */
        }
        .dark .markdown-editor .md-code-block {
          color: #34d399; /* emerald-400 */
          background-color: rgba(52, 211, 153, 0.15);
        }
        .dark .markdown-editor .md-inline-code {
          color: #fb923c; /* orange-400 */
          background-color: rgba(251, 146, 60, 0.15);
        }
        .dark .markdown-editor .md-bold {
          color: #a78bfa; /* violet-400 */
        }
        .dark .markdown-editor .md-italic {
          color: #f472b6; /* pink-400 */
        }
        .dark .markdown-editor .md-link {
          color: #38bdf8; /* sky-400 */
        }
        .dark .markdown-editor .md-checkbox,
        .dark .markdown-editor .md-checkbox-checked {
          color: #4ade80; /* green-400 */
        }
        .dark .markdown-editor .md-list-bullet,
        .dark .markdown-editor .md-list-number {
          color: #fbbf24; /* amber-400 */
        }
        .dark .markdown-editor .md-hr {
          color: #9ca3af; /* gray-400 */
        }
        .dark .markdown-editor .md-blockquote {
          color: #818cf8; /* indigo-400 */
        }
      `}</style>
    </div>
  );
});

function generateHighlightedHtml(text: string): string {
  if (!text) return '';

  // Escape HTML first
  let html = escapeHtml(text);

  // Apply highlighting patterns
  // Process code blocks first to prevent other patterns from matching inside
  html = html.replace(/(```[\s\S]*?```)/g, (match) => {
    return `<span class="md-code-block">${match}</span>`;
  });

  // Headers
  html = html.replace(/^(#{1,6}\s.*)$/gm, '<span class="md-header">$1</span>');

  // Inline code (not inside code blocks)
  html = html.replace(/(?<!<span class="md-code-block">.*?)(`[^`\n]+`)(?![^<]*<\/span>)/g, '<span class="md-inline-code">$1</span>');

  // Bold
  html = html.replace(/(\*\*[^*]+\*\*)/g, '<span class="md-bold">$1</span>');

  // Italic (careful not to match bold)
  html = html.replace(/(?<!\*)(\*[^*]+\*)(?!\*)/g, '<span class="md-italic">$1</span>');

  // Links
  html = html.replace(/(\[[^\]]+\]\([^)]+\))/g, '<span class="md-link">$1</span>');

  // Checkboxes
  html = html.replace(/(^\s*\[\s*\]\s)/gm, '<span class="md-checkbox">$1</span>');
  html = html.replace(/(^\s*\[x\]\s)/gim, '<span class="md-checkbox-checked">$1</span>');

  // List items
  html = html.replace(/^([-*]\s)/gm, '<span class="md-list-bullet">$1</span>');
  html = html.replace(/^(\d+\.\s)/gm, '<span class="md-list-number">$1</span>');

  // Horizontal rule
  html = html.replace(/^(---)$/gm, '<span class="md-hr">$1</span>');

  // Blockquotes
  html = html.replace(/^(>\s)/gm, '<span class="md-blockquote">$1</span>');

  return html;
}

function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

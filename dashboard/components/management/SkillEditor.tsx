'use client';

import { useState, useEffect, useCallback } from 'react';

interface SkillEditorProps {
  initialContent?: string;
  skillName?: string;
  onSave: (name: string, content: string) => Promise<void>;
  onCancel: () => void;
  isNew?: boolean;
}

export function SkillEditor({ initialContent = '', skillName = '', onSave, onCancel, isNew = false }: SkillEditorProps) {
  const [name, setName] = useState(skillName);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Character count
  const charCount = content.length;
  const MAX_CHARS = 100000;

  // Handle save
  const handleSave = async () => {
    if (isNew && !name.trim()) {
      setError('Skill name is required');
      return;
    }

    if (!content.trim()) {
      setError('Skill content is required');
      return;
    }

    if (charCount > MAX_CHARS) {
      setError(`Content exceeds maximum length of ${MAX_CHARS.toLocaleString()} characters`);
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await onSave(name, content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  // Insert template
  const insertTemplate = useCallback(() => {
    const template = `# Skill: ${name || 'New Skill'}

## When to Apply
Apply this skill when...

## Guidelines

### 1. First Guideline
Description of the guideline.

\`\`\`typescript
// Example code
\`\`\`

### 2. Second Guideline
Another guideline.

## Common Mistakes to Avoid

1. **Mistake 1** - Description
2. **Mistake 2** - Description

## Examples

### Good Example
\`\`\`typescript
// Good code example
\`\`\`

### Bad Example
\`\`\`typescript
// Bad code example
\`\`\`
`;
    setContent(template);
  }, [name]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, content]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 flex-1">
          {isNew ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter skill name..."
              className="text-lg font-semibold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 outline-none px-1 py-1 text-gray-900 dark:text-white min-w-[200px]"
            />
          ) : (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {skillName || 'Edit Skill'}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${charCount > MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showPreview
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <div className="h-full overflow-auto p-4">
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownPreview content={content} />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              {isNew && !content && (
                <button
                  onClick={insertTemplate}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  Insert Template
                </button>
              )}
              <span className="text-xs text-gray-400">
                Supports Markdown. Use Cmd/Ctrl+S to save.
              </span>
            </div>

            {/* Editor */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your skill content in Markdown..."
              className="flex-1 w-full p-4 font-mono text-sm bg-transparent resize-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Skill
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Simple markdown preview component
function MarkdownPreview({ content }: { content: string }) {
  // Basic markdown rendering
  const renderMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let key = 0;
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLanguage = '';

    for (const line of lines) {
      // Code block handling
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.slice(3).trim();
          codeContent = [];
        } else {
          elements.push(
            <pre key={key++} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
              <code className={`language-${codeLanguage}`}>
                {codeContent.join('\n')}
              </code>
            </pre>
          );
          inCodeBlock = false;
          codeContent = [];
          codeLanguage = '';
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(<h1 key={key++} className="text-2xl font-bold mt-6 mb-4">{line.slice(2)}</h1>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={key++} className="text-xl font-bold mt-5 mb-3">{line.slice(3)}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={key++} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>);
      } else if (line.startsWith('#### ')) {
        elements.push(<h4 key={key++} className="text-base font-semibold mt-3 mb-2">{line.slice(5)}</h4>);
      }
      // Bullet points
      else if (line.match(/^[-*]\s/)) {
        elements.push(<li key={key++} className="ml-4">{renderInline(line.slice(2))}</li>);
      }
      // Numbered lists
      else if (line.match(/^\d+\.\s/)) {
        const content = line.replace(/^\d+\.\s/, '');
        elements.push(<li key={key++} className="ml-4 list-decimal">{renderInline(content)}</li>);
      }
      // Empty line
      else if (line.trim() === '') {
        elements.push(<br key={key++} />);
      }
      // Regular paragraph
      else {
        elements.push(<p key={key++} className="my-2">{renderInline(line)}</p>);
      }
    }

    return elements;
  };

  // Render inline markdown (bold, italic, code, links)
  const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Inline code
      const codeMatch = remaining.match(/`([^`]+)`/);
      if (codeMatch && codeMatch.index !== undefined) {
        if (codeMatch.index > 0) {
          parts.push(<span key={key++}>{renderBoldItalic(remaining.slice(0, codeMatch.index))}</span>);
        }
        parts.push(
          <code key={key++} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
        continue;
      }

      // No more inline code, render rest with bold/italic
      parts.push(<span key={key++}>{renderBoldItalic(remaining)}</span>);
      break;
    }

    return parts;
  };

  // Render bold and italic
  const renderBoldItalic = (text: string): React.ReactNode => {
    // Bold: **text**
    const boldPattern = /\*\*([^*]+)\*\*/g;
    const parts = text.split(boldPattern);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index}>{part}</strong>;
      }
      return part;
    });
  };

  return <div className="markdown-preview">{renderMarkdown(content)}</div>;
}

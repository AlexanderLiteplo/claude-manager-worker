'use client';

import { useState, useCallback } from 'react';
import { PRDPreview } from './PRDPreview';

interface PRDEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

type ViewMode = 'preview' | 'edit' | 'split';

export function PRDEditor({ content, onChange, readOnly = false }: PRDEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [editContent, setEditContent] = useState(content);

  // Sync edit content when content prop changes (from refinement)
  if (content !== editContent && viewMode !== 'edit') {
    setEditContent(content);
  }

  const handleContentChange = useCallback((newContent: string) => {
    setEditContent(newContent);
  }, []);

  const handleApplyChanges = useCallback(() => {
    onChange(editContent);
  }, [onChange, editContent]);

  const handleCancelChanges = useCallback(() => {
    setEditContent(content);
    setViewMode('preview');
  }, [content]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [content]);

  // Download as markdown file
  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Extract title from content for filename
    const titleMatch = content.match(/^#\s+PRD:\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'prd';
    const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.download = `${sanitizedTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  return (
    <div className="flex flex-col h-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
          <ViewModeButton
            active={viewMode === 'preview'}
            onClick={() => setViewMode('preview')}
            icon={<EyeIcon />}
            label="Preview"
          />
          {!readOnly && (
            <>
              <ViewModeButton
                active={viewMode === 'split'}
                onClick={() => setViewMode('split')}
                icon={<SplitIcon />}
                label="Split"
              />
              <ViewModeButton
                active={viewMode === 'edit'}
                onClick={() => setViewMode('edit')}
                icon={<EditIcon />}
                label="Edit"
              />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Copy to clipboard"
          >
            <CopyIcon />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Download as .md"
          >
            <DownloadIcon />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'preview' && (
          <div className="h-full overflow-y-auto p-4 sm:p-6">
            <PRDPreview content={content} />
          </div>
        )}

        {viewMode === 'edit' && (
          <div className="h-full flex flex-col">
            <textarea
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="flex-1 w-full p-4 sm:p-6 font-mono text-sm resize-none
                bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                focus:outline-none"
              placeholder="Write your PRD here..."
            />
            {editContent !== content && (
              <div className="flex items-center justify-end gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
                <span className="text-sm text-yellow-700 dark:text-yellow-300 mr-auto">Unsaved changes</span>
                <button
                  onClick={handleCancelChanges}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyChanges}
                  className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Apply Changes
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'split' && (
          <div className="h-full flex">
            <div className="w-1/2 h-full border-r border-gray-200 dark:border-gray-700 flex flex-col">
              <textarea
                value={editContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="flex-1 w-full p-4 font-mono text-sm resize-none
                  bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                  focus:outline-none"
                placeholder="Write your PRD here..."
              />
              {editContent !== content && (
                <div className="flex items-center justify-end gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
                  <button
                    onClick={handleCancelChanges}
                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyChanges}
                    className="px-2 py-1 text-xs bg-yellow-500 text-white rounded"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
            <div className="w-1/2 h-full overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800/50">
              <PRDPreview content={editContent} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// View mode button component
function ViewModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors
        ${active
          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// Icons
function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

'use client';

import React, { useState, useEffect } from 'react';

interface PRD {
  id: string;
  filename: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  estimatedIterations: number;
  path?: string;
}

interface PrdReviewCardProps {
  prd: PRD;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSave?: (content: string) => Promise<void>;
}

export function PrdReviewCard({
  prd,
  isEditing = false,
  onStartEdit,
  onCancelEdit,
  onSave,
}: PrdReviewCardProps) {
  const [editContent, setEditContent] = useState(prd.content);
  const [isSaving, setIsSaving] = useState(false);

  // Reset edit content when PRD changes
  useEffect(() => {
    setEditContent(prd.content);
  }, [prd.content, prd.id]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(editContent);
    } finally {
      setIsSaving(false);
    }
  };

  // Simple markdown rendering for preview
  const renderMarkdown = (content: string) => {
    // Split into lines and process
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let currentList: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = '';

    const flushList = () => {
      if (currentList.length > 0 && listType) {
        const ListTag = listType === 'ul' ? 'ul' : 'ol';
        elements.push(
          <ListTag key={elements.length} className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} list-inside mb-3 space-y-1`}>
            {currentList.map((item, i) => (
              <li key={i} className="text-gray-700 dark:text-gray-300">{item}</li>
            ))}
          </ListTag>
        );
        currentList = [];
        listType = null;
      }
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <pre key={elements.length} className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
            <code className="text-sm text-gray-800 dark:text-gray-200">{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        codeBlockLang = '';
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block handling
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
          codeBlockLang = line.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Headers
      if (line.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={i} className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-6 first:mt-0">
            {line.slice(2)}
          </h1>
        );
        continue;
      }

      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={i} className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-5">
            {line.slice(3)}
          </h2>
        );
        continue;
      }

      if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={i} className="text-lg font-medium text-gray-900 dark:text-white mb-2 mt-4">
            {line.slice(4)}
          </h3>
        );
        continue;
      }

      // Unordered list items
      if (line.match(/^[-*] /)) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        currentList.push(line.slice(2));
        continue;
      }

      // Checkbox items
      if (line.match(/^- \[[ x]\] /)) {
        flushList();
        const checked = line[3] === 'x';
        const text = line.slice(6);
        elements.push(
          <div key={i} className="flex items-start gap-2 mb-1">
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="mt-1 rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-gray-700 dark:text-gray-300">{text}</span>
          </div>
        );
        continue;
      }

      // Ordered list items
      if (line.match(/^\d+\. /)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        currentList.push(line.replace(/^\d+\. /, ''));
        continue;
      }

      // Horizontal rule
      if (line.match(/^---+$/)) {
        flushList();
        elements.push(<hr key={i} className="my-6 border-gray-200 dark:border-gray-700" />);
        continue;
      }

      // Empty lines
      if (line.trim() === '') {
        flushList();
        continue;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={i} className="text-gray-700 dark:text-gray-300 mb-3">
          {line}
        </p>
      );
    }

    flushList();
    flushCodeBlock();

    return elements;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {prd.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {prd.filename}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {prd.dependencies.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              Depends on: {prd.dependencies.join(', ')}
            </span>
          )}
          {!isEditing && onStartEdit && (
            <button
              onClick={onStartEdit}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit PRD"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      {isEditing ? (
        <div className="flex-1 flex flex-col gap-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="flex-1 w-full p-4 text-sm font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="PRD content..."
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`
                px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
                ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-500 hover:bg-purple-600'}
              `}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
          {renderMarkdown(prd.content)}
        </div>
      )}
    </div>
  );
}

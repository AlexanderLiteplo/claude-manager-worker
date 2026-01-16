'use client';

import { useMemo } from 'react';

interface PRDPreviewProps {
  content: string;
  className?: string;
}

// Simple markdown rendering without external dependencies
export function PRDPreview({ content, className = '' }: PRDPreviewProps) {
  const renderedContent = useMemo(() => {
    return renderMarkdown(content);
  }, [content]);

  return (
    <div className={`prd-preview prose prose-sm sm:prose dark:prose-invert max-w-none ${className}`}>
      <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
    </div>
  );
}

// Simple markdown renderer
function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = escapeHtml(text);

  // Headers (must be processed before other patterns)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# PRD: (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 dark:text-white border-b pb-2 mb-4">$1</h1>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Code blocks (triple backticks)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4"><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Checkboxes
  html = html.replace(/^\s*\[\s*\]\s*(.+)$/gm, '<div class="flex items-start gap-2 my-1"><input type="checkbox" disabled class="mt-1 rounded border-gray-300" /><span>$1</span></div>');
  html = html.replace(/^\s*\[x\]\s*(.+)$/gim, '<div class="flex items-start gap-2 my-1"><input type="checkbox" checked disabled class="mt-1 rounded border-gray-300" /><span class="line-through text-gray-500">$1</span></div>');

  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li class="ml-4">$1</li>');

  // Numbered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Wrap consecutive list items in ul/ol tags
  html = html.replace(/((?:<li class="ml-4">.*<\/li>\n?)+)/g, '<ul class="list-disc my-2">$1</ul>');
  html = html.replace(/((?:<li class="ml-4 list-decimal">.*<\/li>\n?)+)/g, '<ol class="list-decimal my-2">$1</ol>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-6 border-gray-300 dark:border-gray-600" />');

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4">$1</blockquote>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Paragraphs (lines that don't start with html tags)
  html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p class="my-2">$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p class="my-2"><\/p>/g, '');

  // Clean up nested paragraphs
  html = html.replace(/<p class="my-2">(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');

  return html;
}

// Escape HTML entities to prevent XSS
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };
  return text.replace(/[&<>]/g, char => htmlEntities[char] || char);
}

// Revert HTML entities for code blocks (they were escaped)
// This is a workaround for the simple markdown renderer

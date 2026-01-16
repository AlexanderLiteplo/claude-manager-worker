'use client';

import { useState, useEffect, memo } from 'react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
}

// Simple markdown-like rendering for code blocks and basic formatting
function renderContent(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let keyIndex = 0;

  // Match code blocks (```language\ncode\n```)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > currentIndex) {
      const textBefore = content.slice(currentIndex, match.index);
      parts.push(
        <span key={keyIndex++} className="whitespace-pre-wrap">
          {renderInlineFormatting(textBefore)}
        </span>
      );
    }

    // Add code block
    const language = match[1] || 'plaintext';
    const code = match[2];
    parts.push(
      <div key={keyIndex++} className="my-3 rounded-lg overflow-hidden bg-gray-900 dark:bg-gray-950">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-mono">{language}</span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Copy
          </button>
        </div>
        <pre className="p-4 overflow-x-auto text-sm">
          <code className="text-green-400 font-mono">{code}</code>
        </pre>
      </div>
    );

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < content.length) {
    const remainingText = content.slice(currentIndex);
    parts.push(
      <span key={keyIndex++} className="whitespace-pre-wrap">
        {renderInlineFormatting(remainingText)}
      </span>
    );
  }

  return parts;
}

// Handle inline formatting like **bold** and `code`
function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  // Match inline code first
  const inlineCodeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    // Add text before inline code
    if (match.index > lastIndex) {
      parts.push(<span key={keyIndex++}>{text.slice(lastIndex, match.index)}</span>);
    }
    // Add inline code
    parts.push(
      <code
        key={keyIndex++}
        className="px-1.5 py-0.5 mx-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-sm text-pink-600 dark:text-pink-400"
      >
        {match[1]}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={keyIndex++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [text];
}

// Format timestamp to relative time
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function MessageBubbleComponent({ role, content, timestamp, isStreaming }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [displayContent, setDisplayContent] = useState(content);

  // Update content when it changes (for streaming)
  useEffect(() => {
    setDisplayContent(content);
  }, [content]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4`}>
      <div
        className={`max-w-[90%] sm:max-w-[85%] rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm sm:rounded-br-md'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm sm:rounded-bl-md'
        }`}
      >
        {/* Role indicator */}
        <div className={`flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] sm:text-xs font-medium ${isUser ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
            {isUser ? 'You' : 'Claude'}
          </span>
          {timestamp && (
            <span className={`text-[10px] sm:text-xs ${isUser ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>

        {/* Message content */}
        <div className={`text-xs sm:text-sm leading-relaxed ${isUser ? 'text-white' : ''}`}>
          {renderContent(displayContent)}
        </div>

        {/* Streaming indicator */}
        {isStreaming && !isUser && (
          <div className="flex items-center gap-1 mt-1.5 sm:mt-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse" />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

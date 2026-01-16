'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface AICommandInputProps {
  onCommand: (command: string) => void;
  isProcessing: boolean;
  selectedText: string | null;
  commandHistory: string[];
}

// Example commands to show users
const EXAMPLE_COMMANDS = [
  { label: 'no', description: 'Reject the suggestion' },
  { label: 'yes', description: 'Accept the suggestion' },
  { label: 'undo', description: 'Undo the last change' },
  { label: 'add section about X', description: 'Add a new section' },
  { label: 'remove the part about Y', description: 'Remove content' },
  { label: 'change X to Y', description: 'Replace content' },
  { label: 'make this more detailed', description: 'Expand content' },
  { label: 'simplify', description: 'Make content simpler' },
  { label: 'fix grammar', description: 'Proofread the content' },
  { label: 'reorganize this section', description: 'Restructure for clarity' },
  { label: 'rewrite', description: 'Completely rewrite content' },
  { label: 'improve list items', description: 'Make lists actionable' },
  { label: 'fill in placeholder content', description: 'Complete [placeholders]' },
  { label: 'add acceptance criteria', description: 'Add AC section' },
];

// Commands specifically for when text is selected
const SELECTION_COMMANDS = [
  { label: 'expand this', description: 'Add more detail' },
  { label: 'simplify this', description: 'Make more concise' },
  { label: 'rewrite this', description: 'Reformulate content' },
  { label: 'improve this', description: 'Enhance quality' },
  { label: 'make more specific', description: 'Add concrete details' },
  { label: 'fix grammar', description: 'Correct errors' },
];

export function AICommandInput({
  onCommand,
  isProcessing,
  selectedText,
  commandHistory,
}: AICommandInputProps) {
  const [command, setCommand] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input and selection state
  const baseCommands = selectedText ? SELECTION_COMMANDS : EXAMPLE_COMMANDS;
  const suggestions = command.length > 0
    ? baseCommands.filter(cmd =>
        cmd.label.toLowerCase().includes(command.toLowerCase())
      )
    : baseCommands;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !isProcessing) {
      onCommand(command.trim());
      setCommand('');
      setHistoryIndex(-1);
      setShowSuggestions(false);
    }
  }, [command, isProcessing, onCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Arrow up to go back in history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1
          ? historyIndex + 1
          : historyIndex;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    }
    // Arrow down to go forward in history
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
    // Tab to autocomplete
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      setCommand(suggestions[0].label);
    }
    // Escape to clear
    if (e.key === 'Escape') {
      setCommand('');
      setShowSuggestions(false);
      setHistoryIndex(-1);
    }
  }, [commandHistory, historyIndex, suggestions]);

  const handleSelectSuggestion = useCallback((suggestion: string) => {
    setCommand(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  // Focus input on "/" key press
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="relative px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <span className="text-gray-400">
              {isProcessing ? (
                <LoadingSpinner />
              ) : (
                <CommandIcon />
              )}
            </span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => {
              setCommand(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={selectedText
              ? `Describe changes to selected text: "${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"`
              : 'Type a command... (e.g., "add section about authentication", "make this more detailed")'
            }
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isProcessing}
          />

          {/* Suggestions dropdown */}
          {showSuggestions && !isProcessing && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion.label)}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {suggestion.label}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {suggestion.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!command.trim() || isProcessing}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {isProcessing ? (
            <>
              <LoadingSpinner />
              Processing...
            </>
          ) : (
            <>
              <ApplyIcon />
              Apply
            </>
          )}
        </button>
      </form>

      {/* Quick command buttons */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedText ? 'Selection commands:' : 'Quick commands:'}
        </span>
        {selectedText ? (
          <>
            <QuickCommandButton onClick={() => onCommand('expand this')}>
              Expand
            </QuickCommandButton>
            <QuickCommandButton onClick={() => onCommand('simplify this')}>
              Simplify
            </QuickCommandButton>
            <QuickCommandButton onClick={() => onCommand('rewrite this')}>
              Rewrite
            </QuickCommandButton>
            <QuickCommandButton onClick={() => onCommand('improve this')}>
              Improve
            </QuickCommandButton>
            <QuickCommandButton onClick={() => onCommand('make more specific')}>
              More Specific
            </QuickCommandButton>
            <QuickCommandButton onClick={() => onCommand('fix grammar')}>
              Fix Grammar
            </QuickCommandButton>
          </>
        ) : (
          <>
            <QuickCommandButton onClick={() => onCommand('fix grammar')}>
              Fix Grammar
            </QuickCommandButton>
            <QuickCommandButton onClick={() => onCommand('make this more detailed')}>
              Expand
            </QuickCommandButton>
            <QuickCommandButton onClick={() => onCommand('simplify')}>
              Simplify
            </QuickCommandButton>
            <QuickCommandButton onClick={() => onCommand('add acceptance criteria section')}>
              + Criteria
            </QuickCommandButton>
            <QuickCommandButton onClick={() => onCommand('fill in placeholder content')}>
              Fill Placeholders
            </QuickCommandButton>
          </>
        )}
        <span className="ml-auto text-xs text-gray-400">
          Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">/</kbd> to focus
        </span>
      </div>
    </div>
  );
}

function QuickCommandButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    >
      {children}
    </button>
  );
}

// Icons
function CommandIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function ApplyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

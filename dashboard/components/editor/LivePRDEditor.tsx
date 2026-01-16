'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { PRDPreview } from '../prd/PRDPreview';
import { AICommandInput } from './AICommandInput';
import { DiffLine } from './DiffViewer';
import { SuggestionPanel, Suggestion, generateSmartSuggestions } from './SuggestionPanel';
import { MarkdownEditor, MarkdownEditorRef } from './MarkdownEditor';

interface LivePRDEditorProps {
  initialContent: string;
  instanceId: string;
  prdFile: string;
  onSave: (content: string, message: string) => Promise<void>;
  onContentChange?: (content: string) => void;
}

export function LivePRDEditor({
  initialContent,
  instanceId,
  prdFile,
  onSave,
  onContentChange,
}: LivePRDEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [editContent, setEditContent] = useState(initialContent);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<Suggestion | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<Array<{ command: string; description: string; section?: string }>>([]);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const suggestionIdCounter = useRef(0);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(content !== initialContent);
  }, [content, initialContent]);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const key = `prd-autosave-${instanceId}-${prdFile}`;

    // Load autosaved content if exists
    const autosaved = localStorage.getItem(key);
    if (autosaved) {
      const { content: savedContent, timestamp } = JSON.parse(autosaved);
      const savedTime = new Date(timestamp);
      const timeDiff = Date.now() - savedTime.getTime();

      // Only use autosaved content if it's less than 24 hours old
      if (timeDiff < 24 * 60 * 60 * 1000 && savedContent !== initialContent) {
        if (window.confirm('Found autosaved changes. Would you like to restore them?')) {
          setContent(savedContent);
          setEditContent(savedContent);
        } else {
          localStorage.removeItem(key);
        }
      }
    }

    // Save periodically
    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        localStorage.setItem(key, JSON.stringify({
          content,
          timestamp: new Date().toISOString(),
        }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [instanceId, prdFile, content, hasUnsavedChanges, initialContent]);

  // Track selection in textarea and generate smart suggestions
  const handleSelect = useCallback(() => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        const newSelection = { start, end };
        setSelection(newSelection);
        // Generate smart suggestions based on selection
        const suggestions = generateSmartSuggestions(editContent, newSelection);
        setSmartSuggestions(suggestions);
        setShowSmartSuggestions(suggestions.length > 0);
      } else {
        setSelection(null);
        setShowSmartSuggestions(false);
      }
    }
  }, [editContent]);

  // Handle content change from textarea
  const handleContentChange = useCallback((newContent: string) => {
    setEditContent(newContent);
    setContent(newContent);
    onContentChange?.(newContent);
  }, [onContentChange]);

  // Process AI command
  const handleCommand = useCallback(async (command: string) => {
    setIsProcessing(true);
    setError(null);

    // Handle simple commands
    const lowerCommand = command.toLowerCase().trim();

    if (lowerCommand === 'no' && pendingSuggestion) {
      // Reject suggestion
      setPendingSuggestion(null);
      setIsProcessing(false);
      return;
    }

    if (lowerCommand === 'yes' && pendingSuggestion) {
      // Accept suggestion
      setUndoStack(prev => [...prev, content]);
      setContent(pendingSuggestion.suggestedContent);
      setEditContent(pendingSuggestion.suggestedContent);
      setPendingSuggestion(null);
      setCommandHistory(prev => [...prev, `Applied: ${command}`]);
      setIsProcessing(false);
      onContentChange?.(pendingSuggestion.suggestedContent);
      return;
    }

    if (lowerCommand === 'undo' && undoStack.length > 0) {
      const previousContent = undoStack[undoStack.length - 1];
      setUndoStack(prev => prev.slice(0, -1));
      setContent(previousContent);
      setEditContent(previousContent);
      setCommandHistory(prev => [...prev, 'Undo']);
      setIsProcessing(false);
      onContentChange?.(previousContent);
      return;
    }

    try {
      const response = await fetch('/api/editor/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          prdFile,
          currentContent: content,
          command,
          selection: selection || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process command');
      }

      const result = await response.json();

      // Create a proper Suggestion object
      suggestionIdCounter.current += 1;
      const newSuggestion: Suggestion = {
        id: `suggestion-${suggestionIdCounter.current}-${Date.now()}`,
        type: selection ? 'context-aware' : 'ai-command',
        command,
        originalContent: content,
        suggestedContent: result.updatedContent,
        explanation: result.explanation,
        diff: result.changes,
        section: selection ? 'Selected text' : undefined,
        timestamp: new Date(),
      };

      setPendingSuggestion(newSuggestion);
      setCommandHistory(prev => [...prev, command]);
      setShowSmartSuggestions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [content, instanceId, prdFile, selection, pendingSuggestion, undoStack, onContentChange]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const message = commandHistory.length > 0
        ? commandHistory.slice(-3).join(', ')
        : 'Manual save';
      await onSave(content, message);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // Clear autosave
      localStorage.removeItem(`prd-autosave-${instanceId}-${prdFile}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [content, commandHistory, onSave, instanceId, prdFile]);

  // Accept suggestion
  const handleAcceptSuggestion = useCallback(() => {
    if (pendingSuggestion) {
      setUndoStack(prev => [...prev, content]);
      setContent(pendingSuggestion.suggestedContent);
      setEditContent(pendingSuggestion.suggestedContent);
      setPendingSuggestion(null);
      onContentChange?.(pendingSuggestion.suggestedContent);
    }
  }, [pendingSuggestion, content, onContentChange]);

  // Reject suggestion
  const handleRejectSuggestion = useCallback(() => {
    setPendingSuggestion(null);
  }, []);

  // Refine suggestion - send a follow-up command based on current suggestion
  const handleRefineSuggestion = useCallback(async (refinement: string) => {
    if (!pendingSuggestion) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Use the suggested content as the base and apply refinement
      const response = await fetch('/api/editor/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          prdFile,
          currentContent: pendingSuggestion.suggestedContent,
          command: refinement,
          previousCommand: pendingSuggestion.command,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refine suggestion');
      }

      const result = await response.json();

      // Update the pending suggestion with refined content
      suggestionIdCounter.current += 1;
      const refinedSuggestion: Suggestion = {
        id: `suggestion-${suggestionIdCounter.current}-${Date.now()}`,
        type: 'ai-command',
        command: `${pendingSuggestion.command} → ${refinement}`,
        originalContent: pendingSuggestion.originalContent,
        suggestedContent: result.updatedContent,
        explanation: result.explanation,
        diff: result.changes,
        timestamp: new Date(),
      };

      setPendingSuggestion(refinedSuggestion);
      setCommandHistory(prev => [...prev, `Refined: ${refinement}`]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine suggestion');
    } finally {
      setIsProcessing(false);
    }
  }, [pendingSuggestion, instanceId, prdFile]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [content]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Cmd/Ctrl + Z to undo (when not in textarea)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && document.activeElement !== textareaRef.current) {
        e.preventDefault();
        if (undoStack.length > 0) {
          handleCommand('undo');
        }
      }
      // Escape to reject suggestion
      if (e.key === 'Escape' && pendingSuggestion) {
        handleRejectSuggestion();
      }
      // Enter to accept suggestion (when shift is held)
      if (e.key === 'Enter' && e.shiftKey && pendingSuggestion) {
        e.preventDefault();
        handleAcceptSuggestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, undoStack, handleCommand, pendingSuggestion, handleRejectSuggestion, handleAcceptSuggestion]);

  // Get selected text
  const selectedText = useMemo(() => {
    if (selection && textareaRef.current) {
      return editContent.substring(selection.start, selection.end);
    }
    return null;
  }, [selection, editContent]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ✏️ Editing: {prdFile}
          </span>
          {hasUnsavedChanges && (
            <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
              Unsaved changes
            </span>
          )}
          {lastSaved && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Copy to clipboard"
          >
            <CopyIcon />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* AI Command Input */}
      <AICommandInput
        onCommand={handleCommand}
        isProcessing={isProcessing}
        selectedText={selectedText}
        commandHistory={commandHistory}
      />

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Smart Suggestions (when text is selected) */}
      {showSmartSuggestions && smartSuggestions.length > 0 && !pendingSuggestion && (
        <div className="mx-4 mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              💡 Smart Suggestions for Selection
            </h4>
            <button
              onClick={() => setShowSmartSuggestions(false)}
              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {smartSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleCommand(suggestion.command)}
                disabled={isProcessing}
                className="px-3 py-1.5 text-sm bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800/60 transition-colors disabled:opacity-50"
                title={suggestion.description}
              >
                {suggestion.section && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 mr-1">
                    [{suggestion.section}]
                  </span>
                )}
                {suggestion.command}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pending Suggestion Panel */}
      <SuggestionPanel
        suggestion={pendingSuggestion}
        selectedText={selectedText}
        onAccept={handleAcceptSuggestion}
        onReject={handleRejectSuggestion}
        onRefine={handleRefineSuggestion}
        isProcessing={isProcessing}
      />

      {/* Split Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Markdown Source */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-750 text-sm font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            Markdown Source
          </div>
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => handleContentChange(e.target.value)}
            onSelect={handleSelect}
            className="flex-1 w-full p-4 font-mono text-sm resize-none
              bg-white dark:bg-gray-900 text-gray-900 dark:text-white
              focus:outline-none"
            placeholder="Write your PRD here..."
            spellCheck={false}
          />
        </div>

        {/* Live Preview */}
        <div className="w-1/2 flex flex-col">
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-750 text-sm font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            Live Preview
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800/50">
            <PRDPreview content={editContent} />
          </div>
        </div>
      </div>

      {/* Footer with keyboard shortcuts */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex gap-4">
        <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">⌘S</kbd> Save</span>
        <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">⌘Z</kbd> Undo</span>
        <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> Reject suggestion</span>
        <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">⇧↵</kbd> Accept suggestion</span>
      </div>
    </div>
  );
}

// Icons
function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

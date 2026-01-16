'use client';

import { useState, useCallback, useEffect } from 'react';
import { DiffViewer, DiffLine } from './DiffViewer';

interface BatchEditResult {
  prdFile: string;
  success: boolean;
  updatedContent?: string;
  changes?: DiffLine[];
  explanation?: string;
  error?: string;
  version?: string;
}

interface BatchPRDEditorProps {
  instanceId: string;
  prdFiles: string[];
  onClose: () => void;
  onComplete?: (results: BatchEditResult[]) => void;
}

// Common batch commands
const BATCH_COMMANDS = [
  { label: 'Standardize headers', command: 'standardize headers', description: 'Make all section headers consistent' },
  { label: 'Add acceptance criteria', command: 'add acceptance criteria template', description: 'Add AC section if missing' },
  { label: 'Fix formatting', command: 'fix formatting', description: 'Fix markdown formatting issues' },
  { label: 'Add out of scope section', command: 'add out of scope section', description: 'Add out of scope if missing' },
  { label: 'Update terminology', command: 'update terminology:', description: 'Replace terms across all docs' },
  { label: 'Add timestamps', command: 'add timestamp to all', description: 'Add timestamp or date section' },
  { label: 'Fill placeholders', command: 'fill in placeholder content', description: 'Complete [placeholder] sections' },
];

export function BatchPRDEditor({
  instanceId,
  prdFiles,
  onClose,
  onComplete,
}: BatchPRDEditorProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(prdFiles));
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BatchEditResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const toggleFile = useCallback((file: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedFiles(new Set(prdFiles));
  }, [prdFiles]);

  const selectNone = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || selectedFiles.size === 0) return;

    setIsProcessing(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/editor/batch-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          prdFiles: Array.from(selectedFiles),
          command: command.trim(),
          autoSave,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Batch edit failed');
      }

      const data = await response.json();
      setResults(data.results);
      onComplete?.(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  }, [command, selectedFiles, instanceId, autoSave, onComplete]);

  const handleQuickCommand = useCallback((cmd: string) => {
    setCommand(cmd);
  }, []);

  // Calculate summary stats
  const successCount = results?.filter(r => r.success).length ?? 0;
  const failCount = results?.filter(r => !r.success).length ?? 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              📝 Batch Edit PRDs
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Apply the same command to multiple PRD files at once
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!results ? (
            <>
              {/* File Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Select PRD Files ({selectedFiles.size}/{prdFiles.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-400">|</span>
                    <button
                      onClick={selectNone}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Select None
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {prdFiles.map((file) => (
                    <label
                      key={file}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedFiles.has(file)
                          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                          : 'bg-gray-50 dark:bg-gray-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file)}
                        onChange={() => toggleFile(file)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
                        {file}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quick Commands */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Quick Commands
                </h3>
                <div className="flex flex-wrap gap-2">
                  {BATCH_COMMANDS.map((cmd) => (
                    <button
                      key={cmd.command}
                      onClick={() => handleQuickCommand(cmd.command)}
                      className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title={cmd.description}
                    >
                      {cmd.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Command Input */}
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block font-medium text-gray-900 dark:text-white mb-2">
                    Command
                  </label>
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Enter command to apply to all selected PRDs..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing}
                  />
                </div>

                {/* Options */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                      disabled={isProcessing}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Auto-save changes (create new versions automatically)
                    </span>
                  </label>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isProcessing || selectedFiles.size === 0 || !command.trim()}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner />
                      Processing {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}...
                    </>
                  ) : (
                    <>
                      <ApplyIcon />
                      Apply to {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Results Display */
            <div>
              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Batch Edit Results
                </h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {successCount} successful
                    </span>
                  </div>
                  {failCount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {failCount} failed
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Individual Results */}
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.prdFile}
                    className={`rounded-lg border ${
                      result.success
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedResult(
                        expandedResult === result.prdFile ? null : result.prdFile
                      )}
                      className="w-full px-4 py-3 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                          {result.success ? '✓' : '✕'}
                        </span>
                        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                          {result.prdFile}
                        </span>
                        {result.version && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
                            v{result.version.substring(0, 8)}
                          </span>
                        )}
                      </div>
                      <ChevronIcon direction={expandedResult === result.prdFile ? 'down' : 'right'} />
                    </button>

                    {expandedResult === result.prdFile && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 mt-2 pt-3">
                        {result.success ? (
                          <>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {result.explanation}
                            </p>
                            {result.changes && result.changes.length > 0 && (
                              <DiffViewer diff={result.changes} maxLines={20} />
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Error: {result.error}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Back Button */}
              <button
                onClick={() => setResults(null)}
                className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                ← Edit Another Batch
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 text-xs text-gray-500 dark:text-gray-400">
          <span>Tip: Use specific commands for best results. Example: "add acceptance criteria section" or "update terminology: MVP to Minimum Viable Product"</span>
        </div>
      </div>
    </div>
  );
}

// Icons
function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

function ApplyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'right' | 'down' }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform text-gray-500 ${direction === 'down' ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

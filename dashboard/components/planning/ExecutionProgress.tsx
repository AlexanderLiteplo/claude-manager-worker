'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ExecutionState {
  status: 'idle' | 'starting' | 'running' | 'paused' | 'completed' | 'failed';
  startedAt?: string;
  workerModel?: string;
  managerModel?: string;
  maxIterations?: number;
  currentPrd?: string;
  currentIteration?: number;
  completedPrds?: string[];
  error?: string;
}

interface ExecutionProgressProps {
  instancePath: string;
  isVisible: boolean;
  onClose: () => void;
}

export function ExecutionProgress({
  instancePath,
  isVisible,
  onClose,
}: ExecutionProgressProps) {
  const [state, setState] = useState<ExecutionState>({ status: 'idle' });
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/planning/execute-plan?instancePath=${encodeURIComponent(instancePath)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.state) {
          setState(data.state);
        }
      }
    } catch (error) {
      console.error('Failed to fetch execution status:', error);
    }
  }, [instancePath]);

  // Poll for status updates
  useEffect(() => {
    if (isVisible) {
      fetchStatus();
      pollInterval.current = setInterval(fetchStatus, 3000);
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [isVisible, fetchStatus]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isVisible) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-500';
      case 'paused':
        return 'text-yellow-500';
      case 'completed':
        return 'text-blue-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-40">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={getStatusColor(state.status)}>
            {getStatusIcon(state.status)}
          </span>
          <span className="text-white font-medium capitalize">
            {state.status === 'idle' ? 'No Active Execution' : `Execution ${state.status}`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Status info */}
      {state.status !== 'idle' && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {state.currentPrd && (
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs uppercase">Current PRD</div>
                <div className="text-gray-900 dark:text-white font-medium truncate">
                  {state.currentPrd}
                </div>
              </div>
            )}
            {state.currentIteration !== undefined && (
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs uppercase">Iteration</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  #{state.currentIteration}
                </div>
              </div>
            )}
            {state.workerModel && (
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs uppercase">Worker</div>
                <div className="text-gray-900 dark:text-white font-medium capitalize">
                  {state.workerModel}
                </div>
              </div>
            )}
            {state.managerModel && (
              <div>
                <div className="text-gray-500 dark:text-gray-400 text-xs uppercase">Manager</div>
                <div className="text-gray-900 dark:text-white font-medium capitalize">
                  {state.managerModel}
                </div>
              </div>
            )}
            {state.startedAt && (
              <div className="col-span-2">
                <div className="text-gray-500 dark:text-gray-400 text-xs uppercase">Duration</div>
                <div className="text-gray-900 dark:text-white font-medium">
                  {formatDuration(state.startedAt)}
                </div>
              </div>
            )}
          </div>

          {/* Completed PRDs */}
          {state.completedPrds && state.completedPrds.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-2">
                Completed PRDs
              </div>
              <div className="flex flex-wrap gap-1">
                {state.completedPrds.map((prd, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded"
                  >
                    {prd}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error display */}
          {state.error && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              {state.error}
            </div>
          )}
        </div>
      )}

      {/* Logs (if any) */}
      {logs.length > 0 && (
        <div className="max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}

      {/* Actions */}
      {state.status === 'running' && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            className="flex-1 px-3 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded-lg transition-colors"
          >
            Pause
          </button>
          <button
            className="flex-1 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
}

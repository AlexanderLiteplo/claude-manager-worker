'use client';

import { useState, useCallback, useEffect } from 'react';
import { DiffViewer, computeDiff, DiffLine } from './DiffViewer';

export interface Version {
  id: string;
  timestamp: string;
  content: string;
  commitMessage: string;
  author: 'user' | 'ai-command';
}

interface VersionHistoryProps {
  instanceId: string;
  prdFile: string;
  currentContent: string;
  onRestore: (content: string) => void;
  onCompare?: (version: Version) => void;
}

export function VersionHistory({
  instanceId,
  prdFile,
  currentContent,
  onRestore,
  onCompare,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Fetch version history
  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const encodedInstanceId = encodeURIComponent(instanceId);
      const encodedPrdFile = encodeURIComponent(prdFile);
      const response = await fetch(`/api/editor/history/${encodedInstanceId}/${encodedPrdFile}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch history');
      }

      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [instanceId, prdFile]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Restore a version
  const handleRestore = useCallback(async (version: Version) => {
    setRestoring(true);
    try {
      const response = await fetch('/api/editor/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          prdFile,
          version: version.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore version');
      }

      const data = await response.json();
      onRestore(data.content);
      setSelectedVersion(null);
      await fetchVersions(); // Refresh history
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore');
    } finally {
      setRestoring(false);
    }
  }, [instanceId, prdFile, onRestore, fetchVersions]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Compute diff between selected version and current
  const versionDiff = selectedVersion
    ? computeDiff(selectedVersion.content, currentContent)
    : [];

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <LoadingSpinner />
        <span className="ml-2 text-gray-500">Loading history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>
        <button
          onClick={fetchVersions}
          className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-medium text-gray-900 dark:text-white">
          📚 Version History
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <p>No versions saved yet.</p>
            <p className="text-sm mt-1">Save your changes to create a version.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {versions.map((version, index) => (
              <VersionItem
                key={version.id}
                version={version}
                isLatest={index === 0}
                isSelected={selectedVersion?.id === version.id}
                formatTime={formatTime}
                onSelect={() => {
                  setSelectedVersion(selectedVersion?.id === version.id ? null : version);
                  setShowDiff(false);
                }}
                onRestore={() => handleRestore(version)}
                onShowDiff={() => {
                  setSelectedVersion(version);
                  setShowDiff(true);
                }}
                restoring={restoring}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected version details */}
      {selectedVersion && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {showDiff ? 'Diff from this version' : 'Version details'}
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiff(!showDiff)}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {showDiff ? 'Hide Diff' : 'Show Diff'}
              </button>
              <button
                onClick={() => handleRestore(selectedVersion)}
                disabled={restoring}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {restoring ? 'Restoring...' : 'Restore This Version'}
              </button>
            </div>
          </div>

          {showDiff && (
            <DiffViewer diff={versionDiff} maxLines={30} />
          )}

          {!showDiff && (
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p><strong>Message:</strong> {selectedVersion.commitMessage}</p>
              <p><strong>Author:</strong> {selectedVersion.author === 'ai-command' ? 'AI Assistant' : 'User'}</p>
              <p><strong>Time:</strong> {new Date(selectedVersion.timestamp).toLocaleString()}</p>
              <p><strong>Size:</strong> {selectedVersion.content.length.toLocaleString()} characters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VersionItem({
  version,
  isLatest,
  isSelected,
  formatTime,
  onSelect,
  onRestore,
  onShowDiff,
  restoring,
}: {
  version: Version;
  isLatest: boolean;
  isSelected: boolean;
  formatTime: (timestamp: string) => string;
  onSelect: () => void;
  onRestore: () => void;
  onShowDiff: () => void;
  restoring: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {version.id.substring(0, 8)}
            </span>
            {isLatest && (
              <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                Latest
              </span>
            )}
            {version.author === 'ai-command' && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                AI
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
            {version.commitMessage}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {formatTime(version.timestamp)}
          </p>
        </div>

        {isSelected && (
          <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onShowDiff}
              className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Show diff"
            >
              <DiffIcon />
            </button>
            <button
              onClick={onRestore}
              disabled={restoring || isLatest}
              className="p-1.5 text-gray-500 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Restore this version"
            >
              <RestoreIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
function LoadingSpinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function DiffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

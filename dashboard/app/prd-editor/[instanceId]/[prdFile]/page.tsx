'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LivePRDEditor } from '../../../../components/editor/LivePRDEditor';
import { VersionHistory } from '../../../../components/editor/VersionHistory';
import { useToast } from '../../../../components/ui/Toast';

type TabType = 'editor' | 'history';

export default function PRDEditorPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const instanceId = decodeURIComponent(params.instanceId as string);
  const prdFile = decodeURIComponent(params.prdFile as string);

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const [showHistory, setShowHistory] = useState(false);

  // Load PRD content
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to load from the PRDs directory
        const prdPath = `${instanceId}/prds/${prdFile}`;
        const response = await fetch(`/api/editor/load?path=${encodeURIComponent(prdPath)}`);

        if (!response.ok) {
          // If file doesn't exist, start with a template
          if (response.status === 404) {
            const templateContent = generateTemplate(prdFile);
            setContent(templateContent);
            return;
          }
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load PRD');
        }

        const data = await response.json();
        setContent(data.content);
      } catch (err) {
        // If loading fails, provide a starter template
        console.error('Load error:', err);
        const templateContent = generateTemplate(prdFile);
        setContent(templateContent);
      } finally {
        setLoading(false);
      }
    };

    if (instanceId && prdFile) {
      loadContent();
    }
  }, [instanceId, prdFile]);

  // Save handler
  const handleSave = useCallback(async (newContent: string, message: string) => {
    try {
      const response = await fetch('/api/editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: encodeURIComponent(instanceId),
          prdFile,
          content: newContent,
          commitMessage: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      const result = await response.json();
      toast.success('PRD saved', `Version ${result.version.substring(0, 8)} created`);
      setContent(newContent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      toast.error('Save failed', errorMessage);
      throw err;
    }
  }, [instanceId, prdFile, toast]);

  // Content change handler
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Restore version handler
  const handleRestore = useCallback((restoredContent: string) => {
    setContent(restoredContent);
    setActiveTab('editor');
    toast.success('Version restored', 'Content has been restored from the selected version');
  }, [toast]);

  // Back to dashboard
  const handleBack = () => {
    router.push('/');
  };

  // Extract instance name from path
  const instanceName = instanceId.split('/').pop() || 'Instance';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading PRD...</p>
        </div>
      </div>
    );
  }

  if (error && content === null) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <ErrorIcon />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load PRD
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                title="Back to Dashboard"
              >
                <BackIcon />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  PRD Editor
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {instanceName} / {prdFile}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Tab switcher */}
              <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'editor'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  ✏️ Editor
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'history'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  📚 History
                </button>
              </div>

              {/* Toggle history sidebar */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-lg transition-colors ${
                  showHistory
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title={showHistory ? 'Hide history panel' : 'Show history panel'}
              >
                <HistoryIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Editor/History view */}
        <div className={`flex-1 flex flex-col overflow-hidden ${showHistory ? 'border-r border-gray-200 dark:border-gray-700' : ''}`}>
          {activeTab === 'editor' && content !== null && (
            <LivePRDEditor
              initialContent={content}
              instanceId={encodeURIComponent(instanceId)}
              prdFile={prdFile}
              onSave={handleSave}
              onContentChange={handleContentChange}
            />
          )}

          {activeTab === 'history' && (
            <VersionHistory
              instanceId={encodeURIComponent(instanceId)}
              prdFile={prdFile}
              currentContent={content || ''}
              onRestore={handleRestore}
            />
          )}
        </div>

        {/* History sidebar (optional) */}
        {showHistory && activeTab === 'editor' && (
          <div className="w-80 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
            <VersionHistory
              instanceId={encodeURIComponent(instanceId)}
              prdFile={prdFile}
              currentContent={content || ''}
              onRestore={handleRestore}
            />
          </div>
        )}
      </main>
    </div>
  );
}

// Generate a template for new PRDs
function generateTemplate(filename: string): string {
  // Extract title from filename (e.g., "01_user_auth.md" -> "User Auth")
  const nameWithoutNumber = filename.replace(/^\d+_/, '').replace(/\.md$/, '');
  const title = nameWithoutNumber
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `# PRD: ${title}

## Overview
[Describe the feature or change at a high level]

## Goals
1. [Primary goal]
2. [Secondary goal]
3. [Additional goal]

## User Stories

### As a user, I want to:
1. [User story 1]
2. [User story 2]
3. [User story 3]

## Technical Requirements

### Architecture
[Describe the technical approach]

### API Endpoints
[List any new or modified API endpoints]

### Database Changes
[Describe any database schema changes]

## UI/UX Design
[Describe the user interface]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Out of Scope
- [What is NOT included in this PRD]

## Timeline
[Estimated phases/iterations]

## Open Questions
- [Question 1]
- [Question 2]
`;
}

// Icons
function LoadingSpinner() {
  return (
    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
  );
}

function ErrorIcon() {
  return (
    <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

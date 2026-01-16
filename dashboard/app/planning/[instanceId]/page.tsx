'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PlanningChat } from '../../../components/planning/PlanningChat';
import { useToast } from '../../../components/ui/Toast';

interface InstanceInfo {
  name: string;
  path: string;
  existingPrds: string[];
  skills: string[];
}

export default function PlanningPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const instanceId = params.instanceId as string;

  const [instanceInfo, setInstanceInfo] = useState<InstanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch instance information
  useEffect(() => {
    async function fetchInstance() {
      try {
        setLoading(true);
        // Decode the instanceId (it's the URL-encoded path)
        const instancePath = decodeURIComponent(instanceId);

        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error('Failed to fetch instance status');
        }

        const data = await response.json();
        const manager = data.managers.find(
          (m: { path: string; name: string }) => m.path === instancePath || m.name === instancePath
        );

        if (!manager) {
          throw new Error('Instance not found');
        }

        setInstanceInfo({
          name: manager.name,
          path: manager.path,
          existingPrds: manager.prds?.list || [],
          skills: manager.skills?.list || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load instance');
      } finally {
        setLoading(false);
      }
    }

    fetchInstance();
  }, [instanceId]);

  const handleStartWork = useCallback(async () => {
    if (!instanceInfo) return;

    try {
      const response = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          instancePath: instanceInfo.path,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start instance');
      }

      // Show success notification and navigate back to dashboard
      toast.success('Instance started', 'Work has begun on this instance');
      router.push('/');
    } catch (err) {
      console.error('Failed to start work:', err);
      toast.error('Failed to start instance', err instanceof Error ? err.message : 'Unknown error');
    }
  }, [instanceInfo, router, toast]);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading instance...</p>
        </div>
      </div>
    );
  }

  if (error || !instanceInfo) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Instance not found'}</p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left side - back button and title */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={handleBack}
                className="flex-shrink-0 flex items-center gap-1 sm:gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                  Planning: {instanceInfo.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                  {instanceInfo.path}
                </p>
              </div>
            </div>

            {/* Context info - hidden on very small screens */}
            <div className="hidden xs:flex items-center gap-3 sm:gap-4 flex-shrink-0">
              {instanceInfo.existingPrds.length > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">PRDs</div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {instanceInfo.existingPrds.length}
                  </div>
                </div>
              )}
              {instanceInfo.skills.length > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Skills</div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {instanceInfo.skills.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Chat area - takes remaining height */}
      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
        <PlanningChat
          instanceId={instanceId}
          instanceName={instanceInfo.name}
          instancePath={instanceInfo.path}
          existingPrds={instanceInfo.existingPrds}
          skills={instanceInfo.skills}
          onStartWork={handleStartWork}
        />
      </main>
    </div>
  );
}

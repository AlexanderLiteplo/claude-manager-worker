'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { PRDGenerator } from '../../../components/prd/PRDGenerator';
import { QueueManager } from '../../../components/prd/QueueManager';
import { useToast } from '../../../components/ui/Toast';

interface InstanceInfo {
  name: string;
  path: string;
  status: string;
  prds: {
    list: string[];
  };
  skills: {
    list: string[];
  };
}

type ViewMode = 'generate' | 'queue';

export default function PRDGeneratorPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params);
  const router = useRouter();
  const { showToast } = useToast();

  const [instance, setInstance] = useState<InstanceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('generate');

  // Fetch instance info
  const fetchInstance = useCallback(async () => {
    try {
      const response = await fetch('/api/instances');
      if (!response.ok) {
        throw new Error('Failed to fetch instances');
      }

      const data = await response.json();
      const found = data.instances.find((inst: InstanceInfo) => {
        // Match by name or path containing the instanceId
        const pathParts = inst.path.split('/');
        const dirName = pathParts[pathParts.length - 1];
        return dirName === instanceId || inst.name === instanceId;
      });

      if (!found) {
        showToast('error', 'Instance not found');
        router.push('/');
        return;
      }

      setInstance(found);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load instance');
    } finally {
      setIsLoading(false);
    }
  }, [instanceId, router, showToast]);

  useEffect(() => {
    fetchInstance();
  }, [fetchInstance]);

  // Handle PRD added to queue
  const handlePRDAdded = useCallback((filename: string) => {
    // Refresh instance data
    fetchInstance();
    // Switch to queue view
    setViewMode('queue');
  }, [fetchInstance]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!instance) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

          {/* Instance info */}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {instance.name}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">
              {instance.path}
            </p>
          </div>
        </div>

        {/* Context info */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{instance.prds.list.length} PRDs</span>
            <span>{instance.skills.list.length} Skills</span>
          </div>

          {/* Status badge */}
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full
            ${instance.status === 'running'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : instance.status === 'stopped'
              ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}
          >
            {instance.status}
          </span>
        </div>
      </header>

      {/* View mode tabs */}
      <div className="flex items-center gap-1 px-4 sm:px-6 py-2 bg-gray-100 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <TabButton
          active={viewMode === 'generate'}
          onClick={() => setViewMode('generate')}
          icon={<GenerateIcon />}
          label="Generate PRD"
        />
        <TabButton
          active={viewMode === 'queue'}
          onClick={() => setViewMode('queue')}
          icon={<QueueIcon />}
          label="Queue"
          badge={instance.prds.list.length > 0 ? String(instance.prds.list.length) : undefined}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {viewMode === 'generate' && (
          <PRDGenerator
            instanceId={instanceId}
            instanceName={instance.name}
            instancePath={instance.path}
            existingPrds={instance.prds.list}
            onPRDAdded={handlePRDAdded}
          />
        )}

        {viewMode === 'queue' && (
          <QueueManager
            instanceId={instanceId}
            instancePath={instance.path}
            onGenerateNew={() => setViewMode('generate')}
          />
        )}
      </main>
    </div>
  );
}

// Tab button component
function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
        ${active
          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className={`px-1.5 py-0.5 text-xs rounded-full
          ${active
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// Icons
function GenerateIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

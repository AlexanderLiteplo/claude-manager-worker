'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../ui/Toast';

interface PRDQueueItem {
  id: string;
  filename: string;
  title: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed';
  addedAt: string;
  estimatedIterations?: number;
}

interface QueueManagerProps {
  instanceId: string;
  instancePath: string;
  onGenerateNew?: () => void;
}

export function QueueManager({ instanceId, instancePath, onGenerateNew }: QueueManagerProps) {
  const [queue, setQueue] = useState<PRDQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const { showToast } = useToast();

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/prd/queue/${instanceId}?instancePath=${encodeURIComponent(instancePath)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch queue');
      }

      const data = await response.json();
      setQueue(data.queue || []);
      setStats(data.stats || { total: 0, pending: 0, inProgress: 0, completed: 0 });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setIsLoading(false);
    }
  }, [instanceId, instancePath, showToast]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Delete item from queue
  const handleDelete = useCallback(async (prdId: string, deleteFile: boolean) => {
    try {
      const response = await fetch(`/api/prd/queue/${instanceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instancePath,
          prdId,
          deleteFile,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete PRD');
      }

      showToast('success', 'PRD removed from queue');
      fetchQueue();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete');
    }
  }, [instanceId, instancePath, fetchQueue, showToast]);

  // Update item status or priority
  const handleUpdate = useCallback(async (prdId: string, updates: { status?: string; priority?: number }) => {
    try {
      const response = await fetch(`/api/prd/queue/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instancePath,
          prdId,
          ...updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update PRD');
      }

      showToast('success', 'PRD updated');
      fetchQueue();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update');
    }
  }, [instanceId, instancePath, fetchQueue, showToast]);

  // Group items by status and priority
  const inProgress = queue.filter(item => item.status === 'in_progress');
  const highPriority = queue.filter(item => item.status === 'pending' && item.priority === 1);
  const mediumPriority = queue.filter(item => item.status === 'pending' && item.priority === 2);
  const lowPriority = queue.filter(item => item.status === 'pending' && item.priority === 3);
  const completed = queue.filter(item => item.status === 'completed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading queue...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">PRD Queue</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {stats.pending} pending, {stats.inProgress} in progress, {stats.completed} completed
          </p>
        </div>
        {onGenerateNew && (
          <button
            onClick={onGenerateNew}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New PRD
          </button>
        )}
      </div>

      {/* Queue content */}
      <div className="flex-1 overflow-y-auto p-4">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No PRDs in queue</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Generate PRDs from natural language descriptions and add them to the queue.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* In Progress */}
            {inProgress.length > 0 && (
              <QueueSection
                title="In Progress"
                icon={<InProgressIcon />}
                iconColor="text-blue-500"
                items={inProgress}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            )}

            {/* High Priority */}
            {highPriority.length > 0 && (
              <QueueSection
                title="High Priority"
                icon={<HighPriorityIcon />}
                iconColor="text-red-500"
                items={highPriority}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            )}

            {/* Medium Priority */}
            {mediumPriority.length > 0 && (
              <QueueSection
                title="Medium Priority"
                icon={<MediumPriorityIcon />}
                iconColor="text-yellow-500"
                items={mediumPriority}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            )}

            {/* Low Priority */}
            {lowPriority.length > 0 && (
              <QueueSection
                title="Low Priority"
                icon={<LowPriorityIcon />}
                iconColor="text-gray-400"
                items={lowPriority}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <QueueSection
                title="Completed"
                icon={<CompletedIcon />}
                iconColor="text-green-500"
                items={completed}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                collapsed
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Queue section component
function QueueSection({
  title,
  icon,
  iconColor,
  items,
  onDelete,
  onUpdate,
  collapsed = false,
}: {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  items: PRDQueueItem[];
  onDelete: (id: string, deleteFile: boolean) => void;
  onUpdate: (id: string, updates: { status?: string; priority?: number }) => void;
  collapsed?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <span className={iconColor}>{icon}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">({items.length})</span>
        <svg
          className={`w-4 h-4 ml-auto text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-2 ml-6">
          {items.map(item => (
            <QueueItem
              key={item.id}
              item={item}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Individual queue item
function QueueItem({
  item,
  onDelete,
  onUpdate,
}: {
  item: PRDQueueItem;
  onDelete: (id: string, deleteFile: boolean) => void;
  onUpdate: (id: string, updates: { status?: string; priority?: number }) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {item.filename} • Added {formatDate(item.addedAt)}
          {item.estimatedIterations && ` • ~${item.estimatedIterations} iterations`}
        </p>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Start button (for pending items) */}
        {item.status === 'pending' && (
          <button
            onClick={() => onUpdate(item.id, { status: 'in_progress' })}
            className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
            title="Start working"
          >
            <PlayIcon />
          </button>
        )}

        {/* Complete button (for in progress items) */}
        {item.status === 'in_progress' && (
          <button
            onClick={() => onUpdate(item.id, { status: 'completed' })}
            className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
            title="Mark completed"
          >
            <CheckIcon />
          </button>
        )}

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <MenuIcon />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                {item.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => {
                        onUpdate(item.id, { priority: 1 });
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Set High Priority
                    </button>
                    <button
                      onClick={() => {
                        onUpdate(item.id, { priority: 2 });
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Set Medium Priority
                    </button>
                    <button
                      onClick={() => {
                        onUpdate(item.id, { priority: 3 });
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Set Low Priority
                    </button>
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                  </>
                )}
                <button
                  onClick={() => {
                    onDelete(item.id, false);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Remove from Queue
                </button>
                <button
                  onClick={() => {
                    onDelete(item.id, true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Delete PRD File
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Icons
function InProgressIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function HighPriorityIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function MediumPriorityIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  );
}

function LowPriorityIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CompletedIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}

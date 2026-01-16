'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../ui/Toast';
import { TagManager } from './TagManager';
import type { PRDMetadata, PRDStatus, PRDPriority, PRDViewMode } from '@/lib/types/prd';

interface PRDOrganizerProps {
  instanceId: string;
}

interface PRDStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  blocked: number;
  archived: number;
}

export function PRDOrganizer({ instanceId }: PRDOrganizerProps) {
  const router = useRouter();
  const toast = useToast();
  const [prds, setPrds] = useState<PRDMetadata[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [stats, setStats] = useState<PRDStats>({
    total: 0, pending: 0, inProgress: 0, completed: 0, blocked: 0, archived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<PRDViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [editingPrd, setEditingPrd] = useState<PRDMetadata | null>(null);

  // Drag-and-drop state
  const [draggedPrd, setDraggedPrd] = useState<PRDMetadata | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<PRDStatus | null>(null);

  const decodedPath = decodeURIComponent(instanceId);

  // Fetch PRDs
  const fetchPrds = useCallback(async () => {
    try {
      const response = await fetch(`/api/prds/${instanceId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch PRDs');
      }

      setPrds(data.prds);
      setAllTags(data.tags || []);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PRDs');
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchPrds();
  }, [fetchPrds]);

  // Filter PRDs
  const filteredPrds = useMemo(() => {
    let result = prds;

    // Filter by archived status
    if (!showArchived) {
      result = result.filter(p => !p.archived);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      result = result.filter(p =>
        selectedTags.every(tag => p.tags.includes(tag))
      );
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.filename.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return result;
  }, [prds, showArchived, selectedTags, searchQuery]);

  // Group PRDs by status for kanban view
  const groupedPrds = useMemo(() => {
    const groups: Record<PRDStatus, PRDMetadata[]> = {
      'pending': [],
      'in-progress': [],
      'blocked': [],
      'completed': [],
    };

    for (const prd of filteredPrds) {
      groups[prd.status].push(prd);
    }

    return groups;
  }, [filteredPrds]);

  // Update PRD metadata
  const handleUpdatePrd = async (filename: string, updates: Partial<PRDMetadata>) => {
    try {
      const response = await fetch(`/api/prds/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, ...updates }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update PRD');
      }

      // Update local state
      setPrds(prev => prev.map(p =>
        p.filename === filename ? { ...p, ...updates } : p
      ));

      if (data.tags) {
        setAllTags(data.tags);
      }

      toast.success('PRD updated', `${filename} has been updated`);
    } catch (err) {
      toast.error('Update failed', err instanceof Error ? err.message : 'Failed to update PRD');
    }
  };

  // Handle status change via drag-drop or click
  const handleStatusChange = async (filename: string, newStatus: PRDStatus) => {
    await handleUpdatePrd(filename, { status: newStatus });
  };

  // Open PRD editor
  const handleEditPrd = (prd: PRDMetadata) => {
    router.push(`/prd-editor/${instanceId}/${encodeURIComponent(prd.filename)}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={fetchPrds}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">PRD Organizer</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {stats.total} PRD{stats.total !== 1 ? 's' : ''} • {stats.inProgress} in progress • {stats.completed} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/prd-generator/${instanceId}`)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New PRD
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-md min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PRDs..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value && !selectedTags.includes(e.target.value)) {
                setSelectedTags([...selectedTags, e.target.value]);
              }
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Filter by tag...</option>
            {allTags.filter(t => !selectedTags.includes(t)).map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        )}

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {selectedTags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1"
              >
                {tag}
                <button
                  onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Show Archived Toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Show archived
        </label>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 ml-auto">
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
            title="Kanban view"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
            title="List view"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* PRD Content */}
      {filteredPrds.length === 0 ? (
        <EmptyState
          hasFilters={searchQuery !== '' || selectedTags.length > 0}
          onCreateNew={() => router.push(`/prd-generator/${instanceId}`)}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanView
          groupedPrds={groupedPrds}
          onStatusChange={handleStatusChange}
          onEdit={handleEditPrd}
          onUpdatePrd={handleUpdatePrd}
          setEditingPrd={setEditingPrd}
          draggedPrd={draggedPrd}
          setDraggedPrd={setDraggedPrd}
          dragOverColumn={dragOverColumn}
          setDragOverColumn={setDragOverColumn}
        />
      ) : (
        <ListView
          prds={filteredPrds}
          onEdit={handleEditPrd}
          onUpdatePrd={handleUpdatePrd}
          setEditingPrd={setEditingPrd}
        />
      )}

      {/* Tag Manager Modal */}
      {editingPrd && (
        <TagManager
          prd={editingPrd}
          allTags={allTags}
          onSave={async (tags) => {
            await handleUpdatePrd(editingPrd.filename, { tags });
            setEditingPrd(null);
          }}
          onClose={() => setEditingPrd(null)}
        />
      )}
    </div>
  );
}

// Empty state component
function EmptyState({ hasFilters, onCreateNew }: { hasFilters: boolean; onCreateNew: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
      {hasFilters ? (
        <>
          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No matching PRDs</p>
          <p className="text-gray-400 dark:text-gray-500">
            Try adjusting your search or filters
          </p>
        </>
      ) : (
        <>
          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No PRDs yet</p>
          <p className="text-gray-400 dark:text-gray-500 mb-4">
            Create your first PRD to start tracking development tasks
          </p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Create PRD
          </button>
        </>
      )}
    </div>
  );
}

// Kanban View Component
function KanbanView({
  groupedPrds,
  onStatusChange,
  onEdit,
  onUpdatePrd,
  setEditingPrd,
  draggedPrd,
  setDraggedPrd,
  dragOverColumn,
  setDragOverColumn,
}: {
  groupedPrds: Record<PRDStatus, PRDMetadata[]>;
  onStatusChange: (filename: string, status: PRDStatus) => void;
  onEdit: (prd: PRDMetadata) => void;
  onUpdatePrd: (filename: string, updates: Partial<PRDMetadata>) => void;
  setEditingPrd: (prd: PRDMetadata | null) => void;
  draggedPrd: PRDMetadata | null;
  setDraggedPrd: (prd: PRDMetadata | null) => void;
  dragOverColumn: PRDStatus | null;
  setDragOverColumn: (status: PRDStatus | null) => void;
}) {
  const columns: { status: PRDStatus; title: string; color: string; icon: React.ReactNode }[] = [
    {
      status: 'pending',
      title: 'Pending',
      color: 'border-gray-300 dark:border-gray-600',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      status: 'in-progress',
      title: 'In Progress',
      color: 'border-blue-400',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    },
    {
      status: 'blocked',
      title: 'Blocked',
      color: 'border-red-400',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    },
    {
      status: 'completed',
      title: 'Completed',
      color: 'border-green-400',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
  ];

  const handleDragStart = (e: React.DragEvent, prd: PRDMetadata) => {
    setDraggedPrd(prd);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', prd.filename);
  };

  const handleDragEnd = () => {
    setDraggedPrd(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: PRDStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, status: PRDStatus) => {
    e.preventDefault();
    if (draggedPrd && draggedPrd.status !== status) {
      onStatusChange(draggedPrd.filename, status);
    }
    setDraggedPrd(null);
    setDragOverColumn(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
      {columns.map(column => (
        <div
          key={column.status}
          className={`flex-1 min-w-[280px] max-w-[350px] bg-gray-50 dark:bg-gray-800/50 rounded-lg border-t-4 ${column.color} ${dragOverColumn === column.status ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} transition-all`}
          onDragOver={(e) => handleDragOver(e, column.status)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.status)}
        >
          {/* Column Header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">{column.icon}</span>
              <h3 className="font-semibold text-gray-900 dark:text-white">{column.title}</h3>
              <span className="ml-auto px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                {groupedPrds[column.status].length}
              </span>
            </div>
          </div>

          {/* Column Cards */}
          <div className="p-2 space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto min-h-[100px]">
            {groupedPrds[column.status].map(prd => (
              <PRDCard
                key={prd.filename}
                prd={prd}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
                onUpdatePrd={onUpdatePrd}
                setEditingPrd={setEditingPrd}
                compact
                onDragStart={(e) => handleDragStart(e, prd)}
                onDragEnd={handleDragEnd}
                isDragging={draggedPrd?.filename === prd.filename}
              />
            ))}

            {/* Drop indicator when dragging */}
            {dragOverColumn === column.status && draggedPrd && draggedPrd.status !== column.status && (
              <div className="h-16 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center text-sm text-blue-500">
                Drop here to move to {column.title}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// List View Component
function ListView({
  prds,
  onEdit,
  onUpdatePrd,
  setEditingPrd,
}: {
  prds: PRDMetadata[];
  onEdit: (prd: PRDMetadata) => void;
  onUpdatePrd: (filename: string, updates: Partial<PRDMetadata>) => void;
  setEditingPrd: (prd: PRDMetadata | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1">
      {prds.map(prd => (
        <PRDCard
          key={prd.filename}
          prd={prd}
          onEdit={onEdit}
          onStatusChange={() => {}}
          onUpdatePrd={onUpdatePrd}
          setEditingPrd={setEditingPrd}
          compact={false}
        />
      ))}
    </div>
  );
}

// PRD Card Component
function PRDCard({
  prd,
  onEdit,
  onStatusChange,
  onUpdatePrd,
  setEditingPrd,
  compact,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  prd: PRDMetadata;
  onEdit: (prd: PRDMetadata) => void;
  onStatusChange: (filename: string, status: PRDStatus) => void;
  onUpdatePrd: (filename: string, updates: Partial<PRDMetadata>) => void;
  setEditingPrd: (prd: PRDMetadata | null) => void;
  compact: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const priorityColors: Record<PRDPriority, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  const statusColors: Record<PRDStatus, string> = {
    pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  const complexityIcons: Record<string, string> = {
    simple: '⚡',
    medium: '⚙️',
    complex: '🔧',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (compact) {
    return (
      <div
        draggable={!!onDragStart}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:shadow-md transition-all group ${prd.archived ? 'opacity-60' : ''} ${isDragging ? 'opacity-50 scale-95 ring-2 ring-blue-500' : ''} ${onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onClick={() => onEdit(prd)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
            {prd.title}
          </h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-1.5 py-0.5 text-xs rounded ${priorityColors[prd.priority]}`}>
            {prd.priority}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {complexityIcons[prd.complexity]} {prd.complexity}
          </span>
        </div>

        {prd.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {prd.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
              >
                {tag}
              </span>
            ))}
            {prd.tags.length > 2 && (
              <span className="text-xs text-gray-400">+{prd.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Dropdown Menu */}
        {showMenu && (
          <CardMenu
            prd={prd}
            onClose={() => setShowMenu(false)}
            onStatusChange={onStatusChange}
            onUpdatePrd={onUpdatePrd}
            setEditingPrd={setEditingPrd}
          />
        )}
      </div>
    );
  }

  // List view card
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow group ${prd.archived ? 'opacity-60' : ''}`}
      onClick={() => onEdit(prd)}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">
              {prd.title}
            </h4>
            {prd.archived && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 rounded">
                archived
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {prd.filename} • Created {formatDate(prd.createdAt)}
            {prd.estimatedIterations && ` • ~${prd.estimatedIterations} iterations`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tags */}
          {prd.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {prd.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                >
                  {tag}
                </span>
              ))}
              {prd.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{prd.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Priority */}
          <span className={`px-2 py-1 text-xs rounded font-medium ${priorityColors[prd.priority]}`}>
            {prd.priority}
          </span>

          {/* Status */}
          <span className={`px-2 py-1 text-xs rounded font-medium ${statusColors[prd.status]}`}>
            {prd.status}
          </span>

          {/* Complexity */}
          <span className="text-sm" title={prd.complexity}>
            {complexityIcons[prd.complexity]}
          </span>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMenu && (
              <CardMenu
                prd={prd}
                onClose={() => setShowMenu(false)}
                onStatusChange={onStatusChange}
                onUpdatePrd={onUpdatePrd}
                setEditingPrd={setEditingPrd}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Card Menu Component
function CardMenu({
  prd,
  onClose,
  onStatusChange,
  onUpdatePrd,
  setEditingPrd,
}: {
  prd: PRDMetadata;
  onClose: () => void;
  onStatusChange: (filename: string, status: PRDStatus) => void;
  onUpdatePrd: (filename: string, updates: Partial<PRDMetadata>) => void;
  setEditingPrd: (prd: PRDMetadata | null) => void;
}) {
  const statuses: PRDStatus[] = ['pending', 'in-progress', 'blocked', 'completed'];
  const priorities: PRDPriority[] = ['high', 'medium', 'low'];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
        {/* Status submenu */}
        <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">Status</div>
        {statuses.map(status => (
          <button
            key={status}
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(prd.filename, status);
              onClose();
            }}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${prd.status === status ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
          >
            {prd.status === status && '✓ '}{status}
          </button>
        ))}

        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

        {/* Priority submenu */}
        <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">Priority</div>
        {priorities.map(priority => (
          <button
            key={priority}
            onClick={(e) => {
              e.stopPropagation();
              onUpdatePrd(prd.filename, { priority });
              onClose();
            }}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${prd.priority === priority ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
          >
            {prd.priority === priority && '✓ '}{priority}
          </button>
        ))}

        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

        {/* Other actions */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingPrd(prd);
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Manage Tags
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdatePrd(prd.filename, { archived: !prd.archived });
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {prd.archived ? 'Unarchive' : 'Archive'}
        </button>
      </div>
    </>
  );
}

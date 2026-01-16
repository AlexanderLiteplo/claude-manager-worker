'use client';

import { useState, useCallback } from 'react';
import { PrdReviewCard } from './PrdReviewCard';
import { PlanSummary } from './PlanSummary';

interface PRD {
  id: string;
  filename: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  estimatedIterations: number;
  path?: string;
}

interface Plan {
  title: string;
  summary: string;
  prds: PRD[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
  suggestedOrder: number[];
  generatedAt?: string;
}

interface PrdPreviewModalProps {
  isOpen: boolean;
  plan: Plan;
  instancePath: string;
  onClose: () => void;
  onExecute: () => Promise<void>;
  onEdit: (prdId: string, content: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function PrdPreviewModal({
  isOpen,
  plan,
  instancePath,
  onClose,
  onExecute,
  onEdit,
  onRefresh,
}: PrdPreviewModalProps) {
  const [selectedPrdIndex, setSelectedPrdIndex] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPrd, setEditingPrd] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecute = async () => {
    setExecuting(true);
    setError(null);
    try {
      await onExecute();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start execution');
    } finally {
      setExecuting(false);
    }
  };

  const handleEditSave = async (prdId: string, content: string) => {
    try {
      await onEdit(prdId, content);
      setEditingPrd(null);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  };

  const selectedPrd = plan.prds[selectedPrdIndex];
  const totalIterations = plan.prds.reduce((sum, prd) => sum + prd.estimatedIterations, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-4 sm:p-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2 truncate">
                {plan.title}
              </h2>
              <p className="text-white/90 text-sm sm:text-base line-clamp-2">{plan.summary}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors flex-shrink-0 p-1"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Plan stats */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 sm:mt-4 text-sm text-white/90">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold">{plan.prds.length}</span>
              <span>PRD{plan.prds.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold capitalize">{plan.estimatedComplexity}</span>
              <span>complexity</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold">~{totalIterations}</span>
              <span>iterations</span>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
          {/* PRD List */}
          <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-3 sm:p-4 flex-shrink-0 max-h-40 sm:max-h-none">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
              Generated PRDs
            </h3>
            <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
              {plan.prds.map((prd, index) => (
                <button
                  key={prd.id}
                  onClick={() => setSelectedPrdIndex(index)}
                  className={`
                    flex-shrink-0 sm:flex-shrink text-left p-2.5 sm:p-3 rounded-lg transition-colors min-w-[140px] sm:min-w-0
                    ${
                      selectedPrdIndex === index
                        ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <span className="text-base sm:text-lg font-semibold text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </span>
                    <span
                      className={`
                        px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium
                        ${prd.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : ''}
                        ${prd.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' : ''}
                        ${prd.priority === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : ''}
                      `}
                    >
                      {prd.priority}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {prd.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                    ~{prd.estimatedIterations} iter.
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PRD Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {selectedPrd && (
              <PrdReviewCard
                prd={selectedPrd}
                isEditing={editingPrd === selectedPrd.id}
                onStartEdit={() => setEditingPrd(selectedPrd.id)}
                onCancelEdit={() => setEditingPrd(null)}
                onSave={(content) => handleEditSave(selectedPrd.id, content)}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
            Review the generated PRDs and start implementation when ready
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={executing}
              className={`
                flex-1 sm:flex-none px-4 sm:px-6 py-2 text-sm font-medium text-white rounded-lg
                flex items-center justify-center gap-2 transition-all
                ${
                  executing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 shadow-lg hover:shadow-xl'
                }
              `}
            >
              {executing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Start Implementation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

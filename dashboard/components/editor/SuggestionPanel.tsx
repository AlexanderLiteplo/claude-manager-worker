'use client';

import { useState, useCallback, useEffect } from 'react';
import { DiffViewer, DiffLine } from './DiffViewer';

export interface Suggestion {
  id: string;
  type: 'ai-command' | 'smart-suggestion' | 'context-aware';
  command: string;
  originalContent: string;
  suggestedContent: string;
  explanation: string;
  diff: DiffLine[];
  confidence?: number;
  section?: string;
  timestamp: Date;
}

interface SuggestionPanelProps {
  suggestion: Suggestion | null;
  selectedText: string | null;
  onAccept: () => void;
  onReject: () => void;
  onRefine: (refinement: string) => void;
  isProcessing: boolean;
}

export function SuggestionPanel({
  suggestion,
  selectedText,
  onAccept,
  onReject,
  onRefine,
  isProcessing,
}: SuggestionPanelProps) {
  const [showFullDiff, setShowFullDiff] = useState(false);
  const [refinementInput, setRefinementInput] = useState('');
  const [showRefinement, setShowRefinement] = useState(false);

  // Reset state when suggestion changes
  useEffect(() => {
    setShowFullDiff(false);
    setRefinementInput('');
    setShowRefinement(false);
  }, [suggestion?.id]);

  const handleRefineSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (refinementInput.trim()) {
      onRefine(refinementInput.trim());
      setRefinementInput('');
      setShowRefinement(false);
    }
  }, [refinementInput, onRefine]);

  if (!suggestion) {
    return null;
  }

  const getSuggestionTypeLabel = () => {
    switch (suggestion.type) {
      case 'smart-suggestion':
        return { label: 'Smart Suggestion', icon: '💡', color: 'yellow' };
      case 'context-aware':
        return { label: 'Context-Aware', icon: '🎯', color: 'purple' };
      case 'ai-command':
      default:
        return { label: 'AI Edit', icon: '✨', color: 'blue' };
    }
  };

  const typeInfo = getSuggestionTypeLabel();

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      header: 'text-blue-800 dark:text-blue-200',
      text: 'text-blue-600 dark:text-blue-300',
      badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      header: 'text-yellow-800 dark:text-yellow-200',
      text: 'text-yellow-600 dark:text-yellow-300',
      badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      header: 'text-purple-800 dark:text-purple-200',
      text: 'text-purple-600 dark:text-purple-300',
      badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    },
  };

  const colors = colorClasses[typeInfo.color as keyof typeof colorClasses];

  return (
    <div className={`mx-4 mt-2 p-4 ${colors.bg} border ${colors.border} rounded-lg`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{typeInfo.icon}</span>
            <h4 className={`font-medium ${colors.header}`}>
              {typeInfo.label}
            </h4>
            {suggestion.section && (
              <span className={`text-xs px-2 py-0.5 rounded ${colors.badge}`}>
                {suggestion.section}
              </span>
            )}
            {suggestion.confidence && (
              <span className={`text-xs px-2 py-0.5 rounded ${colors.badge}`}>
                {Math.round(suggestion.confidence * 100)}% confidence
              </span>
            )}
          </div>
          <p className={`text-sm ${colors.text}`}>
            {suggestion.explanation}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-4">
          {!showRefinement && (
            <>
              <button
                onClick={() => setShowRefinement(true)}
                disabled={isProcessing}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                title="Refine this suggestion"
              >
                🔧 Refine
              </button>
              <button
                onClick={onReject}
                disabled={isProcessing}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                ✕ Reject
              </button>
              <button
                onClick={onAccept}
                disabled={isProcessing}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                ✓ Accept
              </button>
            </>
          )}
        </div>
      </div>

      {/* Refinement input */}
      {showRefinement && (
        <form onSubmit={handleRefineSubmit} className="mb-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={refinementInput}
              onChange={(e) => setRefinementInput(e.target.value)}
              placeholder="Describe how to refine this suggestion..."
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              disabled={isProcessing}
            />
            <button
              type="button"
              onClick={() => setShowRefinement(false)}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!refinementInput.trim() || isProcessing}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Apply'}
            </button>
          </div>
        </form>
      )}

      {/* Selected text indicator */}
      {selectedText && (
        <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
          <span className="text-gray-500 dark:text-gray-400 text-xs">Selected text:</span>
          <p className="font-mono text-gray-700 dark:text-gray-300 mt-1 truncate">
            "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
          </p>
        </div>
      )}

      {/* Diff toggle */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setShowFullDiff(!showFullDiff)}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1"
        >
          <ChevronIcon direction={showFullDiff ? 'down' : 'right'} />
          {showFullDiff ? 'Hide detailed diff' : 'Show detailed diff'}
          <span className="text-xs text-gray-500">
            ({suggestion.diff.filter(d => d.type !== 'unchanged').length} changes)
          </span>
        </button>
      </div>

      {/* Diff View */}
      {showFullDiff ? (
        <DiffViewer diff={suggestion.diff} maxLines={50} />
      ) : (
        <DiffViewer diff={suggestion.diff} maxLines={10} compact />
      )}

      {/* Keyboard hints */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Shift+Enter</kbd> Accept
          <span className="mx-2">|</span>
          <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Escape</kbd> Reject
          <span className="mx-2">|</span>
          Type <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">yes</kbd> or <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">no</kbd> to respond
        </p>
      </div>
    </div>
  );
}

// Chevron icon component
function ChevronIcon({ direction }: { direction: 'right' | 'down' }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${direction === 'down' ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// Smart suggestion generator - analyzes content and provides context-aware suggestions
export function generateSmartSuggestions(
  content: string,
  selection?: { start: number; end: number }
): Array<{ command: string; description: string; section?: string }> {
  const suggestions: Array<{ command: string; description: string; section?: string }> = [];
  const lines = content.split('\n');

  // Analyze content structure
  const hasGoals = content.toLowerCase().includes('## goals');
  const hasAcceptanceCriteria = content.toLowerCase().includes('## acceptance criteria');
  const hasUserStories = content.toLowerCase().includes('## user stories');
  const hasTechnicalReqs = content.toLowerCase().includes('## technical');
  const hasTimeline = content.toLowerCase().includes('## timeline');
  const hasOutOfScope = content.toLowerCase().includes('## out of scope');

  // Suggest missing sections
  if (!hasGoals) {
    suggestions.push({
      command: 'add section about goals',
      description: 'Add a Goals section with measurable objectives',
    });
  }

  if (!hasAcceptanceCriteria) {
    suggestions.push({
      command: 'add acceptance criteria section',
      description: 'Add acceptance criteria for verification',
    });
  }

  if (!hasUserStories) {
    suggestions.push({
      command: 'add user stories section',
      description: 'Add user stories to capture requirements',
    });
  }

  if (!hasTechnicalReqs) {
    suggestions.push({
      command: 'add technical requirements section',
      description: 'Add technical architecture details',
    });
  }

  if (!hasTimeline && hasGoals) {
    suggestions.push({
      command: 'add implementation timeline',
      description: 'Add estimated implementation phases',
    });
  }

  if (!hasOutOfScope) {
    suggestions.push({
      command: 'add out of scope section',
      description: 'Define what is not included in this PRD',
    });
  }

  // Analyze content quality
  const todoPlaceholders = content.match(/\[.*?\]/g) || [];
  if (todoPlaceholders.length > 3) {
    suggestions.push({
      command: 'fill in placeholder content',
      description: `Complete ${todoPlaceholders.length} placeholder sections`,
    });
  }

  // Check for vague language
  const vagueTerms = ['some', 'various', 'etc', 'stuff', 'things'];
  const hasVagueLanguage = vagueTerms.some(term =>
    content.toLowerCase().includes(` ${term} `) || content.toLowerCase().includes(` ${term}.`)
  );
  if (hasVagueLanguage) {
    suggestions.push({
      command: 'make requirements more specific',
      description: 'Replace vague terms with concrete details',
    });
  }

  // Selection-based suggestions
  if (selection && selection.end > selection.start) {
    const selectedText = content.substring(selection.start, selection.end);
    const selectedLines = selectedText.split('\n');

    // Suggest based on selected content
    if (selectedLines.length > 1) {
      suggestions.unshift({
        command: 'reorganize this section',
        description: 'Restructure selected content for clarity',
        section: 'Selection',
      });
    }

    if (selectedText.length < 100) {
      suggestions.unshift({
        command: 'expand this section',
        description: 'Add more detail to selected content',
        section: 'Selection',
      });
    }

    if (selectedText.length > 500) {
      suggestions.unshift({
        command: 'simplify this section',
        description: 'Make selected content more concise',
        section: 'Selection',
      });
    }

    // Check if selection is a list
    if (selectedText.includes('- ') || selectedText.includes('* ') || /^\d+\.\s/.test(selectedText)) {
      suggestions.unshift({
        command: 'improve list items',
        description: 'Make list items more actionable',
        section: 'Selection',
      });
    }
  }

  // Limit suggestions
  return suggestions.slice(0, 5);
}

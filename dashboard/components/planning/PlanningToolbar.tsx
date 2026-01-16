'use client';

interface PlanningToolbarProps {
  instanceName: string;
  conversationId?: string;
  onSave: () => void;
  onDraftPrd: () => void;
  onStartWork: () => void;
  onExport: () => void;
  onNewConversation: () => void;
  onGeneratePlan?: () => void;
  onViewPlan?: () => void;
  isSaving?: boolean;
  isDraftingPrd?: boolean;
  isGeneratingPlan?: boolean;
  hasMessages?: boolean;
  hasPlan?: boolean;
}

export function PlanningToolbar({
  instanceName,
  conversationId,
  onSave,
  onDraftPrd,
  onStartWork,
  onExport,
  onNewConversation,
  onGeneratePlan,
  onViewPlan,
  isSaving = false,
  isDraftingPrd = false,
  isGeneratingPlan = false,
  hasMessages = false,
  hasPlan = false,
}: PlanningToolbarProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 sm:px-4 py-2 sm:py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        {/* Left side - info (hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Planning for <span className="font-medium text-gray-700 dark:text-gray-200">{instanceName}</span>
          </span>
          {conversationId && (
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              ID: {conversationId.slice(0, 8)}...
            </span>
          )}
        </div>

        {/* Right side - actions */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Secondary actions group */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* New Conversation */}
            <button
              onClick={onNewConversation}
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg
                bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                hover:bg-gray-300 dark:hover:bg-gray-600
                transition-colors whitespace-nowrap"
              title="Start a new conversation"
            >
              <span className="hidden sm:inline">New Chat</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* Save */}
            <button
              onClick={onSave}
              disabled={isSaving || !hasMessages}
              className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1 sm:gap-1.5
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap
                ${
                  hasMessages
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}
              title="Save conversation"
            >
              {isSaving ? (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="hidden xs:inline">Save</span>
                </>
              )}
            </button>

            {/* Export */}
            <button
              onClick={onExport}
              disabled={!hasMessages}
              className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1 sm:gap-1.5
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap
                ${
                  hasMessages
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}
              title="Export as markdown"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="hidden xs:inline">Export</span>
            </button>
          </div>

          {/* Primary actions group */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Draft PRD */}
            <button
              onClick={onDraftPrd}
              disabled={isDraftingPrd || !hasMessages}
              className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1 sm:gap-1.5
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap
                ${
                  hasMessages
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}
              title="Generate single PRD from conversation"
            >
              {isDraftingPrd ? (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="hidden sm:inline">Drafting...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden xs:inline">PRD</span>
                </>
              )}
            </button>

            {/* Generate Plan - Creates multiple PRDs */}
            {onGeneratePlan && (
              <button
                onClick={onGeneratePlan}
                disabled={isGeneratingPlan || !hasMessages}
                className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1 sm:gap-1.5
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap
                  ${
                    hasMessages
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                  }`}
                title="Generate implementation plan with multiple PRDs"
              >
                {isGeneratingPlan ? (
                  <>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="hidden xs:inline">Generate Plan</span>
                  </>
                )}
              </button>
            )}

            {/* View Plan - Shows if plan exists */}
            {hasPlan && onViewPlan && (
              <button
                onClick={onViewPlan}
                className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1 sm:gap-1.5
                  bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300
                  hover:bg-blue-200 dark:hover:bg-blue-900/50
                  transition-colors whitespace-nowrap"
                title="View generated plan"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="hidden xs:inline">View Plan</span>
              </button>
            )}

            {/* Start Work - Primary action */}
            <button
              onClick={onStartWork}
              disabled={!hasMessages}
              className={`px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1 sm:gap-1.5
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap
                ${
                  hasMessages
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}
              title="Start autonomous work"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden xs:inline">Start</span>
              <span className="hidden sm:inline"> Work</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

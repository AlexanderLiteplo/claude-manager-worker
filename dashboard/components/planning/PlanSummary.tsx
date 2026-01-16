'use client';

interface PRD {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  estimatedIterations: number;
}

interface PlanSummaryProps {
  title: string;
  summary: string;
  prds: PRD[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
  suggestedOrder: number[];
}

export function PlanSummary({
  title,
  summary,
  prds,
  estimatedComplexity,
  suggestedOrder,
}: PlanSummaryProps) {
  const totalIterations = prds.reduce((sum, prd) => sum + prd.estimatedIterations, 0);
  const highPriorityCount = prds.filter(p => p.priority === 'high').length;
  const mediumPriorityCount = prds.filter(p => p.priority === 'medium').length;
  const lowPriorityCount = prds.filter(p => p.priority === 'low').length;

  const complexityColors = {
    simple: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    complex: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {summary}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 dark:bg-gray-700">
        <div className="bg-white dark:bg-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {prds.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            PRDs
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ~{totalIterations}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Iterations
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4">
          <span className={`inline-block px-2 py-1 rounded text-sm font-medium capitalize ${complexityColors[estimatedComplexity]}`}>
            {estimatedComplexity}
          </span>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
            Complexity
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center gap-1">
            {highPriorityCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                {highPriorityCount}H
              </span>
            )}
            {mediumPriorityCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
                {mediumPriorityCount}M
              </span>
            )}
            {lowPriorityCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                {lowPriorityCount}L
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
            Priority Split
          </div>
        </div>
      </div>

      {/* Execution order */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Suggested Execution Order
        </h4>
        <div className="flex flex-wrap gap-2">
          {suggestedOrder.map((prdIndex, order) => {
            const prd = prds[prdIndex];
            if (!prd) return null;
            return (
              <div
                key={prd.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
              >
                <span className="w-5 h-5 flex items-center justify-center bg-purple-500 text-white text-xs font-medium rounded-full">
                  {order + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                  {prd.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

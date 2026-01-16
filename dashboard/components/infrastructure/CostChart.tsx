'use client';

interface CostData {
  vercel: { costs: { total: number } };
  github: { costs: { total: number } };
  gcloud: { costs: { total: number } };
}

interface CostChartProps {
  data: CostData;
}

export function CostChart({ data }: CostChartProps) {
  const costs = [
    { name: 'Vercel', cost: data.vercel.costs.total, color: 'bg-black dark:bg-white' },
    { name: 'GitHub', cost: data.github.costs.total, color: 'bg-purple-500' },
    { name: 'Google Cloud', cost: data.gcloud.costs.total, color: 'bg-blue-500' },
  ];

  const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
  const maxCost = Math.max(...costs.map(c => c.cost), 1); // Avoid division by zero

  return (
    <div className="space-y-6">
      {/* Total Cost Display */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Monthly Cost</p>
        <p className="text-4xl font-bold text-gray-900 dark:text-white">
          ${totalCost.toFixed(2)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Current Month (Estimated)
        </p>
      </div>

      {/* Cost Distribution Bar */}
      {totalCost > 0 && (
        <div className="h-8 flex rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
          {costs.map((item) => {
            const percentage = (item.cost / totalCost) * 100;
            if (percentage === 0) return null;
            return (
              <div
                key={item.name}
                className={`${item.color} flex items-center justify-center text-xs font-medium ${
                  item.color.includes('black') ? 'text-white' :
                  item.color.includes('white') ? 'text-black' : 'text-white'
                }`}
                style={{ width: `${percentage}%` }}
                title={`${item.name}: $${item.cost.toFixed(2)} (${percentage.toFixed(1)}%)`}
              >
                {percentage > 15 && `${percentage.toFixed(0)}%`}
              </div>
            );
          })}
        </div>
      )}

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {costs.map((item) => {
          const percentage = totalCost > 0 ? (item.cost / totalCost) * 100 : 0;
          return (
            <div
              key={item.name}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.name}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${item.cost.toFixed(2)}
              </p>
              <div className="mt-2">
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} transition-all duration-500`}
                    style={{ width: `${(item.cost / maxCost) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {percentage.toFixed(1)}% of total
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cost Legend */}
      <div className="flex justify-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        {costs.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${item.color}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {item.name}
            </span>
          </div>
        ))}
      </div>

      {/* Note */}
      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        Costs are estimated based on current usage. Actual billing may vary.
      </p>
    </div>
  );
}

'use client';

import { ReactNode } from 'react';

interface PlatformStatus {
  configured: boolean;
  available: boolean;
  error?: string;
}

interface PlatformSummaryProps {
  platform: 'vercel' | 'github' | 'gcloud';
  title: string;
  icon: ReactNode;
  status: PlatformStatus;
  stats: {
    label: string;
    value: string | number;
    type?: 'default' | 'success' | 'warning' | 'error';
  }[];
  consoleUrl: string;
  detailUrl?: string;
}

export function PlatformSummary({
  platform,
  title,
  icon,
  status,
  stats,
  consoleUrl,
  detailUrl,
}: PlatformSummaryProps) {
  const getStatusColor = () => {
    if (!status.configured) return 'bg-gray-100 dark:bg-gray-800';
    if (!status.available) return 'bg-red-50 dark:bg-red-900/20';
    return 'bg-white dark:bg-gray-800';
  };

  const getStatusBadge = () => {
    if (!status.configured) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          Not Configured
        </span>
      );
    }
    if (!status.available) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
          Error
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
        Connected
      </span>
    );
  };

  const getValueColor = (type: string | undefined) => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-900 dark:text-white';
    }
  };

  return (
    <div className={`rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{icon}</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>
        {getStatusBadge()}
      </div>

      {status.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
          {status.error}
        </div>
      )}

      {status.available && (
        <div className="space-y-3">
          {stats.map((stat, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </span>
              <span className={`text-lg font-semibold ${getValueColor(stat.type)}`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {!status.configured && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure the {title} integration to see data here.
        </p>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <a
          href={consoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
        >
          Open Console
        </a>
        {detailUrl && status.available && (
          <a
            href={detailUrl}
            className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
          >
            View Details
          </a>
        )}
      </div>
    </div>
  );
}

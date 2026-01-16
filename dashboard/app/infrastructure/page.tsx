'use client';

import { useEffect, useState, useCallback } from 'react';
import { PlatformSummary } from '@/components/infrastructure/PlatformSummary';
import { DeploymentCard } from '@/components/infrastructure/DeploymentCard';
import { RepoCard } from '@/components/infrastructure/RepoCard';
import { ServiceCard } from '@/components/infrastructure/ServiceCard';
import { CostChart } from '@/components/infrastructure/CostChart';
import { QuickLinks } from '@/components/infrastructure/QuickLinks';

interface PlatformStatus {
  configured: boolean;
  available: boolean;
  error?: string;
}

interface InfrastructureSummary {
  vercel: {
    status: PlatformStatus;
    projectCount: number;
    productionDeployments: number;
    buildingDeployments: number;
    costs: { total: number; currency: string };
  };
  github: {
    status: PlatformStatus;
    repoCount: number;
    activeRepos: number;
    openPRs: number;
    openIssues: number;
    costs: {
      actionsMinutes: number;
      actionsMinutesLimit: number;
      total: number;
      currency: string;
    };
  };
  gcloud: {
    status: PlatformStatus;
    projectCount: number;
    activeProjects: number;
    runningInstances: number;
    enabledServices: number;
    costs: { total: number; currency: string };
  };
  summary: {
    totalCost: number;
    currency: string;
    totalProjects: number;
    healthyServices: number;
    warnings: string[];
  };
  timestamp: string;
}

interface VercelData {
  projects: any[];
  costs: any;
  usage: any;
}

interface GitHubData {
  repos: any[];
  costs: any;
  user: any;
}

interface GCloudData {
  projects: any[];
  services: Record<string, any[]>;
  instances: Record<string, any[]>;
  costs: Record<string, any>;
}

export default function InfrastructurePage() {
  const [summaryData, setSummaryData] = useState<InfrastructureSummary | null>(null);
  const [vercelData, setVercelData] = useState<VercelData | null>(null);
  const [githubData, setGithubData] = useState<GitHubData | null>(null);
  const [gcloudData, setGcloudData] = useState<GCloudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
        await fetch('/api/infrastructure/refresh', { method: 'POST' });
      }

      const [summaryRes, vercelRes, githubRes, gcloudRes] = await Promise.all([
        fetch('/api/infrastructure/summary'),
        fetch('/api/infrastructure/vercel'),
        fetch('/api/infrastructure/github'),
        fetch('/api/infrastructure/gcloud'),
      ]);

      const [summary, vercel, github, gcloud] = await Promise.all([
        summaryRes.json(),
        vercelRes.json(),
        githubRes.json(),
        gcloudRes.json(),
      ]);

      if (summary.success) {
        setSummaryData(summary.data);
      }
      if (vercel.success) {
        setVercelData(vercel.data);
      }
      if (github.success) {
        setGithubData(github.data);
      }
      if (gcloud.success) {
        setGcloudData(gcloud.data);
      }

      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading infrastructure data...
          </p>
        </div>
      </div>
    );
  }

  if (error && !summaryData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchData(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const costData = {
    vercel: { costs: { total: summaryData?.vercel.costs.total || 0 } },
    github: { costs: { total: summaryData?.github.costs.total || 0 } },
    gcloud: { costs: { total: summaryData?.gcloud.costs.total || 0 } },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Infrastructure Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {lastRefresh
              ? `Last updated: ${lastRefresh.toLocaleTimeString()}`
              : 'Loading...'}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {autoRefresh ? '✓ Auto-refresh' : 'Auto-refresh off'}
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            {refreshing ? (
              <>
                <span className="animate-spin">⟳</span>
                Refreshing...
              </>
            ) : (
              <>
                🔄 Refresh Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warnings */}
      {summaryData?.summary.warnings && summaryData.summary.warnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-2">
            Warnings
          </h3>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            {summaryData.summary.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Monthly Cost
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            ${summaryData?.summary.totalCost.toFixed(2) || '0.00'}
          </p>
          <p className="text-sm text-gray-500 mt-1">USD (Estimated)</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Production Deployments
          </h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {summaryData?.vercel.productionDeployments || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Live on Vercel</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Active Repositories
          </h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {summaryData?.github.activeRepos || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Updated in last 30 days</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            GCloud Instances
          </h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
            {summaryData?.gcloud.runningInstances || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">Running</p>
        </div>
      </div>

      {/* Platform Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <PlatformSummary
          platform="vercel"
          title="Vercel"
          icon={<span className="text-black dark:text-white">▲</span>}
          status={summaryData?.vercel.status || { configured: false, available: false }}
          stats={[
            { label: 'Projects', value: summaryData?.vercel.projectCount || 0 },
            {
              label: 'Production',
              value: summaryData?.vercel.productionDeployments || 0,
              type: 'success' as const,
            },
            {
              label: 'Building',
              value: summaryData?.vercel.buildingDeployments || 0,
              type: summaryData?.vercel.buildingDeployments ? 'warning' as const : 'default' as const,
            },
            {
              label: 'Cost',
              value: `$${summaryData?.vercel.costs.total.toFixed(2) || '0.00'}`,
            },
          ]}
          consoleUrl="https://vercel.com/dashboard"
          detailUrl="/infrastructure/vercel"
        />

        <PlatformSummary
          platform="github"
          title="GitHub"
          icon={<span>📦</span>}
          status={summaryData?.github.status || { configured: false, available: false }}
          stats={[
            { label: 'Repositories', value: summaryData?.github.repoCount || 0 },
            {
              label: 'Active (30d)',
              value: summaryData?.github.activeRepos || 0,
              type: 'success' as const,
            },
            {
              label: 'Open PRs',
              value: summaryData?.github.openPRs || 0,
              type: summaryData?.github.openPRs ? 'warning' as const : 'default' as const,
            },
            {
              label: 'Actions Minutes',
              value: `${summaryData?.github.costs.actionsMinutes || 0}/${summaryData?.github.costs.actionsMinutesLimit || 2000}`,
            },
          ]}
          consoleUrl="https://github.com"
          detailUrl="/infrastructure/github"
        />

        <PlatformSummary
          platform="gcloud"
          title="Google Cloud"
          icon={<span>☁️</span>}
          status={summaryData?.gcloud.status || { configured: false, available: false }}
          stats={[
            { label: 'Projects', value: summaryData?.gcloud.projectCount || 0 },
            {
              label: 'Active',
              value: summaryData?.gcloud.activeProjects || 0,
              type: 'success' as const,
            },
            {
              label: 'Running Instances',
              value: summaryData?.gcloud.runningInstances || 0,
            },
            {
              label: 'Cost',
              value: `$${summaryData?.gcloud.costs.total.toFixed(2) || '0.00'}`,
            },
          ]}
          consoleUrl="https://console.cloud.google.com"
          detailUrl="/infrastructure/gcloud"
        />
      </div>

      {/* Cost Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Cost Breakdown
        </h2>
        <CostChart data={costData} />
      </div>

      {/* Vercel Deployments */}
      {vercelData?.projects && vercelData.projects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Vercel Deployments
            </h2>
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              View All →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vercelData.projects.slice(0, 6).map((project) => (
              <DeploymentCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* GitHub Repositories */}
      {githubData?.repos && githubData.repos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              GitHub Repositories
            </h2>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              View All →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {githubData.repos.slice(0, 6).map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        </div>
      )}

      {/* GCloud Projects */}
      {gcloudData?.projects && gcloudData.projects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Google Cloud Projects
            </h2>
            <a
              href="https://console.cloud.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              View All →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gcloudData.projects.slice(0, 6).map((project) => (
              <ServiceCard
                key={project.projectId}
                project={project}
                services={gcloudData.services[project.projectId] || []}
                instances={gcloudData.instances[project.projectId] || []}
                cost={gcloudData.costs[project.projectId] || { total: 0, netTotal: 0 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <QuickLinks />

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Infrastructure Monitoring Dashboard</p>
        <p className="mt-1">
          Data cached for performance. Use "Refresh Now" for latest data.
        </p>
      </div>
    </div>
  );
}

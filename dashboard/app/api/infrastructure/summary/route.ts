import { NextResponse } from 'next/server';
import { createVercelClient } from '@/lib/api/vercel-client';
import { createGitHubClient } from '@/lib/api/github-client';
import { createGCloudClient } from '@/lib/api/gcloud-client';
import {
  infrastructureCache,
  CACHE_KEYS,
  CACHE_TTL,
} from '@/lib/cache/infrastructure-cache';

export const dynamic = 'force-dynamic';

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
    costs: {
      total: number;
      currency: string;
    };
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
    costs: {
      total: number;
      currency: string;
    };
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

export async function GET() {
  try {
    const cacheKey = CACHE_KEYS.summary();

    // Check cache first
    const cached = infrastructureCache.get<InfrastructureSummary>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const warnings: string[] = [];

    // Initialize platform data with defaults
    let vercelData = {
      status: { configured: false, available: false } as PlatformStatus,
      projectCount: 0,
      productionDeployments: 0,
      buildingDeployments: 0,
      costs: { total: 0, currency: 'USD' },
    };

    let githubData = {
      status: { configured: false, available: false } as PlatformStatus,
      repoCount: 0,
      activeRepos: 0,
      openPRs: 0,
      openIssues: 0,
      costs: { actionsMinutes: 0, actionsMinutesLimit: 2000, total: 0, currency: 'USD' },
    };

    let gcloudData = {
      status: { configured: false, available: false } as PlatformStatus,
      projectCount: 0,
      activeProjects: 0,
      runningInstances: 0,
      enabledServices: 0,
      costs: { total: 0, currency: 'USD' },
    };

    // Fetch Vercel data
    const vercelClient = createVercelClient();
    if (vercelClient) {
      vercelData.status.configured = true;
      try {
        const [projects, costs] = await Promise.all([
          vercelClient.getProjectsWithDeployments(),
          vercelClient.getCurrentCosts(),
        ]);

        vercelData.status.available = true;
        vercelData.projectCount = projects.length;
        vercelData.productionDeployments = projects.filter(
          p => p.productionDeployment?.state === 'READY'
        ).length;
        vercelData.buildingDeployments = projects.filter(
          p => p.latestDeployments?.some(d => d.state === 'BUILDING')
        ).length;
        vercelData.costs.total = costs.total;
      } catch (error) {
        vercelData.status.error = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Vercel: ${vercelData.status.error}`);
      }
    } else {
      warnings.push('Vercel: Not configured (VERCEL_TOKEN missing)');
    }

    // Fetch GitHub data
    const githubClient = createGitHubClient();
    if (githubClient) {
      githubData.status.configured = true;
      try {
        const [repos, costs] = await Promise.all([
          githubClient.getReposWithActivity(),
          githubClient.getActionsUsage(),
        ]);

        githubData.status.available = true;
        githubData.repoCount = repos.length;

        // Consider repos active if pushed to in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        githubData.activeRepos = repos.filter(
          r => new Date(r.pushedAt) > thirtyDaysAgo
        ).length;

        // Count open PRs and issues from activity data
        githubData.openPRs = repos.reduce((count, repo) => {
          const activity = (repo as any).activity;
          if (activity?.pullRequests) {
            return count + activity.pullRequests.filter((pr: any) => pr.state === 'open').length;
          }
          return count;
        }, 0);

        githubData.openIssues = repos.reduce((sum, r) => sum + r.openIssues, 0);
        githubData.costs.actionsMinutes = costs.actionsMinutes;
        githubData.costs.actionsMinutesLimit = costs.actionsMinutesLimit;
        githubData.costs.total = costs.total;
      } catch (error) {
        githubData.status.error = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`GitHub: ${githubData.status.error}`);
      }
    } else {
      warnings.push('GitHub: Not configured (GITHUB_TOKEN missing)');
    }

    // Fetch GCloud data
    const gcloudClient = createGCloudClient();
    if (gcloudClient) {
      gcloudData.status.configured = true;
      try {
        const data = await gcloudClient.getProjectsWithDetails();

        gcloudData.status.available = true;
        gcloudData.projectCount = data.projects.length;
        gcloudData.activeProjects = data.projects.filter(p => p.state === 'ACTIVE').length;

        // Count running instances across all projects
        gcloudData.runningInstances = Object.values(data.instances).reduce(
          (count, instances) => count + instances.filter(i => i.status === 'RUNNING').length,
          0
        );

        // Count enabled services across all projects
        gcloudData.enabledServices = Object.values(data.services).reduce(
          (count, services) => count + services.filter(s => s.state === 'ENABLED').length,
          0
        );

        // Sum costs across all projects
        gcloudData.costs.total = Object.values(data.costs).reduce(
          (sum, cost) => sum + cost.netTotal,
          0
        );
      } catch (error) {
        gcloudData.status.error = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Google Cloud: ${gcloudData.status.error}`);
      }
    } else {
      warnings.push('Google Cloud: Not configured (GCLOUD_CREDENTIALS missing)');
    }

    // Calculate summary
    const totalCost = vercelData.costs.total + githubData.costs.total + gcloudData.costs.total;
    const totalProjects = vercelData.projectCount + githubData.repoCount + gcloudData.projectCount;
    const healthyServices =
      vercelData.productionDeployments +
      githubData.activeRepos +
      gcloudData.runningInstances;

    const summary: InfrastructureSummary = {
      vercel: vercelData,
      github: githubData,
      gcloud: gcloudData,
      summary: {
        totalCost,
        currency: 'USD',
        totalProjects,
        healthyServices,
        warnings,
      },
      timestamp: new Date().toISOString(),
    };

    // Cache the summary
    infrastructureCache.set(cacheKey, summary, CACHE_TTL.summary);

    return NextResponse.json({
      success: true,
      data: summary,
      cached: false,
    });
  } catch (error) {
    console.error('Infrastructure summary error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SUMMARY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch infrastructure summary',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

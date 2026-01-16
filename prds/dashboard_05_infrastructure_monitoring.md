# PRD: Infrastructure Monitoring Dashboard

## Overview

Build a comprehensive infrastructure monitoring system integrated into the claude-manager dashboard that automatically tracks and displays all deployments, costs, and status across Vercel, GitHub, and Google Cloud Platform. Provide real-time visibility into what's running in production, how much it costs, and quick links to manage everything.

## Goals

1. Single pane of glass for all infrastructure
2. Real-time deployment status across platforms
3. Cost tracking and budget alerts
4. Quick access links to all platform consoles
5. GitHub repository health monitoring
6. Automated daily updates with minimal API calls
7. Historical cost and deployment trends

## Target Directory

`/Users/alexander/claude-manager-worker/dashboard/`

## User Stories

### As a developer, I want to:
1. See all my Vercel deployments and their production status
2. Monitor costs for Vercel, GitHub, and GCloud in one place
3. View GitHub repo activity (commits, PRs, issues)
4. Check GCloud service status and costs
5. Get alerts when costs exceed budget
6. Click links to jump directly to any console
7. See deployment history and trends
8. Track which repos are deployed where
9. Monitor build success/failure rates
10. Compare costs month-over-month

## Technical Requirements

### Architecture

```
dashboard/
  app/
    api/
      infrastructure/
        vercel/
          route.ts              # GET deployments, projects, costs
        github/
          route.ts              # GET repos, activity, PRs
        gcloud/
          route.ts              # GET projects, services, costs
        summary/
          route.ts              # GET aggregated view
      refresh/
        route.ts                # POST trigger manual refresh
    infrastructure/
      page.tsx                  # Main infrastructure dashboard
      [platform]/
        page.tsx                # Platform-specific detailed view
  components/
    infrastructure/
      DeploymentCard.tsx        # Deployment status card
      CostChart.tsx             # Cost visualization
      RepoCard.tsx              # GitHub repo card
      ServiceCard.tsx           # GCloud service card
      PlatformSummary.tsx       # Platform overview
      QuickLinks.tsx            # Console quick links
  lib/
    api/
      vercel-client.ts          # Vercel API client
      github-client.ts          # GitHub API client
      gcloud-client.ts          # GCloud API client
    cache/
      infrastructure-cache.ts   # Cache layer for API data
    db/
      infrastructure-schema.sql # Database schema
```

### 1. Vercel Integration

**API Client:**
```typescript
// lib/api/vercel-client.ts
import { Vercel } from '@vercel/sdk';

export interface VercelDeployment {
  id: string;
  name: string;
  url: string;
  state: 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | 'CANCELED';
  target: 'production' | 'preview';
  createdAt: number;
  readyState: string;
  inspectorUrl: string;
  projectId: string;
  projectName: string;
  githubRepo?: string;
  githubCommitSha?: string;
  buildingAt?: number;
  ready?: number;
}

export interface VercelProject {
  id: string;
  name: string;
  framework: string;
  link?: {
    type: 'github';
    repo: string;
  };
  latestDeployments: VercelDeployment[];
  productionDeployment: VercelDeployment;
  targets: {
    production: {
      domain: string;
      url: string;
    };
  };
}

export interface VercelCost {
  month: string;
  bandwidth: number;
  buildExecution: number;
  serverlessFunctionExecution: number;
  total: number;
  currency: 'USD';
}

export class VercelClient {
  private client: Vercel;

  constructor(token: string) {
    this.client = new Vercel({ bearerToken: token });
  }

  async getProjects(): Promise<VercelProject[]> {
    // Fetch all projects with latest deployments
    const { projects } = await this.client.projects.getProjects();
    return projects.map(this.transformProject);
  }

  async getDeployments(projectId?: string): Promise<VercelDeployment[]> {
    // Fetch deployments, optionally filtered by project
    const params = projectId ? { projectId } : {};
    const { deployments } = await this.client.deployments.getDeployments(params);
    return deployments;
  }

  async getCurrentCosts(): Promise<VercelCost> {
    // Fetch current month usage and costs
    // Use /v1/integrations/usage endpoint
    const response = await fetch('https://api.vercel.com/v1/integrations/usage', {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    const data = await response.json();
    return this.calculateCosts(data);
  }

  async getHistoricalCosts(months: number = 6): Promise<VercelCost[]> {
    // Fetch cost history for trend analysis
    const costs: VercelCost[] = [];

    for (let i = 0; i < months; i++) {
      const month = this.getMonthOffset(i);
      const cost = await this.getCostsForMonth(month);
      costs.push(cost);
    }

    return costs;
  }
}
```

**Data to Track:**
- All projects
- Production vs preview deployments
- Build times and success rates
- Deployment frequency
- Bandwidth usage
- Function execution costs
- Edge config usage
- Current month costs vs budget

### 2. GitHub Integration

**API Client:**
```typescript
// lib/api/github-client.ts
import { Octokit } from '@octokit/rest';

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  private: boolean;
  defaultBranch: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  size: number;
  updatedAt: string;
  pushedAt: string;
  topics: string[];
  visibility: 'public' | 'private';
  deployedTo?: {
    vercel?: string[];
    gcloud?: string[];
  };
}

export interface GitHubActivity {
  repoName: string;
  commits: {
    sha: string;
    message: string;
    author: string;
    date: string;
    url: string;
  }[];
  pullRequests: {
    number: number;
    title: string;
    state: 'open' | 'closed' | 'merged';
    url: string;
    createdAt: string;
  }[];
  issues: {
    number: number;
    title: string;
    state: 'open' | 'closed';
    url: string;
    createdAt: string;
  }[];
}

export interface GitHubCost {
  month: string;
  actionsMinutes: number;
  storageGB: number;
  lfsDataGB: number;
  total: number;
  currency: 'USD';
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getRepositories(): Promise<GitHubRepo[]> {
    // Fetch all user/org repos
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    });

    return data.map(this.transformRepo);
  }

  async getRecentActivity(
    owner: string,
    repo: string,
    days: number = 7
  ): Promise<GitHubActivity> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Fetch commits
    const { data: commits } = await this.octokit.repos.listCommits({
      owner,
      repo,
      since: since.toISOString(),
      per_page: 10,
    });

    // Fetch PRs
    const { data: pullRequests } = await this.octokit.pulls.list({
      owner,
      repo,
      state: 'all',
      sort: 'updated',
      per_page: 10,
    });

    // Fetch issues
    const { data: issues } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      sort: 'updated',
      per_page: 10,
    });

    return {
      repoName: `${owner}/${repo}`,
      commits: commits.map(c => ({
        sha: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
      })),
      pullRequests,
      issues,
    };
  }

  async getActionsUsage(): Promise<GitHubCost> {
    // Fetch GitHub Actions usage and costs
    // For orgs: GET /orgs/{org}/settings/billing/actions
    // For users: GET /users/{username}/settings/billing/actions

    const { data } = await this.octokit.billing.getGithubActionsBillingUser({
      username: 'alexander', // or from env
    });

    return {
      month: new Date().toISOString().slice(0, 7),
      actionsMinutes: data.total_minutes_used,
      storageGB: data.total_paid_minutes_used,
      lfsDataGB: 0, // Separate API call if needed
      total: data.total_minutes_used * 0.008, // $0.008 per minute
      currency: 'USD',
    };
  }
}
```

**Data to Track:**
- All repositories
- Recent commits (last 7 days)
- Open PRs and issues
- GitHub Actions usage
- Actions minutes consumed
- Package storage usage
- LFS data usage
- Workflow success/failure rates

### 3. Google Cloud Integration

**API Client:**
```typescript
// lib/api/gcloud-client.ts
import { google } from 'googleapis';

export interface GCloudProject {
  projectId: string;
  name: string;
  projectNumber: string;
  state: 'ACTIVE' | 'DELETE_REQUESTED';
  createTime: string;
  labels: Record<string, string>;
}

export interface GCloudService {
  projectId: string;
  serviceName: string;
  displayName: string;
  state: 'ENABLED' | 'DISABLED';
  config: {
    name: string;
    title: string;
    documentation: string;
  };
}

export interface GCloudCost {
  projectId: string;
  month: string;
  services: {
    serviceName: string;
    displayName: string;
    cost: number;
    usage: {
      metric: string;
      amount: number;
      unit: string;
    }[];
  }[];
  total: number;
  currency: 'USD';
  credits: number;
  netTotal: number; // total - credits
}

export interface GCloudInstance {
  projectId: string;
  zone: string;
  name: string;
  machineType: string;
  status: 'RUNNING' | 'STOPPED' | 'TERMINATED';
  internalIP: string;
  externalIP?: string;
  createdAt: string;
  labels: Record<string, string>;
}

export class GCloudClient {
  private auth: any;
  private cloudresourcemanager: any;
  private serviceusage: any;
  private cloudbilling: any;
  private compute: any;

  constructor(credentials: string) {
    this.auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform.read-only',
        'https://www.googleapis.com/auth/cloud-billing.readonly',
      ],
    });

    this.cloudresourcemanager = google.cloudresourcemanager({
      version: 'v1',
      auth: this.auth,
    });

    this.serviceusage = google.serviceusage({
      version: 'v1',
      auth: this.auth,
    });

    this.cloudbilling = google.cloudbilling({
      version: 'v1',
      auth: this.auth,
    });

    this.compute = google.compute({
      version: 'v1',
      auth: this.auth,
    });
  }

  async getProjects(): Promise<GCloudProject[]> {
    const { data } = await this.cloudresourcemanager.projects.list();
    return data.projects || [];
  }

  async getEnabledServices(projectId: string): Promise<GCloudService[]> {
    const { data } = await this.serviceusage.services.list({
      parent: `projects/${projectId}`,
      filter: 'state:ENABLED',
    });

    return (data.services || []).map(s => ({
      projectId,
      serviceName: s.name,
      displayName: s.config.title,
      state: s.state,
      config: s.config,
    }));
  }

  async getCurrentCosts(projectId: string): Promise<GCloudCost> {
    // Use Cloud Billing API to get current month costs
    const billingAccountName = await this.getBillingAccount(projectId);

    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    const { data } = await this.cloudbilling.billingAccounts.projects.exportCostData({
      name: billingAccountName,
      requestBody: {
        query: {
          filters: {
            projectIds: [projectId],
          },
          dateRange: {
            startDate: this.formatDate(startDate),
            endDate: this.formatDate(endDate),
          },
          groupBy: ['service'],
        },
      },
    });

    return this.transformCostData(projectId, data);
  }

  async getComputeInstances(projectId: string): Promise<GCloudInstance[]> {
    const instances: GCloudInstance[] = [];

    // List all zones
    const { data: zoneData } = await this.compute.zones.list({ project: projectId });
    const zones = zoneData.items || [];

    // Get instances from each zone
    for (const zone of zones) {
      try {
        const { data } = await this.compute.instances.list({
          project: projectId,
          zone: zone.name,
        });

        if (data.items) {
          instances.push(...data.items.map(i => this.transformInstance(projectId, zone.name, i)));
        }
      } catch (err) {
        // Zone might not have instances
        continue;
      }
    }

    return instances;
  }

  async getHistoricalCosts(
    projectId: string,
    months: number = 6
  ): Promise<GCloudCost[]> {
    const costs: GCloudCost[] = [];

    for (let i = 0; i < months; i++) {
      const month = this.getMonthOffset(i);
      const cost = await this.getCostsForMonth(projectId, month);
      costs.push(cost);
    }

    return costs;
  }
}
```

**Data to Track:**
- All GCP projects
- Enabled services per project
- Compute Engine instances and status
- Cloud Run services
- Cloud Functions
- Current month costs by service
- Cost breakdown and trends
- Resource quotas and usage

### 4. Caching Layer

```typescript
// lib/cache/infrastructure-cache.ts
import { Redis } from '@upstash/redis';

export class InfrastructureCache {
  private redis: Redis;
  private TTL = {
    deployments: 300, // 5 minutes
    repos: 600, // 10 minutes
    costs: 3600, // 1 hour
    projects: 3600, // 1 hour
  };

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data as string);
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const fresh = await fetcher();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  // Convenience methods
  async getVercelDeployments() {
    return this.getOrFetch(
      'vercel:deployments',
      () => new VercelClient(process.env.VERCEL_TOKEN!).getDeployments(),
      this.TTL.deployments
    );
  }

  async getGitHubRepos() {
    return this.getOrFetch(
      'github:repos',
      () => new GitHubClient(process.env.GITHUB_TOKEN!).getRepositories(),
      this.TTL.repos
    );
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear cache for pattern (e.g., 'vercel:*')
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### 5. API Routes

```typescript
// app/api/infrastructure/summary/route.ts
import { NextResponse } from 'next/server';
import { VercelClient } from '@/lib/api/vercel-client';
import { GitHubClient } from '@/lib/api/github-client';
import { GCloudClient } from '@/lib/api/gcloud-client';
import { InfrastructureCache } from '@/lib/cache/infrastructure-cache';

export async function GET() {
  try {
    const cache = new InfrastructureCache();

    // Fetch all data in parallel
    const [vercelData, githubData, gcloudData] = await Promise.all([
      cache.getOrFetch('summary:vercel', async () => {
        const client = new VercelClient(process.env.VERCEL_TOKEN!);
        const [projects, costs] = await Promise.all([
          client.getProjects(),
          client.getCurrentCosts(),
        ]);
        return { projects, costs };
      }, 300),

      cache.getOrFetch('summary:github', async () => {
        const client = new GitHubClient(process.env.GITHUB_TOKEN!);
        const [repos, costs] = await Promise.all([
          client.getRepositories(),
          client.getActionsUsage(),
        ]);
        return { repos, costs };
      }, 600),

      cache.getOrFetch('summary:gcloud', async () => {
        const client = new GCloudClient(process.env.GCLOUD_CREDENTIALS!);
        const projects = await client.getProjects();

        const costsPromises = projects.map(p => client.getCurrentCosts(p.projectId));
        const allCosts = await Promise.all(costsPromises);

        const totalCost = allCosts.reduce((sum, c) => sum + c.netTotal, 0);

        return { projects, costs: { total: totalCost, breakdown: allCosts } };
      }, 600),
    ]);

    // Calculate totals
    const totalCost =
      vercelData.costs.total +
      githubData.costs.total +
      gcloudData.costs.total;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      vercel: vercelData,
      github: githubData,
      gcloud: gcloudData,
      summary: {
        totalCost,
        currency: 'USD',
        totalProjects:
          vercelData.projects.length +
          githubData.repos.length +
          gcloudData.projects.length,
        productionDeployments: vercelData.projects.filter(
          p => p.productionDeployment?.state === 'READY'
        ).length,
        activeRepos: githubData.repos.filter(
          r => new Date(r.pushedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        gcloudActiveProjects: gcloudData.projects.filter(
          p => p.state === 'ACTIVE'
        ).length,
      },
    });
  } catch (error) {
    console.error('Infrastructure summary error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

### 6. Dashboard UI

```typescript
// app/infrastructure/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { PlatformSummary } from '@/components/infrastructure/PlatformSummary';
import { DeploymentCard } from '@/components/infrastructure/DeploymentCard';
import { CostChart } from '@/components/infrastructure/CostChart';
import { QuickLinks } from '@/components/infrastructure/QuickLinks';

interface InfrastructureData {
  vercel: {
    projects: any[];
    costs: any;
  };
  github: {
    repos: any[];
    costs: any;
  };
  gcloud: {
    projects: any[];
    costs: any;
  };
  summary: {
    totalCost: number;
    currency: string;
    totalProjects: number;
    productionDeployments: number;
    activeRepos: number;
    gcloudActiveProjects: number;
  };
  timestamp: string;
}

export default function InfrastructurePage() {
  const [data, setData] = useState<InfrastructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/infrastructure/summary');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch infrastructure data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading infrastructure data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load infrastructure data</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Infrastructure Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded ${
              autoRefresh
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {autoRefresh ? '✓ Auto-refresh' : 'Auto-refresh off'}
          </button>

          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔄 Refresh Now
          </button>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Monthly Cost
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            ${data.summary.totalCost.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{data.summary.currency}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Production Deployments
          </h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {data.summary.productionDeployments}
          </p>
          <p className="text-sm text-gray-500 mt-1">Live on Vercel</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Active Repositories
          </h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {data.summary.activeRepos}
          </p>
          <p className="text-sm text-gray-500 mt-1">Updated in last 30 days</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            GCloud Projects
          </h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
            {data.summary.gcloudActiveProjects}
          </p>
          <p className="text-sm text-gray-500 mt-1">Active projects</p>
        </div>
      </div>

      {/* Platform Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <PlatformSummary
          platform="vercel"
          title="Vercel"
          icon="▲"
          data={data.vercel}
          consoleUrl="https://vercel.com/dashboard"
        />

        <PlatformSummary
          platform="github"
          title="GitHub"
          icon="📦"
          data={data.github}
          consoleUrl="https://github.com"
        />

        <PlatformSummary
          platform="gcloud"
          title="Google Cloud"
          icon="☁️"
          data={data.gcloud}
          consoleUrl="https://console.cloud.google.com"
        />
      </div>

      {/* Cost Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Monthly Costs
        </h2>
        <CostChart data={data} />
      </div>

      {/* Deployments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Recent Deployments
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.vercel.projects.map(project => (
            <DeploymentCard
              key={project.id}
              project={project}
            />
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <QuickLinks />
    </div>
  );
}
```

### 7. Components

```typescript
// components/infrastructure/PlatformSummary.tsx
interface PlatformSummaryProps {
  platform: 'vercel' | 'github' | 'gcloud';
  title: string;
  icon: string;
  data: any;
  consoleUrl: string;
}

export function PlatformSummary({
  platform,
  title,
  icon,
  data,
  consoleUrl
}: PlatformSummaryProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>
        <a
          href={consoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          Open Console →
        </a>
      </div>

      <div className="space-y-3">
        {platform === 'vercel' && (
          <>
            <div>
              <p className="text-sm text-gray-500">Projects</p>
              <p className="text-2xl font-bold">{data.projects.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Cost</p>
              <p className="text-2xl font-bold text-green-600">
                ${data.costs.total.toFixed(2)}
              </p>
            </div>
          </>
        )}

        {platform === 'github' && (
          <>
            <div>
              <p className="text-sm text-gray-500">Repositories</p>
              <p className="text-2xl font-bold">{data.repos.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Actions Minutes</p>
              <p className="text-2xl font-bold text-blue-600">
                {data.costs.actionsMinutes}
              </p>
            </div>
          </>
        )}

        {platform === 'gcloud' && (
          <>
            <div>
              <p className="text-sm text-gray-500">Projects</p>
              <p className="text-2xl font-bold">{data.projects.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Cost</p>
              <p className="text-2xl font-bold text-orange-600">
                ${data.costs.total.toFixed(2)}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <a
          href={`/infrastructure/${platform}`}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          View Details →
        </a>
      </div>
    </div>
  );
}
```

### Environment Variables Required

```bash
# .env.local
VERCEL_TOKEN=your_vercel_token
GITHUB_TOKEN=your_github_token
GCLOUD_CREDENTIALS={"type":"service_account",...}
UPSTASH_REDIS_URL=your_redis_url
UPSTASH_REDIS_TOKEN=your_redis_token
```

## Acceptance Criteria

1. [ ] Vercel API integration fetches all projects and deployments
2. [ ] GitHub API integration fetches all repos and activity
3. [ ] GCloud API integration fetches all projects and services
4. [ ] Cost tracking works for all three platforms
5. [ ] Dashboard displays aggregated summary view
6. [ ] Real-time updates every 60 seconds
7. [ ] Manual refresh button works
8. [ ] Quick links to all platform consoles
9. [ ] Cost chart shows historical trends
10. [ ] Deployment cards show production status
11. [ ] Caching layer reduces API calls
12. [ ] Error handling for API failures
13. [ ] Dark mode support
14. [ ] Mobile responsive design
15. [ ] Database stores historical data

## Out of Scope (v1)

- AWS integration
- Azure integration
- Slack/email alerts for cost spikes
- Budget management and forecasting
- Automated cost optimization suggestions
- Multi-user authentication
- Team collaboration features
- Custom dashboards per user

## Implementation Phases

### Phase 1: Foundation (5 iterations)
- Project structure
- API client scaffolding
- Environment configuration
- Database schema
- Basic UI layout

### Phase 2: Vercel Integration (5 iterations)
- Vercel API client implementation
- Deployment fetching
- Cost calculation
- Deployment cards UI
- Console links

### Phase 3: GitHub Integration (5 iterations)
- GitHub API client implementation
- Repository fetching
- Activity tracking
- Repo cards UI
- Actions usage tracking

### Phase 4: GCloud Integration (7 iterations)
- GCloud API client implementation
- Project and service fetching
- Cost breakdown
- Instance monitoring
- Service cards UI

### Phase 5: Dashboard & Polish (5 iterations)
- Summary view aggregation
- Cost chart implementation
- Caching layer
- Auto-refresh
- Error handling
- Mobile responsiveness

## Technical Notes

### Rate Limiting
- Vercel: 100 requests per 10 seconds
- GitHub: 5,000 requests per hour (authenticated)
- GCloud: Varies by API (typically 100-1000 per 100 seconds)

### Caching Strategy
- Cache all GET requests
- Use Redis for fast lookups
- TTL based on data volatility
- Invalidate on manual refresh

### Cost Calculation
Each platform provides different APIs:
- **Vercel:** Usage API returns bandwidth, build minutes, function invocations
- **GitHub:** Billing API returns Actions minutes, storage, LFS data
- **GCloud:** Cloud Billing API returns detailed cost breakdown by service

### Security
- Store API tokens in environment variables
- Never expose tokens in client-side code
- Use server-side API routes only
- Implement rate limiting on API routes
- Validate all input data

## Priority

**High** - Provides critical visibility into infrastructure costs and status.

## Estimated Complexity

**High** - Multiple API integrations, complex data aggregation, real-time updates, cost tracking.

## Success Metrics

- All platforms integrated and displaying data
- Cost tracking accurate to within $1
- Page load time < 2 seconds
- API response time < 500ms (cached)
- 99% uptime for monitoring
- Zero exposed credentials

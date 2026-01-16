/**
 * GitHub API Client
 * Fetches repositories, activity, and Actions usage from GitHub
 */

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  htmlUrl: string;
  private: boolean;
  defaultBranch: string;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  size: number;
  updatedAt: string;
  pushedAt: string;
  createdAt: string;
  topics: string[];
  visibility: 'public' | 'private' | 'internal';
  archived: boolean;
  disabled: boolean;
  deployedTo?: {
    vercel?: string[];
    gcloud?: string[];
  };
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
  url: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  url: string;
  createdAt: string;
  updatedAt: string;
  author: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  url: string;
  createdAt: string;
  updatedAt: string;
  author: string;
  labels: string[];
}

export interface GitHubActivity {
  repoFullName: string;
  commits: GitHubCommit[];
  pullRequests: GitHubPullRequest[];
  issues: GitHubIssue[];
}

export interface GitHubCost {
  month: string;
  actionsMinutes: number;
  actionsMinutesLimit: number;
  storageGB: number;
  storageLimitGB: number;
  packagesDataGB: number;
  lfsDataGB: number;
  total: number;
  currency: 'USD';
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  workflowName: string;
  branch: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  runNumber: number;
}

export class GitHubClient {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string) {
    this.token = token;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getAuthenticatedUser(): Promise<{ login: string; name: string; id: number }> {
    return this.fetch('/user');
  }

  async getRepositories(options: {
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  } = {}): Promise<GitHubRepo[]> {
    const params = new URLSearchParams();
    params.set('sort', options.sort || 'updated');
    params.set('direction', options.direction || 'desc');
    params.set('per_page', String(options.perPage || 100));
    if (options.page) params.set('page', String(options.page));

    const data = await this.fetch<any[]>(`/user/repos?${params.toString()}`);

    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.url,
      htmlUrl: repo.html_url,
      private: repo.private,
      defaultBranch: repo.default_branch,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      size: repo.size,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      createdAt: repo.created_at,
      topics: repo.topics || [],
      visibility: repo.visibility,
      archived: repo.archived,
      disabled: repo.disabled,
    }));
  }

  async getRecentCommits(
    owner: string,
    repo: string,
    options: { since?: string; perPage?: number } = {}
  ): Promise<GitHubCommit[]> {
    const params = new URLSearchParams();
    if (options.since) params.set('since', options.since);
    params.set('per_page', String(options.perPage || 10));

    const query = params.toString() ? `?${params.toString()}` : '';

    try {
      const data = await this.fetch<any[]>(`/repos/${owner}/${repo}/commits${query}`);

      return data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message.split('\n')[0], // First line only
        author: commit.commit.author?.name || 'Unknown',
        authorEmail: commit.commit.author?.email || '',
        date: commit.commit.author?.date || '',
        url: commit.html_url,
      }));
    } catch {
      return [];
    }
  }

  async getPullRequests(
    owner: string,
    repo: string,
    options: { state?: 'open' | 'closed' | 'all'; perPage?: number } = {}
  ): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams();
    params.set('state', options.state || 'all');
    params.set('sort', 'updated');
    params.set('direction', 'desc');
    params.set('per_page', String(options.perPage || 10));

    try {
      const data = await this.fetch<any[]>(`/repos/${owner}/${repo}/pulls?${params.toString()}`);

      return data.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        merged: pr.merged_at !== null,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        author: pr.user?.login || 'Unknown',
      }));
    } catch {
      return [];
    }
  }

  async getIssues(
    owner: string,
    repo: string,
    options: { state?: 'open' | 'closed' | 'all'; perPage?: number } = {}
  ): Promise<GitHubIssue[]> {
    const params = new URLSearchParams();
    params.set('state', options.state || 'all');
    params.set('sort', 'updated');
    params.set('direction', 'desc');
    params.set('per_page', String(options.perPage || 10));

    try {
      const data = await this.fetch<any[]>(`/repos/${owner}/${repo}/issues?${params.toString()}`);

      // Filter out pull requests (GitHub returns PRs as issues)
      return data
        .filter(issue => !issue.pull_request)
        .map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          url: issue.html_url,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          author: issue.user?.login || 'Unknown',
          labels: issue.labels?.map((l: any) => l.name) || [],
        }));
    } catch {
      return [];
    }
  }

  async getRepoActivity(owner: string, repo: string, days: number = 7): Promise<GitHubActivity> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [commits, pullRequests, issues] = await Promise.all([
      this.getRecentCommits(owner, repo, { since: since.toISOString(), perPage: 10 }),
      this.getPullRequests(owner, repo, { state: 'all', perPage: 10 }),
      this.getIssues(owner, repo, { state: 'all', perPage: 10 }),
    ]);

    return {
      repoFullName: `${owner}/${repo}`,
      commits,
      pullRequests,
      issues,
    };
  }

  async getWorkflowRuns(
    owner: string,
    repo: string,
    options: { perPage?: number } = {}
  ): Promise<GitHubWorkflowRun[]> {
    const params = new URLSearchParams();
    params.set('per_page', String(options.perPage || 10));

    try {
      const data = await this.fetch<{ workflow_runs: any[] }>(
        `/repos/${owner}/${repo}/actions/runs?${params.toString()}`
      );

      return (data.workflow_runs || []).map(run => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        workflowName: run.name,
        branch: run.head_branch,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        url: run.html_url,
        runNumber: run.run_number,
      }));
    } catch {
      return [];
    }
  }

  async getActionsUsage(): Promise<GitHubCost> {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);

    try {
      // Try to get billing info for authenticated user
      const user = await this.getAuthenticatedUser();
      const billing = await this.fetch<any>(`/users/${user.login}/settings/billing/actions`);

      const minutesUsed = billing.total_minutes_used || 0;
      const minutesLimit = billing.included_minutes || 2000;

      // GitHub Actions pricing: $0.008 per minute (Linux)
      const actionsMinutesCost = Math.max(0, minutesUsed - minutesLimit) * 0.008;

      return {
        month,
        actionsMinutes: minutesUsed,
        actionsMinutesLimit: minutesLimit,
        storageGB: billing.total_paid_minutes_used || 0,
        storageLimitGB: 0.5, // Default free tier
        packagesDataGB: 0,
        lfsDataGB: 0,
        total: actionsMinutesCost,
        currency: 'USD',
      };
    } catch {
      // Return defaults if billing unavailable
      return {
        month,
        actionsMinutes: 0,
        actionsMinutesLimit: 2000,
        storageGB: 0,
        storageLimitGB: 0.5,
        packagesDataGB: 0,
        lfsDataGB: 0,
        total: 0,
        currency: 'USD',
      };
    }
  }

  async getReposWithActivity(): Promise<(GitHubRepo & { activity?: GitHubActivity })[]> {
    const repos = await this.getRepositories({ perPage: 20 });

    // Get activity for top 5 most recently updated repos
    const reposWithActivity = await Promise.all(
      repos.slice(0, 5).map(async (repo) => {
        try {
          const [owner, name] = repo.fullName.split('/');
          const activity = await this.getRepoActivity(owner, name, 7);
          return { ...repo, activity };
        } catch {
          return repo;
        }
      })
    );

    // Return all repos, with activity for the first 5
    return [
      ...reposWithActivity,
      ...repos.slice(5),
    ];
  }
}

// Factory function for creating client
export function createGitHubClient(): GitHubClient | null {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('GITHUB_TOKEN not set');
    return null;
  }
  return new GitHubClient(token);
}

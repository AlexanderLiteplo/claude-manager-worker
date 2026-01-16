/**
 * Vercel API Client
 * Fetches projects, deployments, and cost data from Vercel
 */

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
  projectName?: string;
  githubRepo?: string;
  githubCommitSha?: string;
  buildingAt?: number;
  ready?: number;
}

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  link?: {
    type: 'github';
    repo: string;
  };
  latestDeployments?: VercelDeployment[];
  productionDeployment?: VercelDeployment;
  targets?: {
    production?: {
      alias?: string[];
      url?: string;
    };
  };
  updatedAt: number;
  createdAt: number;
}

export interface VercelCost {
  month: string;
  bandwidth: number;
  buildExecution: number;
  serverlessFunctionExecution: number;
  edgeFunctionExecution: number;
  total: number;
  currency: 'USD';
}

export interface VercelUsage {
  bandwidth: {
    amount: number;
    limit: number;
    unit: string;
  };
  buildExecution: {
    amount: number;
    limit: number;
    unit: string;
  };
  serverlessFunctionExecution: {
    amount: number;
    limit: number;
    unit: string;
  };
}

export class VercelClient {
  private token: string;
  private baseUrl = 'https://api.vercel.com';

  constructor(token: string) {
    this.token = token;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vercel API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getProjects(): Promise<VercelProject[]> {
    const data = await this.fetch<{ projects: VercelProject[] }>('/v9/projects');
    return data.projects || [];
  }

  async getProject(projectId: string): Promise<VercelProject> {
    return this.fetch<VercelProject>(`/v9/projects/${projectId}`);
  }

  async getDeployments(options: {
    projectId?: string;
    target?: 'production' | 'preview';
    limit?: number;
  } = {}): Promise<VercelDeployment[]> {
    const params = new URLSearchParams();
    if (options.projectId) params.set('projectId', options.projectId);
    if (options.target) params.set('target', options.target);
    if (options.limit) params.set('limit', String(options.limit));

    const query = params.toString() ? `?${params.toString()}` : '';
    const data = await this.fetch<{ deployments: VercelDeployment[] }>(`/v6/deployments${query}`);
    return data.deployments || [];
  }

  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    return this.fetch<VercelDeployment>(`/v13/deployments/${deploymentId}`);
  }

  async getUsage(): Promise<VercelUsage> {
    // Note: This endpoint may require specific team/user context
    // For personal accounts, use /v2/usage
    try {
      const data = await this.fetch<any>('/v2/usage');
      return {
        bandwidth: {
          amount: data.bandwidth?.value || 0,
          limit: data.bandwidth?.limit || 100,
          unit: 'GB',
        },
        buildExecution: {
          amount: data.buildMinutes?.value || 0,
          limit: data.buildMinutes?.limit || 6000,
          unit: 'minutes',
        },
        serverlessFunctionExecution: {
          amount: data.serverlessFunctionExecution?.value || 0,
          limit: data.serverlessFunctionExecution?.limit || 100,
          unit: 'GB-hours',
        },
      };
    } catch {
      // Return defaults if usage endpoint fails
      return {
        bandwidth: { amount: 0, limit: 100, unit: 'GB' },
        buildExecution: { amount: 0, limit: 6000, unit: 'minutes' },
        serverlessFunctionExecution: { amount: 0, limit: 100, unit: 'GB-hours' },
      };
    }
  }

  async getCurrentCosts(): Promise<VercelCost> {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);

    // Try to get actual billing data
    try {
      const usage = await this.getUsage();

      // Estimate costs based on usage (rough estimates based on Vercel pricing)
      // Note: Actual costs depend on your plan and overage rates
      const bandwidthCost = Math.max(0, usage.bandwidth.amount - 100) * 0.15; // $0.15/GB after free tier
      const buildCost = Math.max(0, usage.buildExecution.amount - 6000) * 0.01; // $0.01/min after free tier
      const serverlessCost = Math.max(0, usage.serverlessFunctionExecution.amount - 100) * 0.18; // $0.18/GB-hour

      return {
        month,
        bandwidth: bandwidthCost,
        buildExecution: buildCost,
        serverlessFunctionExecution: serverlessCost,
        edgeFunctionExecution: 0,
        total: bandwidthCost + buildCost + serverlessCost,
        currency: 'USD',
      };
    } catch {
      // Return zero costs if billing unavailable
      return {
        month,
        bandwidth: 0,
        buildExecution: 0,
        serverlessFunctionExecution: 0,
        edgeFunctionExecution: 0,
        total: 0,
        currency: 'USD',
      };
    }
  }

  async getHistoricalCosts(months: number = 6): Promise<VercelCost[]> {
    const costs: VercelCost[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toISOString().slice(0, 7);

      // Note: Historical data would require billing API access
      // For now, return placeholders
      costs.push({
        month,
        bandwidth: 0,
        buildExecution: 0,
        serverlessFunctionExecution: 0,
        edgeFunctionExecution: 0,
        total: 0,
        currency: 'USD',
      });
    }

    return costs.reverse();
  }

  async getProjectsWithDeployments(): Promise<VercelProject[]> {
    const projects = await this.getProjects();

    // Fetch recent deployments for each project
    const projectsWithDeployments = await Promise.all(
      projects.slice(0, 10).map(async (project) => {
        try {
          const deployments = await this.getDeployments({
            projectId: project.id,
            limit: 5,
          });

          const productionDeployment = deployments.find(d => d.target === 'production' && d.state === 'READY');

          return {
            ...project,
            latestDeployments: deployments,
            productionDeployment,
          };
        } catch {
          return project;
        }
      })
    );

    return projectsWithDeployments;
  }
}

// Factory function for creating client
export function createVercelClient(): VercelClient | null {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.warn('VERCEL_TOKEN not set');
    return null;
  }
  return new VercelClient(token);
}

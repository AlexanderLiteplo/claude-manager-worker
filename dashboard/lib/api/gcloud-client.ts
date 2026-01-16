/**
 * Google Cloud API Client
 * Fetches projects, services, and cost data from GCP
 */

export interface GCloudProject {
  projectId: string;
  name: string;
  projectNumber: string;
  state: 'ACTIVE' | 'DELETE_REQUESTED' | 'DELETE_IN_PROGRESS';
  createTime: string;
  labels: Record<string, string>;
}

export interface GCloudService {
  projectId: string;
  serviceName: string;
  displayName: string;
  state: 'ENABLED' | 'DISABLED';
  documentation?: {
    summary?: string;
  };
}

export interface GCloudServiceCost {
  serviceName: string;
  displayName: string;
  cost: number;
  usage: {
    metric: string;
    amount: number;
    unit: string;
  }[];
}

export interface GCloudCost {
  projectId: string;
  month: string;
  services: GCloudServiceCost[];
  total: number;
  currency: 'USD';
  credits: number;
  netTotal: number;
}

export interface GCloudInstance {
  projectId: string;
  zone: string;
  name: string;
  machineType: string;
  status: 'RUNNING' | 'STOPPED' | 'TERMINATED' | 'STAGING' | 'PROVISIONING' | 'SUSPENDED';
  internalIP: string;
  externalIP?: string;
  createdAt: string;
  labels: Record<string, string>;
}

export interface GCloudCloudRunService {
  projectId: string;
  name: string;
  region: string;
  url: string;
  status: 'READY' | 'FAILED' | 'UNKNOWN';
  lastDeployedAt: string;
  trafficPercent: number;
}

export interface GCloudCloudFunction {
  projectId: string;
  name: string;
  region: string;
  runtime: string;
  status: 'ACTIVE' | 'OFFLINE' | 'DEPLOY_IN_PROGRESS';
  entryPoint: string;
  trigger: string;
  lastDeployedAt: string;
}

interface GCloudCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

export class GCloudClient {
  private credentials: GCloudCredentials;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(credentialsJson: string) {
    this.credentials = JSON.parse(credentialsJson);
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    // Create JWT for service account authentication
    const jwt = await this.createJwt();

    // Exchange JWT for access token
    const response = await fetch(this.credentials.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get GCloud access token: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    return this.accessToken!;
  }

  private async createJwt(): Promise<string> {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.credentials.client_email,
      sub: this.credentials.client_email,
      aud: this.credentials.token_uri,
      iat: now,
      exp: now + 3600,
      scope: [
        'https://www.googleapis.com/auth/cloud-platform.read-only',
        'https://www.googleapis.com/auth/cloud-billing.readonly',
        'https://www.googleapis.com/auth/compute.readonly',
      ].join(' '),
    };

    // Base64url encode
    const base64urlEncode = (obj: object) => {
      return Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    const headerEncoded = base64urlEncode(header);
    const payloadEncoded = base64urlEncode(payload);
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;

    // Sign with private key
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(this.credentials.private_key, 'base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return `${signatureInput}.${signature}`;
  }

  private async fetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GCloud API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getProjects(): Promise<GCloudProject[]> {
    try {
      const data = await this.fetch<{ projects: any[] }>(
        'https://cloudresourcemanager.googleapis.com/v1/projects'
      );

      return (data.projects || []).map(project => ({
        projectId: project.projectId,
        name: project.name,
        projectNumber: project.projectNumber,
        state: project.lifecycleState,
        createTime: project.createTime,
        labels: project.labels || {},
      }));
    } catch {
      // Return default project from credentials if API fails
      return [{
        projectId: this.credentials.project_id,
        name: this.credentials.project_id,
        projectNumber: '',
        state: 'ACTIVE',
        createTime: '',
        labels: {},
      }];
    }
  }

  async getEnabledServices(projectId: string): Promise<GCloudService[]> {
    try {
      const data = await this.fetch<{ services: any[] }>(
        `https://serviceusage.googleapis.com/v1/projects/${projectId}/services?filter=state:ENABLED`
      );

      return (data.services || []).map(service => {
        const name = service.name || '';
        const serviceName = name.split('/').pop() || name;

        return {
          projectId,
          serviceName,
          displayName: service.config?.title || serviceName,
          state: service.state,
          documentation: service.config?.documentation,
        };
      });
    } catch {
      return [];
    }
  }

  async getComputeInstances(projectId: string): Promise<GCloudInstance[]> {
    try {
      const data = await this.fetch<{ items: Record<string, { instances: any[] }> }>(
        `https://compute.googleapis.com/compute/v1/projects/${projectId}/aggregated/instances`
      );

      const instances: GCloudInstance[] = [];

      for (const [zonePath, zoneData] of Object.entries(data.items || {})) {
        if (!zoneData.instances) continue;

        const zone = zonePath.replace('zones/', '');

        for (const instance of zoneData.instances) {
          instances.push({
            projectId,
            zone,
            name: instance.name,
            machineType: instance.machineType?.split('/').pop() || 'unknown',
            status: instance.status,
            internalIP: instance.networkInterfaces?.[0]?.networkIP || '',
            externalIP: instance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP,
            createdAt: instance.creationTimestamp,
            labels: instance.labels || {},
          });
        }
      }

      return instances;
    } catch {
      return [];
    }
  }

  async getCloudRunServices(projectId: string): Promise<GCloudCloudRunService[]> {
    try {
      // List all regions for Cloud Run
      const regions = ['us-central1', 'us-east1', 'us-west1', 'europe-west1', 'asia-east1'];
      const services: GCloudCloudRunService[] = [];

      for (const region of regions) {
        try {
          const data = await this.fetch<{ items: any[] }>(
            `https://run.googleapis.com/v2/projects/${projectId}/locations/${region}/services`
          );

          for (const service of data.items || []) {
            services.push({
              projectId,
              name: service.name?.split('/').pop() || service.name,
              region,
              url: service.uri || '',
              status: service.conditions?.find((c: any) => c.type === 'Ready')?.state === 'CONDITION_SUCCEEDED'
                ? 'READY'
                : 'UNKNOWN',
              lastDeployedAt: service.updateTime || '',
              trafficPercent: 100,
            });
          }
        } catch {
          // Region might not have Cloud Run enabled
          continue;
        }
      }

      return services;
    } catch {
      return [];
    }
  }

  async getCurrentCosts(projectId: string): Promise<GCloudCost> {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);

    // Note: Actual billing data requires Cloud Billing API and billing account access
    // For now, return estimated costs based on enabled services
    try {
      const services = await this.getEnabledServices(projectId);
      const instances = await this.getComputeInstances(projectId);

      const serviceCosts: GCloudServiceCost[] = [];
      let total = 0;

      // Estimate compute costs
      if (instances.length > 0) {
        const runningInstances = instances.filter(i => i.status === 'RUNNING');
        const computeCost = runningInstances.length * 25; // Rough estimate: $25/instance/month

        serviceCosts.push({
          serviceName: 'compute.googleapis.com',
          displayName: 'Compute Engine',
          cost: computeCost,
          usage: [{
            metric: 'instances',
            amount: runningInstances.length,
            unit: 'instance',
          }],
        });
        total += computeCost;
      }

      // Add placeholder costs for other services
      const costlyServices = [
        'storage.googleapis.com',
        'bigquery.googleapis.com',
        'cloudfunctions.googleapis.com',
        'run.googleapis.com',
      ];

      for (const serviceId of costlyServices) {
        const service = services.find(s => s.serviceName === serviceId);
        if (service) {
          serviceCosts.push({
            serviceName: service.serviceName,
            displayName: service.displayName,
            cost: 0, // Placeholder
            usage: [],
          });
        }
      }

      return {
        projectId,
        month,
        services: serviceCosts,
        total,
        currency: 'USD',
        credits: 0,
        netTotal: total,
      };
    } catch {
      return {
        projectId,
        month,
        services: [],
        total: 0,
        currency: 'USD',
        credits: 0,
        netTotal: 0,
      };
    }
  }

  async getProjectsWithDetails(): Promise<{
    projects: GCloudProject[];
    services: Record<string, GCloudService[]>;
    instances: Record<string, GCloudInstance[]>;
    costs: Record<string, GCloudCost>;
    cloudRunServices: Record<string, GCloudCloudRunService[]>;
  }> {
    const projects = await this.getProjects();
    const activeProjects = projects.filter(p => p.state === 'ACTIVE');

    const services: Record<string, GCloudService[]> = {};
    const instances: Record<string, GCloudInstance[]> = {};
    const costs: Record<string, GCloudCost> = {};
    const cloudRunServices: Record<string, GCloudCloudRunService[]> = {};

    // Fetch details for ALL projects (they have 6, that's fine)
    await Promise.all(
      activeProjects.map(async (project) => {
        try {
          const [projectServices, projectInstances, projectCosts, projectCloudRun] = await Promise.all([
            this.getEnabledServices(project.projectId),
            this.getComputeInstances(project.projectId),
            this.getCurrentCosts(project.projectId),
            this.getCloudRunServices(project.projectId),
          ]);

          services[project.projectId] = projectServices;
          instances[project.projectId] = projectInstances;
          costs[project.projectId] = projectCosts;
          cloudRunServices[project.projectId] = projectCloudRun;
        } catch {
          services[project.projectId] = [];
          instances[project.projectId] = [];
          cloudRunServices[project.projectId] = [];
          costs[project.projectId] = {
            projectId: project.projectId,
            month: new Date().toISOString().slice(0, 7),
            services: [],
            total: 0,
            currency: 'USD',
            credits: 0,
            netTotal: 0,
          };
        }
      })
    );

    return { projects, services, instances, costs, cloudRunServices };
  }
}

// Factory function for creating client
export function createGCloudClient(): GCloudClient | null {
  const credentials = process.env.GCLOUD_CREDENTIALS;
  if (!credentials) {
    console.warn('GCLOUD_CREDENTIALS not set');
    return null;
  }
  try {
    return new GCloudClient(credentials);
  } catch (error) {
    console.error('Failed to create GCloud client:', error);
    return null;
  }
}

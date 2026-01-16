/**
 * Infrastructure Cache Layer
 * In-memory caching with TTL support for infrastructure data
 * Can be extended to use Redis for distributed caching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  deletePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton cache instance
const cache = new InMemoryCache();

// TTL configurations (in milliseconds)
export const CACHE_TTL = {
  vercel: {
    projects: 5 * 60 * 1000,      // 5 minutes
    deployments: 2 * 60 * 1000,   // 2 minutes
    costs: 30 * 60 * 1000,        // 30 minutes
  },
  github: {
    repos: 10 * 60 * 1000,        // 10 minutes
    activity: 5 * 60 * 1000,      // 5 minutes
    costs: 30 * 60 * 1000,        // 30 minutes
  },
  gcloud: {
    projects: 10 * 60 * 1000,     // 10 minutes
    services: 10 * 60 * 1000,     // 10 minutes
    instances: 5 * 60 * 1000,     // 5 minutes
    costs: 30 * 60 * 1000,        // 30 minutes
  },
  summary: 60 * 1000,             // 1 minute
};

// Cache key generators
export const CACHE_KEYS = {
  vercel: {
    projects: () => 'vercel:projects',
    deployments: (projectId?: string) =>
      projectId ? `vercel:deployments:${projectId}` : 'vercel:deployments',
    costs: () => 'vercel:costs',
    all: () => 'vercel:all',
  },
  github: {
    repos: () => 'github:repos',
    activity: (repoFullName: string) => `github:activity:${repoFullName}`,
    costs: () => 'github:costs',
    all: () => 'github:all',
  },
  gcloud: {
    projects: () => 'gcloud:projects',
    services: (projectId: string) => `gcloud:services:${projectId}`,
    instances: (projectId: string) => `gcloud:instances:${projectId}`,
    costs: (projectId: string) => `gcloud:costs:${projectId}`,
    all: () => 'gcloud:all',
  },
  summary: () => 'infrastructure:summary',
};

/**
 * Infrastructure Cache provides caching for all platform data
 */
export class InfrastructureCache {
  /**
   * Get or fetch data with caching
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const cached = cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    cache.set(key, fresh, ttlMs);
    return fresh;
  }

  /**
   * Get cached data without fetching
   */
  get<T>(key: string): T | null {
    return cache.get<T>(key);
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    cache.set(key, data, ttlMs);
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): boolean {
    return cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): number {
    return cache.deletePattern(pattern);
  }

  /**
   * Invalidate all Vercel cache entries
   */
  invalidateVercel(): void {
    cache.deletePattern('vercel:*');
  }

  /**
   * Invalidate all GitHub cache entries
   */
  invalidateGitHub(): void {
    cache.deletePattern('github:*');
  }

  /**
   * Invalidate all GCloud cache entries
   */
  invalidateGCloud(): void {
    cache.deletePattern('gcloud:*');
  }

  /**
   * Invalidate all infrastructure cache entries
   */
  invalidateAll(): void {
    cache.deletePattern('vercel:*');
    cache.deletePattern('github:*');
    cache.deletePattern('gcloud:*');
    cache.delete(CACHE_KEYS.summary());
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    cache.clear();
  }
}

// Export singleton instance
export const infrastructureCache = new InfrastructureCache();

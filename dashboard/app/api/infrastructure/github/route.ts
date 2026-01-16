import { NextResponse } from 'next/server';
import { createGitHubClient } from '@/lib/api/github-client';
import {
  infrastructureCache,
  CACHE_KEYS,
  CACHE_TTL,
} from '@/lib/cache/infrastructure-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = createGitHubClient();

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_CONFIGURED',
            message: 'GitHub integration not configured. Set GITHUB_TOKEN environment variable.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Try to get cached data first
    const cacheKey = CACHE_KEYS.github.all();
    const cached = infrastructureCache.get<{
      repos: Awaited<ReturnType<typeof client.getReposWithActivity>>;
      costs: Awaited<ReturnType<typeof client.getActionsUsage>>;
      user: Awaited<ReturnType<typeof client.getAuthenticatedUser>>;
    }>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch fresh data
    const [repos, costs, user] = await Promise.all([
      client.getReposWithActivity(),
      client.getActionsUsage(),
      client.getAuthenticatedUser(),
    ]);

    const data = { repos, costs, user };

    // Cache the result
    infrastructureCache.set(cacheKey, data, CACHE_TTL.github.repos);

    return NextResponse.json({
      success: true,
      data,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GitHub API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch GitHub data',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

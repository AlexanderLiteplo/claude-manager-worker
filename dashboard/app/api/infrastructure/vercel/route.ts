import { NextResponse } from 'next/server';
import { createVercelClient } from '@/lib/api/vercel-client';
import {
  infrastructureCache,
  CACHE_KEYS,
  CACHE_TTL,
} from '@/lib/cache/infrastructure-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = createVercelClient();

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_CONFIGURED',
            message: 'Vercel integration not configured. Set VERCEL_TOKEN environment variable.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Try to get cached data first
    const cacheKey = CACHE_KEYS.vercel.all();
    const cached = infrastructureCache.get<{
      projects: Awaited<ReturnType<typeof client.getProjectsWithDeployments>>;
      costs: Awaited<ReturnType<typeof client.getCurrentCosts>>;
      usage: Awaited<ReturnType<typeof client.getUsage>>;
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
    const [projects, costs, usage] = await Promise.all([
      client.getProjectsWithDeployments(),
      client.getCurrentCosts(),
      client.getUsage(),
    ]);

    const data = { projects, costs, usage };

    // Cache the result
    infrastructureCache.set(cacheKey, data, CACHE_TTL.vercel.projects);

    return NextResponse.json({
      success: true,
      data,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Vercel API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch Vercel data',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

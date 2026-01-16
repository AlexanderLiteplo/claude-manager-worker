import { NextResponse } from 'next/server';
import { createGCloudClient } from '@/lib/api/gcloud-client';
import {
  infrastructureCache,
  CACHE_KEYS,
  CACHE_TTL,
} from '@/lib/cache/infrastructure-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = createGCloudClient();

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_CONFIGURED',
            message: 'Google Cloud integration not configured. Set GCLOUD_CREDENTIALS environment variable.',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Try to get cached data first
    const cacheKey = CACHE_KEYS.gcloud.all();
    const cached = infrastructureCache.get<Awaited<ReturnType<typeof client.getProjectsWithDetails>>>(cacheKey);

    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch fresh data
    const data = await client.getProjectsWithDetails();

    // Cache the result
    infrastructureCache.set(cacheKey, data, CACHE_TTL.gcloud.projects);

    return NextResponse.json({
      success: true,
      data,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GCloud API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch Google Cloud data',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

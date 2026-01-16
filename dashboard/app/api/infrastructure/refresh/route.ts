import { NextRequest, NextResponse } from 'next/server';
import { infrastructureCache } from '@/lib/cache/infrastructure-cache';

export const dynamic = 'force-dynamic';

interface RefreshRequest {
  platform?: 'vercel' | 'github' | 'gcloud' | 'all';
}

export async function POST(request: NextRequest) {
  try {
    let body: RefreshRequest = { platform: 'all' };

    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Use default if body is empty or invalid
    }

    const platform = body.platform || 'all';

    // Invalidate cache based on platform
    switch (platform) {
      case 'vercel':
        infrastructureCache.invalidateVercel();
        break;
      case 'github':
        infrastructureCache.invalidateGitHub();
        break;
      case 'gcloud':
        infrastructureCache.invalidateGCloud();
        break;
      case 'all':
      default:
        infrastructureCache.invalidateAll();
        break;
    }

    return NextResponse.json({
      success: true,
      message: `Cache invalidated for: ${platform}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cache refresh error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REFRESH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to refresh cache',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

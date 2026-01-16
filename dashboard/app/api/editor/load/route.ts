import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

// Allowed base path for security
const ALLOWED_BASE = path.join(os.homedir(), 'claude-managers');

function isPathAllowed(testPath: string): boolean {
  const normalized = path.normalize(path.resolve(testPath));
  return normalized.startsWith(path.normalize(ALLOWED_BASE));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'path parameter is required' }, { status: 400 });
    }

    // Decode the path
    const decodedPath = decodeURIComponent(filePath);

    // Validate path
    if (!isPathAllowed(decodedPath)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }

    // Check file extension
    if (!decodedPath.endsWith('.md')) {
      return NextResponse.json({ error: 'Only markdown files are allowed' }, { status: 400 });
    }

    // Read the file
    try {
      const content = await fs.readFile(decodedPath, 'utf-8');
      return NextResponse.json({
        content,
        path: decodedPath,
        size: content.length,
      });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      throw err;
    }

  } catch (error) {
    console.error('Editor load error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

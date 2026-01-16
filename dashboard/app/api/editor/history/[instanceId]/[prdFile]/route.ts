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

interface Version {
  id: string;
  timestamp: string;
  content: string;
  commitMessage: string;
  author: 'user' | 'ai-command';
}

interface VersionFile {
  versions: Version[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string; prdFile: string }> }
) {
  try {
    const { instanceId, prdFile } = await params;

    // Validate parameters
    if (!instanceId || !prdFile) {
      return NextResponse.json(
        { error: 'instanceId and prdFile are required' },
        { status: 400 }
      );
    }

    // Decode and validate path
    const instancePath = decodeURIComponent(instanceId);
    if (!isPathAllowed(instancePath)) {
      return NextResponse.json({ error: 'Invalid instance path' }, { status: 403 });
    }

    // Sanitize prdFile name
    const decodedPrdFile = decodeURIComponent(prdFile);
    const sanitizedPrdFile = decodedPrdFile.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    // Load versions
    const versionsDir = path.join(instancePath, '.prd-versions');
    const versionsFile = path.join(versionsDir, `${sanitizedPrdFile}.versions.json`);

    let versionData: VersionFile = { versions: [] };

    try {
      const existingData = await fs.readFile(versionsFile, 'utf-8');
      versionData = JSON.parse(existingData);
    } catch {
      // File doesn't exist or is invalid, return empty versions
    }

    // Return versions with full content for diff/restore
    return NextResponse.json({
      versions: versionData.versions,
      total: versionData.versions.length,
    });

  } catch (error) {
    console.error('Editor history error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceId, prdFile, version: versionId } = body;

    // Validate required fields
    if (!instanceId || typeof instanceId !== 'string') {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 });
    }

    if (!prdFile || typeof prdFile !== 'string') {
      return NextResponse.json({ error: 'prdFile is required' }, { status: 400 });
    }

    if (!versionId || typeof versionId !== 'string') {
      return NextResponse.json({ error: 'version is required' }, { status: 400 });
    }

    // Validate path
    const instancePath = decodeURIComponent(instanceId);
    if (!isPathAllowed(instancePath)) {
      return NextResponse.json({ error: 'Invalid instance path' }, { status: 403 });
    }

    // Sanitize prdFile name
    const sanitizedPrdFile = prdFile.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    // Load versions
    const versionsDir = path.join(instancePath, '.prd-versions');
    const versionsFile = path.join(versionsDir, `${sanitizedPrdFile}.versions.json`);

    let versionData: VersionFile;
    try {
      const existingData = await fs.readFile(versionsFile, 'utf-8');
      versionData = JSON.parse(existingData);
    } catch {
      return NextResponse.json({ error: 'No version history found' }, { status: 404 });
    }

    // Find the requested version
    const targetVersion = versionData.versions.find(v => v.id === versionId);
    if (!targetVersion) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Create a new version entry for the revert
    const newVersionId = crypto.randomBytes(16).toString('hex');
    const revertVersion: Version = {
      id: newVersionId,
      timestamp: new Date().toISOString(),
      content: targetVersion.content,
      commitMessage: `Reverted to version ${versionId.substring(0, 8)}`,
      author: 'user',
    };

    // Add to beginning of versions
    versionData.versions.unshift(revertVersion);

    // Limit versions
    if (versionData.versions.length > 50) {
      versionData.versions = versionData.versions.slice(0, 50);
    }

    // Save versions file atomically
    const tempVersionsFile = `${versionsFile}.${Date.now()}.tmp`;
    await fs.writeFile(tempVersionsFile, JSON.stringify(versionData, null, 2));
    await fs.rename(tempVersionsFile, versionsFile);

    // Save the reverted content to the actual PRD file
    const prdsDir = path.join(instancePath, 'prds');
    const prdPath = path.join(prdsDir, sanitizedPrdFile);
    const tempPrdFile = `${prdPath}.${Date.now()}.tmp`;
    await fs.writeFile(tempPrdFile, targetVersion.content);
    await fs.rename(tempPrdFile, prdPath);

    return NextResponse.json({
      success: true,
      content: targetVersion.content,
      newVersion: newVersionId,
      timestamp: revertVersion.timestamp,
    });

  } catch (error) {
    console.error('Editor revert error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

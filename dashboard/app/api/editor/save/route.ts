import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH = 200000;
const MAX_MESSAGE_LENGTH = 500;
const MAX_VERSIONS = 50;

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
    const { instanceId, prdFile, content, commitMessage, author = 'user' } = body;

    // Validate required fields
    if (!instanceId || typeof instanceId !== 'string') {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 });
    }

    if (!prdFile || typeof prdFile !== 'string') {
      return NextResponse.json({ error: 'prdFile is required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Validate lengths
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    const message = commitMessage && typeof commitMessage === 'string'
      ? commitMessage.substring(0, MAX_MESSAGE_LENGTH)
      : 'Manual save';

    // Validate path
    const instancePath = decodeURIComponent(instanceId);
    if (!isPathAllowed(instancePath)) {
      return NextResponse.json({ error: 'Invalid instance path' }, { status: 403 });
    }

    // Sanitize prdFile name
    const sanitizedPrdFile = prdFile.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    if (!sanitizedPrdFile.endsWith('.md')) {
      return NextResponse.json({ error: 'PRD file must have .md extension' }, { status: 400 });
    }

    // Verify instance exists
    try {
      await fs.access(instancePath);
    } catch {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    // Create versions directory
    const versionsDir = path.join(instancePath, '.prd-versions');
    await fs.mkdir(versionsDir, { recursive: true });

    // Create PRDs directory if it doesn't exist
    const prdsDir = path.join(instancePath, 'prds');
    await fs.mkdir(prdsDir, { recursive: true });

    // Load existing versions
    const versionsFile = path.join(versionsDir, `${sanitizedPrdFile}.versions.json`);
    let versionData: VersionFile = { versions: [] };

    try {
      const existingData = await fs.readFile(versionsFile, 'utf-8');
      versionData = JSON.parse(existingData);
    } catch {
      // File doesn't exist yet, use empty versions
    }

    // Create new version
    const versionId = crypto.randomBytes(16).toString('hex');
    const newVersion: Version = {
      id: versionId,
      timestamp: new Date().toISOString(),
      content,
      commitMessage: message,
      author: author === 'ai-command' ? 'ai-command' : 'user',
    };

    // Add to beginning of versions array
    versionData.versions.unshift(newVersion);

    // Limit versions to MAX_VERSIONS
    if (versionData.versions.length > MAX_VERSIONS) {
      versionData.versions = versionData.versions.slice(0, MAX_VERSIONS);
    }

    // Save versions file atomically
    const tempVersionsFile = `${versionsFile}.${Date.now()}.tmp`;
    await fs.writeFile(tempVersionsFile, JSON.stringify(versionData, null, 2));
    await fs.rename(tempVersionsFile, versionsFile);

    // Save the actual PRD file
    const prdPath = path.join(prdsDir, sanitizedPrdFile);
    const tempPrdFile = `${prdPath}.${Date.now()}.tmp`;
    await fs.writeFile(tempPrdFile, content);
    await fs.rename(tempPrdFile, prdPath);

    return NextResponse.json({
      success: true,
      version: versionId,
      timestamp: newVersion.timestamp,
    });

  } catch (error) {
    console.error('Editor save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

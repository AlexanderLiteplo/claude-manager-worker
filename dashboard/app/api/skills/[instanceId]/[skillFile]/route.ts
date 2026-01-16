import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MAX_CONTENT_LENGTH = 100000; // 100KB
const SKILL_FILENAME_PATTERN = /^[a-z0-9_-]+\.md$/;

// Resolve instance path from encoded parameter
async function resolveInstancePath(encodedPath: string): Promise<string | null> {
  const decodedPath = decodeURIComponent(encodedPath);

  // Validate path is within allowed directories
  const allowedBase = path.join(process.env.HOME || '', 'claude-managers');
  const normalizedPath = path.normalize(path.resolve(decodedPath));

  if (!normalizedPath.startsWith(allowedBase) && !normalizedPath.includes('claude-manager')) {
    return null;
  }

  try {
    await fs.access(normalizedPath);
    return normalizedPath;
  } catch {
    return null;
  }
}

// Validate skill filename
function isValidSkillFilename(filename: string): boolean {
  return SKILL_FILENAME_PATTERN.test(filename);
}

// Extract title from markdown content
function extractTitle(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
  }
  return 'Untitled Skill';
}

// Extract category from markdown content
function extractCategory(content: string, filename: string): string {
  const parts = filename.replace('.md', '').split('_');
  if (parts.length > 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('react') || lowerContent.includes('hook')) return 'React';
  if (lowerContent.includes('api') || lowerContent.includes('endpoint')) return 'API';
  if (lowerContent.includes('database') || lowerContent.includes('prisma')) return 'Database';
  if (lowerContent.includes('security') || lowerContent.includes('xss')) return 'Security';
  if (lowerContent.includes('testing') || lowerContent.includes('test')) return 'Testing';
  if (lowerContent.includes('performance')) return 'Performance';

  return 'General';
}

// Extract tags from content
function extractTags(content: string): string[] {
  const tags: Set<string> = new Set();

  const patterns = [
    /typescript/gi, /javascript/gi, /react/gi, /nextjs/gi,
    /prisma/gi, /api/gi, /security/gi, /performance/gi,
    /testing/gi, /database/gi, /validation/gi, /error/gi
  ];

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      const match = content.match(pattern);
      if (match) {
        tags.add(match[0].toLowerCase());
      }
    }
  }

  return Array.from(tags).slice(0, 5);
}

// GET: Get a single skill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string; skillFile: string }> }
) {
  try {
    const { instanceId, skillFile } = await params;
    const instancePath = await resolveInstancePath(instanceId);

    if (!instancePath) {
      return NextResponse.json(
        { success: false, error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    const filename = decodeURIComponent(skillFile);

    if (!isValidSkillFilename(filename)) {
      return NextResponse.json(
        { success: false, error: 'Invalid skill filename' },
        { status: 400 }
      );
    }

    const filePath = path.join(instancePath, 'skills', filename);

    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Skill not found' },
        { status: 404 }
      );
    }

    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');

    return NextResponse.json({
      success: true,
      skill: {
        filename,
        title: extractTitle(content),
        category: extractCategory(content, filename),
        tags: extractTags(content),
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
        content,
      },
    });
  } catch (error) {
    console.error('Error getting skill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get skill' },
      { status: 500 }
    );
  }
}

// PUT: Update a skill
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string; skillFile: string }> }
) {
  try {
    const { instanceId, skillFile } = await params;
    const instancePath = await resolveInstancePath(instanceId);

    if (!instancePath) {
      return NextResponse.json(
        { success: false, error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    const filename = decodeURIComponent(skillFile);

    if (!isValidSkillFilename(filename)) {
      return NextResponse.json(
        { success: false, error: 'Invalid skill filename' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Skill content is required' },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Content must be at most ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    const filePath = path.join(instancePath, 'skills', filename);

    // Check if skill exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Write updated content
    await fs.writeFile(filePath, content, 'utf-8');

    const stat = await fs.stat(filePath);

    return NextResponse.json({
      success: true,
      skill: {
        filename,
        title: extractTitle(content),
        category: extractCategory(content, filename),
        tags: extractTags(content),
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
        content,
      },
    });
  } catch (error) {
    console.error('Error updating skill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a skill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string; skillFile: string }> }
) {
  try {
    const { instanceId, skillFile } = await params;
    const instancePath = await resolveInstancePath(instanceId);

    if (!instancePath) {
      return NextResponse.json(
        { success: false, error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    const filename = decodeURIComponent(skillFile);

    if (!isValidSkillFilename(filename)) {
      return NextResponse.json(
        { success: false, error: 'Invalid skill filename' },
        { status: 400 }
      );
    }

    const filePath = path.join(instancePath, 'skills', filename);

    // Check if skill exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Delete the file
    await fs.unlink(filePath);

    return NextResponse.json({
      success: true,
      message: `Skill ${filename} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
}

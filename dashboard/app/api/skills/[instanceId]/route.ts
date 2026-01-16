import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Validation constants
const MAX_SKILL_NAME_LENGTH = 100;
const MAX_CONTENT_LENGTH = 100000; // 100KB
const SKILL_FILENAME_PATTERN = /^[a-z0-9_-]+\.md$/;

interface Skill {
  filename: string;
  title: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  content: string;
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

// Extract category from markdown content (looks for "## When to Apply" section or similar)
function extractCategory(content: string, filename: string): string {
  // Try to infer from filename
  const parts = filename.replace('.md', '').split('_');
  if (parts.length > 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }

  // Check content for common patterns
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

  // Look for common patterns
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

// GET: List all skills for an instance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const instancePath = await resolveInstancePath(instanceId);

    if (!instancePath) {
      return NextResponse.json(
        { success: false, error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    const skillsDir = path.join(instancePath, 'skills');

    // Ensure skills directory exists
    try {
      await fs.access(skillsDir);
    } catch {
      await fs.mkdir(skillsDir, { recursive: true });
      return NextResponse.json({ success: true, skills: [] });
    }

    const files = await fs.readdir(skillsDir);
    const skillFiles = files.filter(f => f.endsWith('.md'));

    const skills: Skill[] = [];

    for (const filename of skillFiles) {
      const filePath = path.join(skillsDir, filename);
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      skills.push({
        filename,
        title: extractTitle(content),
        category: extractCategory(content, filename),
        tags: extractTags(content),
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
        content,
      });
    }

    // Sort by title
    skills.sort((a, b) => a.title.localeCompare(b.title));

    return NextResponse.json({
      success: true,
      skills,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error listing skills:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list skills' },
      { status: 500 }
    );
  }
}

// POST: Create a new skill
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const instancePath = await resolveInstancePath(instanceId);

    if (!instancePath) {
      return NextResponse.json(
        { success: false, error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, content, category, tags } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Skill name is required' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Skill content is required' },
        { status: 400 }
      );
    }

    // Validate lengths
    if (name.length > MAX_SKILL_NAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Skill name must be at most ${MAX_SKILL_NAME_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Skill content must be at most ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Generate filename from name
    const filename = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') + '.md';

    if (!SKILL_FILENAME_PATTERN.test(filename)) {
      return NextResponse.json(
        { success: false, error: 'Invalid skill name - use only letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const skillsDir = path.join(instancePath, 'skills');

    // Ensure skills directory exists
    await fs.mkdir(skillsDir, { recursive: true });

    const filePath = path.join(skillsDir, filename);

    // Check if skill already exists
    try {
      await fs.access(filePath);
      return NextResponse.json(
        { success: false, error: 'A skill with this name already exists' },
        { status: 409 }
      );
    } catch {
      // File doesn't exist, which is good
    }

    // Write the skill file
    await fs.writeFile(filePath, content, 'utf-8');

    const stat = await fs.stat(filePath);

    const skill: Skill = {
      filename,
      title: extractTitle(content),
      category: category || extractCategory(content, filename),
      tags: tags || extractTags(content),
      createdAt: stat.birthtime.toISOString(),
      updatedAt: stat.mtime.toISOString(),
      content,
    };

    return NextResponse.json({
      success: true,
      skill,
    });
  } catch (error) {
    console.error('Error creating skill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create skill' },
      { status: 500 }
    );
  }
}

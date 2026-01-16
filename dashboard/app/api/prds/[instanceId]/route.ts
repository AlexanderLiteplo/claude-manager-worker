import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { PRDMetadata, PRDStatus, PRDPriority, PRDComplexity, PRDOrganizerState } from '@/lib/types/prd';

// Validate instance path is within allowed directory
function isPathAllowed(instancePath: string): boolean {
  const normalizedPath = path.normalize(path.resolve(instancePath));
  const allowedBase = path.join(os.homedir(), 'claude-managers');
  return normalizedPath.startsWith(path.normalize(allowedBase));
}

// Extract title from PRD content
function extractTitle(content: string): string {
  // Look for first H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  // Look for first H2 heading
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match) {
    return h2Match[1].trim();
  }
  // Fallback to first non-empty line
  const firstLine = content.split('\n').find(line => line.trim());
  return firstLine?.replace(/^#+\s*/, '').trim() || 'Untitled PRD';
}

// Detect complexity based on content
function detectComplexity(content: string): PRDComplexity {
  const wordCount = content.split(/\s+/).length;
  const hasTechRequirements = /technical requirements|tech stack|architecture/i.test(content);
  const hasPhases = /phase \d|iteration \d/i.test(content);

  if (wordCount > 2000 || (hasTechRequirements && hasPhases)) {
    return 'complex';
  }
  if (wordCount > 800 || hasTechRequirements || hasPhases) {
    return 'medium';
  }
  return 'simple';
}

// Estimate iterations based on content
function estimateIterations(content: string, complexity: PRDComplexity): number {
  // Look for explicit iteration estimate
  const iterMatch = content.match(/estimated?.?\s*iterations?:?\s*(\d+)/i);
  if (iterMatch) {
    return parseInt(iterMatch[1], 10);
  }

  // Default based on complexity
  switch (complexity) {
    case 'simple': return 3;
    case 'medium': return 8;
    case 'complex': return 15;
    default: return 5;
  }
}

// Load PRD organizer state
async function loadOrganizerState(instancePath: string): Promise<PRDOrganizerState> {
  const statePath = path.join(instancePath, 'planning', 'prd-organizer.json');
  try {
    const content = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      prds: [],
      tags: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Save PRD organizer state
async function saveOrganizerState(instancePath: string, state: PRDOrganizerState): Promise<void> {
  const planningDir = path.join(instancePath, 'planning');
  await fs.mkdir(planningDir, { recursive: true });

  const statePath = path.join(planningDir, 'prd-organizer.json');
  state.lastUpdated = new Date().toISOString();
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

// Load PRD queue state (for status sync)
async function loadQueueState(instancePath: string): Promise<{ queue: Array<{ filename: string; status: string }> }> {
  const queuePath = path.join(instancePath, 'planning', 'prd-queue.json');
  try {
    const content = await fs.readFile(queuePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { queue: [] };
  }
}

// GET - List all PRDs with metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const decodedPath = decodeURIComponent(instanceId);

    // Validate instance path
    if (!isPathAllowed(decodedPath)) {
      return NextResponse.json(
        { error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    // Verify instance exists
    try {
      await fs.access(decodedPath);
    } catch {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }

    // Load organizer state
    const organizerState = await loadOrganizerState(decodedPath);
    const queueState = await loadQueueState(decodedPath);

    // Map queue status to organizer status format
    const queueStatusMap = new Map<string, string>();
    for (const item of queueState.queue) {
      queueStatusMap.set(item.filename, item.status);
    }

    // Read PRD files
    const prdsDir = path.join(decodedPath, 'prds');
    let prdFiles: string[] = [];

    try {
      const files = await fs.readdir(prdsDir);
      prdFiles = files.filter(f => f.endsWith('.md'));
    } catch {
      // PRDs directory doesn't exist yet
    }

    // Build PRD metadata list
    const prds: PRDMetadata[] = [];
    const existingMetadata = new Map(organizerState.prds.map(p => [p.filename, p]));

    for (const filename of prdFiles) {
      const filePath = path.join(prdsDir, filename);
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');

      const existing = existingMetadata.get(filename);
      const complexity = existing?.complexity || detectComplexity(content);

      // Map queue status to organizer status
      let status: PRDStatus = existing?.status || 'pending';
      const queueStatus = queueStatusMap.get(filename);
      if (queueStatus) {
        if (queueStatus === 'in_progress') status = 'in-progress';
        else if (queueStatus === 'completed') status = 'completed';
        else if (queueStatus === 'pending') status = 'pending';
      }

      const metadata: PRDMetadata = {
        filename,
        title: existing?.title || extractTitle(content),
        status,
        priority: existing?.priority || 'medium',
        tags: existing?.tags || [],
        complexity,
        dependencies: existing?.dependencies || [],
        estimatedIterations: existing?.estimatedIterations || estimateIterations(content, complexity),
        actualIterations: existing?.actualIterations,
        createdAt: existing?.createdAt || stat.birthtime.toISOString(),
        completedAt: existing?.completedAt,
        archived: existing?.archived || false,
      };

      prds.push(metadata);
    }

    // Sort by status priority (in-progress first, then pending, then completed)
    // Within same status, sort by priority
    const statusOrder: Record<PRDStatus, number> = {
      'in-progress': 0,
      'blocked': 1,
      'pending': 2,
      'completed': 3,
    };

    const priorityOrder: Record<PRDPriority, number> = {
      'high': 0,
      'medium': 1,
      'low': 2,
    };

    prds.sort((a, b) => {
      if (a.archived !== b.archived) return a.archived ? 1 : -1;
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Collect unique tags
    const allTags = new Set<string>();
    for (const prd of prds) {
      for (const tag of prd.tags) {
        allTags.add(tag);
      }
    }

    // Update organizer state with current PRDs
    organizerState.prds = prds;
    organizerState.tags = Array.from(allTags).sort();
    await saveOrganizerState(decodedPath, organizerState);

    return NextResponse.json({
      success: true,
      prds,
      tags: organizerState.tags,
      stats: {
        total: prds.length,
        pending: prds.filter(p => p.status === 'pending' && !p.archived).length,
        inProgress: prds.filter(p => p.status === 'in-progress' && !p.archived).length,
        completed: prds.filter(p => p.status === 'completed' && !p.archived).length,
        blocked: prds.filter(p => p.status === 'blocked' && !p.archived).length,
        archived: prds.filter(p => p.archived).length,
      },
      lastUpdated: organizerState.lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching PRDs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch PRDs' },
      { status: 500 }
    );
  }
}

// PATCH - Update PRD metadata (tags, status, priority, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const decodedPath = decodeURIComponent(instanceId);
    const body = await request.json();
    const { filename, ...updates } = body;

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Validate instance path
    if (!isPathAllowed(decodedPath)) {
      return NextResponse.json(
        { error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    // Load organizer state
    const organizerState = await loadOrganizerState(decodedPath);

    // Find the PRD to update
    const prdIndex = organizerState.prds.findIndex(p => p.filename === filename);
    if (prdIndex === -1) {
      return NextResponse.json(
        { error: 'PRD not found' },
        { status: 404 }
      );
    }

    // Validate and apply updates
    const prd = organizerState.prds[prdIndex];

    if (updates.status !== undefined) {
      const validStatuses: PRDStatus[] = ['pending', 'in-progress', 'completed', 'blocked'];
      if (!validStatuses.includes(updates.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      prd.status = updates.status;
      if (updates.status === 'completed' && !prd.completedAt) {
        prd.completedAt = new Date().toISOString();
      }
    }

    if (updates.priority !== undefined) {
      const validPriorities: PRDPriority[] = ['high', 'medium', 'low'];
      if (!validPriorities.includes(updates.priority)) {
        return NextResponse.json(
          { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
          { status: 400 }
        );
      }
      prd.priority = updates.priority;
    }

    if (updates.tags !== undefined) {
      if (!Array.isArray(updates.tags)) {
        return NextResponse.json(
          { error: 'Tags must be an array' },
          { status: 400 }
        );
      }
      // Sanitize tags: lowercase, trim, max 20 chars each, max 10 tags
      prd.tags = updates.tags
        .slice(0, 10)
        .map((t: string) => String(t).toLowerCase().trim().slice(0, 20))
        .filter((t: string) => t.length > 0);
    }

    if (updates.archived !== undefined) {
      prd.archived = Boolean(updates.archived);
    }

    if (updates.actualIterations !== undefined) {
      prd.actualIterations = Math.max(0, parseInt(updates.actualIterations, 10) || 0);
    }

    if (updates.complexity !== undefined) {
      const validComplexities: PRDComplexity[] = ['simple', 'medium', 'complex'];
      if (validComplexities.includes(updates.complexity)) {
        prd.complexity = updates.complexity;
      }
    }

    // Update tags list
    const allTags = new Set<string>();
    for (const p of organizerState.prds) {
      for (const tag of p.tags) {
        allTags.add(tag);
      }
    }
    organizerState.tags = Array.from(allTags).sort();

    // Save updated state
    await saveOrganizerState(decodedPath, organizerState);

    return NextResponse.json({
      success: true,
      prd,
      tags: organizerState.tags,
    });
  } catch (error) {
    console.error('Error updating PRD:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update PRD' },
      { status: 500 }
    );
  }
}

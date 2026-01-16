import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Type definitions
interface PRDQueueItem {
  id: string;
  filename: string;
  title: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed';
  addedAt: string;
  estimatedIterations?: number;
}

interface PRDQueue {
  queue: PRDQueueItem[];
  lastUpdated: string;
}

// Validate instance path is within allowed directory
function isPathAllowed(instancePath: string): boolean {
  const normalizedPath = path.normalize(path.resolve(instancePath));
  const allowedBase = path.join(os.homedir(), 'claude-managers');
  return normalizedPath.startsWith(path.normalize(allowedBase));
}

// Get next PRD number based on existing files
async function getNextPRDNumber(prdsDir: string): Promise<string> {
  try {
    const files = await fs.readdir(prdsDir);
    const numbers = files
      .map(f => parseInt(f.match(/^(\d+)_/)?.[1] || '0'))
      .filter(n => !isNaN(n));

    const next = Math.max(0, ...numbers) + 1;
    return String(next).padStart(2, '0');
  } catch {
    return '01';
  }
}

// Load queue from file
async function loadQueue(instancePath: string): Promise<PRDQueue> {
  const queuePath = path.join(instancePath, 'planning', 'prd-queue.json');
  try {
    const content = await fs.readFile(queuePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      queue: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Save queue to file
async function saveQueue(instancePath: string, queue: PRDQueue): Promise<void> {
  const planningDir = path.join(instancePath, 'planning');
  await fs.mkdir(planningDir, { recursive: true });

  const queuePath = path.join(planningDir, 'prd-queue.json');
  queue.lastUpdated = new Date().toISOString();
  await fs.writeFile(queuePath, JSON.stringify(queue, null, 2));
}

// Input validation
const MAX_PRD_CONTENT_LENGTH = 200000;
const MAX_TITLE_LENGTH = 200;

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { instanceId, instancePath, prdContent, title, priority } = body;

    // Validate required fields
    if (!prdContent || typeof prdContent !== 'string') {
      return NextResponse.json(
        { error: 'PRD content is required' },
        { status: 400 }
      );
    }

    if (prdContent.length > MAX_PRD_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `PRD content exceeds maximum length of ${MAX_PRD_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (!instancePath || typeof instancePath !== 'string') {
      return NextResponse.json(
        { error: 'Instance path is required' },
        { status: 400 }
      );
    }

    // Validate instance path
    if (!isPathAllowed(instancePath)) {
      return NextResponse.json(
        { error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    // Verify instance exists
    try {
      await fs.access(instancePath);
    } catch {
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      );
    }

    // Validate and bound priority
    const validatedPriority = typeof priority === 'number'
      ? Math.max(1, Math.min(priority, 3)) // 1 = High, 2 = Medium, 3 = Low
      : 2; // Default to Medium

    // Extract title from PRD if not provided
    let prdTitle = title;
    if (!prdTitle || typeof prdTitle !== 'string') {
      const titleMatch = prdContent.match(/^#\s+PRD:\s*(.+)$/m);
      prdTitle = titleMatch ? titleMatch[1].trim() : 'Untitled PRD';
    }

    if (prdTitle.length > MAX_TITLE_LENGTH) {
      prdTitle = prdTitle.substring(0, MAX_TITLE_LENGTH);
    }

    // Create PRDs directory if it doesn't exist
    const prdsDir = path.join(instancePath, 'prds');
    await fs.mkdir(prdsDir, { recursive: true });

    // Generate filename with auto-increment number
    const nextNumber = await getNextPRDNumber(prdsDir);
    const sanitizedTitle = prdTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 40);
    const filename = `${nextNumber}_${sanitizedTitle}.md`;

    // Save PRD file
    const prdPath = path.join(prdsDir, filename);
    await fs.writeFile(prdPath, prdContent);

    // Generate unique ID for queue item
    const id = crypto.randomUUID();

    // Load current queue
    const queue = await loadQueue(instancePath);

    // Estimate iterations based on complexity keyword in PRD
    let estimatedIterations = 3; // Default
    if (prdContent.toLowerCase().includes('simple')) {
      estimatedIterations = 2;
    } else if (prdContent.toLowerCase().includes('complex')) {
      estimatedIterations = 5;
    }

    // Add to queue
    const queueItem: PRDQueueItem = {
      id,
      filename,
      title: prdTitle,
      priority: validatedPriority,
      status: 'pending',
      addedAt: new Date().toISOString(),
      estimatedIterations,
    };

    queue.queue.push(queueItem);

    // Sort queue by priority (lower number = higher priority)
    queue.queue.sort((a, b) => {
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (b.status === 'completed' && a.status !== 'completed') return -1;
      return a.priority - b.priority;
    });

    // Save updated queue
    await saveQueue(instancePath, queue);

    return NextResponse.json({
      success: true,
      filename,
      queueItem,
      queueLength: queue.queue.length,
    });
  } catch (error) {
    console.error('Error adding PRD to queue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add PRD to queue' },
      { status: 500 }
    );
  }
}

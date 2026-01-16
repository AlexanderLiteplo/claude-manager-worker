import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

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

// GET - List all PRDs in queue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;

    // Get instance path from query params
    const instancePath = request.nextUrl.searchParams.get('instancePath');

    if (!instancePath) {
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

    // Load queue
    const queue = await loadQueue(instancePath);

    // Group by status
    const grouped = {
      inProgress: queue.queue.filter(item => item.status === 'in_progress'),
      pending: queue.queue.filter(item => item.status === 'pending'),
      completed: queue.queue.filter(item => item.status === 'completed'),
    };

    // Group pending by priority
    const byPriority = {
      high: grouped.pending.filter(item => item.priority === 1),
      medium: grouped.pending.filter(item => item.priority === 2),
      low: grouped.pending.filter(item => item.priority === 3),
    };

    return NextResponse.json({
      success: true,
      queue: queue.queue,
      grouped,
      byPriority,
      stats: {
        total: queue.queue.length,
        pending: grouped.pending.length,
        inProgress: grouped.inProgress.length,
        completed: grouped.completed.length,
      },
      lastUpdated: queue.lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching PRD queue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch queue' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a PRD from queue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const body = await request.json();
    const { instancePath, prdId, deleteFile } = body;

    if (!instancePath) {
      return NextResponse.json(
        { error: 'Instance path is required' },
        { status: 400 }
      );
    }

    if (!prdId) {
      return NextResponse.json(
        { error: 'PRD ID is required' },
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

    // Load queue
    const queue = await loadQueue(instancePath);

    // Find the item to delete
    const itemIndex = queue.queue.findIndex(item => item.id === prdId);
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'PRD not found in queue' },
        { status: 404 }
      );
    }

    const item = queue.queue[itemIndex];

    // Optionally delete the file
    if (deleteFile) {
      try {
        const prdPath = path.join(instancePath, 'prds', item.filename);
        await fs.unlink(prdPath);
      } catch (err) {
        console.warn('Failed to delete PRD file:', err);
        // Continue - file might not exist
      }
    }

    // Remove from queue
    queue.queue.splice(itemIndex, 1);

    // Save updated queue
    await saveQueue(instancePath, queue);

    return NextResponse.json({
      success: true,
      deleted: item,
      queueLength: queue.queue.length,
    });
  } catch (error) {
    console.error('Error deleting PRD from queue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete from queue' },
      { status: 500 }
    );
  }
}

// PATCH - Update PRD status or priority
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;
    const body = await request.json();
    const { instancePath, prdId, status, priority } = body;

    if (!instancePath) {
      return NextResponse.json(
        { error: 'Instance path is required' },
        { status: 400 }
      );
    }

    if (!prdId) {
      return NextResponse.json(
        { error: 'PRD ID is required' },
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

    // Load queue
    const queue = await loadQueue(instancePath);

    // Find the item to update
    const itemIndex = queue.queue.findIndex(item => item.id === prdId);
    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'PRD not found in queue' },
        { status: 404 }
      );
    }

    // Update status if provided
    if (status) {
      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      queue.queue[itemIndex].status = status;
    }

    // Update priority if provided
    if (typeof priority === 'number') {
      const validatedPriority = Math.max(1, Math.min(priority, 3));
      queue.queue[itemIndex].priority = validatedPriority;
    }

    // Re-sort queue
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
      updated: queue.queue[itemIndex],
    });
  } catch (error) {
    console.error('Error updating PRD in queue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update queue item' },
      { status: 500 }
    );
  }
}

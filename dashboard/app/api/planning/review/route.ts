import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Validate that path is within allowed directories
const ALLOWED_BASES = [
  path.join(os.homedir(), 'claude-managers'),
];

function isPathAllowed(testPath: string): boolean {
  const normalizedPath = path.normalize(path.resolve(testPath));
  return ALLOWED_BASES.some(basePath =>
    normalizedPath.startsWith(path.normalize(basePath))
  );
}

// GET - Load generated plan and PRDs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instancePath = searchParams.get('instancePath');

    if (!instancePath) {
      return NextResponse.json(
        { error: 'Instance path is required' },
        { status: 400 }
      );
    }

    // Validate path is allowed
    if (!isPathAllowed(instancePath)) {
      return NextResponse.json(
        { error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    // Read plan metadata
    const planMetaPath = path.join(instancePath, '.state', 'generated_plan.json');
    try {
      const content = await fs.readFile(planMetaPath, 'utf-8');
      const plan = JSON.parse(content);

      // Refresh PRD content from files
      for (const prd of plan.prds) {
        if (prd.path) {
          try {
            prd.content = await fs.readFile(prd.path, 'utf-8');
          } catch (err) {
            console.warn('[Review] Could not read PRD file:', prd.path, err);
          }
        }
      }

      return NextResponse.json({
        success: true,
        plan,
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: 'No generated plan found',
      }, { status: 404 });
    }
  } catch (error) {
    console.error('[Review] Error loading plan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load plan' },
      { status: 500 }
    );
  }
}

// POST - Update a PRD
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instancePath, prdId, content, priority, title } = body;

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

    // Validate path is allowed
    if (!isPathAllowed(instancePath)) {
      return NextResponse.json(
        { error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    // Read current plan
    const planMetaPath = path.join(instancePath, '.state', 'generated_plan.json');
    let plan;
    try {
      const planContent = await fs.readFile(planMetaPath, 'utf-8');
      plan = JSON.parse(planContent);
    } catch {
      return NextResponse.json(
        { error: 'No generated plan found' },
        { status: 404 }
      );
    }

    // Find the PRD to update
    const prdIndex = plan.prds.findIndex((p: { id: string }) => p.id === prdId);
    if (prdIndex === -1) {
      return NextResponse.json(
        { error: 'PRD not found' },
        { status: 404 }
      );
    }

    const prd = plan.prds[prdIndex];

    // Update PRD file if content provided
    if (content !== undefined) {
      if (prd.path) {
        await fs.writeFile(prd.path, content, 'utf-8');
        prd.content = content;
      }
    }

    // Update metadata fields
    if (priority !== undefined) {
      prd.priority = priority;
    }
    if (title !== undefined) {
      prd.title = title;
    }

    // Update timestamp
    prd.updatedAt = new Date().toISOString();
    plan.updatedAt = new Date().toISOString();

    // Save updated plan metadata
    await fs.writeFile(planMetaPath, JSON.stringify(plan, null, 2), 'utf-8');

    console.log('[Review] Updated PRD:', prdId);

    return NextResponse.json({
      success: true,
      prd,
    });
  } catch (error) {
    console.error('[Review] Error updating PRD:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update PRD' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a PRD from the plan
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instancePath = searchParams.get('instancePath');
    const prdId = searchParams.get('prdId');

    if (!instancePath || !prdId) {
      return NextResponse.json(
        { error: 'Instance path and PRD ID are required' },
        { status: 400 }
      );
    }

    // Validate path is allowed
    if (!isPathAllowed(instancePath)) {
      return NextResponse.json(
        { error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    // Read current plan
    const planMetaPath = path.join(instancePath, '.state', 'generated_plan.json');
    let plan;
    try {
      const planContent = await fs.readFile(planMetaPath, 'utf-8');
      plan = JSON.parse(planContent);
    } catch {
      return NextResponse.json(
        { error: 'No generated plan found' },
        { status: 404 }
      );
    }

    // Find and remove the PRD
    const prdIndex = plan.prds.findIndex((p: { id: string }) => p.id === prdId);
    if (prdIndex === -1) {
      return NextResponse.json(
        { error: 'PRD not found' },
        { status: 404 }
      );
    }

    const removedPrd = plan.prds.splice(prdIndex, 1)[0];

    // Optionally delete the file
    if (removedPrd.path) {
      try {
        await fs.unlink(removedPrd.path);
      } catch {
        // File might not exist, ignore
      }
    }

    // Update suggested order
    plan.suggestedOrder = plan.suggestedOrder
      .filter((i: number) => i !== prdIndex)
      .map((i: number) => (i > prdIndex ? i - 1 : i));

    // Update timestamp
    plan.updatedAt = new Date().toISOString();

    // Save updated plan
    await fs.writeFile(planMetaPath, JSON.stringify(plan, null, 2), 'utf-8');

    console.log('[Review] Deleted PRD:', prdId);

    return NextResponse.json({
      success: true,
      message: 'PRD removed from plan',
    });
  } catch (error) {
    console.error('[Review] Error deleting PRD:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete PRD' },
      { status: 500 }
    );
  }
}

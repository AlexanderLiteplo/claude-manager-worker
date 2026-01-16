import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instancePath,
      workerModel = 'opus',
      managerModel = 'opus',
      maxIterations = 999999,
    } = body;

    console.log('[Execute Plan] Received request:', {
      instancePath,
      workerModel,
      managerModel,
      maxIterations,
    });

    // Validate required fields
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

    // Verify the path exists
    try {
      await fs.access(instancePath);
    } catch {
      return NextResponse.json(
        { error: 'Instance path does not exist' },
        { status: 404 }
      );
    }

    // Check for generated plan
    const planMetaPath = path.join(instancePath, '.state', 'generated_plan.json');
    try {
      await fs.access(planMetaPath);
    } catch {
      return NextResponse.json(
        { error: 'No generated plan found. Generate PRDs first.' },
        { status: 400 }
      );
    }

    // Read the plan to get the first PRD
    const planContent = await fs.readFile(planMetaPath, 'utf-8');
    const plan = JSON.parse(planContent);

    if (!plan.prds || plan.prds.length === 0) {
      return NextResponse.json(
        { error: 'No PRDs in generated plan' },
        { status: 400 }
      );
    }

    // Get the first PRD in suggested order
    const firstPrdIndex = plan.suggestedOrder?.[0] ?? 0;
    const firstPrd = plan.prds[firstPrdIndex];

    console.log('[Execute Plan] Starting execution with PRD:', firstPrd.filename);

    // Check if orchestrator script exists
    const scriptPath = path.join(instancePath, 'scripts', 'orchestrator.sh');
    let useOrchestrator = false;

    try {
      await fs.access(scriptPath);
      useOrchestrator = true;
    } catch {
      console.log('[Execute Plan] Orchestrator script not found, will use direct start');
    }

    // Update instance state to mark as starting
    const stateDir = path.join(instancePath, '.state');
    await fs.mkdir(stateDir, { recursive: true });

    const executionState = {
      status: 'starting',
      startedAt: new Date().toISOString(),
      workerModel,
      managerModel,
      maxIterations,
      currentPrd: firstPrd.filename,
      planId: plan.generatedAt,
    };

    await fs.writeFile(
      path.join(stateDir, 'execution_state.json'),
      JSON.stringify(executionState, null, 2),
      'utf-8'
    );

    if (useOrchestrator) {
      // Start the orchestrator in background
      const child = spawn('bash', [scriptPath, 'start', '--worker-model', workerModel, '--manager-model', managerModel, '--max-iterations', String(maxIterations)], {
        cwd: instancePath,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Capture initial output
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Don't wait for completion, let it run in background
      child.unref();

      // Wait a moment to capture initial output
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update state to running
      executionState.status = 'running';
      await fs.writeFile(
        path.join(stateDir, 'execution_state.json'),
        JSON.stringify(executionState, null, 2),
        'utf-8'
      );

      return NextResponse.json({
        success: true,
        message: 'Implementation started via orchestrator',
        execution: {
          pid: child.pid,
          currentPrd: firstPrd.filename,
          workerModel,
          managerModel,
        },
        initialOutput: stdout || 'Started...',
        initialError: stderr || undefined,
      });
    } else {
      // No orchestrator script - return info for manual start
      return NextResponse.json({
        success: true,
        message: 'Plan ready for implementation',
        execution: {
          currentPrd: firstPrd.filename,
          prdPath: firstPrd.path,
          workerModel,
          managerModel,
        },
        note: 'No orchestrator script found. Start implementation manually or use the dashboard controls.',
      });
    }
  } catch (error) {
    console.error('[Execute Plan] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start execution',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check execution status
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

    // Read execution state
    const statePath = path.join(instancePath, '.state', 'execution_state.json');
    try {
      const content = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(content);
      return NextResponse.json({ success: true, state });
    } catch {
      return NextResponse.json({
        success: true,
        state: { status: 'idle' },
      });
    }
  } catch (error) {
    console.error('[Execute Plan] Error getting status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}

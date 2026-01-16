import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Allowed model values
const VALID_MODELS = ['opus', 'sonnet', 'haiku'] as const;
type ModelType = typeof VALID_MODELS[number];

// Security: Validate that the instance path is within allowed directories
const ALLOWED_BASE_PATHS = [
  path.join(os.homedir(), 'claude-managers'),
  path.join(os.homedir(), 'claude-manager-worker'),
  '/opt/claude-managers',
];

function isPathAllowed(testPath: string): boolean {
  const normalizedPath = path.normalize(path.resolve(testPath));
  return ALLOWED_BASE_PATHS.some((basePath) =>
    normalizedPath.startsWith(path.normalize(basePath))
  );
}

function isValidModel(model: unknown): model is ModelType {
  return typeof model === 'string' && VALID_MODELS.includes(model as ModelType);
}

/**
 * POST /api/control/models
 * Update Worker and Manager models for an instance
 * This will stop the current instance and restart with new models
 */
export async function POST(request: Request) {
  try {
    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    // Validate body size
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    const MAX_BODY_SIZE = 10 * 1024; // 10KB
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      );
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Request body must be an object' },
        { status: 400 }
      );
    }

    const { instancePath, workerModel, managerModel, maxIterations } = body as Record<string, unknown>;

    // Validate required fields
    if (typeof instancePath !== 'string' || !instancePath) {
      return NextResponse.json(
        { error: 'instancePath is required and must be a string' },
        { status: 400 }
      );
    }

    if (!isValidModel(workerModel)) {
      return NextResponse.json(
        { error: `workerModel must be one of: ${VALID_MODELS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!isValidModel(managerModel)) {
      return NextResponse.json(
        { error: `managerModel must be one of: ${VALID_MODELS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate path traversal
    if (!isPathAllowed(instancePath)) {
      return NextResponse.json(
        { error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    // Validate optional maxIterations
    let iterations = 999999; // Default to essentially infinite
    if (maxIterations !== undefined) {
      if (typeof maxIterations !== 'number' || maxIterations < 1 || maxIterations > 999999) {
        return NextResponse.json(
          { error: 'maxIterations must be a number between 1 and 999999' },
          { status: 400 }
        );
      }
      iterations = maxIterations;
    }

    const scriptPath = path.join(instancePath, 'scripts', 'orchestrator.sh');

    // Stop current instance
    console.log(`[Model Switch] Stopping instance at ${instancePath}`);
    try {
      await execAsync(`cd "${instancePath}" && "${scriptPath}" stop`, {
        timeout: 30000, // 30 second timeout for stop
      });
    } catch (stopError: unknown) {
      // Log but continue - instance might not be running
      console.log('[Model Switch] Stop command result:', stopError);
    }

    // Wait for clean shutdown
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Start with new models
    console.log(`[Model Switch] Starting with worker=${workerModel}, manager=${managerModel}`);
    const startCommand = `cd "${instancePath}" && "${scriptPath}" start --worker-model ${workerModel} --manager-model ${managerModel} --max-iterations ${iterations}`;

    const { stdout, stderr } = await execAsync(startCommand, {
      timeout: 60000, // 60 second timeout for start
    });

    return NextResponse.json({
      success: true,
      workerModel,
      managerModel,
      maxIterations: iterations,
      message: 'Models updated successfully',
      output: stdout,
      warnings: stderr || undefined,
    });
  } catch (error: unknown) {
    console.error('[Model Switch] Error:', error);

    const errorObj = error as { message?: string; stdout?: string; stderr?: string };

    return NextResponse.json(
      {
        error: errorObj.message || 'Failed to update models',
        details: {
          stdout: errorObj.stdout,
          stderr: errorObj.stderr,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/control/models
 * Get available models and current selection
 */
export async function GET() {
  return NextResponse.json({
    availableModels: VALID_MODELS.map((id) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      description: getModelDescription(id),
    })),
  });
}

function getModelDescription(model: ModelType): string {
  switch (model) {
    case 'opus':
      return 'Most powerful and capable model';
    case 'sonnet':
      return 'Balanced performance and speed';
    case 'haiku':
      return 'Fastest and most efficient';
  }
}

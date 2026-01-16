import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, instancePath, workerModel, managerModel, maxIterations } = body;

    if (!action || !instancePath) {
      return NextResponse.json(
        { error: 'Action and instancePath are required' },
        { status: 400 }
      );
    }

    const scriptPath = path.join(instancePath, 'scripts', 'orchestrator.sh');

    let command = '';

    switch (action) {
      case 'start':
        const models = `--worker-model ${workerModel || 'sonnet'} --manager-model ${managerModel || 'opus'}`;
        const iterations = maxIterations ? `--max-iterations ${maxIterations}` : '';
        command = `cd "${instancePath}" && "${scriptPath}" start ${models} ${iterations}`;
        break;

      case 'stop':
        command = `cd "${instancePath}" && "${scriptPath}" stop`;
        break;

      case 'restart':
        command = `cd "${instancePath}" && "${scriptPath}" stop && sleep 2 && "${scriptPath}" start`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { stdout, stderr } = await execAsync(command);

    return NextResponse.json({
      success: true,
      action,
      stdout,
      stderr,
    });
  } catch (error: any) {
    console.error('Control error:', error);
    return NextResponse.json(
      {
        error: error.message || String(error),
        stdout: error.stdout,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}

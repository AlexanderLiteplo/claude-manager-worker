import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Create a new claude-manager instance
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, workerModel, managerModel, maxIterations } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create instance directory
    const instancePath = path.join(process.env.HOME || '', 'claude-managers', name);

    // Check if already exists
    try {
      await fs.access(instancePath);
      return NextResponse.json({ error: 'Instance already exists' }, { status: 400 });
    } catch {
      // Directory doesn't exist, which is good
    }

    // Create directory structure
    await fs.mkdir(instancePath, { recursive: true });
    await fs.mkdir(path.join(instancePath, 'prds'), { recursive: true });
    await fs.mkdir(path.join(instancePath, 'skills'), { recursive: true });
    await fs.mkdir(path.join(instancePath, 'output'), { recursive: true });
    await fs.mkdir(path.join(instancePath, 'logs'), { recursive: true });
    await fs.mkdir(path.join(instancePath, '.state'), { recursive: true });
    await fs.mkdir(path.join(instancePath, 'scripts'), { recursive: true });

    // Copy scripts from template
    const templatePath = path.join(process.env.HOME || '', 'claude-manager-worker');
    try {
      await execAsync(`cp -r "${templatePath}/scripts/"* "${instancePath}/scripts/"`);
    } catch (error) {
      console.error('Failed to copy scripts:', error);
    }

    // Save configuration
    const config = {
      name,
      workerModel: workerModel || 'sonnet',
      managerModel: managerModel || 'opus',
      maxIterations: maxIterations || 50,
      createdAt: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(instancePath, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    return NextResponse.json({
      success: true,
      path: instancePath,
      config,
    });
  } catch (error) {
    console.error('Error creating instance:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// List all instances
export async function GET() {
  try {
    const managersDir = path.join(process.env.HOME || '', 'claude-managers');

    try {
      await fs.access(managersDir);
    } catch {
      // Directory doesn't exist yet
      return NextResponse.json({ instances: [] });
    }

    const entries = await fs.readdir(managersDir);
    const instances = [];

    for (const entry of entries) {
      const instancePath = path.join(managersDir, entry);
      const stat = await fs.stat(instancePath);

      if (stat.isDirectory()) {
        try {
          const configPath = path.join(instancePath, 'config.json');
          const configData = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(configData);

          instances.push({
            name: entry,
            path: instancePath,
            ...config,
          });
        } catch {
          // No config file, skip
        }
      }
    }

    return NextResponse.json({ instances });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

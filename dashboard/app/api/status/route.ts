import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Find all claude-manager instances
async function findClaudeManagers(): Promise<string[]> {
  const instances: string[] = [];

  // Check ~/claude-managers directory (managed instances)
  try {
    const managersDir = path.join(process.env.HOME || '', 'claude-managers');
    const entries = await fs.readdir(managersDir);

    for (const entry of entries) {
      const instancePath = path.join(managersDir, entry);
      const stat = await fs.stat(instancePath);
      if (stat.isDirectory()) {
        instances.push(instancePath);
      }
    }
  } catch {
    // Directory doesn't exist yet
  }

  // Also find other claude-manager instances on the system
  try {
    const { stdout } = await execAsync('find /Users/alexander -maxdepth 4 -type d -name "claude-manager*" 2>/dev/null | grep -v node_modules | grep -v claude-managers | head -10');
    const found = stdout.trim().split('\n').filter(Boolean);
    instances.push(...found);
  } catch {
    // No additional instances found
  }

  return instances;
}

async function getManagerStatus(managerPath: string) {
  const stateDir = path.join(managerPath, '.state');
  const prdsDir = path.join(managerPath, 'prds');
  const skillsDir = path.join(managerPath, 'skills');
  const logsDir = path.join(managerPath, 'logs');
  const completedDir = path.join(managerPath, 'output', 'completed');

  const status: any = {
    path: managerPath,
    name: path.basename(managerPath),
    worker: { status: 'stopped', pid: null, iteration: 0, currentPrd: null, model: 'sonnet' },
    manager: { status: 'stopped', pid: null, reviews: 0, model: 'opus' },
    prds: { total: 0, completed: 0, list: [], completedList: [] },
    skills: { count: 0, list: [] },
    recentLogs: [],
    config: null,
  };

  // Read configuration if it exists
  try {
    const configPath = path.join(managerPath, 'config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    status.config = JSON.parse(configData);
    if (status.config.workerModel) status.worker.model = status.config.workerModel;
    if (status.config.managerModel) status.manager.model = status.config.managerModel;
  } catch {
    // No config file
  }

  // Check worker status
  try {
    const workerPidFile = path.join(stateDir, 'worker.pid');
    const workerPid = await fs.readFile(workerPidFile, 'utf-8');
    const pid = workerPid.trim();

    // Check if process is running
    try {
      await execAsync(`kill -0 ${pid} 2>/dev/null`);
      status.worker.status = 'running';
      status.worker.pid = pid;
    } catch {
      status.worker.status = 'stopped';
    }
  } catch {}

  // Get iteration
  try {
    const iterFile = path.join(stateDir, 'worker_iteration');
    status.worker.iteration = parseInt(await fs.readFile(iterFile, 'utf-8'), 10) || 0;
  } catch {}

  // Get current PRD
  try {
    const prdFile = path.join(stateDir, 'current_prd');
    const prdPath = await fs.readFile(prdFile, 'utf-8');
    status.worker.currentPrd = path.basename(prdPath.trim());
  } catch {}

  // Check manager status
  try {
    const managerPidFile = path.join(stateDir, 'manager.pid');
    const managerPid = await fs.readFile(managerPidFile, 'utf-8');
    const pid = managerPid.trim();

    try {
      await execAsync(`kill -0 ${pid} 2>/dev/null`);
      status.manager.status = 'running';
      status.manager.pid = pid;
    } catch {
      status.manager.status = 'stopped';
    }
  } catch {}

  // Get manager reviews count
  try {
    const reviewsFile = path.join(stateDir, 'manager_reviews');
    status.manager.reviews = parseInt(await fs.readFile(reviewsFile, 'utf-8'), 10) || 0;
  } catch {}

  // Get PRDs
  try {
    const prdFiles = await fs.readdir(prdsDir);
    status.prds.list = prdFiles.filter(f => f.endsWith('.md')).sort();
    status.prds.total = status.prds.list.length;
  } catch {}

  // Get completed PRDs
  try {
    const completedFiles = await fs.readdir(completedDir);
    status.prds.completedList = completedFiles.filter(f => f.endsWith('.done')).map(f => f.replace('.md.done', '.md'));
    status.prds.completed = status.prds.completedList.length;
  } catch {}

  // Get skills
  try {
    const skillFiles = await fs.readdir(skillsDir);
    status.skills.list = skillFiles.filter(f => f.endsWith('.md')).sort();
    status.skills.count = status.skills.list.length;
  } catch {}

  // Get recent logs
  try {
    const logFiles = await fs.readdir(logsDir);
    const workerLog = logFiles.find(f => f.startsWith('worker_') && f.endsWith('.log'));
    if (workerLog) {
      const logPath = path.join(logsDir, workerLog);
      const { stdout } = await execAsync(`tail -20 "${logPath}" 2>/dev/null`);
      status.recentLogs = stdout.trim().split('\n').slice(-20);
    }
  } catch {}

  return status;
}

export async function GET() {
  try {
    const managerPaths = await findClaudeManagers();
    const statuses = await Promise.all(managerPaths.map(getManagerStatus));

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      managers: statuses, // Show all instances, even without PRDs
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

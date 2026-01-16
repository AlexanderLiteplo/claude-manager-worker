import { promises as fs } from 'fs';
import path from 'path';

/**
 * Security check: Ensure the instance path is within the allowed parent directory
 */
export function isPathAllowed(instancePath: string): boolean {
  const allowedParent = '/Users/alexander/claude-managers';
  const normalizedPath = path.normalize(instancePath);
  return normalizedPath.startsWith(allowedParent);
}

/**
 * Load PRD queue/organizer state from instance
 */
export async function loadQueueState(instancePath: string) {
  const queueFile = path.join(instancePath, '.state', 'prd_queue.json');

  try {
    const content = await fs.readFile(queueFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist, return empty queue
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { queue: [], inProgress: null };
    }
    throw error;
  }
}

/**
 * Save PRD queue/organizer state to instance
 */
export async function saveQueueState(instancePath: string, state: any) {
  const stateDir = path.join(instancePath, '.state');
  const queueFile = path.join(stateDir, 'prd_queue.json');

  // Ensure .state directory exists
  await fs.mkdir(stateDir, { recursive: true });

  // Save state
  await fs.writeFile(queueFile, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Get all PRD files from instance
 */
export async function getPrdFiles(instancePath: string) {
  const prdsDir = path.join(instancePath, 'prds');

  try {
    const files = await fs.readdir(prdsDir);
    return files.filter(f => f.endsWith('.md'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

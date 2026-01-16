# Skill: Avoiding File System Race Conditions

## When to Apply
Apply this skill when implementing file-based storage, especially:
- JSON file databases (conversations.json, config.json)
- Log files with concurrent writes
- Any read-modify-write pattern on files
- Configuration management

## Guidelines

### 1. The Read-Modify-Write Race Condition

The most common pattern that causes data loss:

```typescript
// BAD - Race condition!
async function updateConfig(key: string, value: string) {
  // Request A: reads file
  const data = JSON.parse(await fs.readFile('config.json', 'utf-8'));
  // Request B: reads file (same content as A)

  // Request A: modifies
  data[key] = value;
  // Request B: modifies (doesn't see A's change)

  // Request A: writes
  await fs.writeFile('config.json', JSON.stringify(data));
  // Request B: writes (OVERWRITES A's change!)
}
```

### 2. Solution 1: Atomic Writes with Temp Files

Use write-to-temp-then-rename pattern:

```typescript
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

async function atomicWriteFile(
  filePath: string,
  data: string
): Promise<void> {
  const dir = path.dirname(filePath);
  const tempId = crypto.randomBytes(8).toString('hex');
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${tempId}.tmp`);

  try {
    // Write to temp file
    await fs.writeFile(tempPath, data, 'utf-8');

    // Atomic rename
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

// Usage
async function saveConfig(config: Config) {
  await atomicWriteFile(
    'config.json',
    JSON.stringify(config, null, 2)
  );
}
```

### 3. Solution 2: File-Based Locking

For read-modify-write operations:

```typescript
import { promises as fs } from 'fs';
import path from 'path';

class FileLock {
  private locks = new Map<string, Promise<void>>();

  async withLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
    const normalizedPath = path.normalize(filePath);

    // Wait for existing lock
    while (this.locks.has(normalizedPath)) {
      await this.locks.get(normalizedPath);
    }

    // Create lock
    let releaseLock: () => void;
    const lockPromise = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    this.locks.set(normalizedPath, lockPromise);

    try {
      return await operation();
    } finally {
      this.locks.delete(normalizedPath);
      releaseLock!();
    }
  }
}

const fileLock = new FileLock();

// Usage
async function updateConversation(id: string, newMessages: Message[]) {
  return fileLock.withLock('conversations.json', async () => {
    const data = JSON.parse(await fs.readFile('conversations.json', 'utf-8'));
    const conv = data.conversations.find((c: Conv) => c.id === id);
    if (conv) {
      conv.messages = newMessages;
      conv.updatedAt = new Date().toISOString();
    }
    await atomicWriteFile('conversations.json', JSON.stringify(data, null, 2));
    return conv;
  });
}
```

### 4. Solution 3: Lock Files

For cross-process locking:

```typescript
import { promises as fs } from 'fs';
import path from 'path';

async function acquireLock(
  filePath: string,
  timeout = 5000
): Promise<() => Promise<void>> {
  const lockPath = `${filePath}.lock`;
  const startTime = Date.now();
  const pid = process.pid.toString();

  while (true) {
    try {
      // Try to create lock file exclusively
      await fs.writeFile(lockPath, pid, { flag: 'wx' });

      // Return release function
      return async () => {
        try {
          await fs.unlink(lockPath);
        } catch {
          // Ignore if already deleted
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }

      // Check for stale lock
      try {
        const stat = await fs.stat(lockPath);
        const age = Date.now() - stat.mtimeMs;
        if (age > 30000) {
          // Lock is >30 seconds old, likely stale
          await fs.unlink(lockPath);
          continue;
        }
      } catch {
        // Lock was deleted, try again
        continue;
      }

      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error(`Failed to acquire lock for ${filePath} within ${timeout}ms`);
      }

      // Wait and retry
      await new Promise(r => setTimeout(r, 100));
    }
  }
}

// Usage
async function safeUpdate(filePath: string, updater: (data: any) => any) {
  const releaseLock = await acquireLock(filePath);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const updated = updater(data);
    await atomicWriteFile(filePath, JSON.stringify(updated, null, 2));
    return updated;
  } finally {
    await releaseLock();
  }
}
```

### 5. Solution 4: Append-Only with Compaction

For high-write scenarios:

```typescript
interface LogEntry<T> {
  timestamp: string;
  operation: 'create' | 'update' | 'delete';
  id: string;
  data?: T;
}

// Append operations (no race condition - appends are atomic)
async function appendOperation<T>(
  logFile: string,
  operation: LogEntry<T>
): Promise<void> {
  const line = JSON.stringify(operation) + '\n';
  await fs.appendFile(logFile, line);
}

// Compact periodically to merge operations
async function compactLog<T>(
  logFile: string,
  snapshotFile: string
): Promise<Map<string, T>> {
  const releaseLock = await acquireLock(snapshotFile);

  try {
    const state = new Map<string, T>();

    // Read existing snapshot
    try {
      const snapshot = JSON.parse(await fs.readFile(snapshotFile, 'utf-8'));
      for (const [id, data] of Object.entries(snapshot)) {
        state.set(id, data as T);
      }
    } catch {
      // No snapshot yet
    }

    // Apply log entries
    const logContent = await fs.readFile(logFile, 'utf-8');
    for (const line of logContent.split('\n').filter(Boolean)) {
      const entry: LogEntry<T> = JSON.parse(line);
      switch (entry.operation) {
        case 'create':
        case 'update':
          state.set(entry.id, entry.data!);
          break;
        case 'delete':
          state.delete(entry.id);
          break;
      }
    }

    // Write new snapshot
    const snapshotData = Object.fromEntries(state);
    await atomicWriteFile(snapshotFile, JSON.stringify(snapshotData, null, 2));

    // Clear log
    await fs.writeFile(logFile, '');

    return state;
  } finally {
    await releaseLock();
  }
}
```

### 6. Best Practice: Database-Like API

Abstract file operations into a safe API:

```typescript
interface Conversation {
  id: string;
  messages: Message[];
  updatedAt: string;
}

class ConversationStore {
  private lock = new FileLock();
  private filePath: string;

  constructor(basePath: string) {
    this.filePath = path.join(basePath, 'conversations.json');
  }

  private async readAll(): Promise<Conversation[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data).conversations || [];
    } catch {
      return [];
    }
  }

  private async writeAll(conversations: Conversation[]): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await atomicWriteFile(
      this.filePath,
      JSON.stringify({ conversations }, null, 2)
    );
  }

  async get(id: string): Promise<Conversation | null> {
    const all = await this.readAll();
    return all.find(c => c.id === id) || null;
  }

  async list(): Promise<Conversation[]> {
    return this.readAll();
  }

  async save(conversation: Conversation): Promise<void> {
    return this.lock.withLock(this.filePath, async () => {
      const all = await this.readAll();
      const index = all.findIndex(c => c.id === conversation.id);

      if (index >= 0) {
        all[index] = conversation;
      } else {
        all.push(conversation);
      }

      await this.writeAll(all);
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.lock.withLock(this.filePath, async () => {
      const all = await this.readAll();
      const filtered = all.filter(c => c.id !== id);

      if (filtered.length === all.length) {
        return false;  // Not found
      }

      await this.writeAll(filtered);
      return true;
    });
  }
}

// Usage in API routes
const store = new ConversationStore('/path/to/instance');

// Safe concurrent access
await store.save(conversation);
```

## Common Mistakes to Avoid

1. **Read-then-write without locking** - Always lock or use atomic patterns
2. **Ignoring rename atomicity** - Write to temp, rename to target
3. **Long lock hold times** - Keep critical sections short
4. **No cleanup on error** - Always clean up temp/lock files
5. **Process-level-only locks** - Use file locks for multi-process
6. **Stale lock accumulation** - Implement lock timeout/cleanup
7. **Testing only with low concurrency** - Race conditions are timing-dependent

## Testing Race Conditions

```typescript
// Simulate concurrent writes
async function testConcurrency() {
  const store = new ConversationStore('./test');
  const id = 'test-conversation';

  // Create initial
  await store.save({ id, messages: [], updatedAt: new Date().toISOString() });

  // Concurrent updates
  const updates = Array.from({ length: 10 }, (_, i) =>
    store.save({
      id,
      messages: [{ content: `Message ${i}` }],
      updatedAt: new Date().toISOString(),
    })
  );

  await Promise.all(updates);

  // Verify last write won
  const final = await store.get(id);
  console.log('Final message count:', final?.messages.length);
  // Should be 1 if properly locked, could be inconsistent without locking
}
```

# Skill: Input Validation in API Routes

## When to Apply
Apply this skill when building any API route that accepts user input, especially:
- POST/PATCH/PUT request bodies
- Query parameters
- URL path parameters
- Any data that flows to file system operations

## Guidelines

### 1. Always Validate Request Body Size

Unbounded input can cause memory exhaustion:

```typescript
// BAD - No size limit
export async function POST(request: NextRequest) {
  const body = await request.json();
  // If body is 1GB, server will crash
}

// GOOD - Check content length
export async function POST(request: NextRequest) {
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  const MAX_BODY_SIZE = 100 * 1024; // 100KB

  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: `Request body too large. Maximum ${MAX_BODY_SIZE} bytes.` },
      { status: 413 }
    );
  }

  const body = await request.json();
  // ...
}
```

### 2. Validate String Field Lengths

Even within a valid JSON body, individual fields need limits:

```typescript
// BAD - No field validation
const { message, title } = body;
// message could be 10MB of text

// GOOD - Validate field lengths
const MAX_MESSAGE_LENGTH = 50000;  // 50KB
const MAX_TITLE_LENGTH = 200;

if (typeof body.message !== 'string') {
  return NextResponse.json({ error: 'Message must be a string' }, { status: 400 });
}

if (body.message.length > MAX_MESSAGE_LENGTH) {
  return NextResponse.json(
    { error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
    { status: 400 }
  );
}

if (body.title && body.title.length > MAX_TITLE_LENGTH) {
  return NextResponse.json(
    { error: `Title exceeds maximum length of ${MAX_TITLE_LENGTH} characters` },
    { status: 400 }
  );
}
```

### 3. Validate Path Parameters Before File Operations

Path parameters used in file system operations MUST be validated:

```typescript
// BAD - Direct path usage (path traversal vulnerability!)
export async function POST(request: NextRequest) {
  const { instancePath } = await request.json();

  await fs.access(instancePath);  // Attacker: "../../etc/passwd"
  const data = await fs.readFile(path.join(instancePath, 'data.json'));
}

// GOOD - Validate path is within allowed directory
const ALLOWED_BASE_PATHS = [
  path.join(os.homedir(), 'claude-managers'),
  '/opt/managers',
];

function isPathAllowed(testPath: string): boolean {
  const normalizedPath = path.normalize(path.resolve(testPath));
  return ALLOWED_BASE_PATHS.some(basePath =>
    normalizedPath.startsWith(path.normalize(basePath))
  );
}

export async function POST(request: NextRequest) {
  const { instancePath } = await request.json();

  if (!isPathAllowed(instancePath)) {
    return NextResponse.json(
      { error: 'Invalid instance path' },
      { status: 403 }
    );
  }

  await fs.access(instancePath);
  // Now safe to use
}
```

### 4. Validate ID Formats

IDs from user input should match expected patterns:

```typescript
// BAD - Use ID directly
const { conversationId } = body;
const conversation = data.find(c => c.id === conversationId);

// GOOD - Validate ID format first
const CONVERSATION_ID_PATTERN = /^conv_[a-z0-9]{8,15}_[a-z0-9]{8,11}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidConversationId(id: unknown): id is string {
  return typeof id === 'string' && CONVERSATION_ID_PATTERN.test(id);
}

if (body.conversationId && !isValidConversationId(body.conversationId)) {
  return NextResponse.json(
    { error: 'Invalid conversation ID format' },
    { status: 400 }
  );
}
```

### 5. Sanitize Output Data

When returning data that came from user input:

```typescript
// BAD - Return data as-is
return NextResponse.json({
  message: userMessage,  // Could contain XSS
});

// GOOD - Mark as raw text or escape
import { escapeHtml } from '@/lib/sanitize';

return NextResponse.json({
  message: escapeHtml(userMessage),
  rawMessage: userMessage,  // Client knows to handle safely
});
```

### 6. Required Fields Validation Pattern

Create a reusable validation function:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface FieldSpec {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

function validateBody(body: unknown, specs: FieldSpec[]): ValidationResult {
  const errors: string[] = [];

  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: ['Request body must be an object'] };
  }

  const obj = body as Record<string, unknown>;

  for (const spec of specs) {
    const value = obj[spec.name];

    // Required check
    if (spec.required && (value === undefined || value === null)) {
      errors.push(`${spec.name} is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    // Type check
    if (spec.type === 'array' && !Array.isArray(value)) {
      errors.push(`${spec.name} must be an array`);
    } else if (spec.type !== 'array' && typeof value !== spec.type) {
      errors.push(`${spec.name} must be a ${spec.type}`);
    }

    // String length checks
    if (spec.type === 'string' && typeof value === 'string') {
      if (spec.minLength && value.length < spec.minLength) {
        errors.push(`${spec.name} must be at least ${spec.minLength} characters`);
      }
      if (spec.maxLength && value.length > spec.maxLength) {
        errors.push(`${spec.name} must be at most ${spec.maxLength} characters`);
      }
    }

    // Number range checks
    if (spec.type === 'number' && typeof value === 'number') {
      if (spec.min !== undefined && value < spec.min) {
        errors.push(`${spec.name} must be at least ${spec.min}`);
      }
      if (spec.max !== undefined && value > spec.max) {
        errors.push(`${spec.name} must be at most ${spec.max}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// Usage
const validation = validateBody(body, [
  { name: 'message', type: 'string', required: true, minLength: 1, maxLength: 50000 },
  { name: 'instancePath', type: 'string', required: true },
  { name: 'conversationId', type: 'string', required: false, maxLength: 50 },
]);

if (!validation.valid) {
  return NextResponse.json(
    { error: 'Validation failed', details: validation.errors },
    { status: 400 }
  );
}
```

## Common Mistakes to Avoid

1. **Trusting any user input** - All input is potentially malicious
2. **Only validating presence, not content** - `if (!message)` isn't enough
3. **Using paths directly from input** - Always validate against allowed paths
4. **Forgetting array bounds** - Arrays need length limits too
5. **Not validating content type** - Check `Content-Type` header
6. **Returning raw user data** - Can enable XSS attacks
7. **Validating after use** - Always validate BEFORE using data

## Example: Complete Validated Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const MAX_BODY_SIZE = 100 * 1024;
const MAX_MESSAGE_LENGTH = 50000;
const ALLOWED_BASE = path.join(os.homedir(), 'claude-managers');

function isPathAllowed(testPath: string): boolean {
  const normalized = path.normalize(path.resolve(testPath));
  return normalized.startsWith(path.normalize(ALLOWED_BASE));
}

export async function POST(request: NextRequest) {
  // 1. Check body size
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const { message, instancePath } = body as Record<string, unknown>;

  // 3. Validate required fields
  if (typeof message !== 'string' || message.length === 0) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  if (typeof instancePath !== 'string') {
    return NextResponse.json({ error: 'Instance path is required' }, { status: 400 });
  }

  // 4. Validate path
  if (!isPathAllowed(instancePath)) {
    return NextResponse.json({ error: 'Invalid instance path' }, { status: 403 });
  }

  // 5. Verify path exists
  try {
    await fs.access(instancePath);
  } catch {
    return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
  }

  // Now safe to proceed...
}
```

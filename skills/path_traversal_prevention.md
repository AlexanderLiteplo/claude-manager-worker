# Skill: Path Traversal Prevention in API Routes

## When to Apply
Apply this skill **ALWAYS** when implementing any API route that:
- Accepts file paths from user input
- Reads or writes files based on user-provided paths
- Uses `instancePath`, `filePath`, or any path parameter from request body/params

## Critical Pattern: VALIDATE BEFORE USE

```typescript
import path from 'path';
import os from 'os';

// Define allowed base directories
const ALLOWED_BASES = [
  path.join(os.homedir(), 'claude-managers'),
  // Add other allowed directories if needed
];

/**
 * Validates that a path is within allowed directories.
 * MUST be called before any file system operation.
 */
function isPathAllowed(testPath: string): boolean {
  // Normalize and resolve to absolute path
  const normalizedPath = path.normalize(path.resolve(testPath));

  // Check against all allowed base paths
  return ALLOWED_BASES.some(basePath =>
    normalizedPath.startsWith(path.normalize(basePath))
  );
}

// Usage in route handler - ALWAYS do this first
export async function POST(request: NextRequest) {
  const { instancePath } = await request.json();

  // VALIDATE BEFORE ANY FILE OPERATION
  if (!isPathAllowed(instancePath)) {
    return NextResponse.json(
      { error: 'Invalid instance path' },
      { status: 403 }
    );
  }

  // Now safe to use instancePath
  await fs.readFile(path.join(instancePath, 'data.json'));
}
```

## Why This Matters

Without path validation, an attacker can:

```bash
# Read arbitrary files
curl -X POST /api/endpoint \
  -d '{"instancePath": "/../../../etc/passwd"}'

# Write to arbitrary locations
curl -X POST /api/save \
  -d '{"instancePath": "/../../../root/.bashrc", "content": "malicious"}'
```

## Checklist for Every File-Handling Route

1. [ ] Does the route accept any path from user input?
2. [ ] Is `isPathAllowed()` called BEFORE any `fs.*` operation?
3. [ ] Does the validation use `path.normalize()` and `path.resolve()`?
4. [ ] Are ALL path parameters validated (not just `instancePath`)?
5. [ ] Is the validation at the TOP of the handler (before any other logic)?

## Common Mistakes

### Bad: Checking existence instead of validation
```typescript
// WRONG - attacker can read /etc/passwd if it exists
try {
  await fs.access(instancePath);
  // Path exists, so we allow it - WRONG!
} catch {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

### Bad: Partial path checking
```typescript
// WRONG - can be bypassed with /../
if (instancePath.includes('claude-managers')) {
  // Allowed - WRONG!
}

// Attacker: "/../../../etc/passwd/../../claude-managers/fake"
```

### Bad: Only checking after file operations
```typescript
// WRONG ORDER - damage already done
const data = await fs.readFile(instancePath); // Already read!
if (!isPathAllowed(instancePath)) { // Too late
  return NextResponse.json({ error: 'Invalid' }, { status: 403 });
}
```

### Good: Validate first, then operate
```typescript
// CORRECT
if (!isPathAllowed(instancePath)) {
  return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
}

// Safe to proceed
const data = await fs.readFile(path.join(instancePath, 'file.json'));
```

## Routes That Need This Validation

In this project, these routes handle user-provided paths:

| Route | Status |
|-------|--------|
| `/api/editor/*` | Needs verification |
| `/api/planning/*` | MISSING validation |
| `/api/prd/*` | Has validation |
| `/api/skills/*` | Has validation |

**Every route that uses `instancePath` must validate it.**

## Testing Path Traversal

Test your routes with these payloads:

```bash
# Test 1: Direct traversal
curl -X POST /api/route -d '{"instancePath": "/../../../etc"}'

# Test 2: Encoded traversal
curl -X POST /api/route -d '{"instancePath": "..%2F..%2F..%2Fetc"}'

# Test 3: Double encoding
curl -X POST /api/route -d '{"instancePath": "..%252F..%252Fetc"}'

# Test 4: Path with null byte
curl -X POST /api/route -d '{"instancePath": "../../../etc\u0000.json"}'
```

All should return 403 Forbidden.

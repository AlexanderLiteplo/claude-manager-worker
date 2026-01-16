# Skill: Request Body Size Validation in API Routes

## When to Apply
Apply this skill **ALWAYS** when implementing Next.js API routes that accept POST, PUT, or PATCH requests with JSON bodies.

## The Problem

Without body size validation, an attacker can send extremely large payloads that consume server memory before you even parse the JSON:

```typescript
// BAD - No size validation
export async function POST(request: NextRequest) {
  const body = await request.json(); // Attacker sends 1GB payload
  // Server crashes with OOM error before reaching your code
}
```

## The Solution

Always check `Content-Length` header BEFORE parsing the body:

```typescript
// GOOD - Validate size before parsing
export async function POST(request: NextRequest) {
  const MAX_BODY_SIZE = 100 * 1024; // 100KB limit

  const contentLength = parseInt(request.headers.get('content-length') || '0');

  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request body exceeds maximum size of ${MAX_BODY_SIZE} bytes`,
        },
      },
      { status: 413 } // 413 Payload Too Large
    );
  }

  // Now safe to parse
  const body = await request.json();
  // ... rest of handler
}
```

## Recommended Limits by Endpoint Type

| Endpoint Type | Recommended Max Size | Rationale |
|---------------|---------------------|-----------|
| Standard CRUD | 50-100KB | Form data rarely exceeds this |
| AI Generation | 200KB | Long prompts, but bounded |
| File Upload | 5-10MB | Depends on file type |
| Bulk Operations | 1MB | Multiple items but reasonable |

## Creating a Reusable Middleware

For consistency, create a validation utility:

```typescript
// lib/api-utils.ts

export function validateRequestSize(
  request: NextRequest,
  maxSize: number = 100 * 1024
): { valid: boolean; response?: NextResponse } {
  const contentLength = parseInt(request.headers.get('content-length') || '0');

  if (contentLength > maxSize) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Request body exceeds ${maxSize} bytes`,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 413 }
      ),
    };
  }

  return { valid: true };
}

// Usage in route
export async function POST(request: NextRequest) {
  const sizeCheck = validateRequestSize(request);
  if (!sizeCheck.valid) return sizeCheck.response!;

  const body = await request.json();
  // ...
}
```

## Additional Considerations

### 1. Streaming Bodies
For very large uploads, consider streaming instead of loading into memory:

```typescript
// For file uploads
const reader = request.body?.getReader();
let bytesReceived = 0;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

while (reader) {
  const { done, value } = await reader.read();
  if (done) break;

  bytesReceived += value?.length || 0;
  if (bytesReceived > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 });
  }
  // Process chunk...
}
```

### 2. Content-Type Validation
Also validate that the content type is what you expect:

```typescript
const contentType = request.headers.get('content-type');
if (!contentType?.includes('application/json')) {
  return NextResponse.json(
    { error: 'Content-Type must be application/json' },
    { status: 415 } // 415 Unsupported Media Type
  );
}
```

### 3. Defense in Depth
Body size validation is one layer. Also implement:
- Rate limiting (requests per minute)
- Authentication (if applicable)
- Input validation after parsing

## Common Mistakes to Avoid

1. **Checking after parsing** - The damage is done if you parse first
2. **Trusting Content-Length alone** - Attackers can lie; also monitor actual bytes
3. **Same limit for all endpoints** - AI generation may need more than a simple form
4. **Forgetting 413 status code** - Use proper HTTP semantics
5. **No error message** - Tell the client the limit so they can adjust

## Testing

Test your validation with:

```bash
# Generate a large payload
dd if=/dev/zero bs=1M count=1 | base64 > /tmp/large.txt

# Try to send it
curl -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -d @/tmp/large.txt

# Should get 413 Payload Too Large
```

## Example: Complete Validated Route

```typescript
import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_SIZE = 100 * 1024; // 100KB

export async function POST(request: NextRequest) {
  // 1. Validate content type
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    );
  }

  // 2. Validate body size
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: `Body exceeds ${MAX_BODY_SIZE} bytes` },
      { status: 413 }
    );
  }

  // 3. Parse body (now safe)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );
  }

  // 4. Validate individual fields
  // ... your validation logic

  // 5. Process request
  // ... your business logic
}
```

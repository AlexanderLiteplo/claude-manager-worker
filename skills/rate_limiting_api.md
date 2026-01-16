# Skill: Rate Limiting for API Routes

## When to Apply
Apply this skill when implementing API routes that:
- Make expensive external API calls (OpenAI, Claude, etc.)
- Perform database-intensive operations
- Could be abused by automated scripts
- Have financial cost implications per call

## Why Rate Limiting Matters

Without rate limiting:
1. **Cost exposure**: A single bad actor could run up your OpenAI bill
2. **Service degradation**: Too many requests slow down everyone
3. **API quota exhaustion**: External APIs have their own limits
4. **Security risk**: Enables brute force attacks

## Simple In-Memory Rate Limiter

For single-server deployments, use an in-memory rate limiter:

```typescript
// lib/rate-limit.ts

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimit(
  key: string,
  options: {
    limit: number;       // Max requests
    windowMs: number;    // Time window in milliseconds
  }
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const { limit, windowMs } = options;

  let entry = rateLimitStore.get(key);

  // Clean up or create new entry
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  entry.count++;

  const remaining = Math.max(0, limit - entry.count);
  const resetIn = entry.resetTime - now;

  return {
    allowed: entry.count <= limit,
    remaining,
    resetIn,
  };
}

// Cleanup old entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute
```

## Using Rate Limiter in API Routes

```typescript
// app/api/ai/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Get client identifier (IP or user ID if authenticated)
  const clientIP = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown';

  // Apply rate limit: 10 requests per minute for AI endpoints
  const limit = rateLimit(`ai-generate:${clientIP}`, {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': String(limit.remaining),
          'X-RateLimit-Reset': String(Math.ceil(limit.resetIn / 1000)),
          'Retry-After': String(Math.ceil(limit.resetIn / 1000)),
        },
      }
    );
  }

  // Proceed with normal processing
  // ...

  // Include rate limit headers in successful responses too
  const response = NextResponse.json({ success: true, data: result });
  response.headers.set('X-RateLimit-Limit', '10');
  response.headers.set('X-RateLimit-Remaining', String(limit.remaining));
  return response;
}
```

## Recommended Limits by Endpoint Type

| Endpoint | Limit | Window | Rationale |
|----------|-------|--------|-----------|
| AI Generation | 10 | 1 min | Expensive, prevent cost abuse |
| AI Improvement | 20 | 1 min | Less expensive than full generation |
| Campaign Create | 5 | 1 min | Prevent spam campaigns |
| Post CRUD | 100 | 1 min | Normal usage, but bounded |
| Template CRUD | 50 | 1 min | Normal usage |
| Authentication | 5 | 15 min | Prevent brute force |

## Tiered Rate Limiting

For different access levels:

```typescript
// lib/rate-limit.ts

type AccessTier = 'anonymous' | 'authenticated' | 'premium';

const TIER_LIMITS: Record<AccessTier, { limit: number; windowMs: number }> = {
  anonymous: { limit: 5, windowMs: 60000 },
  authenticated: { limit: 20, windowMs: 60000 },
  premium: { limit: 100, windowMs: 60000 },
};

export function rateLimitByTier(
  key: string,
  tier: AccessTier
): ReturnType<typeof rateLimit> {
  const config = TIER_LIMITS[tier];
  return rateLimit(key, config);
}
```

## Production Considerations

### 1. Distributed Rate Limiting
For multi-server deployments, use Redis:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function distributedRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const fullKey = `ratelimit:${key}`;

  const current = await redis.incr(fullKey);

  if (current === 1) {
    await redis.expire(fullKey, windowSeconds);
  }

  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}
```

### 2. Sliding Window
More accurate than fixed windows:

```typescript
async function slidingWindowRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Use sorted set with timestamp as score
  const fullKey = `ratelimit:${key}`;

  // Remove old entries
  await redis.zremrangebyscore(fullKey, 0, windowStart);

  // Count current entries
  const count = await redis.zcard(fullKey);

  if (count < limit) {
    // Add new entry
    await redis.zadd(fullKey, now, `${now}-${Math.random()}`);
    await redis.expire(fullKey, Math.ceil(windowMs / 1000));
    return true;
  }

  return false;
}
```

### 3. Cost-Based Limiting
For AI endpoints, consider token-based limits:

```typescript
const TOKEN_BUDGET_PER_MINUTE = 10000;

async function tokenBudgetCheck(
  clientId: string,
  estimatedTokens: number
): Promise<boolean> {
  const key = `token-budget:${clientId}`;
  const current = parseInt(await redis.get(key) || '0');

  if (current + estimatedTokens > TOKEN_BUDGET_PER_MINUTE) {
    return false;
  }

  await redis.incrby(key, estimatedTokens);
  await redis.expire(key, 60);
  return true;
}
```

## Client-Side Handling

Help clients handle rate limits gracefully:

```typescript
// Client-side fetch wrapper
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    // Get retry delay from header
    const retryAfter = response.headers.get('Retry-After');
    const delaySeconds = parseInt(retryAfter || '5');

    console.log(`Rate limited. Retrying in ${delaySeconds}s...`);
    await new Promise(r => setTimeout(r, delaySeconds * 1000));
  }

  throw new Error('Max retries exceeded due to rate limiting');
}
```

## Common Mistakes to Avoid

1. **No rate limiting at all** - Especially on expensive endpoints
2. **Same limit for all endpoints** - AI generation needs tighter limits
3. **Not returning 429 status** - Clients can't distinguish from other errors
4. **Missing Retry-After header** - Clients don't know when to retry
5. **Rate limiting by session only** - Attackers can create new sessions
6. **Memory leaks** - Forgetting to clean up in-memory stores
7. **Too strict limits** - Legitimate users get frustrated

## Testing Rate Limits

```bash
# Test rate limiting with rapid requests
for i in {1..15}; do
  curl -s -w "%{http_code}\n" -X POST http://localhost:3000/api/ai/generate \
    -H "Content-Type: application/json" \
    -d '{"content": "test"}' &
done
wait

# Should see 200s then 429s
```

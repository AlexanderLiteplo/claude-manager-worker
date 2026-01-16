# Skill: Next.js API Route Best Practices

## When to Apply
Apply this skill when implementing API routes in Next.js App Router (`/app/api/**/route.ts`).

## Guidelines

### 1. Input Validation
Always validate and sanitize query parameters.

```typescript
// BAD - trusting user input
export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  const type = request.nextUrl.searchParams.get('type') as MyType;
  // ...
}

// GOOD - validate everything
const VALID_TYPES = ['type_a', 'type_b', 'type_c'] as const;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Bounded integer parsing
  const rawLimit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT));
  const limit = isNaN(rawLimit) ? DEFAULT_LIMIT : Math.min(Math.max(1, rawLimit), MAX_LIMIT);

  // Validated enum
  const rawType = searchParams.get('type');
  const type = VALID_TYPES.includes(rawType as any) ? rawType : null;

  // ...
}
```

### 2. Error Response Structure
Return consistent error responses with appropriate status codes.

```typescript
// BAD - inconsistent error handling
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' });
  }
}

// GOOD - structured error responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();

    return NextResponse.json<ApiResponse<typeof data>>({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API Error:', error);

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
```

### 3. Rate Limiting Awareness
Be aware of rate limiting implications, even if using Vercel's built-in protection.

```typescript
// Consider adding per-route rate limiting headers
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ data: '...' });

  // Add rate limit headers for client awareness
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '99');

  return response;
}
```

### 4. Avoid Expensive Operations
Don't run expensive computations on every request.

```typescript
// BAD - runs full detection on every request
export async function GET(request: NextRequest) {
  const anomalies = await anomalyDetector.detectAll(); // Expensive!
  return NextResponse.json({ anomalies });
}

// GOOD - use caching
let cachedResult: { data: Anomaly[]; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

export async function GET(request: NextRequest) {
  const now = Date.now();

  if (cachedResult && now - cachedResult.timestamp < CACHE_TTL) {
    return NextResponse.json({
      anomalies: cachedResult.data,
      cached: true,
    });
  }

  const anomalies = await anomalyDetector.detectAll();
  cachedResult = { data: anomalies, timestamp: now };

  return NextResponse.json({
    anomalies,
    cached: false,
  });
}
```

### 5. Dynamic vs Static Routes
Explicitly mark routes as dynamic when they need to be.

```typescript
// Force dynamic rendering for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// OR use ISR for semi-static data
export const revalidate = 60; // Revalidate every 60 seconds
```

### 6. Response Size Awareness
Don't return excessive data - implement pagination or filtering.

```typescript
// BAD - returning everything
export async function GET(request: NextRequest) {
  const allData = await getEverything(); // Could be huge!
  return NextResponse.json(allData);
}

// GOOD - paginated with limits
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = (page - 1) * limit;

  const { data, total } = await getData({ limit, offset });

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
```

## Common Mistakes to Avoid

1. **No input validation** - Always validate query params, body, and headers
2. **Exposing internal errors** - Don't leak stack traces or internal details
3. **Missing status codes** - Always return appropriate HTTP status codes
4. **Expensive synchronous operations** - Use async and don't block the event loop
5. **No timeout handling** - API operations should have timeouts
6. **Ignoring request method** - Handle unexpected methods gracefully
7. **No CORS consideration** - Consider CORS headers if API is called cross-origin

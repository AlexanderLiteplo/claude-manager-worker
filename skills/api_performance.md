# Skill: API Performance Patterns

## When to Apply
Apply this skill when building API clients, data fetching layers, or backend services that make external API calls.

## Guidelines

### 1. Avoid N+1 Query Problems
Batch lookups instead of querying for each item individually.

```typescript
// BAD - N+1 queries
async function processOrders(orders: Order[]) {
  for (const order of orders) {
    const user = await getUserById(order.userId); // 1 query per order!
    order.user = user;
  }
  return orders;
}

// GOOD - batch lookup
async function processOrders(orders: Order[]) {
  // Collect unique user IDs
  const userIds = [...new Set(orders.map(o => o.userId))];

  // Single batch query
  const users = await getUsersByIds(userIds);
  const userMap = new Map(users.map(u => [u.id, u]));

  // Attach users to orders
  return orders.map(order => ({
    ...order,
    user: userMap.get(order.userId),
  }));
}
```

### 2. Parallel Requests with Promise.all
When requests are independent, run them in parallel.

```typescript
// BAD - sequential requests
async function fetchDashboardData() {
  const markets = await fetchMarkets();     // Wait...
  const trades = await fetchTrades();        // Wait...
  const stats = await fetchStats();          // Wait...
  return { markets, trades, stats };
}

// GOOD - parallel requests
async function fetchDashboardData() {
  const [markets, trades, stats] = await Promise.all([
    fetchMarkets(),
    fetchTrades(),
    fetchStats(),
  ]);
  return { markets, trades, stats };
}

// BETTER - with error handling for partial success
async function fetchDashboardData() {
  const results = await Promise.allSettled([
    fetchMarkets(),
    fetchTrades(),
    fetchStats(),
  ]);

  return {
    markets: results[0].status === 'fulfilled' ? results[0].value : [],
    trades: results[1].status === 'fulfilled' ? results[1].value : [],
    stats: results[2].status === 'fulfilled' ? results[2].value : null,
    errors: results.filter(r => r.status === 'rejected').map(r => r.reason),
  };
}
```

### 3. Implement Request Deduplication
Prevent duplicate requests for the same data.

```typescript
// BAD - multiple components can trigger duplicate requests
class ApiClient {
  async fetchUser(id: string) {
    return fetch(`/api/users/${id}`).then(r => r.json());
  }
}

// GOOD - deduplicate in-flight requests
class ApiClient {
  private inFlight = new Map<string, Promise<any>>();

  async fetchUser(id: string): Promise<User> {
    const key = `user-${id}`;

    // Return existing promise if request is in flight
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }

    const promise = fetch(`/api/users/${id}`)
      .then(r => r.json())
      .finally(() => {
        this.inFlight.delete(key); // Clean up after completion
      });

    this.inFlight.set(key, promise);
    return promise;
  }
}
```

### 4. Smart Caching Strategy
Implement stale-while-revalidate pattern for resilience.

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

class CachedApiClient {
  private cache = new Map<string, CacheEntry<any>>();
  private staleDuration = 30000; // 30 seconds
  private maxAge = 300000; // 5 minutes

  async fetch<T>(url: string): Promise<T> {
    const cached = this.cache.get(url);
    const now = Date.now();

    // Return fresh cache immediately
    if (cached && now - cached.timestamp < this.staleDuration) {
      return cached.data;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();

      this.cache.set(url, {
        data,
        timestamp: now,
        isStale: false,
      });

      return data;
    } catch (error) {
      // Return stale cache on error if available
      if (cached && now - cached.timestamp < this.maxAge) {
        console.warn(`Using stale cache for ${url}`);
        return cached.data;
      }
      throw error;
    }
  }
}
```

### 5. Memory Management for Long-Running Services
Clean up caches to prevent memory leaks.

```typescript
// BAD - cache grows forever
class ApiClient {
  private cache = new Map<string, any>(); // Never cleaned!

  async fetch(key: string) {
    if (!this.cache.has(key)) {
      this.cache.set(key, await fetchData(key));
    }
    return this.cache.get(key);
  }
}

// GOOD - LRU cache with max size
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

### 6. Response Payload Optimization
Don't return more data than needed.

```typescript
// BAD - returning nested full objects
interface AnomalyResponse {
  anomalies: Array<{
    id: string;
    market: FullMarketObject;  // Huge object repeated
    wallet: FullWalletObject;  // Another huge object
    // ...
  }>;
}

// GOOD - normalized response with references
interface AnomalyResponse {
  anomalies: Array<{
    id: string;
    marketId: string;  // Just the ID
    walletAddress: string;  // Just the address
    // ...
  }>;
  // Include related entities once
  markets: Record<string, Market>;
  wallets: Record<string, Wallet>;
}
```

## Common Mistakes to Avoid

1. **Sequential requests** - Use Promise.all for independent requests
2. **N+1 queries** - Batch lookups where possible
3. **No deduplication** - Multiple components can trigger same request
4. **Unbounded caches** - Implement LRU or TTL-based eviction
5. **Returning too much data** - Normalize responses, implement pagination
6. **No timeout handling** - All external requests should have timeouts
7. **Ignoring partial failures** - Use Promise.allSettled for resilience

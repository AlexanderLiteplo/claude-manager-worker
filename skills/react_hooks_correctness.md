# Skill: React Hooks Correctness

## When to Apply
Apply this skill when writing React functional components with hooks, especially `useEffect`, `useCallback`, `useMemo`, and custom hooks.

## Guidelines

### 1. useEffect Dependency Arrays
Always include all dependencies used within the effect. Use ESLint rules to catch missing deps.

```typescript
// BAD - missing dependency causes stale closure
useEffect(() => {
  fetchData(userId); // userId not in deps!
}, []);

// BAD - function recreated every render, not in deps
const fetchData = async () => {
  const data = await api.get(userId);
  setData(data);
};

useEffect(() => {
  fetchData(); // fetchData changes every render!
}, [userId]); // Missing fetchData

// GOOD - wrap in useCallback and include in deps
const fetchData = useCallback(async () => {
  const data = await api.get(userId);
  setData(data);
}, [userId]);

useEffect(() => {
  fetchData();
}, [fetchData]); // Now correctly includes the dependency
```

### 2. Avoid Duplicate Logic
Don't duplicate fetching logic between components and hooks.

```typescript
// BAD - component duplicates hook logic
function useAnomalies() {
  const [data, setData] = useState([]);
  const fetchAnomalies = useCallback(async () => {
    const response = await fetch('/api/anomalies');
    setData(await response.json());
  }, []);
  // ...
}

function AnomalyFeed() {
  const [anomalies, setAnomalies] = useState([]);
  // Duplicate of hook logic!
  const fetchAnomalies = async () => {
    const response = await fetch('/api/anomalies');
    setAnomalies(await response.json());
  };
}

// GOOD - component uses the hook
function AnomalyFeed() {
  const { anomalies, loading, error, refresh } = useAnomalies();
  // ... just use the hook data
}
```

### 3. Cleanup Effects
Always clean up subscriptions, intervals, and listeners.

```typescript
// BAD - memory leak from interval
useEffect(() => {
  const interval = setInterval(fetchData, 30000);
  // Missing cleanup!
}, []);

// GOOD - cleanup on unmount
useEffect(() => {
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, [fetchData]);

// GOOD - cleanup with abort controller for fetch
useEffect(() => {
  const controller = new AbortController();

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data', {
        signal: controller.signal,
      });
      // ...
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError(error.message);
      }
    }
  };

  fetchData();

  return () => controller.abort();
}, []);
```

### 4. State Updates After Unmount
Guard against setting state after component unmounts.

```typescript
// BAD - can cause "can't perform state update on unmounted component"
useEffect(() => {
  const fetchData = async () => {
    const data = await api.get();
    setData(data); // Component might be unmounted!
  };
  fetchData();
}, []);

// GOOD - use ref to track mounted state
const isMounted = useRef(true);

useEffect(() => {
  return () => {
    isMounted.current = false;
  };
}, []);

useEffect(() => {
  const fetchData = async () => {
    const data = await api.get();
    if (isMounted.current) {
      setData(data);
    }
  };
  fetchData();
}, []);

// BETTER - use AbortController (modern approach)
useEffect(() => {
  const controller = new AbortController();

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data', { signal: controller.signal });
      const data = await response.json();
      setData(data); // Safe - fetch was aborted if unmounted
    } catch (e) {
      if (e.name !== 'AbortError') throw e;
    }
  };

  fetchData();
  return () => controller.abort();
}, []);
```

### 5. Custom Hook Return Values
Return stable references from hooks when possible.

```typescript
// BAD - new object every render
function useAnomalies() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  return { data, loading, refresh: fetchData }; // New object every time!
}

// GOOD - use useMemo for stable reference
function useAnomalies() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // ...
  }, []);

  // For advanced cases, memoize the entire return object
  return useMemo(
    () => ({ data, loading, refresh }),
    [data, loading, refresh]
  );
}
```

### 6. Avoiding Infinite Loops
Be careful with effects that update their own dependencies.

```typescript
// BAD - infinite loop
const [count, setCount] = useState(0);

useEffect(() => {
  setCount(count + 1); // Updates count, which triggers effect again
}, [count]);

// GOOD - use functional update
useEffect(() => {
  const interval = setInterval(() => {
    setCount(c => c + 1); // Functional update doesn't need count in deps
  }, 1000);
  return () => clearInterval(interval);
}, []); // Empty deps is correct here
```

## Common Mistakes to Avoid

1. **Missing dependencies** - Use eslint-plugin-react-hooks to catch these
2. **Object/array dependencies** - These change every render; use useMemo or extract values
3. **Async effects without cleanup** - Always abort ongoing requests on unmount
4. **Forgetting interval cleanup** - Always clearInterval/clearTimeout in cleanup
5. **State updates after unmount** - Use abort controllers or mounted refs
6. **Duplicating hook logic in components** - Reuse hooks, don't reimplement
7. **Heavy computations in render** - Move to useMemo or useEffect

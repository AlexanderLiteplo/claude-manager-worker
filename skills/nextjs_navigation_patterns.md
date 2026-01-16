# Skill: Next.js Navigation Patterns

## When to Apply
Apply this skill when implementing navigation, redirects, or page transitions in Next.js App Router applications.

## Guidelines

### 1. Always Use the Next.js Router for Navigation

Never use `window.location` for client-side navigation - it causes full page reloads.

```typescript
// BAD - causes full page reload, loses client state
window.location.href = '/campaigns/123';
window.location.assign('/campaigns/123');
window.location.replace('/campaigns/123');

// GOOD - client-side navigation, preserves state
import { useRouter } from 'next/navigation';

function MyComponent() {
  const router = useRouter();

  const handleSubmit = async () => {
    // After successful operation
    router.push('/campaigns/123');
  };
}
```

### 2. Never Use `window.location.reload()`

Instead of reloading the entire page, update local state or refetch data.

```typescript
// BAD - destroys all client state, slow, jarring UX
const handleMarkPublished = async () => {
  await fetch(`/api/posts/${id}/publish`, { method: 'POST' });
  window.location.reload();  // DON'T DO THIS
};

// GOOD - update state directly
const handleMarkPublished = async () => {
  const response = await fetch(`/api/posts/${id}/publish`, { method: 'POST' });
  const result = await response.json();

  if (result.success) {
    // Update local state
    setPost(result.data);
    // Or refetch if needed
    // await fetchPost();
  }
};
```

### 3. Use Router Methods Appropriately

```typescript
const router = useRouter();

// Navigate to a new page (adds to history)
router.push('/campaigns');

// Replace current page in history (for redirects after actions)
router.replace('/campaigns');

// Go back in history
router.back();

// Refresh the current route's server components (not a full reload)
router.refresh();

// Prefetch a route for faster navigation
router.prefetch('/campaigns');
```

### 4. Handle Post-Action Navigation

After successful form submissions or mutations, navigate appropriately:

```typescript
// For create operations - push to the new resource
const handleCreate = async () => {
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
  const { data } = await response.json();

  router.push(`/campaigns/${data.id}`);  // Navigate to new campaign
};

// For delete operations - go back or to list
const handleDelete = async () => {
  await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });

  router.replace('/campaigns');  // Replace to prevent going back to deleted resource
};

// For update operations - often stay on same page
const handleUpdate = async () => {
  await fetch(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

  // Just update local state, don't navigate
  setPost(result.data);
};
```

### 5. External Links and New Tabs

For external sites or "open in new tab" functionality:

```typescript
// Opening external links in new tab - this is fine
window.open('https://www.linkedin.com/feed/', '_blank');

// For same-site new tabs, still use router patterns
// Let users cmd/ctrl+click links naturally instead of forcing new tabs
```

## Common Mistakes to Avoid

1. **Using `window.location` for any internal navigation** - Always use router
2. **Calling `window.location.reload()` after state changes** - Update state instead
3. **Not using `replace()` after delete operations** - User can navigate "back" to deleted resource
4. **Forgetting that `router.push()` is async** - Await if needed before subsequent operations
5. **Using `router.push()` in Server Components** - Router is client-side only
6. **Not handling navigation failures** - Router can fail if route doesn't exist

## Examples

### Bad Example - Multiple Anti-Patterns
```typescript
const handleFormSubmit = async (data) => {
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (response.ok) {
    const result = await response.json();
    // BAD: Full page navigation
    window.location.href = `/campaigns/${result.data.id}`;
  } else {
    // BAD: Full page reload on error
    window.location.reload();
  }
};
```

### Good Example - Proper Navigation
```typescript
const router = useRouter();

const handleFormSubmit = async (data) => {
  try {
    const response = await fetch('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      setError(error.message);
      return;
    }

    const result = await response.json();
    router.push(`/campaigns/${result.data.id}`);
  } catch (err) {
    setError('Network error. Please try again.');
  }
};
```

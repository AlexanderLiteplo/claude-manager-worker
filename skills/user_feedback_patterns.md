# Skill: User Feedback Patterns in React

## When to Apply
Apply this skill when providing feedback to users after actions (save, delete, copy, errors, etc.) in React applications.

## Guidelines

### 1. Never Use `alert()` for User Feedback

The browser `alert()` function is blocking, jarring, and provides poor UX.

```typescript
// BAD - blocks the UI, looks unprofessional
alert('Post saved successfully!');
alert('Failed to save post');

// GOOD - non-blocking toast notification
import { toast } from 'sonner';  // or similar library

toast.success('Post saved successfully!');
toast.error('Failed to save post');
```

### 2. Types of User Feedback

Choose the appropriate feedback mechanism based on the situation:

| Situation | Feedback Type | Example |
|-----------|---------------|---------|
| Success confirmation | Toast (auto-dismiss) | "Post saved" |
| Error notification | Toast (persistent) | "Failed to connect" |
| Inline validation | Form field error | Red border + message |
| Destructive action | Confirmation dialog | "Delete this post?" |
| Long operation | Progress indicator | Loading spinner |
| Temporary state | Inline status | "Copied!" badge |

### 3. Toast Notifications

For success and error feedback after actions:

```typescript
// Using sonner (recommended for Next.js)
import { toast } from 'sonner';

// Success
toast.success('Campaign created successfully');

// Error
toast.error('Failed to generate posts. Please try again.');

// With description
toast.error('Generation failed', {
  description: 'OpenAI rate limit exceeded. Try again in 1 minute.',
});

// With action
toast.error('Failed to save', {
  action: {
    label: 'Retry',
    onClick: () => handleSave(),
  },
});

// Loading state
const toastId = toast.loading('Generating posts...');
// Later:
toast.success('Posts generated!', { id: toastId });
```

### 4. Inline Feedback

For temporary visual feedback without interrupting flow:

```typescript
const [copySuccess, setCopySuccess] = useState(false);

const handleCopy = async () => {
  await navigator.clipboard.writeText(content);
  setCopySuccess(true);

  // Auto-reset after 2 seconds
  setTimeout(() => setCopySuccess(false), 2000);
};

return (
  <>
    <Button onClick={handleCopy}>
      {copySuccess ? 'Copied!' : 'Copy'}
    </Button>
    {copySuccess && (
      <span className="text-sm text-green-600 ml-2">
        Copied to clipboard
      </span>
    )}
  </>
);
```

### 5. Confirmation Dialogs

For destructive or irreversible actions:

```typescript
// Using a dialog component
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

const handleDeleteClick = () => {
  setShowDeleteConfirm(true);
};

const handleConfirmDelete = async () => {
  await fetch(`/api/posts/${id}`, { method: 'DELETE' });
  setShowDeleteConfirm(false);
  router.replace('/campaigns');
};

return (
  <>
    <Button variant="destructive" onClick={handleDeleteClick}>
      Delete
    </Button>

    <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Post?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete
            the post and all associated data.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
```

### 6. Error Display Patterns

For form validation and API errors:

```typescript
// Field-level errors
const [errors, setErrors] = useState<Record<string, string>>({});

return (
  <div className="space-y-2">
    <Input
      value={productName}
      onChange={(e) => setProductName(e.target.value)}
      className={errors.productName ? 'border-red-500' : ''}
    />
    {errors.productName && (
      <p className="text-sm text-red-600">{errors.productName}</p>
    )}
  </div>
);

// Page-level errors
const [error, setError] = useState<string | null>(null);

return (
  <>
    {error && (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
        {error}
      </div>
    )}
    {/* rest of content */}
  </>
);
```

### 7. Setup Toast Provider

For toast notifications to work, add the Toaster provider:

```typescript
// In your root layout.tsx
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
```

## Common Mistakes to Avoid

1. **Using `alert()`** - Blocks UI, unprofessional appearance
2. **No feedback at all** - User unsure if action succeeded
3. **Too many toasts** - Only show for significant actions
4. **Not handling errors** - Silent failures confuse users
5. **Using `confirm()` for dialogs** - Use proper dialog components
6. **Forgetting loading states** - Show spinners during async operations
7. **Toasts for validation errors** - Use inline field errors instead

## Example Refactor

### Before (Using alerts)
```typescript
const handleSave = async () => {
  try {
    await fetch('/api/posts', { method: 'POST', body: JSON.stringify(data) });
    alert('Post saved successfully!');
  } catch (err) {
    alert('Failed to save post');
  }
};

const handleDelete = async () => {
  if (confirm('Are you sure you want to delete this post?')) {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    alert('Post deleted');
    window.location.reload();
  }
};
```

### After (Proper feedback patterns)
```typescript
import { toast } from 'sonner';

const handleSave = async () => {
  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to save');

    const result = await response.json();
    setPost(result.data);
    toast.success('Post saved successfully');
  } catch (err) {
    toast.error('Failed to save post', {
      description: err instanceof Error ? err.message : 'Please try again'
    });
  }
};

const [showDeleteDialog, setShowDeleteDialog] = useState(false);

const handleDelete = async () => {
  try {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    toast.success('Post deleted');
    router.replace('/campaigns');
  } catch (err) {
    toast.error('Failed to delete post');
  }
};

// Render delete confirmation dialog separately
```

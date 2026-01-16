# Skill: Avoiding Race Conditions in Prisma

## When to Apply
Apply this skill when implementing any "check-then-update" pattern with Prisma, especially for:
- Recording first occurrence of an event (first open, first click, first view)
- Claiming resources (assigning leads, processing queue items)
- Toggle operations (enable/disable, subscribe/unsubscribe)
- Counter increments with conditions

## Guidelines

### The Problem: Check-Then-Update Race Conditions

A common anti-pattern is reading a record, checking a condition, then updating:

```typescript
// BAD - Race condition!
async function recordFirstOpen(trackingId: string): Promise<boolean> {
  const email = await prisma.email.findUnique({
    where: { trackingId },
  });

  if (!email) return false;

  // Another request could slip through here!
  if (email.openedAt) return true; // Already opened

  await prisma.email.update({
    where: { trackingId },
    data: { openedAt: new Date() },
  });

  return true;
}
```

**Problem:** Between `findUnique` and `update`, another request can:
1. Also see `openedAt: null`
2. Proceed to update
3. Result: Two "first opens" recorded, potentially with different timestamps

### Solution 1: Atomic Conditional Update

Use `updateMany` with conditions in the `where` clause:

```typescript
// GOOD - Atomic operation
async function recordFirstOpen(trackingId: string): Promise<boolean> {
  const result = await prisma.email.updateMany({
    where: {
      trackingId,
      openedAt: null, // Only update if not yet opened
    },
    data: {
      openedAt: new Date(),
    },
  });

  // result.count tells us if we were the first
  return result.count > 0;
}
```

**Why this works:** The database handles the check and update atomically in a single operation.

### Solution 2: Use Transactions with Locking

For complex multi-step operations:

```typescript
// GOOD - Transaction with serializable isolation
async function claimLead(leadId: string, userId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead || lead.assignedTo) {
      return false; // Already claimed or doesn't exist
    }

    await tx.lead.update({
      where: { id: leadId },
      data: { assignedTo: userId },
    });

    return true;
  }, {
    isolationLevel: 'Serializable', // Prevents concurrent modifications
  });
}
```

### Solution 3: Unique Constraints for Deduplication

For event recording, leverage unique constraints:

```typescript
// Schema
model EmailEvent {
  id        String   @id @default(uuid())
  emailId   String
  eventType String   // 'open', 'click', 'bounce'

  @@unique([emailId, eventType]) // Only one of each type per email
}
```

```typescript
// GOOD - Database enforces uniqueness
async function recordEvent(emailId: string, eventType: string): Promise<boolean> {
  try {
    await prisma.emailEvent.create({
      data: { emailId, eventType },
    });
    return true; // We recorded the first one
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint violation
      return false; // Already exists
    }
    throw error;
  }
}
```

### Solution 4: Upsert for Idempotency

When you want "create or do nothing":

```typescript
// GOOD - Idempotent operation
async function ensureEmailTracked(trackingId: string): Promise<void> {
  await prisma.emailOpen.upsert({
    where: { trackingId },
    create: {
      trackingId,
      openedAt: new Date(),
    },
    update: {}, // Do nothing if exists
  });
}
```

## Examples

### Bad Example - Multiple Race Conditions
```typescript
async function processQueueItem(itemId: string): Promise<void> {
  const item = await prisma.queueItem.findUnique({
    where: { id: itemId },
  });

  if (!item || item.status !== 'pending') {
    return; // Already processed or doesn't exist
  }

  // Race: Another worker could claim this item here!

  await prisma.queueItem.update({
    where: { id: itemId },
    data: { status: 'processing' },
  });

  // Process the item...

  await prisma.queueItem.update({
    where: { id: itemId },
    data: { status: 'completed' },
  });
}
```

### Good Example - Atomic Claim Pattern
```typescript
async function processQueueItem(itemId: string): Promise<boolean> {
  // Atomically claim the item
  const claimed = await prisma.queueItem.updateMany({
    where: {
      id: itemId,
      status: 'pending', // Only claim if still pending
    },
    data: {
      status: 'processing',
      processingStartedAt: new Date(),
    },
  });

  if (claimed.count === 0) {
    return false; // Item was already claimed
  }

  try {
    // Process the item...

    await prisma.queueItem.update({
      where: { id: itemId },
      data: { status: 'completed' },
    });

    return true;
  } catch (error) {
    // Reset to pending on failure
    await prisma.queueItem.update({
      where: { id: itemId },
      data: { status: 'pending' },
    });
    throw error;
  }
}
```

## Common Mistakes to Avoid

1. **findUnique then update** - Never check a condition with a read, then act on it with a separate write
2. **Ignoring updateMany return value** - The `count` property tells you if your condition matched
3. **Using transactions without proper isolation** - Default isolation level may still allow races
4. **Trusting in-memory state** - Always verify state in the database before acting
5. **Not handling unique constraint errors** - Use them intentionally for deduplication
6. **Assuming low traffic means no races** - Race conditions will happen eventually; design for correctness

## When It's Okay to Skip Atomic Updates

Sometimes the consequences of a race are acceptable:
- Logging/analytics where duplicate counts are tolerable
- Cache updates where stale data is briefly acceptable
- Read-heavy operations with eventual consistency

But for business logic (payments, lead claims, status transitions), always use atomic patterns.

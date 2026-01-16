# Skill: API Endpoint Authentication

## When to Apply
Apply this skill when creating any API endpoint that:
- Modifies data (POST, PUT, PATCH, DELETE)
- Accesses user-specific data
- Processes payments or financial transactions
- Handles sensitive operations
- Receives webhooks from external services

## Guidelines

### 1. Authentication is Required by Default

Every endpoint that modifies state MUST have authentication unless there's a specific documented reason:

```typescript
// BAD - No authentication on state-changing endpoint
router.post('/process-booking', async (req, res) => {
  const { bookingId, status } = req.body;
  await prisma.booking.update({ where: { id: bookingId }, data: { status } });
});

// GOOD - Authentication required
router.post('/process-booking', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  // Verify user owns or has permission to modify this booking
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId: userId }
  });
  if (!booking) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  // ... process
});
```

### 2. Webhook Endpoints Need Signature Verification

If an endpoint receives callbacks from external services (Stripe, payment processors, etc.), verify the signature:

```typescript
// BAD - Webhook without signature verification
router.post('/webhook/stripe', async (req, res) => {
  const event = req.body; // Anyone can send fake events!
  handleStripeEvent(event);
});

// GOOD - Verify webhook signature
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Now safe to process the verified event
  handleStripeEvent(event);
  res.json({ received: true });
});
```

### 3. Internal/Admin Endpoints Need Extra Protection

For internal-only endpoints, add additional checks:

```typescript
// BAD - "Internal" endpoint with no protection
router.post('/admin/process-payment', async (req, res) => {
  // Anyone who discovers this endpoint can use it
});

// GOOD - Multiple layers of protection
router.post('/admin/process-payment',
  authMiddleware,           // Must be logged in
  requireRole('admin'),     // Must have admin role
  rateLimiter,              // Rate limited
  async (req: AuthenticatedRequest, res) => {
    // Log admin actions
    logger.info('Admin action', {
      userId: req.user!.id,
      action: 'process-payment',
      payload: req.body
    });
    // ... process
});
```

### 4. Check Endpoint Permissions Systematically

Before considering an endpoint complete, verify:

```typescript
// Endpoint Security Checklist
const endpointChecklist = {
  // 1. Authentication
  hasAuthMiddleware: true,            // Required for all non-public endpoints

  // 2. Authorization
  checksResourceOwnership: true,      // User can only access their own resources
  checksRolePermissions: true,        // Admin-only routes check roles

  // 3. Input Validation
  validatesRequestBody: true,         // Zod schema validation
  validatesPathParams: true,          // UUID format, etc.
  validatesQueryParams: true,         // Pagination limits, etc.

  // 4. Rate Limiting
  hasRateLimiting: true,              // Especially for auth endpoints

  // 5. Logging
  logsSecurityEvents: true,           // Failed auth, permission denied, etc.
};
```

### 5. Public Endpoints Should Be Explicitly Marked

If an endpoint genuinely needs to be public, document why:

```typescript
/**
 * GET /api/health
 *
 * PUBLIC ENDPOINT - No authentication required
 * Reason: Health check for load balancers and monitoring
 */
router.get('/health', async (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * GET /api/providers
 *
 * PUBLIC ENDPOINT - No authentication required
 * Reason: Allow unauthenticated users to browse providers
 * Note: Returns limited public data only, no private fields
 */
router.get('/', async (req, res) => {
  const providers = await prisma.providerProfile.findMany({
    select: {
      id: true,
      displayName: true,
      bio: true,
      rating: true,
      // Note: No private fields like earnings, internal notes, etc.
    }
  });
  res.json({ data: providers });
});
```

### 6. Don't Trust Client-Provided IDs Blindly

Always verify the authenticated user has permission to access the resource:

```typescript
// BAD - Trusts client-provided booking ID
router.put('/bookings/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  // Anyone can update any booking!
  await prisma.booking.update({ where: { id }, data: { status } });
});

// GOOD - Verify ownership
router.put('/bookings/:id/status', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user!.id;

  // Get user's provider profile if they have one
  const provider = await prisma.providerProfile.findUnique({
    where: { userId }
  });

  // Only allow customer or assigned provider to update
  const booking = await prisma.booking.findFirst({
    where: {
      id,
      OR: [
        { customerId: userId },
        { providerId: provider?.id }
      ]
    }
  });

  if (!booking) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Booking not found' }
    });
  }

  // Also validate status transitions
  if (!isValidStatusTransition(booking.status, status)) {
    return res.status(400).json({
      error: { code: 'INVALID_TRANSITION', message: 'Invalid status transition' }
    });
  }

  // Now safe to update
  await prisma.booking.update({ where: { id }, data: { status } });
});
```

## Quick Reference: When Auth is Needed

| Method | Endpoint Type | Auth Required? |
|--------|---------------|----------------|
| GET | Public data (provider list) | No |
| GET | User-specific data | Yes |
| POST | Create resource | Yes |
| POST | Webhook from external service | Signature verification |
| PUT/PATCH | Update resource | Yes + ownership check |
| DELETE | Delete resource | Yes + ownership check |

## Common Mistakes to Avoid

1. **Forgetting auth on POST endpoints** - All POST endpoints need auth or signature verification
2. **Webhook endpoints without signature verification** - External callers can forge requests
3. **Trusting client-provided resource IDs** - Always verify ownership
4. **"Internal only" endpoints with no protection** - Security by obscurity doesn't work
5. **Missing rate limiting on sensitive endpoints** - Auth and payment endpoints are targets
6. **Not logging security events** - You need audit trails for incidents

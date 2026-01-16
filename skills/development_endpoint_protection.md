# Skill: Development Endpoint Protection

## When to Apply
Apply this skill when creating:
- Seed/test data endpoints
- Database reset functionality
- Admin/debug endpoints
- Any "development only" functionality

## Guidelines

### 1. Development Endpoints Must Not Be Reachable in Production

Never rely solely on environment variable checks that can be bypassed:

```typescript
// BAD - Can be bypassed with ALLOW_SEED env var
router.post('/seed', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await seedDatabase(); // Attacker sets ALLOW_SEED=1 in their request
});

// BETTER - Multiple layers of protection
router.post('/seed',
  requireAuth,                    // Must be logged in
  requireRole('admin'),           // Must be admin
  requireHeader('X-Admin-Key'),   // Must have secret header
  async (req: AuthenticatedRequest, res) => {
    if (process.env.NODE_ENV === 'production') {
      // Log the attempt even if it would work
      logger.warn('Seed attempt in production', {
        userId: req.user!.id,
        ip: req.ip
      });
      return res.status(403).json({ error: 'Forbidden in production' });
    }
    await seedDatabase();
});

// BEST - Don't include in production build at all
// In your build/bundler config, exclude development routes from production
```

### 2. Don't Register Dev Routes in Production

Use conditional route registration:

```typescript
// src/index.ts
import seedRoutes from './routes/seed.js';

// Only register seed routes in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/seed', seedRoutes);
}

// OR use a build-time flag
if (__DEV__) {
  app.use('/api/seed', seedRoutes);
}
```

### 3. Stats/Debug Endpoints Need Protection Too

Read-only debug endpoints can leak sensitive information:

```typescript
// BAD - Leaks database statistics to anyone
router.get('/seed/stats', async (req, res) => {
  const stats = await getStats();
  res.json(stats); // Reveals table sizes, user counts, etc.
});

// GOOD - Protected debug endpoint
router.get('/seed/stats',
  requireAuth,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res) => {
    const stats = await getStats();
    res.json(stats);
});
```

### 4. Destructive Operations Require Extra Confirmation

Operations that delete data should have safety measures:

```typescript
// BAD - One request wipes the database
router.delete('/seed/clear', async (req, res) => {
  await prisma.user.deleteMany();
  res.json({ message: 'Cleared' });
});

// BETTER - Require confirmation and logging
router.delete('/seed/clear',
  requireAuth,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res) => {
    const { confirmDelete, reason } = req.body;

    if (confirmDelete !== 'DELETE_ALL_DATA') {
      return res.status(400).json({
        error: 'Must provide confirmDelete: "DELETE_ALL_DATA"'
      });
    }

    // Always log destructive operations
    logger.info('Database clear initiated', {
      userId: req.user!.id,
      reason,
      timestamp: new Date().toISOString()
    });

    await prisma.user.deleteMany();

    res.json({ message: 'Data cleared', clearedAt: new Date().toISOString() });
});
```

### 5. Consider IP Whitelisting for Admin Routes

Add network-level protection:

```typescript
// middleware/adminIpCheck.ts
const ALLOWED_ADMIN_IPS = process.env.ADMIN_IP_WHITELIST?.split(',') || [];

export const requireAdminIP = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  if (process.env.NODE_ENV === 'production' && !ALLOWED_ADMIN_IPS.includes(clientIP)) {
    logger.warn('Admin access from non-whitelisted IP', { ip: clientIP });
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};
```

### 6. Use Feature Flags Instead of Environment Checks

For more granular control:

```typescript
// lib/features.ts
interface FeatureFlags {
  enableSeedEndpoints: boolean;
  enableDebugRoutes: boolean;
  enableAdminPanel: boolean;
}

const getFeatureFlags = (): FeatureFlags => ({
  enableSeedEndpoints: process.env.ENABLE_SEED === 'true' &&
                        process.env.NODE_ENV !== 'production',
  enableDebugRoutes: process.env.ENABLE_DEBUG === 'true' &&
                      process.env.NODE_ENV !== 'production',
  enableAdminPanel: process.env.ENABLE_ADMIN === 'true',
});

// In routes
import { getFeatureFlags } from './lib/features.js';

if (getFeatureFlags().enableSeedEndpoints) {
  app.use('/api/seed', seedRoutes);
}
```

## Security Checklist for Development Endpoints

Before deploying, verify:

1. [ ] All dev endpoints are excluded from production builds
2. [ ] Any remaining admin endpoints require authentication + admin role
3. [ ] Destructive operations require explicit confirmation
4. [ ] All admin/debug access is logged
5. [ ] Read-only debug endpoints don't leak sensitive data
6. [ ] Environment variable bypasses are not possible

## Common Mistakes to Avoid

1. **`ALLOW_*` environment bypasses** - Attackers can sometimes inject env vars
2. **Public stats endpoints** - Database statistics reveal architecture info
3. **No logging on admin actions** - You need audit trails for incidents
4. **Single-request destructive ops** - Too easy to accidentally trigger
5. **Trusting `NODE_ENV` alone** - Should be defense in depth
6. **Including dev routes in production bundles** - Even if "protected," don't include them

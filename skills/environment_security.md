# Skill: Environment Variable Security

## When to Apply
Apply this skill when handling sensitive configuration like:
- API keys and secrets
- JWT signing secrets
- Database connection strings
- Third-party service credentials
- Encryption keys

## Guidelines

### 1. NEVER Use Fallback Values for Secrets

Fallback values for sensitive configuration are a security anti-pattern:

```typescript
// CRITICAL SECURITY ISSUE - Never do this!
const JWT_SECRET = process.env.JWT_SECRET || 'default-dev-secret';
const API_KEY = process.env.STRIPE_KEY || 'sk_test_default';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password123';
```

**Why this is dangerous:**
- If `.env` is misconfigured or missing, the app runs with known secrets
- Attackers can forge JWT tokens with the default secret
- Production deploys might accidentally use dev defaults

### 2. Fail Fast for Required Secrets

If a secret is required, the application should refuse to start without it:

```typescript
// GOOD - Fail immediately if secret is missing
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');
const DATABASE_URL = requireEnv('DATABASE_URL');
const STRIPE_SECRET_KEY = requireEnv('STRIPE_SECRET_KEY');
```

### 3. Validate Environment at Startup

Create a validation module that runs before the app starts:

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Required
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Optional with sensible defaults
  JWT_EXPIRES_IN: z.string().default('7d'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Optional - no defaults
  OPENAI_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();
```

### 4. Use the Validated Environment

```typescript
// GOOD - Import validated env instead of accessing process.env
import { env } from './lib/env';

const app = express();
app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

// Generate token with validated secret
jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
```

### 5. Secret Strength Validation

For secrets, validate minimum strength:

```typescript
const secretSchema = z.object({
  // Minimum 32 characters for cryptographic strength
  JWT_SECRET: z.string().min(32).refine(
    (s) => !/^[a-z]+$/.test(s), // Not just lowercase letters
    'JWT_SECRET should be a strong random string'
  ),

  // Stripe keys have specific format
  STRIPE_SECRET_KEY: z.string().regex(
    /^sk_(test|live)_[a-zA-Z0-9]+$/,
    'Invalid Stripe secret key format'
  ).optional(),
});
```

### 6. Environment-Specific Validation

Some secrets are only required in production:

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),

  // Always required
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),

  // Only required in production
  STRIPE_SECRET_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
}).refine(
  (data) => {
    if (data.NODE_ENV === 'production') {
      return !!data.STRIPE_SECRET_KEY && !!data.SENTRY_DSN;
    }
    return true;
  },
  'STRIPE_SECRET_KEY and SENTRY_DSN are required in production'
);
```

### 7. Never Log Secrets

```typescript
// BAD - Exposes secrets in logs
console.log('Config:', process.env);
console.log('JWT Secret:', env.JWT_SECRET);

// GOOD - Mask sensitive values
function maskSecret(s: string): string {
  if (s.length <= 8) return '***';
  return s.slice(0, 4) + '***' + s.slice(-4);
}

console.log('JWT Secret (masked):', maskSecret(env.JWT_SECRET));
// Output: "abcd***wxyz"
```

## .env File Best Practices

```bash
# .env.example (commit this - shows required vars without values)
NODE_ENV=development
PORT=3000

# Required - no defaults
DATABASE_URL=
JWT_SECRET=

# Optional
OPENAI_API_KEY=
STRIPE_SECRET_KEY=

# .env (never commit this!)
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
JWT_SECRET=a-very-long-random-string-at-least-32-characters
OPENAI_API_KEY=sk-proj-xxx
```

## Common Mistakes to Avoid

1. **Fallback secrets** - Never provide default values for secrets
2. **Late validation** - Validate at startup, not at first use
3. **Weak secrets** - Enforce minimum length and complexity
4. **Logging secrets** - Never log environment variables containing secrets
5. **Committing .env files** - Add `.env` to `.gitignore`
6. **Same secrets across environments** - Use different secrets for dev/staging/prod
7. **Hardcoded secrets** - Always use environment variables

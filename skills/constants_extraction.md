# Skill: Constants Extraction

## When to Apply
Apply this skill when you find yourself using hard-coded numbers, strings, or configuration values that:
- Appear in multiple places
- Represent business logic or domain knowledge
- Could change in the future
- Are not immediately obvious what they mean

## Guidelines

### 1. Create a Constants File

For project-wide constants, create `lib/constants.ts`:

```typescript
// lib/constants.ts

// LinkedIn-specific limits
export const LINKEDIN_MAX_CHARS = 3000;
export const LINKEDIN_PREVIEW_TRUNCATE = 210;

// Post length guidance
export const POST_IDEAL_MIN_CHARS = 150;
export const POST_IDEAL_MAX_CHARS = 300;
export const POST_GOOD_MIN_CHARS = 100;
export const POST_GOOD_MAX_CHARS = 800;

// Campaign limits
export const MIN_POSTS_PER_CAMPAIGN = 5;
export const MAX_POSTS_PER_CAMPAIGN = 20;
export const DEFAULT_POSTS_PER_CAMPAIGN = 10;

// Scheduling
export const OPTIMAL_POSTING_HOURS = [8, 9, 10, 12, 17, 18] as const;
export const BEST_POSTING_DAYS = [2, 3, 4] as const; // Tue, Wed, Thu

// API pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Timeouts
export const AI_GENERATION_TIMEOUT_MS = 60_000;
export const API_REQUEST_TIMEOUT_MS = 30_000;
```

### 2. Use Constants Instead of Magic Numbers

```typescript
// BAD - magic numbers
if (content.length > 3000) {
  return { error: 'Too long' };
}

const truncated = content.substring(0, 210);

const ideal = count >= 150 && count <= 300;

// GOOD - named constants
import {
  LINKEDIN_MAX_CHARS,
  LINKEDIN_PREVIEW_TRUNCATE,
  POST_IDEAL_MIN_CHARS,
  POST_IDEAL_MAX_CHARS
} from '@/lib/constants';

if (content.length > LINKEDIN_MAX_CHARS) {
  return { error: `Exceeds LinkedIn limit of ${LINKEDIN_MAX_CHARS} characters` };
}

const truncated = content.substring(0, LINKEDIN_PREVIEW_TRUNCATE);

const ideal = count >= POST_IDEAL_MIN_CHARS && count <= POST_IDEAL_MAX_CHARS;
```

### 3. Group Related Constants

```typescript
// Status values
export const POST_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  SKIPPED: 'skipped',
} as const;

export type PostStatus = typeof POST_STATUS[keyof typeof POST_STATUS];

// Campaign types
export const CAMPAIGN_TYPES = {
  LAUNCH: 'launch',
  FEATURES: 'features',
  TESTIMONIALS: 'testimonials',
  THOUGHT_LEADERSHIP: 'thought_leadership',
  MIXED: 'mixed',
} as const;

export type CampaignType = typeof CAMPAIGN_TYPES[keyof typeof CAMPAIGN_TYPES];

// Tones
export const TONES = {
  PROFESSIONAL: 'professional',
  CASUAL: 'casual',
  BOLD: 'bold',
  EDUCATIONAL: 'educational',
} as const;

export type Tone = typeof TONES[keyof typeof TONES];
```

### 4. Validation Arrays from Constants

```typescript
// Derive validation arrays from grouped constants
export const VALID_CAMPAIGN_TYPES = Object.values(CAMPAIGN_TYPES);
export const VALID_TONES = Object.values(TONES);
export const VALID_POST_STATUSES = Object.values(POST_STATUS);

// Usage in validation
if (!VALID_CAMPAIGN_TYPES.includes(campaignType)) {
  return { error: `Invalid campaign type. Must be one of: ${VALID_CAMPAIGN_TYPES.join(', ')}` };
}
```

### 5. Configuration vs Constants

For values that might need to change per environment, use environment variables:

```typescript
// For config that might change per environment
// .env
OPENAI_MODEL=gpt-4
AI_TEMPERATURE=0.7

// lib/config.ts
export const config = {
  openai: {
    model: process.env.OPENAI_MODEL || 'gpt-4',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  },
} as const;

// For truly constant values that never change
// lib/constants.ts
export const LINKEDIN_MAX_CHARS = 3000;  // This is a platform limit, won't change
```

## When NOT to Extract Constants

Not everything needs to be a constant:

```typescript
// DON'T extract - obvious and self-documenting
const isEven = n % 2 === 0;
const isEmpty = arr.length === 0;

// DON'T extract - only used once and obvious
const halfWidth = width / 2;

// DON'T extract - already descriptive from context
const padding = 16;  // px - standard padding in component
```

## Common Mistakes to Avoid

1. **Not using constants for domain values** - LinkedIn limits, business rules
2. **Scattering same value across files** - Leads to inconsistent updates
3. **Over-extracting** - Not everything needs to be a constant
4. **Wrong location** - Component-specific values shouldn't be in global constants
5. **Not deriving types** - Use `as const` and derive types from constants
6. **Hardcoding in error messages** - Use template literals with constants

## Example: Refactoring CharacterCounter

### Before
```typescript
export function CharacterCounter({ count }: { count: number }) {
  const getStatus = () => {
    if (count === 0) return 'empty';
    if (count < 100) return 'under';
    if (count >= 150 && count <= 300) return 'ideal';
    if (count <= 800) return 'good';
    if (count > 3000) return 'over';
    return 'good';
  };

  return (
    <div>
      {count}/3000 characters
      {count < 150 && <span>Aim for 150-300 characters</span>}
    </div>
  );
}
```

### After
```typescript
import {
  LINKEDIN_MAX_CHARS,
  POST_IDEAL_MIN_CHARS,
  POST_IDEAL_MAX_CHARS,
  POST_GOOD_MIN_CHARS,
  POST_GOOD_MAX_CHARS,
} from '@/lib/constants';

export function CharacterCounter({ count }: { count: number }) {
  const getStatus = () => {
    if (count === 0) return 'empty';
    if (count < POST_GOOD_MIN_CHARS) return 'under';
    if (count >= POST_IDEAL_MIN_CHARS && count <= POST_IDEAL_MAX_CHARS) return 'ideal';
    if (count <= POST_GOOD_MAX_CHARS) return 'good';
    if (count > LINKEDIN_MAX_CHARS) return 'over';
    return 'good';
  };

  return (
    <div>
      {count}/{LINKEDIN_MAX_CHARS} characters
      {count < POST_IDEAL_MIN_CHARS && (
        <span>Aim for {POST_IDEAL_MIN_CHARS}-{POST_IDEAL_MAX_CHARS} characters</span>
      )}
    </div>
  );
}
```

# Skill: Defensive Coding Practices

## When to Apply
Apply this skill whenever writing code that handles external data, performs calculations, or processes user input. This is especially critical for:
- API clients that parse responses
- Mathematical operations
- UI components displaying computed values
- Query parameter handling

## Guidelines

### 1. Guard Against Division by Zero
ALWAYS check denominators before division operations.

```typescript
// BAD - can produce Infinity or NaN
const percentage = value / total;
const profit = amount / price - amount;

// GOOD - guard against zero
const percentage = total > 0 ? value / total : 0;
const profit = price > 0 ? amount / price - amount : 0;
```

### 2. Validate External Data Before Use
Never trust data from APIs or user input. Validate and provide defaults.

```typescript
// BAD - trusts API response
const wallet = trade.maker || trade.taker;  // Could be undefined

// GOOD - validate with fallback
const wallet = trade.maker || trade.taker || trade.trader;
if (!wallet) {
  console.warn('Trade missing wallet address:', trade.id);
  continue; // or use a placeholder
}
```

### 3. Bound Numeric Inputs
Always validate and constrain numeric inputs from users.

```typescript
// BAD - unbounded user input
const limit = parseInt(searchParams.get('limit') || '50');

// GOOD - bounded with sensible limits
const requestedLimit = parseInt(searchParams.get('limit') || '50');
const limit = Math.max(1, Math.min(requestedLimit, 100)); // Between 1 and 100
```

### 4. Type-Safe Enum Validation
Don't cast user input to enum types without validation.

```typescript
// BAD - unsafe cast
const type = searchParams.get('type') as AnomalyType;

// GOOD - validate against allowed values
const VALID_TYPES = ['type_a', 'type_b', 'type_c'] as const;
const rawType = searchParams.get('type');
const type = VALID_TYPES.includes(rawType as any)
  ? (rawType as AnomalyType)
  : null;
```

### 5. Handle Edge Cases in Date/Time Operations
Always consider clock skew and invalid dates.

```typescript
// BAD - assumes date is in the past
const diffMs = now.getTime() - date.getTime();

// GOOD - handle both past and future
const diffMs = now.getTime() - date.getTime();
if (diffMs < 0) {
  return 'just now'; // or handle future date appropriately
}
```

### 6. Provide Meaningful Fallbacks
When parsing data, always have sensible defaults.

```typescript
// BAD - may create Invalid Date
const endDate = new Date(item.end_date_iso);

// GOOD - fallback chain with validation
const endDate = item.end_date_iso
  ? new Date(item.end_date_iso)
  : item.end_date
    ? new Date(item.end_date * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default: 30 days from now

if (isNaN(endDate.getTime())) {
  console.warn('Invalid date for item:', item.id);
}
```

## Examples

### Bad Example - Multiple Vulnerabilities
```typescript
async function processOrder(params: URLSearchParams) {
  const amount = parseInt(params.get('amount'));
  const price = parseFloat(params.get('price'));
  const type = params.get('type') as OrderType;

  const total = amount / price;
  const fee = total * 0.01;

  return { type, total, fee };
}
```

### Good Example - Defensive Implementation
```typescript
const VALID_ORDER_TYPES = ['buy', 'sell', 'limit'] as const;
type OrderType = typeof VALID_ORDER_TYPES[number];

async function processOrder(params: URLSearchParams) {
  // Validate and bound numeric inputs
  const rawAmount = parseInt(params.get('amount') || '0');
  const amount = Math.max(0, Math.min(rawAmount, 1000000));

  const rawPrice = parseFloat(params.get('price') || '0');
  const price = Math.max(0.01, rawPrice); // Minimum price to avoid division issues

  // Validate enum type
  const rawType = params.get('type');
  const type: OrderType | null = VALID_ORDER_TYPES.includes(rawType as any)
    ? (rawType as OrderType)
    : null;

  if (!type) {
    throw new Error(`Invalid order type: ${rawType}`);
  }

  // Safe calculation
  const total = price > 0 ? amount / price : 0;
  const fee = total * 0.01;

  return { type, total, fee };
}
```

## Common Mistakes to Avoid

1. **Trusting parseInt/parseFloat** - They can return NaN, always check or provide defaults
2. **Casting without validation** - User input should never be cast directly to specific types
3. **Assuming arrays have elements** - Always check `.length` before accessing by index
4. **Ignoring API nullability** - External APIs can return null/undefined for any field
5. **Division without guards** - Any division operation needs a zero check
6. **Unbounded loops** - Any loop based on external data should have a max iteration limit

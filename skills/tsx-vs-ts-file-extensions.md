# Skill: TypeScript File Extensions for JSX

## Pattern
When writing React components or files that contain JSX syntax, always use the `.tsx` extension instead of `.ts`.

## Problem
Using JSX syntax in a `.ts` file causes TypeScript compilation errors:
```
error TS1005: '>' expected.
error TS1005: ';' expected.
error TS1109: Expression expected.
```

## Rule
- Files with JSX/TSX syntax → `.tsx`
- Files with pure TypeScript (no JSX) → `.ts`

## Examples

### Incorrect
```typescript
// useSoundEffect.ts (wrong extension)
export function withClickSound<T>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: T) {
    return <Component {...props} />; // JSX causes error in .ts file
  };
}
```

### Correct
```typescript
// useSoundEffect.tsx (correct extension)
export function withClickSound<T>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: T) {
    return <Component {...props} />; // Works in .tsx file
  };
}
```

## When to Apply
- Creating new files with React components
- Adding HOCs (Higher-Order Components) that return JSX
- Any file that will contain `<` followed by a component name

## Verification
Run `npx tsc --noEmit` to check for TypeScript compilation errors before committing.

## Source
Discovered during Review #277 - Anime Theme implementation

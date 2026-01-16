# Skill: Canvas Animation Performance Optimization

## Pattern
When implementing canvas-based animations, optimize for performance and respect user preferences.

## Problems Addressed
1. Animations run even when not visible (wasted CPU/battery)
2. No support for reduced motion preferences
3. O(n²) algorithms for particle interactions

## Best Practices

### 1. Respect Reduced Motion Preferences
```typescript
useEffect(() => {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) {
    // Show static state or minimal animation
    return;
  }

  // Start full animation
}, []);
```

### 2. Pause When Not Visible
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      cancelAnimationFrame(animationRef.current);
    } else {
      animate();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

### 3. Use Spatial Partitioning for Particle Connections
Instead of O(n²) distance checks:
```typescript
// Bad: O(n²)
for (let i = 0; i < particles.length; i++) {
  for (let j = i + 1; j < particles.length; j++) {
    // Check distance between every pair
  }
}

// Better: Use grid-based spatial hashing
const grid = new Map<string, Particle[]>();
const cellSize = connectionDistance;

particles.forEach(p => {
  const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
  if (!grid.has(key)) grid.set(key, []);
  grid.get(key)!.push(p);
});

// Only check particles in same or adjacent cells
```

### 4. Limit Particle Count on Low-End Devices
```typescript
const getOptimalParticleCount = () => {
  // Check device memory if available
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (memory && memory < 4) return 20;

  // Check if mobile
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  if (isMobile) return 25;

  return 50; // Default for desktop
};
```

## When to Apply
- Canvas-based particle systems
- Background animations
- Any continuously running animation

## Verification
- Test with Chrome DevTools Performance tab
- Check CPU usage with animation running
- Verify animation pauses when tab is backgrounded

## Source
Discovered during Review #277 - ParticleBackground component analysis

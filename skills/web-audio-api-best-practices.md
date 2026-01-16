# Skill: Web Audio API Best Practices

## Pattern
When implementing sound effects in web applications, handle browser restrictions and edge cases properly.

## Problems Addressed
1. Audio context blocked until user gesture
2. Rapid successive plays causing issues
3. Sound not playing on mobile devices

## Best Practices

### 1. Resume Audio Context on User Gesture
```typescript
class SoundManager {
  private audioContext: AudioContext | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;

    // Create audio context
    this.audioContext = new (window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();

    // Resume on first user interaction
    const resumeContext = async () => {
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }
      // Remove listeners after first interaction
      document.removeEventListener('click', resumeContext);
      document.removeEventListener('touchstart', resumeContext);
      document.removeEventListener('keydown', resumeContext);
    };

    document.addEventListener('click', resumeContext);
    document.addEventListener('touchstart', resumeContext);
    document.addEventListener('keydown', resumeContext);

    this.initialized = true;
  }

  async play(soundType: string) {
    // Ensure context is running
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
    // ... play sound
  }
}
```

### 2. Debounce Rapid Plays
```typescript
class SoundManager {
  private lastPlayTime: Map<string, number> = new Map();
  private minInterval = 50; // ms between same sound

  play(soundType: string) {
    const now = Date.now();
    const lastTime = this.lastPlayTime.get(soundType) || 0;

    if (now - lastTime < this.minInterval) {
      return; // Skip if played too recently
    }

    this.lastPlayTime.set(soundType, now);
    this._playSound(soundType);
  }
}
```

### 3. Preload Sounds
```typescript
class SoundManager {
  private buffers: Map<string, AudioBuffer> = new Map();

  async preloadSounds(soundPaths: Record<string, string>) {
    const loadPromises = Object.entries(soundPaths).map(
      async ([name, path]) => {
        try {
          const response = await fetch(path);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
          this.buffers.set(name, audioBuffer);
        } catch (error) {
          console.warn(`Failed to load sound: ${name}`, error);
        }
      }
    );

    await Promise.all(loadPromises);
  }
}
```

### 4. Provide Fallback for Failed Audio
```typescript
// Base64-encoded fallback sounds
const FALLBACK_SOUNDS = {
  click: 'data:audio/wav;base64,UklGRnoGAABXQVZF...',
  hover: 'data:audio/wav;base64,UklGRl4GAABXQVZF...',
};

async loadSound(name: string, path: string) {
  try {
    // Try loading from path
    return await this.loadFromPath(path);
  } catch {
    // Fall back to embedded sound
    if (FALLBACK_SOUNDS[name]) {
      return await this.loadFromBase64(FALLBACK_SOUNDS[name]);
    }
    throw new Error(`No sound available for: ${name}`);
  }
}
```

## When to Apply
- Implementing sound effects in React apps
- Building game-like interfaces with audio feedback
- Any Web Audio API usage

## Verification
- Test on iOS Safari (strictest audio policies)
- Test with rapid clicking/hovering
- Test with network offline

## Source
Discovered during Review #277 - SoundManager implementation analysis

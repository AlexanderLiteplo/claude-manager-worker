/**
 * Anime Sound Effect Manager
 * Manages sound effects for UI interactions with multiple sound packs
 */

export type SoundType =
  | 'click'
  | 'hover'
  | 'success'
  | 'error'
  | 'notification'
  | 'victory'
  | 'levelUp'
  | 'start'
  | 'stop'
  | 'complete';

export type SoundPack = 'default' | 'persona' | 'pokemon' | 'zelda' | 'ghibli';

interface SoundSettings {
  enabled: boolean;
  volume: number;
  pack: SoundPack;
}

const STORAGE_KEY = 'anime-sound-settings';

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.5,
  pack: 'default',
};

/**
 * Base64-encoded minimal beep sounds as fallbacks
 * These are tiny placeholder sounds when actual files aren't available
 */
const PLACEHOLDER_SOUNDS: Record<SoundType, string> = {
  // Very short sine wave beeps encoded as base64 WAV
  click: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=',
  hover: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=',
  success: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=',
  error: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=',
  notification: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=',
  victory: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=',
  levelUp: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=',
  start: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=',
  stop: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=',
  complete: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=',
};

/**
 * Sound file paths by pack
 */
function getSoundPath(pack: SoundPack, type: SoundType): string {
  return `/sounds/${pack}/${type}.mp3`;
}

/**
 * Singleton Sound Manager class
 */
class SoundManagerClass {
  private static instance: SoundManagerClass | null = null;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private settings: SoundSettings = DEFAULT_SETTINGS;
  private initialized = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): SoundManagerClass {
    if (!SoundManagerClass.instance) {
      SoundManagerClass.instance = new SoundManagerClass();
    }
    return SoundManagerClass.instance;
  }

  /**
   * Initialize the sound manager (must be called on client side)
   */
  init(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    this.loadSettings();
    this.loadSoundPack(this.settings.pack);
    this.initialized = true;
  }

  /**
   * Load a sound pack
   */
  loadSoundPack(pack: SoundPack): void {
    this.settings.pack = pack;
    this.sounds.clear();

    const soundTypes: SoundType[] = [
      'click',
      'hover',
      'success',
      'error',
      'notification',
      'victory',
      'levelUp',
      'start',
      'stop',
      'complete',
    ];

    for (const type of soundTypes) {
      const audio = new Audio();
      audio.volume = this.settings.volume;
      audio.preload = 'auto';

      // Try to load the actual sound file, fall back to placeholder
      const soundPath = getSoundPath(pack, type);
      audio.src = soundPath;

      // On error, use placeholder
      audio.onerror = () => {
        audio.src = PLACEHOLDER_SOUNDS[type];
      };

      this.sounds.set(type, audio);
    }

    this.saveSettings();
  }

  /**
   * Play a sound effect
   */
  play(type: SoundType): void {
    if (!this.settings.enabled || typeof window === 'undefined') {
      return;
    }

    const sound = this.sounds.get(type);
    if (sound) {
      // Clone the audio for overlapping sounds
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.volume = this.settings.volume;
      clone.play().catch((err) => {
        // Ignore autoplay errors (user hasn't interacted yet)
        if (err.name !== 'NotAllowedError') {
          console.warn('Failed to play sound:', err);
        }
      });
    }
  }

  /**
   * Enable or disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.saveSettings();
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((sound) => {
      sound.volume = this.settings.volume;
    });
    this.saveSettings();
  }

  /**
   * Get current settings
   */
  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = {
          enabled: parsed.enabled ?? DEFAULT_SETTINGS.enabled,
          volume: parsed.volume ?? DEFAULT_SETTINGS.volume,
          pack: parsed.pack ?? DEFAULT_SETTINGS.pack,
        };
      }
    } catch (err) {
      console.warn('Failed to load sound settings:', err);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (err) {
      console.warn('Failed to save sound settings:', err);
    }
  }
}

/**
 * Get the singleton instance
 */
export function getSoundManager(): SoundManagerClass {
  return SoundManagerClass.getInstance();
}

/**
 * Sound pack metadata for UI display
 */
export const SOUND_PACKS: { id: SoundPack; name: string; emoji: string; description: string }[] = [
  { id: 'default', name: 'Default Anime', emoji: '🎌', description: 'Classic anime UI sounds' },
  { id: 'persona', name: 'Persona', emoji: '🎭', description: 'Stylish Persona-inspired sounds' },
  { id: 'pokemon', name: 'Pokemon', emoji: '⚡', description: 'Pokemon game sounds' },
  { id: 'zelda', name: 'Zelda', emoji: '🗡️', description: 'Legend of Zelda sounds' },
  { id: 'ghibli', name: 'Studio Ghibli', emoji: '🌳', description: 'Gentle Ghibli-inspired sounds' },
];

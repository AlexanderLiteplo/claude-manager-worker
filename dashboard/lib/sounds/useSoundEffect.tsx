'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSoundManager, SoundType, SoundPack, SOUND_PACKS } from './SoundManager';

interface UseSoundEffectReturn {
  play: (type: SoundType) => void;
  settings: {
    enabled: boolean;
    volume: number;
    pack: SoundPack;
  };
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  changePack: (pack: SoundPack) => void;
  soundPacks: typeof SOUND_PACKS;
}

/**
 * React hook for playing anime sound effects
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { play, settings, setEnabled } = useSoundEffect();
 *
 *   return (
 *     <button
 *       onClick={() => {
 *         play('click');
 *         // do something
 *       }}
 *       onMouseEnter={() => play('hover')}
 *     >
 *       Click me
 *     </button>
 *   );
 * }
 * ```
 */
export function useSoundEffect(): UseSoundEffectReturn {
  const [settings, setSettings] = useState({
    enabled: true,
    volume: 0.5,
    pack: 'default' as SoundPack,
  });

  // Initialize sound manager on mount
  useEffect(() => {
    const manager = getSoundManager();
    manager.init();
    setSettings(manager.getSettings());
  }, []);

  const play = useCallback((type: SoundType) => {
    getSoundManager().play(type);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    getSoundManager().setEnabled(enabled);
    setSettings((prev) => ({ ...prev, enabled }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    getSoundManager().setVolume(volume);
    setSettings((prev) => ({ ...prev, volume }));
  }, []);

  const changePack = useCallback((pack: SoundPack) => {
    getSoundManager().loadSoundPack(pack);
    setSettings((prev) => ({ ...prev, pack }));
  }, []);

  return {
    play,
    settings,
    setEnabled,
    setVolume,
    changePack,
    soundPacks: SOUND_PACKS,
  };
}

/**
 * HOC for adding sound effects to click handlers
 */
export function withClickSound<T extends { onClick?: () => void }>(
  Component: React.ComponentType<T>,
  soundType: SoundType = 'click'
): React.ComponentType<T> {
  return function WrappedComponent(props: T) {
    const { play } = useSoundEffect();

    const handleClick = () => {
      play(soundType);
      props.onClick?.();
    };

    return <Component {...props} onClick={handleClick} />;
  };
}

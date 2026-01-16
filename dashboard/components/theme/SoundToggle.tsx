'use client';

import { useState } from 'react';
import { useSoundEffect } from '../../lib/sounds/useSoundEffect';
import { animeTransitions, animeHoverEffects } from '../../lib/theme/animations';

interface SoundToggleProps {
  /**
   * Position on screen
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /**
   * Additional CSS class
   */
  className?: string;
}

const positionStyles = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
};

export function SoundToggle({
  position = 'bottom-right',
  className = '',
}: SoundToggleProps) {
  const [showSettings, setShowSettings] = useState(false);
  const { play, settings, setEnabled, setVolume, changePack, soundPacks } = useSoundEffect();

  const handleToggle = () => {
    if (!showSettings) {
      // Toggle sound on/off with single click
      setEnabled(!settings.enabled);
      if (!settings.enabled) {
        // Play a sound when enabling
        setTimeout(() => play('success'), 50);
      }
    } else {
      setShowSettings(false);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowSettings(!showSettings);
  };

  return (
    <div className={`fixed ${positionStyles[position]} z-50 ${className}`}>
      {/* Settings Panel */}
      {showSettings && (
        <div
          className={`
            absolute ${position.includes('bottom') ? 'bottom-16' : 'top-16'}
            ${position.includes('right') ? 'right-0' : 'left-0'}
            bg-white dark:bg-gray-800
            rounded-2xl
            shadow-2xl
            border border-gray-200 dark:border-gray-700
            p-5
            w-72
            ${animeTransitions.normal}
            animate-[anime-slide-up_0.3s_ease-out]
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <span>🎵</span>
              Sound Settings
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sound Effects
            </span>
            <button
              onClick={() => {
                setEnabled(!settings.enabled);
                if (!settings.enabled) play('success');
              }}
              className={`
                relative w-14 h-8 rounded-full
                ${animeTransitions.fast}
                ${
                  settings.enabled
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }
              `}
            >
              <span
                className={`
                  absolute top-1 w-6 h-6 rounded-full bg-white shadow-md
                  ${animeTransitions.fast}
                  ${settings.enabled ? 'left-7' : 'left-1'}
                `}
              />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Volume
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.volume * 100}
              onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer
                bg-gray-200 dark:bg-gray-600
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-gradient-to-r
                [&::-webkit-slider-thumb]:from-pink-500
                [&::-webkit-slider-thumb]:to-purple-600
                [&::-webkit-slider-thumb]:shadow-md
              "
            />
          </div>

          {/* Sound Pack Selection */}
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Sound Pack
            </span>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {soundPacks.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => {
                    changePack(pack.id);
                    play('success');
                  }}
                  className={`
                    w-full text-left px-3 py-2 rounded-xl
                    flex items-center gap-3
                    ${animeTransitions.fast}
                    ${animeHoverEffects.lift}
                    ${
                      settings.pack === pack.id
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  <span className="text-xl">{pack.emoji}</span>
                  <div>
                    <div className="font-medium">{pack.name}</div>
                    <div className={`text-xs ${settings.pack === pack.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                      {pack.description}
                    </div>
                  </div>
                  {settings.pack === pack.id && (
                    <span className="ml-auto">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Test Button */}
          <button
            onClick={() => play('notification')}
            className={`
              w-full mt-4 py-2 rounded-xl
              bg-gray-100 dark:bg-gray-700
              text-gray-700 dark:text-gray-300
              font-medium
              ${animeTransitions.fast}
              hover:bg-gray-200 dark:hover:bg-gray-600
            `}
          >
            🔊 Test Sound
          </button>
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={handleToggle}
        onContextMenu={handleRightClick}
        title="Click to toggle sound, right-click for settings"
        className={`
          w-14 h-14 rounded-full
          flex items-center justify-center
          shadow-lg
          ${animeTransitions.bounce}
          ${animeHoverEffects.grow}
          ${
            settings.enabled
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 shadow-pink-500/30'
              : 'bg-gray-400 dark:bg-gray-600'
          }
        `}
      >
        <span className="text-2xl text-white">
          {settings.enabled ? '🔊' : '🔇'}
        </span>
      </button>

      {/* Hint text */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500 opacity-0 hover:opacity-100 transition-opacity">
        Right-click for settings
      </div>
    </div>
  );
}

/**
 * Inline volume control for use in settings pages
 */
export function VolumeControl({ className = '' }: { className?: string }) {
  const { settings, setVolume, setEnabled } = useSoundEffect();

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <button
        onClick={() => setEnabled(!settings.enabled)}
        className={`
          w-10 h-10 rounded-lg
          flex items-center justify-center
          ${animeTransitions.fast}
          ${
            settings.enabled
              ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
          }
        `}
      >
        {settings.enabled ? '🔊' : '🔇'}
      </button>
      <input
        type="range"
        min="0"
        max="100"
        value={settings.volume * 100}
        onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
        disabled={!settings.enabled}
        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer
          bg-gray-200 dark:bg-gray-600
          disabled:opacity-50 disabled:cursor-not-allowed
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-gradient-to-r
          [&::-webkit-slider-thumb]:from-pink-500
          [&::-webkit-slider-thumb]:to-purple-600
          [&::-webkit-slider-thumb]:shadow-md
        "
      />
      <span className="text-sm text-gray-500 dark:text-gray-400 w-12 text-right">
        {Math.round(settings.volume * 100)}%
      </span>
    </div>
  );
}

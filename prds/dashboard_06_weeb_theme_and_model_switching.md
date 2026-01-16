# PRD: Anime/Weeb Theme with Sound Effects & Model Switching

## Overview

Transform the claude-manager dashboard into a full anime/weeb-themed interface with custom sound effects, anime-style UI elements, particle effects, and dynamic model switching capabilities. Users can change Worker and Manager models on-the-fly and experience an immersive anime aesthetic.

## Goals

1. Complete anime/weeb aesthetic transformation
2. Sound effects for all interactions (clicks, successes, errors, notifications)
3. Anime-style UI components (cards, buttons, panels)
4. Particle effects and animations
5. Dynamic model switching for Worker and Manager
6. Anime character avatars for Worker and Manager
7. Japanese-inspired typography and colors
8. Achievement system with anime-style badges
9. Customizable sound pack themes

## Target Directory

`/Users/alexander/claude-manager-worker/dashboard/`

## User Stories

### As a user, I want to:
1. See an anime-themed dashboard with vibrant colors and effects
2. Hear satisfying anime sound effects when I interact
3. Switch Worker model between Opus, Sonnet, and Haiku
4. Switch Manager model between Opus, Sonnet, and Haiku
5. See anime character avatars representing Worker and Manager
6. Experience particle effects when tasks complete
7. Hear victory music when PRDs complete
8. Earn anime-style achievement badges
9. Toggle sound effects on/off
10. Choose between different anime sound packs

## Technical Requirements

### Architecture

```
dashboard/
  app/
    api/
      control/
        models/
          route.ts            # POST update worker/manager models
    settings/
      theme/
        page.tsx              # Theme customization
      sounds/
        page.tsx              # Sound pack selection
  components/
    theme/
      AnimeCard.tsx           # Anime-styled card component
      AnimeButton.tsx         # Anime-styled button with effects
      ParticleBackground.tsx  # Animated particle background
      CharacterAvatar.tsx     # Anime character avatars
      AchievementToast.tsx    # Achievement notification
      ModelSwitcher.tsx       # Model selection UI
      SoundToggle.tsx         # Sound on/off toggle
  lib/
    sounds/
      SoundManager.ts         # Sound effect management
      sound-packs/
        default/              # Default anime sound pack
        persona/              # Persona game sounds
        pokemon/              # Pokemon sounds
        zelda/                # Zelda sounds
    theme/
      anime-colors.ts         # Anime color palette
      animations.ts           # CSS animations
  public/
    sounds/
      click.mp3
      success.mp3
      error.mp3
      notification.mp3
      victory.mp3
      level-up.mp3
      hover.mp3
    images/
      characters/
        worker-chan.png       # Worker anime character
        manager-senpai.png    # Manager anime character
      badges/
        first-prd.png
        speed-demon.png
        bug-slayer.png
```

### 1. Anime Theme System

**Color Palette:**
```typescript
// lib/theme/anime-colors.ts
export const animeTheme = {
  primary: {
    50: '#fff1f2',   // Sakura pink light
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',  // Sakura pink
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
  },
  secondary: {
    50: '#f0f9ff',   // Sky blue light
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',  // Sky blue
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  accent: {
    50: '#fefce8',   // Gold light
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',  // Gold
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },
  success: '#4ade80',  // Bright green
  error: '#f87171',    // Bright red
  warning: '#fbbf24',  // Amber
  info: '#60a5fa',     // Blue
};

export const animeGradients = {
  sunset: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  sakura: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  ocean: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  fire: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  forest: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
};
```

**Animations:**
```typescript
// lib/theme/animations.ts
export const animeAnimations = {
  bounce: `
    @keyframes anime-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
  `,

  pulse: `
    @keyframes anime-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `,

  shine: `
    @keyframes anime-shine {
      0% { background-position: -100%; }
      100% { background-position: 200%; }
    }
  `,

  float: `
    @keyframes anime-float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
    }
  `,

  sparkle: `
    @keyframes anime-sparkle {
      0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
      50% { opacity: 1; transform: scale(1) rotate(180deg); }
    }
  `,
};
```

### 2. Sound System

```typescript
// lib/sounds/SoundManager.ts
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

export class SoundManager {
  private static instance: SoundManager;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;
  private currentPack: SoundPack = 'default';

  private constructor() {
    this.loadSoundPack('default');
    this.loadSettings();
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  loadSoundPack(pack: SoundPack) {
    this.currentPack = pack;

    const soundFiles: Record<SoundType, string> = {
      click: `/sounds/${pack}/click.mp3`,
      hover: `/sounds/${pack}/hover.mp3`,
      success: `/sounds/${pack}/success.mp3`,
      error: `/sounds/${pack}/error.mp3`,
      notification: `/sounds/${pack}/notification.mp3`,
      victory: `/sounds/${pack}/victory.mp3`,
      levelUp: `/sounds/${pack}/level-up.mp3`,
      start: `/sounds/${pack}/start.mp3`,
      stop: `/sounds/${pack}/stop.mp3`,
      complete: `/sounds/${pack}/complete.mp3`,
    };

    Object.entries(soundFiles).forEach(([type, path]) => {
      const audio = new Audio(path);
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.sounds.set(type, audio);
    });

    this.saveSettings();
  }

  play(type: SoundType) {
    if (!this.enabled) return;

    const sound = this.sounds.get(type);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => {
        console.warn('Failed to play sound:', err);
      });
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.saveSettings();
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
    this.saveSettings();
  }

  getSettings() {
    return {
      enabled: this.enabled,
      volume: this.volume,
      pack: this.currentPack,
    };
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('soundSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      this.enabled = settings.enabled ?? true;
      this.volume = settings.volume ?? 0.5;
      this.currentPack = settings.pack ?? 'default';
    }
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;

    localStorage.setItem('soundSettings', JSON.stringify({
      enabled: this.enabled,
      volume: this.volume,
      pack: this.currentPack,
    }));
  }
}

// React hook for easy use in components
export function useSoundEffect() {
  const soundManager = SoundManager.getInstance();

  return {
    play: (type: SoundType) => soundManager.play(type),
    settings: soundManager.getSettings(),
    setEnabled: (enabled: boolean) => soundManager.setEnabled(enabled),
    setVolume: (volume: number) => soundManager.setVolume(volume),
    changePack: (pack: SoundPack) => soundManager.loadSoundPack(pack),
  };
}
```

### 3. Anime Components

```typescript
// components/theme/AnimeButton.tsx
'use client';

import { useSoundEffect } from '@/lib/sounds/SoundManager';
import { motion } from 'framer-motion';

interface AnimeButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function AnimeButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
}: AnimeButtonProps) {
  const { play } = useSoundEffect();

  const variantStyles = {
    primary: 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700',
    secondary: 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700',
    accent: 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const handleClick = () => {
    play('click');
    onClick?.();
  };

  const handleHover = () => {
    play('hover');
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      onMouseEnter={handleHover}
      disabled={disabled}
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        text-white font-bold rounded-lg
        shadow-lg hover:shadow-xl
        transform transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        relative overflow-hidden
        flex items-center gap-2
      `}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-20 animate-shine" />

      {icon && <span>{icon}</span>}
      {children}

      {/* Sparkle on hover */}
      <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full opacity-0 hover:opacity-100 animate-sparkle" />
    </motion.button>
  );
}
```

```typescript
// components/theme/AnimeCard.tsx
'use client';

import { motion } from 'framer-motion';
import { useSoundEffect } from '@/lib/sounds/SoundManager';

interface AnimeCardProps {
  children: React.ReactNode;
  title?: string;
  gradient?: string;
  icon?: string;
  onClick?: () => void;
  className?: string;
}

export function AnimeCard({
  children,
  title,
  gradient = 'from-pink-500 to-purple-600',
  icon,
  onClick,
  className = '',
}: AnimeCardProps) {
  const { play } = useSoundEffect();

  return (
    <motion.div
      whileHover={{ y: -5 }}
      onClick={() => {
        if (onClick) {
          play('click');
          onClick();
        }
      }}
      className={`
        bg-white dark:bg-gray-800 rounded-2xl shadow-xl
        border-2 border-transparent
        hover:border-gradient-to-r ${gradient}
        transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Header with gradient */}
      {title && (
        <div className={`bg-gradient-to-r ${gradient} p-4 rounded-t-2xl`}>
          <div className="flex items-center gap-3">
            {icon && <span className="text-3xl">{icon}</span>}
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">{children}</div>

      {/* Decorative corner */}
      <div className="absolute top-2 right-2 w-8 h-8 opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M 0,0 L 100,0 L 100,100 Z" fill="currentColor" />
        </svg>
      </div>
    </motion.div>
  );
}
```

```typescript
// components/theme/ParticleBackground.tsx
'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles
    const particles: Particle[] = [];
    const colors = ['#f43f5e', '#0ea5e9', '#eab308', '#4ade80'];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Animation loop
    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas!.width;
        if (p.x > canvas!.width) p.x = 0;
        if (p.y < 0) p.y = canvas!.height;
        if (p.y > canvas!.height) p.y = 0;

        // Draw particle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        particles.forEach((p2, j) => {
          if (i === j) return;

          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.strokeStyle = `${p.color}${Math.floor((1 - distance / 100) * 50).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    }

    animate();

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-30 dark:opacity-20"
      style={{ zIndex: -1 }}
    />
  );
}
```

```typescript
// components/theme/CharacterAvatar.tsx
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

interface CharacterAvatarProps {
  type: 'worker' | 'manager';
  model: 'opus' | 'sonnet' | 'haiku';
  status: 'idle' | 'working' | 'reviewing' | 'success' | 'error';
}

export function CharacterAvatar({ type, model, status }: CharacterAvatarProps) {
  const characterImages = {
    worker: {
      opus: '/images/characters/worker-opus.png',
      sonnet: '/images/characters/worker-sonnet.png',
      haiku: '/images/characters/worker-haiku.png',
    },
    manager: {
      opus: '/images/characters/manager-opus.png',
      sonnet: '/images/characters/manager-sonnet.png',
      haiku: '/images/characters/manager-haiku.png',
    },
  };

  const statusEmojis = {
    idle: '😴',
    working: '💪',
    reviewing: '🔍',
    success: '✨',
    error: '😰',
  };

  const statusColors = {
    idle: 'from-gray-400 to-gray-600',
    working: 'from-blue-400 to-blue-600',
    reviewing: 'from-purple-400 to-purple-600',
    success: 'from-green-400 to-green-600',
    error: 'from-red-400 to-red-600',
  };

  return (
    <motion.div
      animate={{
        scale: status === 'working' || status === 'reviewing' ? [1, 1.05, 1] : 1,
      }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="relative"
    >
      {/* Character image */}
      <div className="w-32 h-32 relative">
        <Image
          src={characterImages[type][model]}
          alt={`${type} ${model}`}
          fill
          className="object-contain"
        />
      </div>

      {/* Status indicator */}
      <div
        className={`
          absolute -bottom-2 -right-2
          bg-gradient-to-r ${statusColors[status]}
          rounded-full p-2
          shadow-lg
          animate-pulse
        `}
      >
        <span className="text-2xl">{statusEmojis[status]}</span>
      </div>

      {/* Name tag */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <div className={`bg-gradient-to-r ${statusColors[status]} text-white px-3 py-1 rounded-full text-sm font-bold`}>
          {type === 'worker' ? 'Worker-chan' : 'Manager-senpai'} ({model.toUpperCase()})
        </div>
      </div>
    </motion.div>
  );
}
```

### 4. Model Switching UI

```typescript
// components/theme/ModelSwitcher.tsx
'use client';

import { useState } from 'react';
import { useSoundEffect } from '@/lib/sounds/SoundManager';
import { AnimeButton } from './AnimeButton';
import { motion } from 'framer-motion';

interface ModelSwitcherProps {
  instancePath: string;
  currentWorkerModel: 'opus' | 'sonnet' | 'haiku';
  currentManagerModel: 'opus' | 'sonnet' | 'haiku';
  onUpdate: () => void;
}

export function ModelSwitcher({
  instancePath,
  currentWorkerModel,
  currentManagerModel,
  onUpdate,
}: ModelSwitcherProps) {
  const [workerModel, setWorkerModel] = useState(currentWorkerModel);
  const [managerModel, setManagerModel] = useState(currentManagerModel);
  const [updating, setUpdating] = useState(false);
  const { play } = useSoundEffect();

  const models = [
    { id: 'opus', name: 'Opus', emoji: '👑', description: 'Most powerful' },
    { id: 'sonnet', name: 'Sonnet', emoji: '⚡', description: 'Balanced' },
    { id: 'haiku', name: 'Haiku', emoji: '🚀', description: 'Fastest' },
  ] as const;

  const handleUpdate = async () => {
    setUpdating(true);
    play('click');

    try {
      const response = await fetch('/api/control/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instancePath,
          workerModel,
          managerModel,
        }),
      });

      if (response.ok) {
        play('success');
        onUpdate();
      } else {
        play('error');
      }
    } catch (error) {
      play('error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Worker Model Selection */}
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span>👷</span>
          <span>Worker-chan Model</span>
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {models.map(model => (
            <motion.button
              key={model.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                play('click');
                setWorkerModel(model.id);
              }}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${
                  workerModel === model.id
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-pink-300'
                }
              `}
            >
              <div className="text-3xl mb-2">{model.emoji}</div>
              <div className="font-bold">{model.name}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {model.description}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Manager Model Selection */}
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span>👔</span>
          <span>Manager-senpai Model</span>
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {models.map(model => (
            <motion.button
              key={model.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                play('click');
                setManagerModel(model.id);
              }}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${
                  managerModel === model.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-purple-300'
                }
              `}
            >
              <div className="text-3xl mb-2">{model.emoji}</div>
              <div className="font-bold">{model.name}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {model.description}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Update Button */}
      <div className="flex justify-end">
        <AnimeButton
          onClick={handleUpdate}
          disabled={updating || (workerModel === currentWorkerModel && managerModel === currentManagerModel)}
          variant="primary"
          size="lg"
        >
          {updating ? '⏳ Updating...' : '✨ Apply Changes'}
        </AnimeButton>
      </div>
    </div>
  );
}
```

### 5. API Route for Model Switching

```typescript
// app/api/control/models/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { instancePath, workerModel, managerModel } = await request.json();

    if (!instancePath || !workerModel || !managerModel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Stop current instance
    await execAsync(`cd "${instancePath}" && ./scripts/orchestrator.sh stop`);

    // Wait a bit for clean shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start with new models
    const command = `cd "${instancePath}" && ./scripts/orchestrator.sh start --worker-model ${workerModel} --manager-model ${managerModel} --max-iterations 999999`;

    const { stdout, stderr } = await execAsync(command);

    return NextResponse.json({
      success: true,
      workerModel,
      managerModel,
      output: stdout,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}
```

### 6. Sound Toggle Component

```typescript
// components/theme/SoundToggle.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSoundEffect } from '@/lib/sounds/SoundManager';
import { motion } from 'framer-motion';

export function SoundToggle() {
  const { settings, setEnabled, setVolume, changePack } = useSoundEffect();
  const [showSettings, setShowSettings] = useState(false);

  const soundPacks = [
    { id: 'default', name: 'Default Anime', emoji: '🎌' },
    { id: 'persona', name: 'Persona', emoji: '🎭' },
    { id: 'pokemon', name: 'Pokémon', emoji: '⚡' },
    { id: 'zelda', name: 'Zelda', emoji: '🗡️' },
    { id: 'ghibli', name: 'Studio Ghibli', emoji: '🌳' },
  ] as const;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-64"
        >
          <h3 className="font-bold mb-3">Sound Settings</h3>

          {/* Volume Slider */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Volume
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.volume * 100}
              onChange={e => setVolume(parseInt(e.target.value) / 100)}
              className="w-full"
            />
          </div>

          {/* Sound Pack Selection */}
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
              Sound Pack
            </label>
            <div className="space-y-2">
              {soundPacks.map(pack => (
                <button
                  key={pack.id}
                  onClick={() => changePack(pack.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded
                    ${
                      settings.pack === pack.id
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  <span className="mr-2">{pack.emoji}</span>
                  {pack.name}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (!showSettings) {
            setEnabled(!settings.enabled);
          } else {
            setShowSettings(false);
          }
        }}
        onContextMenu={e => {
          e.preventDefault();
          setShowSettings(!showSettings);
        }}
        className={`
          w-14 h-14 rounded-full
          flex items-center justify-center
          shadow-lg
          ${
            settings.enabled
              ? 'bg-gradient-to-r from-pink-500 to-purple-600'
              : 'bg-gray-400'
          }
        `}
      >
        <span className="text-2xl">
          {settings.enabled ? '🔊' : '🔇'}
        </span>
      </motion.button>
    </div>
  );
}
```

## Acceptance Criteria

1. [ ] Full anime theme applied to all components
2. [ ] Sound effects play on all interactions
3. [ ] Model switching works for Worker and Manager
4. [ ] Particle background animates smoothly
5. [ ] Character avatars display correct model
6. [ ] Sound toggle works (on/off)
7. [ ] Volume control adjusts sound levels
8. [ ] Multiple sound packs available
9. [ ] Anime buttons have shine and sparkle effects
10. [ ] Cards have gradient borders and hover effects
11. [ ] Victory music plays on PRD completion
12. [ ] Error sounds play on failures
13. [ ] Settings persist in localStorage
14. [ ] Mobile responsive design
15. [ ] Performance: 60fps animations

## Out of Scope (v1)

- Custom character creator
- Voice lines for characters
- BGM playlist system
- Achievement sharing
- Leaderboards
- Multiple theme presets (cyberpunk, fantasy, etc.)
- Character progression system
- Gacha system for unlocking sounds/themes

## Implementation Phases

### Phase 1: Foundation (3 iterations)
- Project structure
- Anime color palette
- Basic animations CSS
- Sound manager setup

### Phase 2: Sound System (4 iterations)
- Sound file integration
- Sound manager implementation
- useSoundEffect hook
- Sound toggle component
- Multiple sound packs

### Phase 3: Anime Components (6 iterations)
- AnimeButton component
- AnimeCard component
- ParticleBackground
- CharacterAvatar
- Animations and effects
- Gradients and borders

### Phase 4: Model Switching (4 iterations)
- ModelSwitcher UI
- API route for model changes
- Restart logic
- Status updates
- Error handling

### Phase 5: Polish & Integration (4 iterations)
- Apply theme to all pages
- Sound effects on all interactions
- Victory/error music
- Performance optimization
- Mobile responsiveness
- Settings persistence

## Technical Notes

### Sound File Format
- Use MP3 for broad compatibility
- Keep files < 100KB each
- Normalize audio levels
- Preload commonly used sounds

### Performance
- Use CSS transforms for animations (GPU accelerated)
- Limit particle count on mobile
- Lazy load sound packs
- Debounce sound effects

### Accessibility
- Provide option to disable animations
- Ensure color contrast meets WCAG
- Keyboard navigation for all controls
- Screen reader friendly

## Priority

**High** - Makes the dashboard fun and engaging.

## Estimated Complexity

**Medium** - Mostly UI/UX work with some API integration.

## Success Metrics

- User engagement increases
- Users enable sound effects
- Model switching works reliably
- 60fps animation performance
- Positive user feedback on aesthetic

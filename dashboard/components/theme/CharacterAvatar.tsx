'use client';

import { modelColors, statusColors, type ModelType, type StatusType } from '../../lib/theme/anime-colors';
import { animeAnimationClasses, animeTransitions } from '../../lib/theme/animations';

interface CharacterAvatarProps {
  /**
   * Character type - worker or manager
   */
  type: 'worker' | 'manager';
  /**
   * Claude model being used
   */
  model: ModelType;
  /**
   * Current status
   */
  status: StatusType;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Show status indicator badge
   */
  showStatus?: boolean;
  /**
   * Show model label
   */
  showLabel?: boolean;
  /**
   * Additional CSS class
   */
  className?: string;
  /**
   * Click handler
   */
  onClick?: () => void;
}

// Character emojis based on type and model
const characterEmojis = {
  worker: {
    opus: '👩‍💻',
    sonnet: '👨‍💻',
    haiku: '🧑‍💻',
  },
  manager: {
    opus: '👩‍💼',
    sonnet: '👨‍💼',
    haiku: '🧑‍💼',
  },
};

// Character names
const characterNames = {
  worker: {
    opus: 'Opus-chan',
    sonnet: 'Sonnet-chan',
    haiku: 'Haiku-chan',
  },
  manager: {
    opus: 'Opus-senpai',
    sonnet: 'Sonnet-senpai',
    haiku: 'Haiku-senpai',
  },
};

const sizeStyles = {
  sm: {
    container: 'w-12 h-12',
    emoji: 'text-2xl',
    badge: 'w-4 h-4 -bottom-0.5 -right-0.5',
    badgeEmoji: 'text-xs',
    label: 'text-xs -bottom-6',
  },
  md: {
    container: 'w-20 h-20',
    emoji: 'text-4xl',
    badge: 'w-6 h-6 -bottom-1 -right-1',
    badgeEmoji: 'text-sm',
    label: 'text-sm -bottom-7',
  },
  lg: {
    container: 'w-28 h-28',
    emoji: 'text-5xl',
    badge: 'w-8 h-8 -bottom-1 -right-1',
    badgeEmoji: 'text-base',
    label: 'text-base -bottom-8',
  },
  xl: {
    container: 'w-36 h-36',
    emoji: 'text-6xl',
    badge: 'w-10 h-10 -bottom-2 -right-2',
    badgeEmoji: 'text-lg',
    label: 'text-lg -bottom-9',
  },
};

export function CharacterAvatar({
  type,
  model,
  status,
  size = 'md',
  showStatus = true,
  showLabel = true,
  className = '',
  onClick,
}: CharacterAvatarProps) {
  const styles = sizeStyles[size];
  const modelStyle = modelColors[model];
  const statusStyle = statusColors[status];
  const characterEmoji = characterEmojis[type][model];
  const characterName = characterNames[type][model];

  // Animation based on status
  const getAnimation = () => {
    switch (status) {
      case 'working':
        return animeAnimationClasses.pulse;
      case 'reviewing':
        return animeAnimationClasses.float;
      case 'success':
        return animeAnimationClasses.bounce;
      case 'error':
        return animeAnimationClasses.wiggle;
      default:
        return '';
    }
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {/* Main avatar container */}
      <div
        className={`
          ${styles.container}
          rounded-full
          flex items-center justify-center
          bg-gradient-to-br from-white to-gray-100
          dark:from-gray-700 dark:to-gray-800
          shadow-lg
          border-4
          ${animeTransitions.normal}
          ${getAnimation()}
          hover:scale-105
        `}
        style={{
          borderColor: modelStyle.primary,
          boxShadow: `0 0 20px ${modelStyle.primary}40`,
        }}
      >
        {/* Character emoji */}
        <span className={styles.emoji}>{characterEmoji}</span>

        {/* Glow ring for active states */}
        {(status === 'working' || status === 'reviewing') && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: modelStyle.primary }}
          />
        )}
      </div>

      {/* Status badge */}
      {showStatus && (
        <div
          className={`
            absolute ${styles.badge}
            rounded-full
            flex items-center justify-center
            bg-gradient-to-br ${statusStyle.gradient}
            shadow-lg
            border-2 border-white dark:border-gray-800
            ${status === 'working' ? 'animate-pulse' : ''}
          `}
        >
          <span className={styles.badgeEmoji}>{statusStyle.emoji}</span>
        </div>
      )}

      {/* Name label */}
      {showLabel && (
        <div
          className={`
            absolute left-1/2 -translate-x-1/2 ${styles.label}
            whitespace-nowrap
            font-bold
            px-2 py-0.5
            rounded-full
            bg-gradient-to-r ${statusStyle.gradient}
            text-white
            shadow-md
          `}
        >
          {characterName}
        </div>
      )}
    </div>
  );
}

/**
 * Dual avatar display for Worker and Manager side by side
 */
export function WorkerManagerDuo({
  workerModel,
  workerStatus,
  managerModel,
  managerStatus,
  size = 'md',
  className = '',
}: {
  workerModel: ModelType;
  workerStatus: StatusType;
  managerModel: ModelType;
  managerStatus: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div className={`flex items-end gap-4 ${className}`}>
      <CharacterAvatar
        type="worker"
        model={workerModel}
        status={workerStatus}
        size={size}
      />
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl">💬</span>
        <div className="w-8 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full" />
      </div>
      <CharacterAvatar
        type="manager"
        model={managerModel}
        status={managerStatus}
        size={size}
      />
    </div>
  );
}

/**
 * Animated typing indicator for character "thinking"
 */
export function CharacterTyping({
  character,
  model,
}: {
  character: 'worker' | 'manager';
  model: ModelType;
}) {
  const modelStyle = modelColors[model];

  return (
    <div className="flex items-center gap-3">
      <CharacterAvatar
        type={character}
        model={model}
        status="working"
        size="sm"
        showLabel={false}
      />
      <div
        className="flex items-center gap-1 px-3 py-2 rounded-xl"
        style={{ backgroundColor: `${modelStyle.primary}20` }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full animate-[anime-typing_1.4s_ease-in-out_infinite]"
            style={{
              backgroundColor: modelStyle.primary,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Simple model badge with character style
 */
export function ModelBadge({
  model,
  size = 'sm',
  className = '',
}: {
  model: ModelType;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const modelStyle = modelColors[model];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
  };

  return (
    <span
      className={`
        inline-flex items-center
        rounded-full
        font-bold
        text-white
        ${sizeClasses[size]}
        ${className}
      `}
      style={{ background: modelStyle.gradient }}
    >
      <span>{modelStyle.emoji}</span>
      <span>{modelStyle.name}</span>
    </span>
  );
}

'use client';

import { useState } from 'react';
import { useSoundEffect } from '../../lib/sounds/useSoundEffect';
import { modelColors, type ModelType } from '../../lib/theme/anime-colors';
import { animeTransitions, animeHoverEffects } from '../../lib/theme/animations';
import { AnimeButton } from './AnimeButton';
import { CharacterAvatar } from './CharacterAvatar';

interface ModelSwitcherProps {
  /**
   * Instance path for API calls
   */
  instancePath: string;
  /**
   * Current worker model
   */
  currentWorkerModel: ModelType;
  /**
   * Current manager model
   */
  currentManagerModel: ModelType;
  /**
   * Callback when models are updated
   */
  onUpdate?: () => void;
  /**
   * Additional CSS class
   */
  className?: string;
}

const MODELS: { id: ModelType; name: string; emoji: string; description: string }[] = [
  { id: 'opus', name: 'Opus', emoji: '👑', description: 'Most powerful & capable' },
  { id: 'sonnet', name: 'Sonnet', emoji: '⚡', description: 'Balanced performance' },
  { id: 'haiku', name: 'Haiku', emoji: '🚀', description: 'Fastest & efficient' },
];

export function ModelSwitcher({
  instancePath,
  currentWorkerModel,
  currentManagerModel,
  onUpdate,
  className = '',
}: ModelSwitcherProps) {
  const [workerModel, setWorkerModel] = useState<ModelType>(currentWorkerModel);
  const [managerModel, setManagerModel] = useState<ModelType>(currentManagerModel);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { play } = useSoundEffect();

  const hasChanges =
    workerModel !== currentWorkerModel || managerModel !== currentManagerModel;

  const handleUpdate = async () => {
    if (!hasChanges) return;

    setUpdating(true);
    setError(null);
    play('start');

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update models');
      }

      play('success');
      onUpdate?.();
    } catch (err) {
      play('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUpdating(false);
    }
  };

  const handleReset = () => {
    play('click');
    setWorkerModel(currentWorkerModel);
    setManagerModel(currentManagerModel);
    setError(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Preview of current selection */}
      <div className="flex justify-center">
        <div className="flex items-center gap-8">
          <div className="text-center">
            <CharacterAvatar
              type="worker"
              model={workerModel}
              status={updating ? 'working' : 'idle'}
              size="lg"
            />
          </div>

          <div className="flex flex-col items-center">
            <span className="text-4xl">🤝</span>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Team Up!</div>
          </div>

          <div className="text-center">
            <CharacterAvatar
              type="manager"
              model={managerModel}
              status={updating ? 'reviewing' : 'idle'}
              size="lg"
            />
          </div>
        </div>
      </div>

      {/* Worker Model Selection */}
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
          <span>👷</span>
          <span>Worker Model</span>
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {MODELS.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              selected={workerModel === model.id}
              onSelect={() => {
                play('click');
                setWorkerModel(model.id);
              }}
              disabled={updating}
              accentColor="pink"
            />
          ))}
        </div>
      </div>

      {/* Manager Model Selection */}
      <div>
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
          <span>👔</span>
          <span>Manager Model</span>
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {MODELS.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              selected={managerModel === model.id}
              onSelect={() => {
                play('click');
                setManagerModel(model.id);
              }}
              disabled={updating}
              accentColor="purple"
            />
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        {hasChanges && (
          <AnimeButton
            variant="ghost"
            onClick={handleReset}
            disabled={updating}
          >
            Reset
          </AnimeButton>
        )}
        <AnimeButton
          variant="primary"
          onClick={handleUpdate}
          disabled={!hasChanges || updating}
          loading={updating}
          icon={hasChanges ? '✨' : '✓'}
        >
          {updating ? 'Applying...' : hasChanges ? 'Apply Changes' : 'No Changes'}
        </AnimeButton>
      </div>
    </div>
  );
}

/**
 * Individual model selection card
 */
function ModelCard({
  model,
  selected,
  onSelect,
  disabled,
  accentColor,
}: {
  model: { id: ModelType; name: string; emoji: string; description: string };
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
  accentColor: 'pink' | 'purple';
}) {
  const modelStyle = modelColors[model.id];

  const selectedStyles = {
    pink: 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 shadow-lg shadow-pink-500/20',
    purple: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg shadow-purple-500/20',
  };

  const hoverStyles = {
    pink: 'hover:border-pink-300 hover:bg-pink-50/50 dark:hover:bg-pink-900/10',
    purple: 'hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/10',
  };

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`
        p-4 rounded-xl
        border-2
        ${animeTransitions.bounce}
        ${animeHoverEffects.grow}
        text-left
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          selected
            ? selectedStyles[accentColor]
            : `border-gray-200 dark:border-gray-700 ${hoverStyles[accentColor]}`
        }
      `}
    >
      {/* Emoji and checkbox */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-3xl">{model.emoji}</span>
        {selected && (
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm"
            style={{ background: modelStyle.gradient }}
          >
            ✓
          </span>
        )}
      </div>

      {/* Name */}
      <div className="font-bold text-gray-900 dark:text-white">{model.name}</div>

      {/* Description */}
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
        {model.description}
      </div>

      {/* Gradient bar */}
      <div
        className={`
          h-1 rounded-full mt-3
          ${selected ? 'opacity-100' : 'opacity-30'}
          ${animeTransitions.fast}
        `}
        style={{ background: modelStyle.gradient }}
      />
    </button>
  );
}

/**
 * Compact model selector for inline use
 */
export function CompactModelSelector({
  label,
  value,
  onChange,
  disabled = false,
  className = '',
}: {
  label: string;
  value: ModelType;
  onChange: (model: ModelType) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { play } = useSoundEffect();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <div className="flex gap-1">
        {MODELS.map((model) => {
          const isSelected = value === model.id;
          const modelStyle = modelColors[model.id];

          return (
            <button
              key={model.id}
              onClick={() => {
                if (!disabled && !isSelected) {
                  play('click');
                  onChange(model.id);
                }
              }}
              disabled={disabled}
              className={`
                px-2 py-1 rounded-lg text-sm
                ${animeTransitions.fast}
                ${
                  isSelected
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              style={isSelected ? { background: modelStyle.gradient } : undefined}
              title={model.description}
            >
              {model.emoji} {model.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

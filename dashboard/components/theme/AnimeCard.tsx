'use client';

import { useSoundEffect } from '../../lib/sounds/useSoundEffect';
import { animeTransitions, animeHoverEffects } from '../../lib/theme/animations';

interface AnimeCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: 'sakura' | 'ocean' | 'sunset' | 'fire' | 'forest' | 'aurora' | 'cosmic' | 'neon';
  onClick?: () => void;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  hoverable?: boolean;
  soundOnClick?: boolean;
  glow?: boolean;
  badge?: React.ReactNode;
}

const gradientStyles = {
  sakura: 'from-pink-500 to-rose-600',
  ocean: 'from-blue-500 to-cyan-600',
  sunset: 'from-orange-500 to-pink-600',
  fire: 'from-red-500 to-orange-500',
  forest: 'from-green-500 to-teal-600',
  aurora: 'from-purple-500 to-pink-500',
  cosmic: 'from-indigo-500 to-purple-600',
  neon: 'from-cyan-400 to-green-500',
};

export function AnimeCard({
  children,
  title,
  subtitle,
  icon,
  gradient = 'sakura',
  onClick,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  hoverable = true,
  soundOnClick = true,
  glow = false,
  badge,
}: AnimeCardProps) {
  const { play } = useSoundEffect();

  const handleClick = () => {
    if (!onClick) return;
    if (soundOnClick) play('click');
    onClick();
  };

  const isClickable = !!onClick;

  return (
    <div
      onClick={handleClick}
      className={`
        relative
        bg-white dark:bg-gray-800
        rounded-2xl
        shadow-xl
        overflow-hidden
        ${animeTransitions.normal}
        ${hoverable ? animeHoverEffects.lift : ''}
        ${isClickable ? 'cursor-pointer' : ''}
        ${glow ? 'shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40' : ''}
        ${className}
      `}
    >
      {/* Gradient border effect on hover */}
      <div
        className={`
          absolute inset-0 rounded-2xl
          bg-gradient-to-r ${gradientStyles[gradient]}
          opacity-0 hover:opacity-100
          ${animeTransitions.normal}
          pointer-events-none
        `}
        style={{ padding: '2px', margin: '-2px' }}
      />

      {/* Header */}
      {(title || icon) && (
        <div
          className={`
            bg-gradient-to-r ${gradientStyles[gradient]}
            p-4
            relative
            ${headerClassName}
          `}
        >
          <div className="flex items-center gap-3">
            {icon && <span className="text-3xl">{icon}</span>}
            <div className="flex-1">
              {title && (
                <h3 className="text-xl font-bold text-white drop-shadow-sm">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-white/80">{subtitle}</p>
              )}
            </div>
            {badge && <div>{badge}</div>}
          </div>

          {/* Decorative shine */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/10 rotate-12 transform" />
          </div>
        </div>
      )}

      {/* Body */}
      <div className={`relative p-6 ${bodyClassName}`}>
        {/* Inner content */}
        {children}

        {/* Corner decoration */}
        <div
          className="absolute bottom-2 right-2 opacity-10 pointer-events-none"
          aria-hidden="true"
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 100 100"
            className="fill-current"
          >
            <circle cx="50" cy="50" r="40" />
            <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * Stats card variant for displaying metrics
 */
export function AnimeStatsCard({
  label,
  value,
  icon,
  gradient = 'sakura',
  trend,
  className = '',
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  gradient?: 'sakura' | 'ocean' | 'sunset' | 'fire' | 'forest' | 'aurora' | 'cosmic' | 'neon';
  trend?: { value: number; label: string };
  className?: string;
}) {
  return (
    <div
      className={`
        bg-gradient-to-br ${gradientStyles[gradient]}
        rounded-2xl p-4
        shadow-lg
        ${animeTransitions.normal}
        ${animeHoverEffects.lift}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {trend && (
            <p
              className={`text-sm mt-1 ${
                trend.value >= 0 ? 'text-green-200' : 'text-red-200'
              }`}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <span className="text-4xl opacity-80">{icon}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Mini card variant for compact displays
 */
export function AnimeMiniCard({
  children,
  icon,
  gradient = 'sakura',
  onClick,
  className = '',
  active = false,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  gradient?: 'sakura' | 'ocean' | 'sunset' | 'fire' | 'forest' | 'aurora' | 'cosmic' | 'neon';
  onClick?: () => void;
  className?: string;
  active?: boolean;
}) {
  const { play } = useSoundEffect();

  const handleClick = () => {
    if (!onClick) return;
    play('click');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-2
        px-3 py-2
        rounded-xl
        ${animeTransitions.bounce}
        ${animeHoverEffects.grow}
        ${
          active
            ? `bg-gradient-to-r ${gradientStyles[gradient]} text-white shadow-lg`
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="font-medium">{children}</span>
    </button>
  );
}

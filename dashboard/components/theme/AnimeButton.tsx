'use client';

import { useSoundEffect } from '../../lib/sounds/useSoundEffect';
import { animeTransitions, animeHoverEffects } from '../../lib/theme/animations';

interface AnimeButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  className?: string;
  fullWidth?: boolean;
  soundOnClick?: boolean;
  soundOnHover?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles = {
  primary:
    'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg shadow-pink-500/25',
  secondary:
    'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25',
  accent:
    'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white shadow-lg shadow-yellow-500/25',
  success:
    'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25',
  danger:
    'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25',
  ghost:
    'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-base gap-2',
  lg: 'px-6 py-3 text-lg gap-2.5',
};

export function AnimeButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  fullWidth = false,
  soundOnClick = true,
  soundOnHover = true,
  type = 'button',
}: AnimeButtonProps) {
  const { play } = useSoundEffect();

  const handleClick = () => {
    if (disabled || loading) return;
    if (soundOnClick) play('click');
    onClick?.();
  };

  const handleMouseEnter = () => {
    if (disabled || loading) return;
    if (soundOnHover) play('hover');
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      disabled={isDisabled}
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${animeTransitions.bounce}
        ${animeHoverEffects.grow}
        ${animeHoverEffects.shrink}
        font-bold rounded-xl
        inline-flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        relative overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {/* Shine effect overlay */}
      <span
        className="absolute inset-0 overflow-hidden rounded-xl"
        aria-hidden="true"
      >
        <span
          className="absolute inset-0 -translate-x-full animate-[anime-shine_3s_linear_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      </span>

      {/* Content */}
      <span className="relative flex items-center gap-inherit">
        {loading ? (
          <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {icon && iconPosition === 'left' && <span>{icon}</span>}
            {children}
            {icon && iconPosition === 'right' && <span>{icon}</span>}
          </>
        )}
      </span>

      {/* Corner sparkle */}
      {!isDisabled && (
        <span
          className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 animate-[anime-sparkle_1.5s_ease-in-out_infinite]"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

/**
 * Icon-only anime button variant
 */
export function AnimeIconButton({
  icon,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  label,
  soundOnClick = true,
  soundOnHover = true,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  label?: string;
  soundOnClick?: boolean;
  soundOnHover?: boolean;
}) {
  const { play } = useSoundEffect();

  const handleClick = () => {
    if (disabled || loading) return;
    if (soundOnClick) play('click');
    onClick?.();
  };

  const handleMouseEnter = () => {
    if (disabled || loading) return;
    if (soundOnHover) play('hover');
  };

  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      disabled={disabled || loading}
      aria-label={label}
      className={`
        ${variantStyles[variant]}
        ${sizeMap[size]}
        ${animeTransitions.bounce}
        ${animeHoverEffects.grow}
        ${animeHoverEffects.shrink}
        rounded-full
        inline-flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        relative overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
        ${className}
      `}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
    </button>
  );
}

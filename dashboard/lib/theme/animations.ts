/**
 * Anime-style CSS Animations
 * Keyframe definitions and Tailwind-compatible animation classes
 */

/**
 * CSS keyframe animations as raw strings for injection into globals.css
 */
export const animeKeyframes = `
/* Bounce animation */
@keyframes anime-bounce {
  0%, 100% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(-15px);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

/* Pulse glow animation */
@keyframes anime-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

/* Shine sweep animation */
@keyframes anime-shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Float animation */
@keyframes anime-float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  25% {
    transform: translateY(-10px) rotate(2deg);
  }
  75% {
    transform: translateY(-5px) rotate(-2deg);
  }
}

/* Sparkle animation */
@keyframes anime-sparkle {
  0%, 100% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1) rotate(180deg);
  }
}

/* Wiggle animation */
@keyframes anime-wiggle {
  0%, 100% {
    transform: rotate(-3deg);
  }
  50% {
    transform: rotate(3deg);
  }
}

/* Heart beat animation */
@keyframes anime-heartbeat {
  0%, 100% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.1);
  }
  50% {
    transform: scale(1);
  }
  75% {
    transform: scale(1.1);
  }
}

/* Glow pulse animation */
@keyframes anime-glow {
  0%, 100% {
    box-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
  }
  50% {
    box-shadow: 0 0 20px currentColor, 0 0 30px currentColor;
  }
}

/* Slide in from bottom */
@keyframes anime-slide-up {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Slide in from right */
@keyframes anime-slide-left {
  0% {
    opacity: 0;
    transform: translateX(20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Pop in animation */
@keyframes anime-pop {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Rainbow border animation */
@keyframes anime-rainbow {
  0% {
    border-color: #f43f5e;
  }
  16% {
    border-color: #eab308;
  }
  33% {
    border-color: #4ade80;
  }
  50% {
    border-color: #0ea5e9;
  }
  66% {
    border-color: #a855f7;
  }
  83% {
    border-color: #f43f5e;
  }
  100% {
    border-color: #f43f5e;
  }
}

/* Typing dots animation */
@keyframes anime-typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-5px);
  }
}

/* Particle float animation */
@keyframes anime-particle {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) rotate(720deg);
    opacity: 0;
  }
}
`;

/**
 * Animation class definitions for use in Tailwind
 */
export const animeAnimationClasses = {
  bounce: 'animate-[anime-bounce_1s_ease-in-out_infinite]',
  pulse: 'animate-[anime-pulse_2s_ease-in-out_infinite]',
  shine: 'animate-[anime-shine_2s_linear_infinite]',
  float: 'animate-[anime-float_3s_ease-in-out_infinite]',
  sparkle: 'animate-[anime-sparkle_1.5s_ease-in-out_infinite]',
  wiggle: 'animate-[anime-wiggle_0.5s_ease-in-out_infinite]',
  heartbeat: 'animate-[anime-heartbeat_1s_ease-in-out_infinite]',
  glow: 'animate-[anime-glow_2s_ease-in-out_infinite]',
  slideUp: 'animate-[anime-slide-up_0.3s_ease-out]',
  slideLeft: 'animate-[anime-slide-left_0.3s_ease-out]',
  pop: 'animate-[anime-pop_0.3s_ease-out]',
  rainbow: 'animate-[anime-rainbow_3s_linear_infinite]',
} as const;

/**
 * Transition presets for hover/active states
 */
export const animeTransitions = {
  fast: 'transition-all duration-150 ease-out',
  normal: 'transition-all duration-300 ease-out',
  slow: 'transition-all duration-500 ease-out',
  bounce: 'transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]',
  spring: 'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
} as const;

/**
 * Hover effect classes
 */
export const animeHoverEffects = {
  lift: 'hover:-translate-y-1 hover:shadow-lg',
  grow: 'hover:scale-105',
  shrink: 'active:scale-95',
  glow: 'hover:shadow-[0_0_15px_currentColor]',
  tilt: 'hover:rotate-1',
  shake: 'hover:animate-[anime-wiggle_0.3s_ease-in-out]',
} as const;

export type AnimationClass = keyof typeof animeAnimationClasses;
export type TransitionPreset = keyof typeof animeTransitions;
export type HoverEffect = keyof typeof animeHoverEffects;

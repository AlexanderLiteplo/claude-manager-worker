/**
 * Anime Theme Color Palette
 * Vibrant colors inspired by anime aesthetics
 */

export const animeTheme = {
  // Sakura Pink - Primary accent
  primary: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
  },

  // Sky Blue - Secondary accent
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Gold - Accent/Highlight
  accent: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  // Purple - Magic/Special
  magic: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },

  // Status colors
  success: '#4ade80',
  error: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa',

  // Dark mode backgrounds
  dark: {
    bg: '#0f0f23',
    card: '#1a1a2e',
    border: '#2d2d44',
    hover: '#252540',
  },

  // Light mode backgrounds
  light: {
    bg: '#fef7f7',
    card: '#ffffff',
    border: '#fecdd3',
    hover: '#fff1f2',
  },
} as const;

/**
 * Anime-style gradient presets
 */
export const animeGradients = {
  sunset: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  sakura: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  ocean: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  fire: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  forest: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  aurora: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  midnight: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  cosmic: 'linear-gradient(135deg, #ff00cc 0%, #333399 100%)',
  neon: 'linear-gradient(135deg, #00ff87 0%, #60efff 100%)',
  cherry: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
} as const;

/**
 * Model-specific colors for Worker and Manager avatars
 */
export const modelColors = {
  opus: {
    primary: '#9333ea',
    secondary: '#c084fc',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)',
    emoji: '👑',
    name: 'Opus',
  },
  sonnet: {
    primary: '#0ea5e9',
    secondary: '#38bdf8',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
    emoji: '⚡',
    name: 'Sonnet',
  },
  haiku: {
    primary: '#4ade80',
    secondary: '#86efac',
    gradient: 'linear-gradient(135deg, #4ade80 0%, #86efac 100%)',
    emoji: '🚀',
    name: 'Haiku',
  },
} as const;

/**
 * Status colors for Worker/Manager states
 */
export const statusColors = {
  idle: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-600 dark:text-gray-400',
    gradient: 'from-gray-400 to-gray-600',
    emoji: '😴',
  },
  working: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-400 to-blue-600',
    emoji: '💪',
  },
  reviewing: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-400 to-purple-600',
    emoji: '🔍',
  },
  success: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-600 dark:text-green-400',
    gradient: 'from-green-400 to-green-600',
    emoji: '✨',
  },
  error: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-600 dark:text-red-400',
    gradient: 'from-red-400 to-red-600',
    emoji: '😰',
  },
} as const;

export type ModelType = keyof typeof modelColors;
export type StatusType = keyof typeof statusColors;

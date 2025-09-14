// Game configuration constants
export const GAME_CONFIG = {
  // Timing
  LOBBY_COUNTDOWN: 5, // seconds
  QUESTION_TIME_LIMIT: 20, // seconds
  ANSWER_DELAY: 2000, // milliseconds
  NAVIGATION_DELAY: 100, // milliseconds
  RESULTS_ANIMATION_DELAY: 500, // milliseconds
  
  // Limits
  MAX_PLAYERS: 12,
  MAX_ROOM_ID_LENGTH: 20,
  MAX_PLAYER_NAME_LENGTH: 50,
  
  // UI
  MIN_HEIGHT_OFFSET: 120, // pixels for header height calculation
} as const;

// Avatar colors for player identification
export const AVATAR_COLORS = [
  'bg-red-600',
  'bg-gray-600', 
  'bg-blue-600',
  'bg-green-600',
  'bg-orange-600',
  'bg-purple-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-pink-600',
  'bg-yellow-600',
] as const;

// Player ID generation letters
export const PLAYER_ID_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

// Default values
export const DEFAULTS = {
  ROOM_CODE: 'ROOM123',
  PLAYER_NAME: 'Player',
  FALLBACK_INITIALS: '?',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  JOIN: '/join',
  LOBBY: '/lobby', 
  QUESTION: '/question',
  RESULTS: '/results',
  LEADERBOARD: '/leaderboard',
} as const;

// Question themes and icons
export const QUESTION_THEMES = [
  { 1: '🌟', 2: '🔥', 3: '💧', 4: '🌪️' },
  { 1: '🎯', 2: '⚡', 3: '🎨', 4: '🚀' },
  { 1: '🎭', 2: '🎪', 3: '🎨', 4: '🎬' },
] as const;

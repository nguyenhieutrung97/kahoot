import { AVATAR_COLORS, PLAYER_ID_LETTERS, DEFAULTS, QUESTION_THEMES } from '@/constants/game';
import type { Avatar, NavigationParams } from '@/types/game';

/**
 * Generates a random player ID in format: Letter + 3 digits (e.g., "A123")
 */
export const generatePlayerId = (): string => {
  const letter = PLAYER_ID_LETTERS[Math.floor(Math.random() * PLAYER_ID_LETTERS.length)];
  const numbers = Math.floor(Math.random() * 900) + 100;
  return `${letter}${numbers}`;
};

/**
 * Creates a random avatar with color and initials from player name
 */
export const getRandomAvatar = (name: string): Avatar => {
  const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
  const initials = name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return {
    color: AVATAR_COLORS[colorIndex],
    initials: initials || DEFAULTS.FALLBACK_INITIALS,
  };
};

/**
 * Gets icon theme for a specific question number
 */
export const getQuestionIconTheme = (questionNumber: number) => {
  return QUESTION_THEMES[questionNumber % QUESTION_THEMES.length];
};

/**
 * Gets the appropriate icon for an answer based on question theme
 */
export const getAnswerIcon = (answerId: number, questionNumber: number = 1): string => {
  const themeIcons = getQuestionIconTheme(questionNumber);
  return themeIcons[answerId as keyof typeof themeIcons] || '❓';
};

/**
 * Builds navigation URL with encoded parameters
 */
export const buildNavigationUrl = (path: string, params: NavigationParams): string => {
  const searchParams = new URLSearchParams();
  
  if (params.roomCode) searchParams.set('roomCode', params.roomCode);
  if (params.name) searchParams.set('name', params.name);
  if (params.answer) searchParams.set('answer', params.answer);
  if (params.questionNumber) searchParams.set('questionNumber', params.questionNumber);
  
  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
};

/**
 * Safely gets URL search parameters with fallbacks
 */
export const getSearchParam = (
  searchParams: URLSearchParams, 
  key: string, 
  fallback: string = ''
): string => {
  return searchParams.get(key) || fallback;
};

/**
 * Validates game ID format
 */
export const isValidRoomCode = (roomCode: string): boolean => {
  return roomCode.trim().length > 0 && roomCode.trim().length <= 50;
};

/**
 * Validates player name format
 */
export const isValidPlayerName = (name: string): boolean => {
  return name.trim().length > 0 && name.trim().length <= 50;
};

/**
 * Formats time remaining for display
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '0S';
  return `${seconds}S`;
};

/**
 * Creates empty slots array for lobby display
 */
export const createEmptySlots = (currentPlayerCount: number, maxPlayers: number): null[] => {
  const emptyCount = Math.max(0, maxPlayers - currentPlayerCount);
  return Array(emptyCount).fill(null);
};

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

  const color = AVATAR_COLORS[colorIndex] ?? AVATAR_COLORS[0];
  return {
    color,
    initials: initials || DEFAULTS.FALLBACK_INITIALS,
  };
};

/**
 * Gets icon theme for a specific question number
 */
export const getQuestionIconTheme = (questionNumber: number) => {
  return QUESTION_THEMES[questionNumber % QUESTION_THEMES.length] ?? QUESTION_THEMES[0];
};

/**
 * Gets the appropriate icon for an answer based on question theme
 */
export const getAnswerIcon = (answerId: number, questionNumber: number = 1): string => {
  const themeIcons: any = getQuestionIconTheme(questionNumber) || {};
  return themeIcons[answerId] || themeIcons[String(answerId)] || '❓';
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
 * Validates game ID format - only alphanumeric characters allowed
 */
export const isValidRoomCode = (roomCode: string): boolean => {
  const trimmed = roomCode.trim();
  if (trimmed.length === 0 || trimmed.length > 50) {
    return false;
  }
  // Only allow alphanumeric characters (letters and numbers)
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(trimmed);
};

/**
 * Validates player name format - allows letters, numbers, spaces, and basic punctuation
 */
export const isValidPlayerName = (name: string): boolean => {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 50) {
    return false;
  }
  // Allow letters, numbers, spaces, hyphens, apostrophes, and periods
  // Reject special characters like < > " ' & and other potentially problematic chars
  const validNameRegex = /^[a-zA-Z0-9\s\-'\.]+$/;
  return validNameRegex.test(trimmed);
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

// Game-related type definitions
export interface Avatar {
  color: string;
  initials: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: Avatar;
  score?: number;
}

// Frontend-specific answer interface (for UI display)
export interface GameAnswer {
  id: number;
  text: string;
  color: string;
  hoverColor: string;
  icon?: string;
}

// Frontend-specific question interface (for UI display)
export interface GameQuestion {
  id?: string;
  text: string;
  answers: GameAnswer[];
  correctAnswerId?: number;
  timeLimit?: number;
}

export interface Room {
  id: string;
  name?: string;
  players: Player[];
  currentQuestion?: GameQuestion;
  maxPlayers: number;
  isActive: boolean;
}

export interface GameSession {
  gameId: string;
  playerName: string;
  currentPlayer?: Player;
  timeLeft?: number;
  hasAnswered?: boolean;
  selectedAnswer?: number | null;
}

// Utility types
export type GamePhase = 'joining' | 'lobby' | 'question' | 'results' | 'leaderboard';
export type NavigationParams = {
  gameId?: string;
  roomCode?: string;
  name?: string;
  answer?: string;
  questionNumber?: string;
};

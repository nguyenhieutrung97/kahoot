// API Types based on Swagger JSON schema

// Enums
export enum GameState {
  Draft = 0,      // Game is being created/edited
  Published = 1,  // Game is ready to be used in sessions
  Archived = 2    // Game is no longer available for new sessions
}

export enum QuestionType {
  SingleChoice = 0,
  MultipleChoice = 1,
  TrueFalse = 2
}

// Align with backend Backend.Domain.Enums.GameSessionState
export enum GameSessionState {
  Lobby = 0,          // Players can join, waiting for host to start
  InProgress = 1,     // Game is running, no new players can join
  WaitingForHost = 2, // All players answered, waiting for host to proceed
  Completed = 3,      // Game finished
  Canceled = 4       // Game was cancelled by host disconnected
}

export enum SortDirection {
  Ascending = 0,
  Descending = 1
}

// Base Answer interface
export interface Answer {
  id?: string | null;
  createdOn?: string;
  updatedOn?: string | null;
  deleted?: boolean;
  deletedOn?: string | null;
  gameId?: string | null;
  questionId?: string | null;
  title?: string | null;
  isCorrect?: boolean;
}

// Game interfaces
export interface Game {
  id?: string;
  title?: string | null;
  description?: string | null;
  state?: GameState;
  createdOn?: string;
  updatedOn?: string | null;
  userNTID?: string | null;
}

// Question interfaces
export interface Question {
  id?: string;
  gameId?: string | null;
  title?: string | null;
  timeLimitSeconds?: number;
  type?: QuestionType;
  createdOn?: string;
  updatedOn?: string | null;
  userNTID?: string | null;
  answers?: Answer[];
}

// Command interfaces for API requests
export interface CreateGameCommand {
  title?: string | null;
  description?: string | null;
  userNTID?: string | null;
}

export interface UpdateGameCommand {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  userNTID?: string | null;
}

export interface UpdateGameStateCommand {
  id?: string | null;
  userNTID?: string | null;
  currentState?: GameState;
  targetState?: GameState;
}

export interface CreateQuestionCommand {
  gameId?: string | null;
  userNTID?: string | null;
  title?: string | null;
  timeLimitSeconds?: number;
  type?: QuestionType;
}

export interface UpdateQuestionCommand {
  gameId?: string | null;
  questionId?: string | null;
  userNTID?: string | null;
  title?: string | null;
  timeLimitSeconds?: number;
}

export interface CreateAnswerCommand {
  gameId?: string | null;
  questionId?: string | null;
  questionType?: QuestionType;
  userNTID?: string | null;
  answers?: Answer[] | null;
}

export interface UpdateAnswerCommand {
  gameId?: string | null;
  questionId?: string | null;
  questionType?: QuestionType;
  userNTID?: string | null;
  answers?: Answer[] | null;
}

export interface DeleteAnswersCommand {
  gameId?: string | null;
  questionId?: string | null;
  userNTID?: string | null;
  answers?: Answer[] | null;
}

// Query parameters
export interface GamesQueryParams {
  skip?: number;
  take?: number;
  search?: string;
  state?: GameState;
  sortBy?: string;
  sortDirection?: SortDirection;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// Error types
export interface ApiError {
  message: string;
  statusCode: number;
  details?: any;
}

// User context
export interface UserContext {
  userNTID: string;
  isAuthenticated: boolean;
}

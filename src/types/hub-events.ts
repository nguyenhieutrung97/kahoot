// Centralized Hub event payload type definitions
// These are intentionally partial and permissive (fields optional) to tolerate backend variations.
// Extend/refine as backend contracts stabilize.

export interface RoomInfoBasics {
  roomCode?: string;
  gameId?: string;
  hostId?: string;
  players?: any[];
  status?: string; // lobby, active, ended, etc.
  [k: string]: any;
}

export interface PlayerBasic {
  playerId?: string;
  id?: string;
  userId?: string;
  userName?: string;
  name?: string;
  score?: number;
  rank?: number;
  [k: string]: any;
}

export interface NewQuestionEvent {
  questionIndex?: number; // 0 or 1 based depending on server
  index?: number;
  questionText?: string;
  question?: any;
  answers?: any[];
  choices?: any[];
  isMultipleChoice?: boolean;
  isMultiple?: boolean;
  isMultipleAnswers?: boolean;
  multiple?: boolean;
  questionType?: string;
  type?: string;
  timeLimitSeconds?: number;
  startTime?: string; // ISO
  [k: string]: any;
}

export interface PlayerQuestionResultEvent {
  isCorrect?: boolean;
  correct?: boolean;
  correctAnswers?: any[];
  answers?: any[];
  correctAnswer?: any;
  currentRank?: number;
  score?: number;
  topPlayers?: any[];
  TopPlayers?: any[];
  totalQuestions?: number;
  questionIndex?: number;
  [k: string]: any;
}

export interface QuestionTimeEndedEvent {
  correct?: boolean;
  isCorrect?: boolean;
  correctAnswers?: any[];
  answers?: any[];
  message?: string;
  totalQuestions?: number;
  questionIndex?: number;
  [k: string]: any;
}

export interface ProceedingToNextQuestionEvent {
  nextQuestionIndex?: number;
  [k: string]: any;
}

export interface FinalResultsEvent {
  finalLeaderboard?: any[];
  FinalLeaderboard?: any[];
  topPlayers?: any[];
  TopPlayers?: any[];
  leaderboard?: any[];
  players?: any[];
  [k: string]: any;
}

export interface GameEndedEvent extends FinalResultsEvent {}

export interface PlayerProgressEvent {
  playerId?: string;
  progress?: number; // 0-1 or percent
  [k: string]: any;
}

// Map hub method/event names to payload shapes
export interface HubEventPayloads {
  Error: { message?: string } | string;
  RoomCreated: RoomInfoBasics;
  JoinedGame: RoomInfoBasics & { player?: PlayerBasic };
  PlayerJoined: PlayerBasic & { roomCode?: string };
  LobbyInfo: RoomInfoBasics;
  LobbyUpdate: RoomInfoBasics;
  GameStarted: RoomInfoBasics;
  NewQuestion: NewQuestionEvent;
  HostNewQuestion: NewQuestionEvent;
  AnswerSubmitted: { playerId?: string; answerId?: string; [k: string]: any };
  PlayerQuestionResult: PlayerQuestionResultEvent;
  QuestionTimeEnded: QuestionTimeEndedEvent;
  QuestionResults: any;
  ProceedingToNextQuestion: ProceedingToNextQuestionEvent;
  FinalResults: FinalResultsEvent;
  GameEnded: GameEndedEvent;
  RoomStatus: RoomInfoBasics;
  PlayerDisconnected: PlayerBasic;
  HostDisconnected: { hostId?: string; roomCode?: string; [k: string]: any };
  RoomClosed: { roomCode?: string; reason?: string; [k: string]: any };
  KickedFromGame: { reason?: string; [k: string]: any };
  ReconnectState: any;
  AllPlayersAnswered: { questionIndex?: number; totalPlayers?: number; [k: string]: any };
  PlayerProgress: PlayerProgressEvent;
  // Allow unknown future events
  [other: string]: any;
}

// Derive handler prop names (e.g., onNewQuestion) from event keys
export type HubEventHandlerProps = {
  [K in keyof HubEventPayloads as `on${K}`]?: (payload: HubEventPayloads[K]) => void;
};

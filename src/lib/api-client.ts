import {
  Game,
  Question,
  Answer,
  CreateGameCommand,
  UpdateGameCommand,
  UpdateGameStateCommand,
  CreateQuestionCommand,
  UpdateQuestionCommand,
  CreateAnswerCommand,
  UpdateAnswerCommand,
  DeleteAnswersCommand,
  GamesQueryParams,
  ApiResponse,
  PaginatedResponse,
  GameState,
  QuestionType
} from '@/types/api';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://bdkahoot-be.azurewebsites.net';

// Default headers
const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: defaultHeaders,
    ...options,
  };

  try {
    const response = await fetch(url, config);

    // No content (204) or content-length 0: return success without parsing
    if (response.status === 204) {
      return { success: true } as ApiResponse<T>;
    }

    // Try to read raw text first to safely handle empty bodies (even when status 200)
    const contentType = response.headers.get('content-type') || '';
    let rawText: string | null = null;
    try {
      rawText = await response.text();
    } catch {
      rawText = null;
    }

    if (!response.ok) {
      // Attempt to parse error JSON if there is text, else construct generic error
      let errorData: any = {};
      if (rawText && rawText.trim().length) {
        try { errorData = JSON.parse(rawText); } catch { /* ignore */ }
      }
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    // Success path: if no body or empty string, return success without data
    if (!rawText || !rawText.trim().length) {
      return { success: true } as ApiResponse<T>;
    }

    // If not JSON content-type, just return raw text as any
    if (!contentType.toLowerCase().includes('application/json')) {
      return { data: rawText as any as T, success: true };
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Fallback: return raw text if parsing fails
      data = rawText as any as T;
    }

    return { data, success: true } as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0,
      error
    );
  }
}

// Helper: try multiple endpoint variants (casing) until one succeeds (non-404)
async function apiRequestVariants<T>(endpoints: string[], options: RequestInit = {}): Promise<ApiResponse<T>> {
  let lastErr: any = null;
  for (const ep of endpoints) {
    try {
      return await apiRequest<T>(ep, options);
    } catch (e) {
      lastErr = e;
      if (e instanceof ApiError && e.statusCode === 404) {
        continue; // try next variant
      }
      throw e; // non-404 propagate immediately
    }
  }
  throw lastErr || new Error('All endpoint variants failed');
}

// Custom Error class
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Games API
export const gamesApi = {
  // GET /api/Games
  async getGames(params?: GamesQueryParams): Promise<ApiResponse<PaginatedResponse<Game>>> {
    const searchParams = new URLSearchParams();
    
    if (params?.skip !== undefined) searchParams.set('skip', params.skip.toString());
    if (params?.take !== undefined) searchParams.set('take', params.take.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.state !== undefined) searchParams.set('state', params.state.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortDirection !== undefined) searchParams.set('sortDirection', params.sortDirection.toString());

    const queryString = searchParams.toString();
    const endpoint = `/api/Games${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<PaginatedResponse<Game>>(endpoint);
  },

  // POST /api/Games
  async createGame(command: CreateGameCommand): Promise<ApiResponse<Game>> {
    const resp = await apiRequest<Game | string>('/api/Games', {
      method: 'POST',
      body: JSON.stringify(command),
    });
    if (resp.success && typeof resp.data === 'string') {
      // Backend returned just an ID string; wrap it into a Game-like object
      return { success: true, data: { id: resp.data, title: command.title, description: command.description } as Game };
    }
    return resp as ApiResponse<Game>;
  },

  // GET /api/Games/{id}
  async getGame(id: string): Promise<ApiResponse<Game>> {
    return apiRequest<Game>(`/api/Games/${encodeURIComponent(id)}`);
  },

  // PATCH /api/Games/{id}
  async updateGame(id: string, command: UpdateGameCommand): Promise<ApiResponse<Game>> {
    return apiRequest<Game>(`/api/Games/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(command),
    });
  },

  // DELETE /api/Games/{id}
  async deleteGame(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/api/Games/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // PATCH /api/Games/{id}/state
  async updateGameState(id: string, command: UpdateGameStateCommand): Promise<ApiResponse<Game>> {
    return apiRequest<Game>(`/api/Games/${encodeURIComponent(id)}/state`, {
      method: 'PATCH',
      body: JSON.stringify(command),
    });
  },
};

// Questions API
export const questionsApi = {
  // GET /api/Games/{gameId}/Questions (fallback: /api/games/{gameId}/Questions)
  async getQuestions(gameId: string): Promise<ApiResponse<Question[]>> {
    return apiRequestVariants<Question[]>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions`,
      `/api/games/${encodeURIComponent(gameId)}/Questions`
    ]);
  },

  // POST create question
  async createQuestion(gameId: string, command: CreateQuestionCommand): Promise<ApiResponse<Question>> {
    return apiRequestVariants<Question>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions`,
      `/api/games/${encodeURIComponent(gameId)}/Questions`
    ], { method: 'POST', body: JSON.stringify(command) });
  },

  // GET single question
  async getQuestion(gameId: string, id: string): Promise<ApiResponse<Question>> {
    return apiRequestVariants<Question>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(id)}`,
      `/api/games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(id)}`
    ]);
  },

  // PATCH update question
  async updateQuestion(gameId: string, id: string, command: UpdateQuestionCommand): Promise<ApiResponse<Question>> {
    return apiRequestVariants<Question>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(id)}`,
      `/api/games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(id)}`
    ], { method: 'PATCH', body: JSON.stringify(command) });
  },

  // DELETE question
  async deleteQuestion(gameId: string, id: string): Promise<ApiResponse<void>> {
    return apiRequestVariants<void>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(id)}`,
      `/api/games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(id)}`
    ], { method: 'DELETE' });
  },
};

// Answers API
export const answersApi = {
  async getAnswers(gameId: string, questionId: string): Promise<ApiResponse<Answer[]>> {
    return apiRequestVariants<Answer[]>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(questionId)}/Answers`,
      `/api/games/${encodeURIComponent(gameId)}/questions/${encodeURIComponent(questionId)}/Answers`
    ]);
  },
  async getAnswer(gameId: string, questionId: string, id: string): Promise<ApiResponse<Answer>> {
    return apiRequestVariants<Answer>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(questionId)}/Answers/${encodeURIComponent(id)}`,
      `/api/games/${encodeURIComponent(gameId)}/questions/${encodeURIComponent(questionId)}/Answers/${encodeURIComponent(id)}`
    ]);
  },
  async createAnswers(gameId: string, questionId: string, command: CreateAnswerCommand): Promise<ApiResponse<Answer[]>> {
    return apiRequestVariants<Answer[]>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(questionId)}/Answers/create`,
      `/api/games/${encodeURIComponent(gameId)}/questions/${encodeURIComponent(questionId)}/Answers/create`
    ], { method: 'POST', body: JSON.stringify(command) });
  },
  async updateAnswers(gameId: string, questionId: string, command: UpdateAnswerCommand): Promise<ApiResponse<Answer[]>> {
    return apiRequestVariants<Answer[]>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(questionId)}/Answers`,
      `/api/games/${encodeURIComponent(gameId)}/questions/${encodeURIComponent(questionId)}/Answers`
    ], { method: 'PATCH', body: JSON.stringify(command) });
  },
  async deleteAnswers(gameId: string, questionId: string, command: DeleteAnswersCommand): Promise<ApiResponse<void>> {
    return apiRequestVariants<void>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(questionId)}/Answers/delete`,
      `/api/games/${encodeURIComponent(gameId)}/questions/${encodeURIComponent(questionId)}/Answers/delete`
    ], { method: 'POST', body: JSON.stringify(command) });
  },
  async deleteAnswer(gameId: string, questionId: string, id: string): Promise<ApiResponse<void>> {
    return apiRequestVariants<void>([
      `/api/Games/${encodeURIComponent(gameId)}/Questions/${encodeURIComponent(questionId)}/Answers/${encodeURIComponent(id)}`,
      `/api/games/${encodeURIComponent(gameId)}/questions/${encodeURIComponent(questionId)}/Answers/${encodeURIComponent(id)}`
    ], { method: 'DELETE' });
  },
};

// Utility functions for common operations
export const apiUtils = {
  // Helper to build query strings
  buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, value.toString());
      }
    });
    
    return searchParams.toString();
  },

  // Helper to handle API errors
  handleApiError(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  },

  // Helper to get user context (you might want to implement this based on your auth system)
  getUserContext(): { userNTID: string } {
    // This is a placeholder - implement based on your authentication system
    return {
      userNTID: 'current-user-id' // Replace with actual user ID from auth context
    };
  },
};

// Export the ApiError class for use in components
export { ApiError };

// SignalR client
// Lightweight wrapper to interact with GameHub endpoints
import * as signalR from '@microsoft/signalr';

export type SignalRClient = {
  connection: signalR.HubConnection;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  // server invocations
  createGameRoom: (gameId: string, autoShowResults?: boolean) => Promise<void>;
  joinGame: (roomCode: string, userName: string, playerId?: string | null) => Promise<void>;
  startGame: (roomCode: string) => Promise<void>;
  submitAnswer: (answerId: string) => Promise<void>;
  proceedToNextQuestion: (roomCode: string) => Promise<void>;
  showFinalLeaderboard: (roomCode: string) => Promise<void>;
};

export function createSignalRClient(baseUrl: string = API_BASE_URL): SignalRClient {
  const url = `${baseUrl}/gameHub`;

  const build = (transport: signalR.HttpTransportType, skipNegotiation = false) =>
    new signalR.HubConnectionBuilder()
      .withUrl(url, {
        transport,
        skipNegotiation,
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Debug)
      .build();

  // Prefer LongPolling for broad compatibility (proxied/dev envs). We'll upgrade to WS if desired later.
  let connection = build(signalR.HttpTransportType.LongPolling);
  let usingFallback = false; // fallback flag if we ever attempt WS

  const start = async () => {
    // Only start when disconnected
    if (connection.state !== signalR.HubConnectionState.Disconnected) return;
    try {
      await connection.start().then(() => console.log("Connected to hub"));
    } catch (err) {
      // If LP somehow fails (rare), try WebSockets without negotiation
      if (!usingFallback) {
        usingFallback = true;
        connection = build(signalR.HttpTransportType.WebSockets, true);
        await connection.start();
      } else {
        console.error("Failed to connect to hub", err);
        throw err;
      }
    }
  };

  const stop = () => connection.stop();

  const invoke = (method: string, ...args: any[]) => connection.invoke(method, ...args);

  return {
    get connection() { return connection; },
    start,
    stop,
    createGameRoom: async (gameId, autoShowResults = true) => {
      try {
        // Debug logging for diagnostics
        // eslint-disable-next-line no-console
        console.debug('[SignalR] -> CreateGameRoom', { gameId, autoShowResults });
        const res = await invoke('CreateGameRoom', gameId, autoShowResults);
        // eslint-disable-next-line no-console
        console.debug('[SignalR] <- CreateGameRoom ok', res);
        return res;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[SignalR] !! CreateGameRoom failed', err);
        throw err;
      }
    },
    joinGame: (roomCode, userName, playerId) => invoke('JoinGame', roomCode, userName, playerId ?? null),
    startGame: (roomCode) => invoke('StartGame', roomCode),
    submitAnswer: (answerId) => invoke('SubmitAnswer', answerId),
    proceedToNextQuestion: (roomCode) => invoke('ProceedToNextQuestion', roomCode),
    showFinalLeaderboard: (roomCode) => invoke('ShowFinalLeaderboard', roomCode),
  } as SignalRClient;
}
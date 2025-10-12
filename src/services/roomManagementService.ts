import { apiRequest } from '@/lib/api-client';

// Helper function to convert GameSessionState enum values to strings
export const getGameSessionStateString = (state: string | number): string => {
  if (typeof state === 'string') {
    return state; // Already a string
  }
  
  // Convert numeric enum values to strings
  switch (state) {
    case 0: return 'Lobby';
    case 1: return 'InProgress';
    case 2: return 'WaitingForHost';
    case 3: return 'Completed';
    case 4: return 'Canceled';
    default: return 'Unknown';
  }
};

export interface RoomManagementInfo {
  roomCode: string;
  gameId: string;
  gameTitle: string;
  hostConnectionId: string;
  state: 'Completed' | 'Lobby' | 'InProgress' | 'WaitingForHost' | 'Canceled' | number; // Support both string and numeric enum values
  createdAt: string;
  lastActivity?: string;
  playerCount: number;
  totalQuestions: number;
  currentQuestionIndex: number;
  autoShowResults: boolean;
  allowReconnection: boolean;
  duration?: string;
  players: PlayerInfo[];
}

export interface PlayerInfo {
  playerId: string;
  userName: string;
  connectionId: string;
  isConnected: boolean;
  joinedAt: string;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  averageResponseTime: number;
}

export interface RoomStatistics {
  roomCode: string;
  totalPlayers: number;
  activePlayers: number;
  questionsAnswered: number;
  averageScore: number;
  averageResponseTime: string;
  lastActivity?: string;
  answerDistribution: Record<string, number>;
}

export interface RoomStatus {
  roomCode: string;
  state: 'Completed' | 'Lobby' | 'InProgress' | 'WaitingForHost';
  isActive: boolean;
  canJoin: boolean;
  canStart: boolean;
  statusMessage: string;
  lastUpdated: string;
}

export interface RoomSettings {
  autoShowResults?: boolean;
  allowReconnection?: boolean;
}

export interface CreateRoomRequest {
  gameId: string;
  autoShowResults?: boolean;
}

class RoomManagementService {
  private baseUrl = '/api/RoomManagement';

  async getRoomInfo(roomCode: string): Promise<RoomManagementInfo> {
    const response = await apiRequest<RoomManagementInfo>(`${this.baseUrl}/${roomCode}`);
    return response.data!;
  }

  async getAllActiveRooms(): Promise<RoomManagementInfo[]> {
    const response = await apiRequest<RoomManagementInfo[]>(`${this.baseUrl}/active`);
    return response.data!;
  }

  async getRoomsByHost(hostConnectionId: string): Promise<RoomManagementInfo[]> {
    const response = await apiRequest<RoomManagementInfo[]>(`${this.baseUrl}/host/${hostConnectionId}`);
    return response.data!;
  }

  async createRoom(request: CreateRoomRequest): Promise<RoomManagementInfo> {
    const response = await apiRequest<RoomManagementInfo>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data!;
  }

  async activateRoom(roomCode: string): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>(`${this.baseUrl}/${roomCode}/activate`, {
      method: 'POST',
    });
    return response.data!;
  }

  async deactivateRoom(roomCode: string): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>(`${this.baseUrl}/${roomCode}/deactivate`, {
      method: 'POST',
    });
    return response.data!;
  }

  async endRoom(roomCode: string): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>(`${this.baseUrl}/${roomCode}/end`, {
      method: 'POST',
    });
    return response.data!;
  }

  async deleteRoom(roomCode: string): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>(`${this.baseUrl}/${roomCode}`, {
      method: 'DELETE',
    });
    return response.data!;
  }

  async updateRoomSettings(roomCode: string, settings: RoomSettings): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>(`${this.baseUrl}/${roomCode}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data!;
  }

  async getRoomStatistics(roomCode: string): Promise<RoomStatistics> {
    const response = await apiRequest<RoomStatistics>(`${this.baseUrl}/${roomCode}/statistics`);
    return response.data!;
  }

  async kickPlayer(roomCode: string, playerId: string): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>(`${this.baseUrl}/${roomCode}/kick/${playerId}`, {
      method: 'POST',
    });
    return response.data!;
  }

  async isRoomActive(roomCode: string): Promise<{ roomCode: string; isActive: boolean }> {
    const response = await apiRequest<{ roomCode: string; isActive: boolean }>(`${this.baseUrl}/${roomCode}/active`);
    return response.data!;
  }

  async getRoomStatus(roomCode: string): Promise<RoomStatus> {
    const response = await apiRequest<RoomStatus>(`${this.baseUrl}/${roomCode}/status`);
    return response.data!;
  }
}

export const roomManagementService = new RoomManagementService();

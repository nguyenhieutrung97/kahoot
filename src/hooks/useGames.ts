import { useState, useEffect, useCallback } from 'react';
import { gamesApi, apiUtils } from '@/lib/api-client';
import { Game, CreateGameCommand, UpdateGameCommand, UpdateGameStateCommand, GamesQueryParams, PaginatedResponse } from '@/types/api';

// Hook for managing games list
export const useGames = (params?: GamesQueryParams) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    pageNumber: 1,
    pageSize: 10,
    totalPages: 0,
  });

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await gamesApi.getGames(params);
      if (response.success && response.data) {
        const raw: any = response.data;
        let list: Game[] = [];
        let totalCount = 0;
        let pageNumber = 1;
        let pageSize = 10;
        let totalPages = 0;

        if (Array.isArray(raw)) {
          // API returned a plain array
          list = raw;
          totalCount = raw.length;
          pageSize = raw.length || 10;
          totalPages = 1;
        } else if (raw && Array.isArray(raw.data)) {
          // Expected PaginatedResponse shape { data: [], totalCount, pageNumber, pageSize, totalPages }
            list = raw.data;
            totalCount = raw.totalCount ?? raw.data.length;
            pageNumber = raw.pageNumber ?? 1;
            pageSize = raw.pageSize ?? raw.data.length ?? 10;
            totalPages = raw.totalPages ?? 1;
        } else if (raw && Array.isArray(raw.items)) {
          // Alternative paging shape { items: [], totalCount, page, pageSize, totalPages }
            list = raw.items;
            totalCount = raw.totalCount ?? raw.items.length;
            pageNumber = raw.page ?? 1;
            pageSize = raw.pageSize ?? raw.items.length ?? 10;
            totalPages = raw.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
        } else {
          // Unknown shape: attempt to derive array from any enumerable property
          const possibleArray = Object.values(raw || {}).find(v => Array.isArray(v)) as Game[] | undefined;
          if (possibleArray) {
            list = possibleArray;
            totalCount = possibleArray.length;
            pageSize = possibleArray.length || 10;
            totalPages = 1;
          }
        }

        setGames(Array.isArray(list) ? list : []);
        setPagination({ totalCount, pageNumber, pageSize, totalPages });
      }
    } catch (err) {
      setError(apiUtils.handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return {
    games,
    loading,
    error,
    pagination,
    refetch: fetchGames,
    // expose internal setter for optimistic updates if needed
    setGames,
  };
};

// Hook for managing a single game
export const useGame = (id: string | null) => {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await gamesApi.getGame(id);
      if (response.success && response.data) {
        setGame(response.data);
      }
    } catch (err) {
      setError(apiUtils.handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  return {
    game,
    loading,
    error,
    refetch: fetchGame,
  };
};

// Hook for game mutations
export const useGameMutations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGame = useCallback(async (command: CreateGameCommand) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await gamesApi.createGame(command);
      if (response.success) {
        return response.data;
      }
      throw new Error('Failed to create game');
    } catch (err) {
      const errorMessage = apiUtils.handleApiError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGame = useCallback(async (id: string, command: UpdateGameCommand) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await gamesApi.updateGame(id, command);
      if (response.success) {
        return response.data;
      }
      throw new Error('Failed to update game');
    } catch (err) {
      const errorMessage = apiUtils.handleApiError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGameState = useCallback(async (id: string, command: UpdateGameStateCommand) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await gamesApi.updateGameState(id, command);
      if (response.success) {
        return response.data;
      }
      throw new Error('Failed to update game state');
    } catch (err) {
      const errorMessage = apiUtils.handleApiError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteGame = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await gamesApi.deleteGame(id);
      if (response.success) {
        return true;
      }
      throw new Error('Failed to delete game');
    } catch (err) {
      const errorMessage = apiUtils.handleApiError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createGame,
    updateGame,
    updateGameState,
    deleteGame,
  };
};

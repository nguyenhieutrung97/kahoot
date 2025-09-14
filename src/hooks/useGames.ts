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
        setGames(response.data.data);
        setPagination({
          totalCount: response.data.totalCount,
          pageNumber: response.data.pageNumber,
          pageSize: response.data.pageSize,
          totalPages: response.data.totalPages,
        });
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

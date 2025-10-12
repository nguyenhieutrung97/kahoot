import { useState, useCallback } from 'react';
import { roomManagementService, RoomManagementInfo, RoomStatistics, RoomStatus, RoomSettings } from '../services/roomManagementService';

export interface UseRoomManagementReturn {
  // State
  rooms: RoomManagementInfo[];
  currentRoom: RoomManagementInfo | null;
  roomStatistics: RoomStatistics | null;
  roomStatus: RoomStatus | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadRooms: () => Promise<void>;
  loadRoomsByHost: (hostConnectionId: string) => Promise<void>;
  loadRoomInfo: (roomCode: string) => Promise<void>;
  loadRoomStatistics: (roomCode: string) => Promise<void>;
  loadRoomStatus: (roomCode: string) => Promise<void>;
  createRoom: (gameId: string, autoShowResults?: boolean) => Promise<RoomManagementInfo>;
  activateRoom: (roomCode: string) => Promise<void>;
  deactivateRoom: (roomCode: string) => Promise<void>;
  endRoom: (roomCode: string) => Promise<void>;
  deleteRoom: (roomCode: string) => Promise<void>;
  updateRoomSettings: (roomCode: string, settings: RoomSettings) => Promise<void>;
  kickPlayer: (roomCode: string, playerId: string) => Promise<void>;
  checkRoomActive: (roomCode: string) => Promise<boolean>;
  clearError: () => void;
  clearCurrentRoom: () => void;
}

export const useRoomManagement = (): UseRoomManagementReturn => {
  const [rooms, setRooms] = useState<RoomManagementInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomManagementInfo | null>(null);
  const [roomStatistics, setRoomStatistics] = useState<RoomStatistics | null>(null);
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: any) => {
    const errorMessage = err?.response?.data?.message || err?.message || 'An error occurred';
    setError(errorMessage);
    console.error('Room management error:', err);
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomManagementService.getAllActiveRooms();
      setRooms(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const loadRoomsByHost = useCallback(async (hostConnectionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomManagementService.getRoomsByHost(hostConnectionId);
      setRooms(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const loadRoomInfo = useCallback(async (roomCode: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomManagementService.getRoomInfo(roomCode);
      setCurrentRoom(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const loadRoomStatistics = useCallback(async (roomCode: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomManagementService.getRoomStatistics(roomCode);
      setRoomStatistics(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const loadRoomStatus = useCallback(async (roomCode: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomManagementService.getRoomStatus(roomCode);
      setRoomStatus(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const createRoom = useCallback(async (gameId: string, autoShowResults = true): Promise<RoomManagementInfo> => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomManagementService.createRoom({ gameId, autoShowResults });
      // Refresh rooms list
      await loadRooms();
      return data;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError, loadRooms]);

  const activateRoom = useCallback(async (roomCode: string) => {
    try {
      setLoading(true);
      setError(null);
      await roomManagementService.activateRoom(roomCode);
      // Refresh current room info
      await loadRoomInfo(roomCode);
      // Refresh rooms list
      await loadRooms();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError, loadRoomInfo, loadRooms]);

  const deactivateRoom = useCallback(async (roomCode: string) => {
    try {
      setLoading(true);
      setError(null);
      await roomManagementService.deactivateRoom(roomCode);
      // Refresh current room info
      await loadRoomInfo(roomCode);
      // Refresh rooms list
      await loadRooms();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError, loadRoomInfo, loadRooms]);

  const endRoom = useCallback(async (roomCode: string) => {
    try {
      setLoading(true);
      setError(null);
      await roomManagementService.endRoom(roomCode);
      // Refresh current room info
      await loadRoomInfo(roomCode);
      // Refresh rooms list
      await loadRooms();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError, loadRoomInfo, loadRooms]);

  const deleteRoom = useCallback(async (roomCode: string) => {
    try {
      setLoading(true);
      setError(null);
      await roomManagementService.deleteRoom(roomCode);
      // Remove from local state
      setRooms(prev => prev.filter(room => room.roomCode !== roomCode));
      if (currentRoom?.roomCode === roomCode) {
        setCurrentRoom(null);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError, currentRoom]);

  const updateRoomSettings = useCallback(async (roomCode: string, settings: RoomSettings) => {
    try {
      setLoading(true);
      setError(null);
      await roomManagementService.updateRoomSettings(roomCode, settings);
      // Refresh current room info
      await loadRoomInfo(roomCode);
      // Refresh rooms list
      await loadRooms();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError, loadRoomInfo, loadRooms]);

  const kickPlayer = useCallback(async (roomCode: string, playerId: string) => {
    try {
      setLoading(true);
      setError(null);
      await roomManagementService.kickPlayer(roomCode, playerId);
      // Refresh current room info
      await loadRoomInfo(roomCode);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError, loadRoomInfo]);

  const checkRoomActive = useCallback(async (roomCode: string): Promise<boolean> => {
    try {
      setError(null);
      const result = await roomManagementService.isRoomActive(roomCode);
      return result.isActive;
    } catch (err) {
      handleError(err);
      return false;
    }
  }, [handleError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearCurrentRoom = useCallback(() => {
    setCurrentRoom(null);
    setRoomStatistics(null);
    setRoomStatus(null);
  }, []);

  return {
    // State
    rooms,
    currentRoom,
    roomStatistics,
    roomStatus,
    loading,
    error,

    // Actions
    loadRooms,
    loadRoomsByHost,
    loadRoomInfo,
    loadRoomStatistics,
    loadRoomStatus,
    createRoom,
    activateRoom,
    deactivateRoom,
    endRoom,
    deleteRoom,
    updateRoomSettings,
    kickPlayer,
    checkRoomActive,
    clearError,
    clearCurrentRoom,
  };
};

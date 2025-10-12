import { useEffect, useCallback } from 'react';
import { useGameHub } from './useGameHub';
import { useRoomManagement } from './useRoomManagement';
import { RoomManagementInfo, RoomStatistics, RoomStatus } from '../services/roomManagementService';

export const useRoomManagementSignalR = () => {
  const { loadRooms, loadRoomInfo, loadRoomStatistics, loadRoomStatus } = useRoomManagement();
  const { client, connected } = useGameHub();

  // Handle SignalR events for room management
  const handleRoomListUpdated = useCallback((rooms: RoomManagementInfo[]) => {
    console.log('Room list updated:', rooms);
    // The useRoomManagement hook will handle updating the state
  }, []);

  const handleRoomInfoUpdated = useCallback((roomInfo: RoomManagementInfo) => {
    console.log('Room info updated:', roomInfo);
    // The useRoomManagement hook will handle updating the state
  }, []);

  const handleRoomStatisticsUpdated = useCallback((statistics: RoomStatistics) => {
    console.log('Room statistics updated:', statistics);
    // The useRoomManagement hook will handle updating the state
  }, []);

  const handleRoomStatusUpdated = useCallback((status: RoomStatus) => {
    console.log('Room status updated:', status);
    // The useRoomManagement hook will handle updating the state
  }, []);

  const handleRoomSettingsUpdated = useCallback((data: { roomCode: string; settings: any }) => {
    console.log('Room settings updated:', data);
    // Refresh room info to get updated settings
    loadRoomInfo(data.roomCode);
  }, [loadRoomInfo]);

  const handleRoomEnded = useCallback((data: { roomCode: string; reason: string }) => {
    console.log('Room ended:', data);
    // Refresh rooms list to reflect the change
    loadRooms();
  }, [loadRooms]);

  const handlePlayerKicked = useCallback((data: { roomCode: string; reason: string }) => {
    console.log('Player kicked:', data);
    // Refresh room info to update player list
    loadRoomInfo(data.roomCode);
  }, [loadRoomInfo]);

  // Set up SignalR event handlers
  useEffect(() => {
    if (!client || !connected) return;

    // Register event handlers
    client.on('RoomListUpdated', handleRoomListUpdated);
    client.on('RoomInfoUpdated', handleRoomInfoUpdated);
    client.on('RoomStatisticsUpdated', handleRoomStatisticsUpdated);
    client.on('RoomStatusUpdated', handleRoomStatusUpdated);
    client.on('RoomSettingsUpdated', handleRoomSettingsUpdated);
    client.on('RoomEnded', handleRoomEnded);
    client.on('PlayerKicked', handlePlayerKicked);

    // Cleanup event handlers
    return () => {
      client.off('RoomListUpdated', handleRoomListUpdated);
      client.off('RoomInfoUpdated', handleRoomInfoUpdated);
      client.off('RoomStatisticsUpdated', handleRoomStatisticsUpdated);
      client.off('RoomStatusUpdated', handleRoomStatusUpdated);
      client.off('RoomSettingsUpdated', handleRoomSettingsUpdated);
      client.off('RoomEnded', handleRoomEnded);
      client.off('PlayerKicked', handlePlayerKicked);
    };
  }, [
    client,
    connected,
    handleRoomListUpdated,
    handleRoomInfoUpdated,
    handleRoomStatisticsUpdated,
    handleRoomStatusUpdated,
    handleRoomSettingsUpdated,
    handleRoomEnded,
    handlePlayerKicked
  ]);

  // SignalR methods for room management
  const getManagedRooms = useCallback(async () => {
    if (!client || !connected) return;
    try {
      await client.invoke('GetManagedRooms');
    } catch (error) {
      console.error('Failed to get managed rooms:', error);
    }
  }, [client, connected]);

  const getRoomInfoSignalR = useCallback(async (roomCode: string) => {
    if (!client || !connected) return;
    try {
      await client.invoke('GetRoomInfo', roomCode);
    } catch (error) {
      console.error('Failed to get room info:', error);
    }
  }, [client, connected]);

  const getRoomStatisticsSignalR = useCallback(async (roomCode: string) => {
    if (!client || !connected) return;
    try {
      await client.invoke('GetRoomStatistics', roomCode);
    } catch (error) {
      console.error('Failed to get room statistics:', error);
    }
  }, [client, connected]);

  const getRoomStatusSignalR = useCallback(async (roomCode: string) => {
    if (!client || !connected) return;
    try {
      await client.invoke('GetRoomStatus', roomCode);
    } catch (error) {
      console.error('Failed to get room status:', error);
    }
  }, [client, connected]);

  const updateRoomSettingsSignalR = useCallback(async (roomCode: string, autoShowResults?: boolean, allowReconnection?: boolean) => {
    if (!client || !connected) return;
    try {
      await client.invoke('UpdateRoomSettings', roomCode, autoShowResults, allowReconnection);
    } catch (error) {
      console.error('Failed to update room settings:', error);
    }
  }, [client, connected]);

  const kickPlayerSignalR = useCallback(async (roomCode: string, playerId: string) => {
    if (!client || !connected) return;
    try {
      await client.invoke('KickPlayerFromRoom', roomCode, playerId);
    } catch (error) {
      console.error('Failed to kick player:', error);
    }
  }, [client, connected]);

  const endRoomSessionSignalR = useCallback(async (roomCode: string) => {
    if (!client || !connected) return;
    try {
      await client.invoke('EndRoomSession', roomCode);
    } catch (error) {
      console.error('Failed to end room session:', error);
    }
  }, [client, connected]);

  return {
    // SignalR methods
    getManagedRooms,
    getRoomInfoSignalR,
    getRoomStatisticsSignalR,
    getRoomStatusSignalR,
    updateRoomSettingsSignalR,
    kickPlayerSignalR,
    endRoomSessionSignalR,
    
    // Connection status
    connected
  };
};

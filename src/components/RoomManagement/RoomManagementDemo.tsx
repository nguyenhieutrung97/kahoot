import React, { useState, useEffect } from 'react';
import { useRoomManagement } from '../../hooks/useRoomManagement';
import { useRoomManagementSignalR } from '../../hooks/useRoomManagementSignalR';
import { RoomManagementPanel, RoomStatisticsPanel } from './index';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

/**
 * Demo component showing how to use the room management features
 * This component demonstrates the integration of both REST API and SignalR
 */
export const RoomManagementDemo: React.FC = () => {
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  
  // REST API hook
  const {
    rooms,
    currentRoom,
    roomStatistics,
    loading,
    error,
    loadRooms,
    loadRoomStatistics,
    clearError
  } = useRoomManagement();

  // SignalR hook
  const {
    getManagedRooms,
    connected
  } = useRoomManagementSignalR();

  // Load rooms on component mount
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Load statistics when room is selected
  useEffect(() => {
    if (selectedRoomCode) {
      loadRoomStatistics(selectedRoomCode);
    }
  }, [selectedRoomCode, loadRoomStatistics]);

  // Auto-refresh rooms every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadRooms();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadRooms]);

  const handleRoomSelect = (roomCode: string) => {
    setSelectedRoomCode(roomCode);
  };

  const handleRefreshSignalR = async () => {
    if (connected) {
      await getManagedRooms();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Room Management Demo</h1>
              <p className="text-gray-600 mt-2">
                Demonstrating REST API and SignalR integration for room management
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {connected ? (
                  <>
                    <Wifi className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-red-600">Disconnected</span>
                  </>
                )}
              </div>
              
              {/* Refresh Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={loadRooms}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Refresh API
                </button>
                <button
                  onClick={handleRefreshSignalR}
                  disabled={!connected}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Refresh SignalR
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">{error}</span>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Rooms</h3>
            <p className="text-3xl font-bold text-blue-600">{rooms.length}</p>
            <p className="text-sm text-gray-600 mt-1">Active rooms</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Players</h3>
            <p className="text-3xl font-bold text-green-600">
              {rooms.reduce((sum, room) => sum + room.playerCount, 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Across all rooms</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Connection</h3>
            <p className={`text-3xl font-bold ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? 'Live' : 'Offline'}
            </p>
            <p className="text-sm text-gray-600 mt-1">Real-time updates</p>
          </div>
        </div>

        {/* Room Management Panel */}
        <div className="bg-white rounded-lg shadow">
          <RoomManagementPanel 
            onRoomSelected={(room) => handleRoomSelect(room.roomCode)}
            onBack={() => setSelectedRoomCode(null)}
          />
        </div>

        {/* Statistics Panel */}
        {selectedRoomCode && roomStatistics && (
          <div className="bg-white rounded-lg shadow">
            <RoomStatisticsPanel statistics={roomStatistics} />
          </div>
        )}

        {/* Code Examples */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Usage Examples</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Basic Room Management</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`import { useRoomManagement } from '@/hooks/useRoomManagement';

const { rooms, createRoom, activateRoom } = useRoomManagement();

// Create a room
const newRoom = await createRoom('game-id', true);

// Activate a room
await activateRoom('ABC123');`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">SignalR Integration</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`import { useRoomManagementSignalR } from '@/hooks/useRoomManagementSignalR';

const { getManagedRooms, connected } = useRoomManagementSignalR();

// Get rooms via SignalR
if (connected) {
  await getManagedRooms();
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useRoomManagement } from '../../hooks/useRoomManagement';
import { RoomManagementInfo, getGameSessionStateString } from '../../services/roomManagementService';
import { Loader2, Users, Clock, Settings, Trash2, Power, PowerOff, Eye, EyeOff } from 'lucide-react';

interface RoomManagementPanelProps {
  onRoomSelected?: (room: RoomManagementInfo) => void;
  onBack?: () => void;
}

export const RoomManagementPanel: React.FC<RoomManagementPanelProps> = ({
  onRoomSelected,
  onBack
}) => {
  const {
    rooms,
    loading,
    error,
    loadRooms,
    activateRoom,
    deactivateRoom,
    endRoom,
    deleteRoom,
    updateRoomSettings,
    kickPlayer,
    clearError
  } = useRoomManagement();

  const [selectedRoom, setSelectedRoom] = useState<RoomManagementInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ autoShowResults: true, allowReconnection: true });

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleRoomSelect = (room: RoomManagementInfo) => {
    setSelectedRoom(room);
    setSettings({
      autoShowResults: room.autoShowResults,
      allowReconnection: room.allowReconnection
    });
    onRoomSelected?.(room);
  };

  const handleActivate = async (roomCode: string) => {
    try {
      await activateRoom(roomCode);
      await loadRooms(); // Refresh the list
    } catch (err) {
      console.error('Failed to activate room:', err);
    }
  };

  const handleDeactivate = async (roomCode: string) => {
    try {
      await deactivateRoom(roomCode);
      await loadRooms(); // Refresh the list
    } catch (err) {
      console.error('Failed to deactivate room:', err);
    }
  };

  const handleEndRoom = async (roomCode: string) => {
    if (window.confirm('Are you sure you want to end this room session?')) {
      try {
        await endRoom(roomCode);
        await loadRooms(); // Refresh the list
      } catch (err) {
        console.error('Failed to end room:', err);
      }
    }
  };

  const handleDeleteRoom = async (roomCode: string) => {
    if (window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      try {
        await deleteRoom(roomCode);
        if (selectedRoom?.roomCode === roomCode) {
          setSelectedRoom(null);
        }
      } catch (err) {
        console.error('Failed to delete room:', err);
      }
    }
  };

  const handleUpdateSettings = async () => {
    if (!selectedRoom) return;
    
    try {
      await updateRoomSettings(selectedRoom.roomCode, settings);
      setShowSettings(false);
      await loadRooms(); // Refresh the list
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!selectedRoom) return;
    
    if (window.confirm('Are you sure you want to kick this player?')) {
      try {
        await kickPlayer(selectedRoom.roomCode, playerId);
        await loadRooms(); // Refresh the list
      } catch (err) {
        console.error('Failed to kick player:', err);
      }
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Lobby': return 'bg-blue-100 text-blue-800';
      case 'InProgress': return 'bg-green-100 text-green-800';
      case 'WaitingForHost': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && rooms.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading rooms...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Room Management
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadRooms}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all duration-200 hover:shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all duration-200 hover:shadow-sm"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Users className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Rooms Found</h3>
          <p className="text-gray-500 text-sm">Create your first room to start managing game sessions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rooms List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Active Rooms</h3>
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.roomCode}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedRoom?.roomCode === room.roomCode
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => handleRoomSelect(room)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{room.roomCode}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(getGameSessionStateString(room.state))}`}>
                          {getGameSessionStateString(room.state)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{room.gameTitle}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {room.playerCount} players
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(room.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {getGameSessionStateString(room.state) === 'Completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivate(room.roomCode);
                          }}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Activate Room"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                      {getGameSessionStateString(room.state) === 'Lobby' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeactivate(room.roomCode);
                          }}
                          className="p-1 text-yellow-600 hover:text-yellow-800"
                          title="Deactivate Room"
                        >
                          <PowerOff className="w-4 h-4" />
                        </button>
                      )}
                      {(getGameSessionStateString(room.state) === 'Lobby' || getGameSessionStateString(room.state) === 'InProgress') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndRoom(room.roomCode);
                          }}
                          className="p-1 text-orange-600 hover:text-orange-800"
                          title="End Room"
                        >
                          <PowerOff className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.roomCode);
                        }}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Room Details */}
          {selectedRoom && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Room Details</h3>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-600 hover:text-gray-800"
                  title="Room Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Room Code:</span>
                    <p className="text-gray-900">{selectedRoom.roomCode}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Game:</span>
                    <p className="text-gray-900">{selectedRoom.gameTitle}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">State:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(getGameSessionStateString(selectedRoom.state))}`}>
                      {getGameSessionStateString(selectedRoom.state)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Players:</span>
                    <p className="text-gray-900">{selectedRoom.playerCount}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Created:</span>
                    <p className="text-gray-900">{formatDate(selectedRoom.createdAt)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Questions:</span>
                    <p className="text-gray-900">{selectedRoom.totalQuestions}</p>
                  </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-800 mb-3">Room Settings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">Auto Show Results</label>
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, autoShowResults: !prev.autoShowResults }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.autoShowResults ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.autoShowResults ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">Allow Reconnection</label>
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, allowReconnection: !prev.allowReconnection }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.allowReconnection ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.allowReconnection ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleUpdateSettings}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Save Settings
                        </button>
                        <button
                          onClick={() => setShowSettings(false)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Players List */}
                {selectedRoom.players.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-800 mb-3">Players ({selectedRoom.players.length})</h4>
                    <div className="space-y-2">
                      {selectedRoom.players.map((player) => (
                        <div key={player.playerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-sm font-medium">{player.userName}</span>
                            <span className="text-xs text-gray-500">({player.score} pts)</span>
                          </div>
                          <button
                            onClick={() => handleKickPlayer(player.playerId)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Kick Player"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

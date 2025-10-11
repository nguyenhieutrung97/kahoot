"use client";

import { useState, useEffect } from 'react';
import { useGameHub } from '@/hooks/useGameHub';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function ConnectionStatus({ showDetails = false, className = "" }: ConnectionStatusProps) {
  const { connected, reconnecting, connectionError, forceReconnect, getConnectionStatus } = useGameHub();
  const [status, setStatus] = useState(getConnectionStatus());
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getConnectionStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, [getConnectionStatus]);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await forceReconnect();
    } catch (err) {
      console.error('Manual reconnection failed:', err);
    } finally {
      setIsReconnecting(false);
    }
  };

  const getStatusColor = () => {
    if (reconnecting || isReconnecting) return 'text-yellow-600 bg-yellow-100';
    if (connected) return 'text-green-600 bg-green-100';
    if (connectionError) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getStatusText = () => {
    if (reconnecting || isReconnecting) return 'Reconnecting...';
    if (connected) return 'Connected';
    if (connectionError) return 'Disconnected';
    return 'Connecting...';
  };

  const getStatusIcon = () => {
    if (reconnecting || isReconnecting) return '🔄';
    if (connected) return '🟢';
    if (connectionError) return '🔴';
    return '🟡';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
        <span>{getStatusIcon()}</span>
        <span>{getStatusText()}</span>
      </div>
      
      {connectionError && (
        <button
          onClick={handleReconnect}
          disabled={isReconnecting}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isReconnecting ? 'Reconnecting...' : 'Retry'}
        </button>
      )}
      
      {showDetails && (
        <div className="text-xs text-gray-500">
          {status.timeSinceLastPing < 60000 ? (
            <span>Last ping: {Math.round(status.timeSinceLastPing / 1000)}s ago</span>
          ) : (
            <span>State: {status.state}</span>
          )}
        </div>
      )}
    </div>
  );
}

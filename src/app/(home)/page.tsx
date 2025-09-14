"use client";

import { useState } from "react";
import { GameHeader } from "@/components/ui/GameHeader";
import { GameInput } from "@/components/ui/GameInput";
import { GameButton } from "@/components/ui/GameButton";
import { useGameNavigation } from "@/hooks/useGameNavigation";
import { isValidRoomCode } from "@/lib/game-utils";

export default function Dashboard() {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { goToJoin } = useGameNavigation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!isValidRoomCode(roomCode)) {
      setError("Please enter a valid room code");
      return;
    }

  // Navigate to join page - pass the room code exactly as entered (do not modify)
  goToJoin(roomCode);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GameHeader title="DEVSLIKECODE" withSvgBorder />

      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border-2 border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 uppercase tracking-wide mb-4">
              JOIN ROOM
            </h2>
            <div className="w-16 h-1 bg-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Innovation through knowledge</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="text-sm font-bold text-gray-700 uppercase tracking-wide">Join Room (Player)</div>
              <GameInput
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="ENTER ROOM CODE"
                error={error}
                fullWidth
                disabled={isLoading}
              />
              
              <GameButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={!roomCode.trim() || isLoading}
              >
                ENTER ROOM
              </GameButton>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}

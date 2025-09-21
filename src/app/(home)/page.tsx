"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { GameHeader } from "@/components/ui/GameHeader";
import { GameInput } from "@/components/ui/GameInput";
import { GameButton } from "@/components/ui/GameButton";
import { buildNavigationUrl, isValidRoomCode, isValidPlayerName } from "@/lib/game-utils";

const SESSION_KEY = 'kahoot_player_session';

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Prefill from query or previous session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - (parsed.timestamp || 0) < 3600_000) {
          if (parsed.userName) setPlayerName(parsed.userName || '');
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidRoomCode(roomCode)) {
      setError('Room code must contain only letters and numbers (1-50 characters)');
      return;
    }
    if (!isValidPlayerName(playerName)) {
      setError('Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods (1-50 characters)');
      return;
    }

    setIsLoading(true);
    try {
      // Provisional session (playerId set after JoinedGame in lobby)
      const session = { userName: playerName.trim(), timestamp: Date.now() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {}

    const url = buildNavigationUrl('/lobby', { roomCode: roomCode.trim(), name: playerName.trim() });
    router.push(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GameHeader title="DEVSLIKECODE" withSvgBorder />
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border-2 border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 uppercase tracking-wide mb-4">JOIN GAME</h2>
            <div className="w-16 h-1 bg-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Enter room code and your name to join</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="text-sm font-bold text-gray-700 uppercase tracking-wide">Room Code</div>
              <GameInput
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="ENTER ROOM CODE"
                error={error && !isValidRoomCode(roomCode) ? error : ''}
                fullWidth
                disabled={isLoading}
              />
              <div className="text-sm font-bold text-gray-700 uppercase tracking-wide">Player Name</div>
              <GameInput
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="ENTER YOUR NAME"
                error={error && isValidRoomCode(roomCode) ? error : ''}
                fullWidth
                disabled={isLoading}
              />
              {error && <div className="text-xs text-red-600 font-medium">{error}</div>}
              <GameButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={!roomCode.trim() || !playerName.trim() || isLoading}
              >
                ENTER LOBBY
              </GameButton>
              <a
                href="references/host.html"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center w-full px-6 py-3 rounded-md border-2 border-gray-300 text-gray-700 font-bold uppercase tracking-wide hover:bg-gray-50 transition-colors"
              >
                <span className="mr-2">🧪</span>
                Create Game (Testing)
              </a>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

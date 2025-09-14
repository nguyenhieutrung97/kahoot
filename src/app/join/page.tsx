"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GameHeader } from "@/components/ui/GameHeader";
import { GameInput } from "@/components/ui/GameInput";
import { GameButton } from "@/components/ui/GameButton";
import { useGameHub } from "@/hooks/useGameHub";
import { buildNavigationUrl } from "@/lib/game-utils";
import { isValidPlayerName, isValidRoomCode } from "@/lib/game-utils";

const SESSION_KEY = "kahoot_player_session";

type Session = {
  roomCode: string;
  userName: string;
  playerId?: string;
  timestamp: number;
};

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const didJoinRef = useRef(false);

  const { connected, joinGame } = useGameHub({
    onJoinedGame: (payload) => {
      // Persist session
      try {
        const session: Session = { roomCode: payload.roomCode || roomCode, userName: payload.userName || userName, playerId: payload.playerId, timestamp: Date.now() };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch (e) {}

      // Navigate to lobby with params
      const url = buildNavigationUrl('/lobby', { roomCode: payload.roomCode || roomCode, name: payload.userName || userName });
      router.push(url);
    },
    onError: (msg) => {
      setError(msg || 'Failed to connect');
      setIsLoading(false);
      didJoinRef.current = false;
    }
  });

  useEffect(() => {
    // Prefill roomCode from URL (do not modify the value)
    let q: string | null = null;
    try {
      q = searchParams?.get('roomCode');
      if (q) setRoomCode(q);
    } catch {}

    // Restore previous session (if <1h). Only apply saved roomCode when no roomCode
    // was provided via URL — we must not overwrite the URL mapping.
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: Session = JSON.parse(raw);
        if (Date.now() - (parsed.timestamp || 0) < 3600_000) {
          if (!q) setRoomCode(parsed.roomCode || '');
          setUserName(parsed.userName || '');
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (e) {}
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    if (!isValidRoomCode(roomCode)) {
      setError('Please enter a valid room code');
      return;
    }

    if (!isValidPlayerName(userName)) {
      setError('Please enter a valid name (1-50 chars)');
      return;
    }

    if (!connected) {
      setError('Connecting to server...');
    }

    if (didJoinRef.current) return;
    didJoinRef.current = true;
    setIsLoading(true);

    try {
      await joinGame(roomCode.trim(), userName.trim());
      // onJoinedGame will handle navigation
    } catch (err: any) {
      setError(err?.message || 'Failed to join game');
      setIsLoading(false);
      didJoinRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GameHeader title="JOIN GAME" withSvgBorder />

      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border-2 border-gray-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide mb-2">Join Room</h2>
            <p className="text-gray-600 text-sm">Enter room code and your display name</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <GameInput
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Room code"
              fullWidth
              disabled={isLoading}
            />

            <GameInput
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
              fullWidth
              disabled={isLoading}
            />

            {error && <div className="text-sm text-red-600">{error}</div>}

            <GameButton type="submit" variant="primary" size="lg" fullWidth loading={isLoading} disabled={isLoading}>
              Join Game
            </GameButton>
          </form>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GameHeader } from "@/components/ui/GameHeader";
import { getDeterministicAvatar } from "@/lib/utils";
import { useGameHub } from "@/hooks/useGameHub";
import { useGame } from "@/hooks/useGames";
import { useQuestions } from "@/hooks/useQuestions";
import { GameState } from "@/types/api";

interface Player {
  id: string;
  name: string;
  connectionId?: string;
  avatar: {
    color: string;
    initials: string;
  };
  joinedAt?: string | undefined; // Optional timestamp for deduplication
}


const generatePlayerId = () => {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const numbers = Math.floor(Math.random() * 900) + 100;
  return `${letter}${numbers}`;
};

const getAvatar = (name: string) => getDeterministicAvatar(name);

export default function Lobby() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = searchParams.get("gameId") || "";
  const roomCode = searchParams.get("roomCode") || "";
  const playerName = searchParams.get("name") || "";
  const joinCode = roomCode || gameId; // Prefer roomCode if provided

  const [players, setPlayers] = useState<Player[]>([]);
  const didJoinRef = useRef(false); // guard to avoid multiple JoinGame calls in StrictMode
  
  // Debug: analyze raw vs mapped vs deduped players to find duplication sources
  const debugLogPlayers = (label: string, list: any[]) => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return;
    try {
      const rows = (list || []).map((p: any) => ({
        playerId: p.playerId || p.id,
        name: p.name || p.userName,
        connectionId: p.connectionId,
        isConnected: p.isConnected,
        joinedAt: p.joinedAt,
      }));
      // eslint-disable-next-line no-console
      console.groupCollapsed(`[LobbyDebug] ${label} count=${rows.length}`);
      // eslint-disable-next-line no-console
      console.table(rows);

      const byName = new Map<string, any[]>();
      rows.forEach((p) => {
        const k = String(p.name || '').toUpperCase().trim();
        if (!k) return;
        const arr = byName.get(k) || [];
        arr.push(p);
        byName.set(k, arr);
      });
      const dupNames = Array.from(byName.entries()).filter(([, arr]) => arr.length > 1);
      if (dupNames.length) {
        // eslint-disable-next-line no-console
        console.warn('[LobbyDebug] Duplicates by NAME:', dupNames.map(([k, arr]) => ({ name: k, ids: arr.map(x => x.playerId), joinedAt: arr.map(x => x.joinedAt) })));
      }

      const byConn = new Map<string, any[]>();
      rows.forEach((p) => {
        const k = String(p.connectionId || '').trim();
        if (!k) return;
        const arr = byConn.get(k) || [];
        arr.push(p);
        byConn.set(k, arr);
      });
      const dupConn = Array.from(byConn.entries()).filter(([, arr]) => arr.length > 1);
      if (dupConn.length) {
        // eslint-disable-next-line no-console
        console.warn('[LobbyDebug] Duplicates by CONNECTION:', dupConn.map(([k, arr]) => ({ connectionId: k, names: arr.map(x => x.name), ids: arr.map(x => x.playerId) })));
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    } catch {}
  };
  
  // Centralized player deduplication. Prefer connectionId when present; otherwise normalize by name.
  const dedupePlayersByName = (playerList: Player[]): Player[] => {
    const playerMap = new Map<string, Player>();

    playerList.forEach((player) => {
      const normalizedName = (player.name || '').toUpperCase().trim();
      // Key by connectionId if present; otherwise use normalized name.
      const key = (player.connectionId && String(player.connectionId).trim()) || normalizedName;

      if (!key) return; // skip empty names

      const existing = playerMap.get(key);
      if (!existing) {
        // clone to avoid mutating original objects
        playerMap.set(key, { ...player });
        return;
      }

      // Determine which record to prefer. Prefer connected players, then newer joinedAt, then larger id.
      const curTime = player.joinedAt ? new Date(player.joinedAt).getTime() : 0;
      const existTime = existing.joinedAt ? new Date(existing.joinedAt).getTime() : 0;

      const curConnected = (player as any).isConnected === undefined ? true : (player as any).isConnected;
      const existConnected = (existing as any).isConnected === undefined ? true : (existing as any).isConnected;

      const preferCurrent =
        (curConnected && !existConnected) ||
        curTime > existTime ||
        (curTime === existTime && player.id > existing.id);

      if (preferCurrent) {
        // merge: keep latest data but preserve connection flag if either is connected
        playerMap.set(key, {
          ...existing,
          ...player,
          joinedAt: player.joinedAt || existing.joinedAt,
          avatar: player.avatar || existing.avatar,
        });
      } else {
        // ensure we keep the connection status and most complete name
        playerMap.set(key, {
          ...existing,
          name: existing.name || player.name,
          joinedAt: existing.joinedAt || player.joinedAt,
          avatar: existing.avatar || player.avatar,
        });
      }
    });

    // Return stable sorted list (oldest first)
    return Array.from(playerMap.values()).sort((a, b) => {
      const ta = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
      const tb = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
      return ta - tb;
    });
  };

  // Map raw server data to Player objects
  const mapServerPlayers = (rawPlayers: any[]): Player[] => {
    return rawPlayers.map((raw: any) => ({
      id: raw.playerId || raw.id || generatePlayerId(),
      name: raw.name || raw.userName || 'Unknown',
      connectionId: raw.connectionId,
      avatar: getAvatar(raw.name || raw.userName || 'Unknown'),
      joinedAt: raw.joinedAt || new Date().toISOString() // Include timestamp for deduplication
    }));
  };
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState("");
  const [gameInfo, setGameInfo] = useState<{
    gameTitle: string;
    gameDescription?: string;
    totalQuestions: number;
    roomCode?: string;
  } | null>(null);
  const { connected, client, joinGame, startGame, requestRoomStatus } = useGameHub({
    onJoinedGame: (payload) => {
      // Store game information from SignalR
      if (payload.gameTitle || payload.totalQuestions) {
        setGameInfo({
          gameTitle: payload.gameTitle || "Game",
          gameDescription: payload.gameDescription,
          totalQuestions: payload.totalQuestions || 0,
          roomCode: payload.roomCode || roomCode
        });
      }
      // Update players list from server data (replace, don't merge to avoid duplicates)
      if (payload.players && Array.isArray(payload.players)) {
        debugLogPlayers('JoinedGame/raw', payload.players);
        const serverPlayers = mapServerPlayers(payload.players);
        debugLogPlayers('JoinedGame/mapped', serverPlayers as any);
        const dedupedPlayers = dedupePlayersByName(serverPlayers);
        debugLogPlayers('JoinedGame/deduped', dedupedPlayers as any);
        setPlayers(dedupedPlayers);
        // Set current player from payload if provided so UI can highlight it immediately
        try {
          const myId = payload.playerId || payload.player?.playerId || payload.player?.id;
          const myName = payload.userName || payload.player?.userName || payload.player?.name || playerName;
          if (myId || myName) {
            const found = dedupedPlayers.find(p => (p.id && myId && String(p.id) === String(myId)) || (p.name && String(p.name).toUpperCase() === String(myName).toUpperCase()));
            if (found) setCurrentPlayer(found);
            else setCurrentPlayer({ id: myId || generatePlayerId(), name: myName || 'You', connectionId: payload.connectionId, avatar: getAvatar(myName || 'You'), joinedAt: payload.joinedAt || new Date().toISOString() });
          }
        } catch {}
      }
    },
    onLobbyInfo: (payload) => {
      // Update players list from server data (replace to get authoritative list)
      if (payload.players && Array.isArray(payload.players)) {
        debugLogPlayers('LobbyInfo/raw', payload.players);
        const serverPlayers = mapServerPlayers(payload.players);
        debugLogPlayers('LobbyInfo/mapped', serverPlayers as any);
        const dedupedPlayers = dedupePlayersByName(serverPlayers);
        debugLogPlayers('LobbyInfo/deduped', dedupedPlayers as any);
        setPlayers(dedupedPlayers);
        // If we have a session or previous currentPlayer, try to reconcile and keep currentPlayer reference
        try {
          const raw = localStorage.getItem('kahoot_player_session');
          const session = raw ? JSON.parse(raw as string) : null;
          const sessionId = session?.playerId;
          const sessionName = session?.userName;
          const found = dedupedPlayers.find(p => (sessionId && String(p.id) === String(sessionId)) || (sessionName && String(p.name).toUpperCase() === String(sessionName).toUpperCase()));
          if (found) setCurrentPlayer(found);
        } catch {}
      }
    },
    onLobbyUpdate: (payload) => {
      // Some servers emit LobbyUpdate separately; treat same as LobbyInfo
      if (payload && Array.isArray(payload.players)) {
        debugLogPlayers('LobbyUpdate/raw', payload.players);
        const serverPlayers = mapServerPlayers(payload.players);
        debugLogPlayers('LobbyUpdate/mapped', serverPlayers as any);
        const dedupedPlayers = dedupePlayersByName(serverPlayers);
        debugLogPlayers('LobbyUpdate/deduped', dedupedPlayers as any);
        setPlayers(dedupedPlayers);
      }
    },
    onPlayerJoined: (payload) => {
      // Server will send updated lobby info automatically
      // No need to manually update players here
    },
    onGameStarted: (payload) => {
      // Navigate to the question page using actual gameId from server
      const startedGameId = payload?.gameId || gameId;
      router.push(
        `/question?gameId=${encodeURIComponent(startedGameId)}&name=${encodeURIComponent(playerName)}&questionNumber=1`
      );
    },
    onError: (msg) => setError(msg || "Connection error"),
  });

  // Helper to request fresh lobby info (manual refresh)
  const requestLobbyUpdate = async () => {
    try {
      await requestRoomStatus(joinCode || undefined);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('Failed to request lobby status', err);
    }
  };

  // Get game and questions data - only if gameId looks like a GUID (actual game ID)
  // If it looks like a room code (short string), we'll get game info from SignalR events
  const isActualGameId = gameId && gameId.length > 10; // GUIDs are longer than room codes
  const { game, loading: gameLoading, error: gameError } = useGame(isActualGameId ? gameId : null);
  const { questions, loading: questionsLoading, error: questionsError } = useQuestions(isActualGameId ? gameId : null);

  useEffect(() => {
    // Clear any previous local results for this player/room so a new game starts clean
    if (playerName) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i) as string;
          if (!key) continue;
          const norm = playerName.toUpperCase();
          if (
            key === `results:${gameId}:${norm}` ||
            key.startsWith(`resultq:${gameId}:${norm}:`)
          ) {
            localStorage.removeItem(key);
            // Adjust index after removal due to storage reindexing
            i = -1;
          }
        }
      } catch {}
    }
    return undefined;
  }, [playerName, gameId]);

  // Note: GetLobbyInfo method doesn't exist on server
  // Lobby info will come through onLobbyInfo events automatically

  // Connect to room via SignalR once we have name+room
  useEffect(() => {
    if (connected && joinCode && playerName && !didJoinRef.current) {
      // Prevent duplicate join when navigating from /join -> /lobby where join was already invoked.
      // If we have a recent session saved that matches this room + name, assume we're already joined
      try {
        const raw = localStorage.getItem('kahoot_player_session');
        if (raw) {
          const parsed = JSON.parse(raw as string);
          const sessionRoom = parsed?.roomCode;
          const sessionName = parsed?.userName;
          const sessionPlayerId = parsed?.playerId;
          const isRecent = parsed?.timestamp && (Date.now() - parsed.timestamp) < 3600_000;

          if (isRecent && sessionRoom && sessionName && sessionPlayerId &&
            sessionRoom === joinCode && String(sessionName).toUpperCase() === String(playerName).toUpperCase()) {
            // We already joined from the Join page; request room status to populate lobby and skip re-joining
            didJoinRef.current = true;
            // Populate optimistic current player from session so UI shows player immediately
            try {
              setCurrentPlayer({ id: sessionPlayerId, name: sessionName, avatar: getAvatar(sessionName), joinedAt: new Date().toISOString() });
            } catch {}
            try { requestRoomStatus(joinCode).catch(() => {}); } catch (e) {}
            return undefined;
          }
        }
      } catch (err) {
        // ignore parse errors and fall through to join
      }

      didJoinRef.current = true; // ensure we only attempt once per mount
      const nameUpper = playerName.toUpperCase();
      joinGame(joinCode, nameUpper).catch((error) => {
        console.error("Failed to join game:", error);
        didJoinRef.current = false; // allow retry on failure
      });
    }
  }, [connected, joinCode, playerName, joinGame]);

  // Check for game errors
  useEffect(() => {
    if (gameError) {
      setError("Failed to load game. Please try again.");
    } else if (game && game.state !== GameState.Ready && game.state !== GameState.Live) {
      setError("This game is not currently accepting players.");
    }
  }, [game, gameError]);

  // Auto-redirect after 5 seconds (only if game is ready and has questions)
  useEffect(() => {
    if (game && game.state === GameState.Ready && questions && questions.length > 0 && !error) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
    return undefined;
  }, [game, questions, error]);

  // Handle navigation when countdown reaches 0
  useEffect(() => {
    const totalQuestions = gameInfo?.totalQuestions || questions?.length || 0;
    if (countdown === 0 && totalQuestions > 0) {
      // Use setTimeout to defer navigation to next tick
      const timeoutId = setTimeout(() => {
        router.push(
          `/question?gameId=${encodeURIComponent(gameId)}&name=${encodeURIComponent(playerName)}&questionNumber=1`,
        );
      }, 100);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [countdown, router, gameId, playerName, gameInfo, questions]);

  const maxSlots = 12;
  const emptySlots = Array(Math.max(0, maxSlots - players.length)).fill(null);

  // Show loading state - only if we're trying to fetch via API and still loading
  if (isActualGameId && (gameLoading || questionsLoading)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GameHeader title="GAME LOBBY" withSvgBorder />
        <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="text-center">
            <div className="text-lg text-gray-600">Loading game...</div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state - only if we have a real error or if using API and got an error
  if (error || (isActualGameId && (gameError || questionsError))) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GameHeader title="GAME LOBBY" withSvgBorder />
        <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 border-2 border-red-200">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 uppercase tracking-wide mb-4">
                ERROR
              </h2>
              <div className="w-16 h-1 bg-red-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium mb-6">
                {error || gameError || questionsError}
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-red-600 text-white rounded font-bold uppercase tracking-wide hover:bg-red-700 transition-colors"
              >
                BACK TO HOME
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GameHeader 
        title="GAME LOBBY" 
        withSvgBorder 
        rightContent={
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 uppercase tracking-wide">
              WAITING ROOM
            </div>
            <div className="text-sm text-gray-600 font-medium">Room Code: {roomCode || gameId}</div>
            {(gameInfo?.gameTitle || game?.title) && (
              <div className="text-xs text-gray-500 mt-1">{gameInfo?.gameTitle || game?.title}</div>
            )}
          </div>
        }
      />

      <main className="px-6 py-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide mb-4">PARTICIPANTS</h2>
          <div className="w-16 h-1 bg-red-600 mx-auto"></div>
        </div>
        <div className="mt-8 text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={requestLobbyUpdate}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
            >
              📋 Refresh Lobby
            </button>
            <button
              onClick={() => {
                // Leave room: stop connection and go home
                try { if (client && (client as any).stop) (client as any).stop(); } catch {};
                router.push('/');
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              🚪 Leave Room
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto">
          {/* If server hasn't sent players yet, show optimistic current player card */}
          {players.length === 0 && currentPlayer ? (
            <div className="bg-white rounded-lg p-4 shadow-lg border-2 border-green-300 transition-colors">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center border-2 border-gray-200">
                <div className={`w-16 h-16 ${currentPlayer.avatar.color} rounded-full flex items-center justify-center text-white text-lg font-bold`}>
                  {currentPlayer.avatar.initials}
                </div>
              </div>
              <div className="text-sm text-center">
                <div className="font-bold text-gray-900 truncate uppercase tracking-wide text-xs">{currentPlayer.name} (You)</div>
                <div className="text-gray-500 font-medium mt-1">{currentPlayer.id}</div>
              </div>
            </div>
          ) : null}

          {/* Render existing players */}
          {players.map((player) => {
            const isCurrent = currentPlayer && ((player.id && currentPlayer.id && String(player.id) === String(currentPlayer.id)) || (player.name && currentPlayer.name && String(player.name).toUpperCase() === String(currentPlayer.name).toUpperCase()));
            return (
              <div
                key={player.id}
                className={`bg-white rounded-lg p-4 shadow-lg border-2 ${isCurrent ? 'border-green-400' : 'border-gray-200'} hover:border-red-600 transition-colors`}
              >
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center border-2 border-gray-200">
                  <div
                    className={`w-16 h-16 ${player.avatar.color} rounded-full flex items-center justify-center text-white text-lg font-bold`}
                  >
                    {player.avatar.initials}
                  </div>
                </div>
                <div className="text-sm text-center">
                  <div className="font-bold text-gray-900 truncate uppercase tracking-wide text-xs">
                    {player.name}{isCurrent ? ' (You)' : ''}
                  </div>
                  <div className="text-gray-500 font-medium mt-1">{player.id}</div>
                </div>
              </div>
            );
          })}

          {/* Render empty slots */}
          {emptySlots.map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-white rounded-lg p-4 shadow-lg border-2 border-gray-200 opacity-40"
            >
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 border-2 border-gray-200 border-dashed"></div>
              <div className="text-sm text-center">
                <div className="h-4 bg-gray-100 rounded mb-1"></div>
                <div className="h-3 bg-gray-100 rounded w-16 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>

        {players.length > 0 && game && questions && questions.length > 0 && (
          <div className="mt-12 text-center bg-white rounded-lg p-6 shadow-lg border-2 border-gray-200 max-w-md mx-auto">
            <div className="text-sm text-gray-600 mb-2 font-medium uppercase tracking-wide">
              {players.length} of {maxSlots} participants ready
            </div>
            <div className="w-12 h-1 bg-red-600 mx-auto mb-4"></div>
            <div className="text-2xl font-bold text-red-600 uppercase tracking-wide">
              START IN {countdown}S
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {questions.length} question{questions.length !== 1 ? 's' : ''} ready
            </div>
          </div>
        )}

        {game && (!questions || questions.length === 0) && (
          <div className="mt-12 text-center bg-yellow-50 rounded-lg p-6 shadow-lg border-2 border-yellow-200 max-w-md mx-auto">
            <div className="text-sm text-yellow-800 mb-2 font-medium uppercase tracking-wide">
              WAITING FOR QUESTIONS
            </div>
            <div className="w-12 h-1 bg-yellow-600 mx-auto mb-4"></div>
            <div className="text-lg font-bold text-yellow-800 uppercase tracking-wide">
              GAME NOT READY
            </div>
            <div className="text-xs text-yellow-600 mt-2">
              The game host needs to add questions before starting
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

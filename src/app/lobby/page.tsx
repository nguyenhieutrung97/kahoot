"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { GameHeader } from '@/components/ui/GameHeader';
import { getDeterministicAvatar } from '@/lib/utils';
import { useGameHub } from '@/hooks/useGameHub';
import { useGame } from '@/hooks/useGames';
import { useQuestions } from '@/hooks/useQuestions';
import { GameState } from '@/types/api';
import { useFinalResult } from '@/context/FinalResultContext'; // NEW

interface Player {
  id: string;
  name: string;
  connectionId?: string;
  avatar: { color: string; initials: string };
  joinedAt?: string;
}

// No fixed max slots; render only actual participants

const generatePlayerId = () => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const numbers = Math.floor(Math.random() * 900) + 100;
  return `${letter}${numbers}`;
};

const getAvatar = (name: string) => getDeterministicAvatar(name);

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

const mapServerPlayers = (rawPlayers: any[]): Player[] => {
  return rawPlayers.map((raw: any) => ({
    id: raw.playerId || raw.id || generatePlayerId(),
    name: raw.name || raw.userName || 'Unknown',
    connectionId: raw.connectionId,
    avatar: getAvatar(raw.name || raw.userName || 'Unknown'),
    joinedAt: raw.joinedAt || new Date().toISOString(),
  }));
};

export default function Lobby() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = searchParams.get('gameId') || '';
  const roomCode = searchParams.get('roomCode') || '';
  const playerName = searchParams.get('name') || '';
  const joinCode = roomCode || gameId;

  const sessionKeyFor = (code: string) => `kahoot_player_session:${String(code || '').toUpperCase()}`;

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(true); // show loading while negotiating & awaiting first Join/Lobby event
  const [gameInfo, setGameInfo] = useState<{
    gameTitle: string;
    gameDescription?: string;
    totalQuestions: number;
    roomCode?: string;
  } | null>(null);
  const didJoinRef = useRef(false);
  const { setResult } = useFinalResult(); // NEW
  const [showWaitingInfo, setShowWaitingInfo] = useState(false); // NEW waiting info flag

  const { connected, client, joinGame, ensureConnected } = useGameHub({
    onGameEnded: (payload) => { // NEW
      try { setResult(payload); } catch {}
      router.push('/final');
    },
    onFinalResults: (payload) => { // NEW (some backends use this name)
      try { setResult(payload); } catch {}
      router.push('/final');
    },
    onJoinedGame: (payload) => {
      try {
        const codeForKey = String(payload.roomCode || roomCode || joinCode || '').toUpperCase();
        const session = {
          userName: payload.userName || playerName,
          playerId: payload.playerId || payload.player?.playerId,
          roomCode: codeForKey,
          timestamp: Date.now(),
        };
        if (codeForKey) {
          localStorage.setItem(sessionKeyFor(codeForKey), JSON.stringify(session));
        }
        // Keep global session for convenience (prefill name elsewhere)
        try {
          const global = { userName: session.userName, timestamp: session.timestamp };
          localStorage.setItem('kahoot_player_session', JSON.stringify(global));
        } catch {}
      } catch {}
      if (payload.gameTitle || payload.totalQuestions) {
        setGameInfo({
          gameTitle: payload.gameTitle || 'Game',
          gameDescription: payload.gameDescription,
          totalQuestions: payload.totalQuestions || 0,
          roomCode: payload.roomCode || roomCode,
        });
      }
      if (payload.players && Array.isArray(payload.players)) {
        debugLogPlayers('JoinedGame/raw', payload.players);
        const serverPlayers = mapServerPlayers(payload.players);
        debugLogPlayers('JoinedGame/mapped', serverPlayers as any);
        setPlayers(serverPlayers);
        try {
          const myId = payload.playerId || payload.player?.playerId || payload.player?.id;
          const myName = payload.userName || payload.player?.userName || payload.player?.name || playerName;
          if (myId || myName) {
            const found = serverPlayers.find(p => (myId && String(p.id) === String(myId)) || (myName && p.name && p.name.toUpperCase() === myName.toUpperCase()));
            if (found) setCurrentPlayer(found);
            else setCurrentPlayer({
              id: myId || generatePlayerId(),
              name: myName || 'You',
              connectionId: payload.connectionId,
              avatar: getAvatar(myName || 'You'),
              joinedAt: payload.joinedAt || new Date().toISOString(),
            });
          }
        } catch {}
      }
      setInitializing(false);
    },
    onLobbyInfo: (payload) => {
      if (payload.players && Array.isArray(payload.players)) {
        debugLogPlayers('LobbyInfo/raw', payload.players);
        const serverPlayers = mapServerPlayers(payload.players);
        debugLogPlayers('LobbyInfo/mapped', serverPlayers as any);
        setPlayers(serverPlayers);
        try {
          const raw = localStorage.getItem(sessionKeyFor(joinCode));
          const session = raw ? JSON.parse(raw) : null;
          const sessionId = session?.playerId;
          const sessionName = session?.userName;
          const found = serverPlayers.find(p => (sessionId && String(p.id) === String(sessionId)) || (sessionName && p.name && p.name.toUpperCase() === sessionName.toUpperCase()));
          if (found) setCurrentPlayer(found);
        } catch {}
      }
      if (payload.players && Array.isArray(payload.players) && payload.players.length && initializing) setInitializing(false);
    },
    onLobbyUpdate: (payload) => {
      if (payload && Array.isArray(payload.players)) {
        debugLogPlayers('LobbyUpdate/raw', payload.players);
        const serverPlayers = mapServerPlayers(payload.players);
        debugLogPlayers('LobbyUpdate/mapped', serverPlayers as any);
        setPlayers(serverPlayers);
      }
      if (payload && Array.isArray(payload.players) && payload.players.length && initializing) setInitializing(false);
    },
    onPlayerJoined: (payload) => {
      if (payload && Array.isArray(payload.players)) {
        debugLogPlayers('PlayerJoined/raw', payload.players);
        const serverPlayers = mapServerPlayers(payload.players);
        debugLogPlayers('PlayerJoined/mapped', serverPlayers as any);
        setPlayers(serverPlayers);
      }
    },
    onGameStarted: (payload) => {
      const startedGameId = payload?.gameId || gameId;
      router.push(`/question?gameId=${encodeURIComponent(startedGameId)}&name=${encodeURIComponent(playerName)}&questionNumber=1`);
    },
    onError: (msg) => {
      const text = typeof msg === 'string' ? msg : (msg && (msg as any).message) || 'Connection error';
      setError(text);
      if (initializing) setInitializing(false);
    },
  });

  const isActualGameId = gameId && gameId.length > 10;
  const { game, error: gameError } = useGame(isActualGameId ? gameId : null);
  const { questions, error: questionsError } = useQuestions(isActualGameId ? gameId : null);

  // Clear previous local results for this player
  useEffect(() => {
    if (!playerName) return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        const norm = playerName.toUpperCase();
        if (key === `results:${gameId}:${norm}` || key.startsWith(`resultq:${gameId}:${norm}:`)) {
          localStorage.removeItem(key);
          i = -1; // restart scan
        }
      }
    } catch {}
  }, [playerName, gameId]);

  // Join logic with retry
  useEffect(() => {
    if (!joinCode || !playerName) return undefined;
    let cancelled = false;
    const attemptJoin = async (attempt = 1) => {
      try {
        await ensureConnected();
        if (cancelled || didJoinRef.current) return;
        if (!client || (client as any).state !== 'Connected') {
          if (attempt <= 5) setTimeout(() => attemptJoin(attempt + 1), 300 * attempt);
          return;
        }
        didJoinRef.current = true;
        let playerId: string | null = null;
        try {
          const raw = localStorage.getItem(sessionKeyFor(joinCode));
          const session = raw ? JSON.parse(raw) : null;
          const storedName = (session?.userName || '').toUpperCase();
          if (session?.playerId && storedName === playerName.toUpperCase()) {
            playerId = session.playerId;
          }
        } catch {}
        await joinGame(joinCode, playerName.toUpperCase(), playerId ?? null);
        setTimeout(() => { if (initializing) setInitializing(false); }, 1500);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Join attempt failed', err);
        if (attempt <= 5 && !cancelled) setTimeout(() => attemptJoin(attempt + 1), 400 * attempt);
        else if (initializing) setInitializing(false);
      }
    };
    attemptJoin();
    return () => { cancelled = true; };
  }, [joinCode, playerName, ensureConnected, joinGame, client, initializing]);

  // Safety timeout
  useEffect(() => {
    if (!initializing) return undefined;
    const t = setTimeout(() => { if (initializing) setInitializing(false); }, 5000);
    return () => clearTimeout(t);
  }, [initializing]);

  // Countdown auto-start (only if we have local questions set etc.)
  useEffect(() => {
    if (game && game.state === GameState.Ready && questions && questions.length > 0 && !error) {
      const t = setInterval(() => setCountdown(prev => prev - 1), 1000);
      return () => clearInterval(t);
    }
    return undefined;
  }, [game, questions, error]);

  useEffect(() => {
    const totalQuestions = gameInfo?.totalQuestions || questions?.length || 0;
    if (countdown === 0 && totalQuestions > 0) {
      const timeoutId = setTimeout(() => {
        router.push(`/question?gameId=${encodeURIComponent(gameId)}&name=${encodeURIComponent(playerName)}&questionNumber=1`);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [countdown, router, gameId, playerName, gameInfo, questions]);

  // Show informational banner if game not ready or questions missing / waiting on more players
  useEffect(() => {
    if (initializing) { setShowWaitingInfo(false); return; }
    const gameReady = game && game.state === GameState.Ready;
    const hasQuestions = !!(questions && questions.length > 0);
    const canCountdown = gameReady && hasQuestions && players.length > 0;
    if (!canCountdown) {
      const t = setTimeout(() => setShowWaitingInfo(true), 800);
      return () => clearTimeout(t);
    }
    setShowWaitingInfo(false);
    return undefined;
  }, [initializing, game, questions, players]);

  // No placeholders for empty slots when max slots are not fixed

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GameHeader title="GAME LOBBY" withSvgBorder />
        <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-gray-200 max-w-sm w-full text-center">
            <div className="mb-6">
              <div className="mx-auto mb-4 w-14 h-14 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-xl font-bold text-gray-900 tracking-wide uppercase">CONNECTING</h2>
              <div className="w-12 h-1 bg-red-600 mx-auto mt-3" />
            </div>
            <p className="text-sm text-gray-600 font-medium">{connected ? 'Joining room…' : 'Negotiating secure connection…'}</p>
            <p className="text-xs text-gray-400 mt-4">Room: {joinCode || '—'} • Player: {playerName || '—'}</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || (isActualGameId && (gameError || questionsError))) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GameHeader title="GAME LOBBY" withSvgBorder />
        <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 border-2 border-red-200 text-center">
            <h2 className="text-2xl font-bold text-red-600 uppercase tracking-wide mb-4">ERROR</h2>
            <div className="w-16 h-1 bg-red-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-6">{error || gameError || questionsError}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-red-600 text-white rounded font-bold uppercase tracking-wide hover:bg-red-700 transition-colors"
            >
              BACK TO HOME
            </button>
          </div>
        </main>
      </div>
    );
  }

  const hideScroll = players.length <= 8; // hide scrollbar when not many players

  return (
    <div className="min-h-screen bg-gray-50">
      <GameHeader
        title="GAME LOBBY"
        withSvgBorder
        rightContent={
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 uppercase tracking-wide">WAITING ROOM</div>
            <div className="text-sm text-gray-600 font-medium">Room Code: {roomCode || gameId}</div>
            {(gameInfo?.gameTitle || game?.title) && (
              <div className="text-xs text-gray-500 mt-1">{gameInfo?.gameTitle || game?.title}</div>
            )}
          </div>
        }
      />
      <main className={`px-6 py-6 min-h-[calc(100vh-120px)] ${hideScroll ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide mb-4">PARTICIPANTS</h2>
          <div className="w-16 h-1 bg-red-600 mx-auto" />
        </div>
        <div className="mt-8 text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                try { if (client && (client as any).stop) (client as any).stop(); } catch {}
                router.push('/');
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              🚪 Leave Room
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto mt-6">
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
          {players.map((player) => {
            const isCurrent = currentPlayer && ((player.id && currentPlayer.id && String(player.id) === String(currentPlayer.id)) || (player.name && currentPlayer.name && player.name.toUpperCase() === currentPlayer.name.toUpperCase()));
            return (
              <div key={player.id} className={`bg-white rounded-lg p-4 shadow-lg border-2 ${isCurrent ? 'border-green-400' : 'border-gray-200'} hover:border-red-600 transition-colors`}>
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center border-2 border-gray-200">
                  <div className={`w-16 h-16 ${player.avatar.color} rounded-full flex items-center justify-center text-white text-lg font-bold`}>
                    {player.avatar.initials}
                  </div>
                </div>
                <div className="text-sm text-center">
                  <div className="font-bold text-gray-900 truncate uppercase tracking-wide text-xs">{player.name}{isCurrent ? ' (You)' : ''}</div>
                  <div className="text-gray-500 font-medium mt-1">{player.id}</div>
                </div>
              </div>
            );
          })}
        </div>
        {players.length > 0 && game && questions && questions.length > 0 && (
          <div className="mt-12 text-center bg-white rounded-lg p-6 shadow-lg border-2 border-gray-200 max-w-md mx-auto">
            <div className="text-sm text-gray-600 mb-2 font-medium uppercase tracking-wide">{players.length} participant{players.length !== 1 ? 's' : ''} ready</div>
            <div className="w-12 h-1 bg-red-600 mx-auto mb-4" />
            <div className="text-2xl font-bold text-red-600 uppercase tracking-wide">START IN {countdown}S</div>
            <div className="text-xs text-gray-500 mt-2">{questions.length} question{questions.length !== 1 ? 's' : ''} ready</div>
          </div>
        )}
        {game && (!questions || questions.length === 0) && (
          <div className="mt-12 text-center bg-yellow-50 rounded-lg p-6 shadow-lg border-2 border-yellow-200 max-w-md mx-auto">
            <div className="text-sm text-yellow-800 mb-2 font-medium uppercase tracking-wide">WAITING FOR QUESTIONS</div>
            <div className="w-12 h-1 bg-yellow-600 mx-auto mb-4" />
            <div className="text-lg font-bold text-yellow-800 uppercase tracking-wide">GAME NOT READY</div>
            <div className="text-xs text-yellow-600 mt-2">The game host needs to add questions before starting</div>
          </div>
        )}
        {showWaitingInfo && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md bg-green-600 text-indigo-50 shadow-xl rounded-xl px-5 py-4 border border-indigo-400/50 backdrop-blur-md" role="status" aria-live="polite">
            <p className="text-sm font-semibold tracking-wide">Waiting for other players to join…</p>
            <p className="text-xs mt-1 opacity-90">The host will start the game when everyone is ready.</p>
            {players.length > 0 && (
              <p className="text-[11px] mt-2 opacity-75">Current players: {players.length}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

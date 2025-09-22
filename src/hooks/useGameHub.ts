"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { getGameHub, ensureStarted } from '@/lib/gameHub';
import type { HubEventPayloads, HubEventHandlerProps } from '@/types/hub-events';

// Derive internal handlers type from HubEventHandlerProps while preserving backwards compatibility
type Handlers = HubEventHandlerProps & {
  onError?: (msg: string) => void; // keep explicit string form for convenience
};

export function useGameHub(handlers: Handlers = {}) {
  const connRef = useRef<ReturnType<typeof getGameHub> | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Handlers>({});
  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  const connection = useMemo(() => {
    if (!connRef.current) { connRef.current = getGameHub(); }
    return connRef.current;
  }, []);

  useEffect(() => {
    let mounted = true;
    const c = connection;
    try {
      (c as any).onreconnecting?.(() => { if (mounted) setConnected(false); });
      (c as any).onreconnected?.(() => { if (mounted) setConnected(true); });
      (c as any).onclose?.(() => { if (mounted) setConnected(false); });
    } catch {}

    const off = (name: string) => c.off(name as any);
    const on = <K extends keyof HubEventPayloads>(name: K | string, fn?: (p: HubEventPayloads[K]) => void) => {
      if (fn) c.on(name as any, fn as any); else c.off(name as any);
    };

    const attach = <K extends keyof HubEventPayloads>(event: K) => {
      const prop = `on${event}` as keyof Handlers;
      on(event, (p: HubEventPayloads[K]) => (handlersRef.current as any)[prop]?.(p));
    };

    // Known events list
    const events: (keyof HubEventPayloads | string)[] = [
      'Error','RoomCreated','JoinedGame','PlayerJoined','LobbyInfo','LobbyUpdate','GameStarted','gamestarted','NewQuestion','HostNewQuestion','AnswerSubmitted','PlayerQuestionResult','QuestionTimeEnded','QuestionResults','ProceedingToNextQuestion','FinalResults','GameEnded','RoomStatus','PlayerDisconnected','HostDisconnected','RoomClosed','KickedFromGame','ReconnectState','AllPlayersAnswered','PlayerProgress','error'
    ];

    // Attach using typed helper when possible
    (['Error','RoomCreated','JoinedGame','PlayerJoined','LobbyInfo','LobbyUpdate','GameStarted','NewQuestion','HostNewQuestion','AnswerSubmitted','PlayerQuestionResult','QuestionTimeEnded','QuestionResults','ProceedingToNextQuestion','FinalResults','GameEnded','RoomStatus','PlayerDisconnected','HostDisconnected','RoomClosed','KickedFromGame','ReconnectState','AllPlayersAnswered','PlayerProgress'] as (keyof HubEventPayloads)[]).forEach(e => attach(e));
    // Extra lowercase alias
    on('gamestarted', (p: any) => (handlersRef.current as any).onGameStarted?.(p));
    on('error', (p: any) => (handlersRef.current as any).onError?.(typeof p === 'string' ? p : (p?.message || 'Error')));

    const startIfNeeded = async () => {
      try { await ensureStarted(c); if (mounted) setConnected(true); } catch (err) { if (mounted) setConnected(false); handlersRef.current.onError?.((err as Error)?.message || 'Failed to connect'); }
    };
    startIfNeeded();

    return () => {
      mounted = false;
      try { (c as any).onreconnecting?.(null); (c as any).onreconnected?.(null); (c as any).onclose?.(null); } catch {}
      events.forEach(e => off(e as string));
    };
  }, [connection]);

  return {
    connected,
    client: connection,
    ensureConnected: () => ensureStarted(connection),
    createGameRoom: async (gameId: string, autoShowResults = true) => { await ensureStarted(connection); return connection.invoke('CreateGameRoom', gameId, autoShowResults); },
    joinGame: async (roomCode: string, userName: string, playerId?: string | null) => { await ensureStarted(connection); return connection.invoke('JoinGame', roomCode, userName, playerId ?? null); },
    startGame: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('StartGame', roomCode); },
    submitAnswer: async (answerId: string) => { await ensureStarted(connection); return connection.invoke('SubmitAnswer', answerId); },
    submitMultipleAnswers: async (answerIds: string[]) => { await ensureStarted(connection); return connection.invoke('SubmitMultipleAnswers', answerIds); },
    requestRoomStatus: async (roomCode?: string) => {
      await ensureStarted(connection);
      const candidates = ['GetRoomStatus', 'GetLobbyInfo', 'GetRoomInfo'];
      let lastErr: any = null;
      for (const m of candidates) {
        try {
          if (roomCode !== undefined) { return await connection.invoke(m, roomCode); }
          return await connection.invoke(m);
        } catch (err) {
          lastErr = err;
          const msg = String((err as any)?.message || err || '').toLowerCase();
          if (msg.includes('method does not exist') || msg.includes('no method')) continue;
          throw err;
        }
      }
      throw lastErr;
    },
    proceedToNextQuestion: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('ProceedToNextQuestion', roomCode); },
    showFinalLeaderboard: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('ShowFinalLeaderboard', roomCode); },
  };
}



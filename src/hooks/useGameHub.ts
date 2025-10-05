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
  const pendingRoomResolvers = useRef<((rc: string)=>void)[]>([]); // always non-null
  const statusMethodRef = useRef<string | null>(null); // cache first successful status method

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

    // Known events list (excluding RoomCreated for custom logic below)
    const baseEvents: (keyof HubEventPayloads | string)[] = [
      'Error','JoinedGame','PlayerJoined','LobbyInfo','LobbyUpdate','GameStarted','gamestarted','NewQuestion','HostNewQuestion','AnswerSubmitted','PlayerQuestionResult','QuestionTimeEnded','QuestionResults','ProceedingToNextQuestion','FinalResults','GameEnded','RoomStatus','PlayerDisconnected','HostDisconnected','RoomClosed','KickedFromGame','ReconnectState','AllPlayersAnswered','PlayerProgress'
    ];

    (['Error','JoinedGame','PlayerJoined','LobbyInfo','LobbyUpdate','GameStarted','NewQuestion','HostNewQuestion','AnswerSubmitted','PlayerQuestionResult','QuestionTimeEnded','QuestionResults','ProceedingToNextQuestion','FinalResults','GameEnded','RoomStatus','PlayerDisconnected','HostDisconnected','RoomClosed','KickedFromGame','ReconnectState','AllPlayersAnswered','PlayerProgress'] as (keyof HubEventPayloads)[]).forEach(e => attach(e));
    // Custom RoomCreated handling to resolve pending promises
    on('RoomCreated', (p: any) => {
      try {
        const code = p?.roomCode || p?.code || '';
        if (code && pendingRoomResolvers.current.length) {
          pendingRoomResolvers.current.forEach(r => r(code));
          pendingRoomResolvers.current = [];
        }
      } catch {}
      (handlersRef.current as any).onRoomCreated?.(p);
    });
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
      baseEvents.forEach(e => off(e as string));
    };
  }, [connection]);

  return {
    connected,
    client: connection,
    ensureConnected: () => ensureStarted(connection),
    createGameRoom: async (gameId: string, autoShowResults = true): Promise<string> => {
      await ensureStarted(connection);
      const eventPromise = new Promise<string>(resolve => {
        pendingRoomResolvers.current.push(resolve);
      });
      let invokeResult: any;
      try {
        invokeResult = await connection.invoke('CreateGameRoom', gameId, autoShowResults);
      } catch (err) {
        // if invoke fails, clear pending resolvers
        pendingRoomResolvers.current = [];
        throw err;
      }
      // If server directly returns room code/object with code use it, else wait for event
      if (typeof invokeResult === 'string' && invokeResult.trim()) {
        const code = invokeResult.trim();
        pendingRoomResolvers.current.forEach(r => r(code));
        pendingRoomResolvers.current = [];
        return code;
      }
      if (invokeResult && typeof invokeResult === 'object') {
        const code = invokeResult.roomCode || invokeResult.code;
        if (code) {
          pendingRoomResolvers.current.forEach(r => r(code));
            pendingRoomResolvers.current = [];
          return code;
        }
      }
      // Fallback: wait up to 5s for event
      const timeoutPromise = new Promise<string>(resolve => setTimeout(() => resolve(''), 5000));
      return Promise.race([eventPromise, timeoutPromise]);
    },
    joinGame: async (roomCode: string, userName: string, playerId?: string | null) => { await ensureStarted(connection); return connection.invoke('JoinGame', roomCode, userName, playerId ?? null); },
    startGame: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('StartGame', roomCode); },
    submitAnswer: async (answerId: string) => { await ensureStarted(connection); return connection.invoke('SubmitAnswer', answerId); },
    submitMultipleAnswers: async (answerIds: string[]) => { await ensureStarted(connection); return connection.invoke('SubmitMultipleAnswers', answerIds); },
    requestRoomStatus: async (roomCode?: string) => {
      await ensureStarted(connection);

      // If we have a cached successful method, try it first
      if (statusMethodRef.current) {
        const m = statusMethodRef.current;
        try {
          if (typeof roomCode !== 'undefined') {
            return await connection.invoke(m, roomCode);
          }
          return await connection.invoke(m);
        } catch (err) {
          // If cached method now fails because it no longer exists, clear cache and continue
          const msg = String((err as any)?.message || '').toLowerCase();
            if (msg.includes('does not exist') || msg.includes('no method') || msg.includes('could not find')) {
              statusMethodRef.current = null;
            } else {
              // Non-missing error -> rethrow
              throw err;
            }
        }
      }

      // Candidate hub methods (exclude event names like LobbyInfo / RoomStatus to avoid invoke errors)
      const methodCandidates = [ 'GetRoomStatus','GetLobbyInfo','GetRoom','GetLobby' ];
      let lastErr: any = null;
      for (const m of methodCandidates) {
        const variants: (()=>Promise<any>)[] = [];
        if (typeof roomCode !== 'undefined') variants.push(() => connection.invoke(m, roomCode));
        variants.push(() => connection.invoke(m));
        for (const call of variants) {
          try {
            const res = await call();
            statusMethodRef.current = m; // cache
            return res;
          } catch (err) {
            lastErr = err;
            const msg = String((err as any)?.message || '').toLowerCase();
            if (msg.includes('does not exist') || msg.includes('no method') || msg.includes('could not find')) {
              continue; // try next method
            }
            // Non-missing error: continue trying others but keep lastErr
            continue;
          }
        }
      }
      if (lastErr) {
        const msg = String((lastErr as any)?.message || '').toLowerCase();
        if (msg.includes('does not exist') || msg.includes('no method') || msg.includes('could not find')) {
          return; // swallow missing-method only cases
        }
        throw lastErr;
      }
    },
    proceedToNextQuestion: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('ProceedToNextQuestion', roomCode); },
    showFinalLeaderboard: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('ShowFinalLeaderboard', roomCode); },
  };
}



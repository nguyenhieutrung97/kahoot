"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { getGameHub, ensureStarted } from '@/lib/gameHub';
import type { HubEventPayloads, HubEventHandlerProps } from '@/types/hub-events';

// Derive internal handlers type from HubEventHandlerProps while preserving backwards compatibility
type Handlers = HubEventHandlerProps & {
  onError?: (msg: string) => void; // keep explicit string form for convenience
  onReconnected?: () => void; // NEW: fire when SignalR fully reconnected
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
      (c as any).onreconnected?.(() => { if (mounted) { setConnected(true); try { handlersRef.current.onReconnected?.(); } catch {} } });
      (c as any).onclose?.(() => { if (mounted) setConnected(false); });
    } catch {}

    const off = (name: string) => c.off(name as any);
    const on = <K extends keyof HubEventPayloads>(name: K | string, fn?: (p: HubEventPayloads[K]) => void) => {
      if (fn) c.on(name as any, fn as any); else c.off(name as any);
    };

    const attach = <K extends keyof HubEventPayloads>(event: K) => {
      const prop = `on${event}` as keyof Handlers;
      on(event, (p: HubEventPayloads[K]) => (handlersRef.current as any)[prop]?.(p));
      return event as string;
    };

    // Maintain a list of actually attached events for proper cleanup
    const attached: string[] = [];

    const baseEvents: (keyof HubEventPayloads)[] = [
      'Error','JoinedGame','PlayerJoined','LobbyInfo','LobbyUpdate','GameStarted','NewQuestion','HostNewQuestion','AnswerSubmitted','PlayerQuestionResult','QuestionTimeEnded','QuestionResults','ProceedingToNextQuestion','FinalResults','GameEnded','RoomStatus','PlayerDisconnected','HostDisconnected','RoomClosed','KickedFromGame','ReconnectState','AllPlayersAnswered','PlayerProgress'
    ];
    baseEvents.forEach(e => attached.push(attach(e)));

    // Custom events / aliases
    on('RoomCreated', (p: any) => {
      try {
        const code = p?.roomCode || p?.code || '';
        if (code && pendingRoomResolvers.current.length) {
          const resolvers = [...pendingRoomResolvers.current];
          pendingRoomResolvers.current = []; // clear first to avoid double resolve
          resolvers.forEach(r => r(code));
        }
      } catch {}
      (handlersRef.current as any).onRoomCreated?.(p);
    }); attached.push('RoomCreated');
    on('gamestarted', (p: any) => (handlersRef.current as any).onGameStarted?.(p)); attached.push('gamestarted');
    on('error', (p: any) => (handlersRef.current as any).onError?.(typeof p === 'string' ? p : (p?.message || 'Error'))); attached.push('error');

    const startIfNeeded = async () => {
      try { await ensureStarted(c); if (mounted) setConnected(true); } catch (err) { if (mounted) setConnected(false); handlersRef.current.onError?.((err as Error)?.message || 'Failed to connect'); }
    };
    startIfNeeded();

    return () => {
      mounted = false;
      try { (c as any).onreconnecting?.(null); (c as any).onreconnected?.(null); (c as any).onclose?.(null); } catch {}
      attached.forEach(ev => off(ev));
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
      let resolved = false;
      const resolveAll = (code: string) => {
        if (resolved) return; // guard double resolve
        resolved = true;
        const resolvers = [...pendingRoomResolvers.current];
        pendingRoomResolvers.current = [];
        resolvers.forEach(r => r(code));
      };
      let invokeResult: any;
      try {
        invokeResult = await connection.invoke('CreateGameRoom', gameId, autoShowResults);
      } catch (err) {
        pendingRoomResolvers.current = [];
        throw err;
      }
      if (typeof invokeResult === 'string' && invokeResult.trim()) {
        resolveAll(invokeResult.trim());
        return invokeResult.trim();
      }
      if (invokeResult && typeof invokeResult === 'object') {
        const code = invokeResult.roomCode || invokeResult.code;
        if (code) { resolveAll(code); return code; }
      }
      const timeoutPromise = new Promise<string>(resolve => setTimeout(() => resolve(''), 5000));
      return Promise.race([eventPromise, timeoutPromise]);
    },
    joinGame: async (roomCode: string, userName: string, playerId?: string | null) => { await ensureStarted(connection); return connection.invoke('JoinGame', roomCode, userName, playerId ?? null); },
    startGame: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('StartGame', roomCode); },
    submitAnswer: async (answerId: string) => { await ensureStarted(connection); return connection.invoke('SubmitAnswer', answerId); },
    submitMultipleAnswers: async (answerIds: string[]) => { await ensureStarted(connection); return connection.invoke('SubmitMultipleAnswers', answerIds); },
    requestRoomStatus: async (roomCode?: string): Promise<any> => {
      await ensureStarted(connection);
      const missingPattern = (msg: string) => {
        const lower = msg.toLowerCase();
        return lower.includes('does not exist') || lower.includes('no method') || lower.includes('could not find');
      };
      if (statusMethodRef.current) {
        try {
          return await (typeof roomCode !== 'undefined' ? connection.invoke(statusMethodRef.current, roomCode) : connection.invoke(statusMethodRef.current));
        } catch (err: any) {
          const msg = String(err?.message || '');
            if (missingPattern(msg)) statusMethodRef.current = null; else throw err;
        }
      }
      const methodCandidates = [ 'GetRoomStatus','GetLobbyInfo','GetRoom','GetLobby' ];
      let lastErr: any = null;
      for (const m of methodCandidates) {
        const calls: (()=>Promise<any>)[] = [];
        if (typeof roomCode !== 'undefined') calls.push(() => connection.invoke(m, roomCode));
        calls.push(() => connection.invoke(m));
        for (const attempt of calls) {
          try {
            const res = await attempt();
            statusMethodRef.current = m;
            return { ok: true, method: m, data: res };
          } catch (err) {
            lastErr = err;
            const msg = String((err as any)?.message || '');
            if (missingPattern(msg)) continue; // try next method
          }
        }
      }
      if (lastErr) {
        const msg = String(lastErr?.message || '');
        if (missingPattern(msg)) return { ok: false, reason: 'missing-methods' };
        return { ok: false, reason: 'error', error: msg };
      }
      return { ok: false, reason: 'unknown' };
    },
    proceedToNextQuestion: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('ProceedToNextQuestion', roomCode); },
    showFinalLeaderboard: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('ShowFinalLeaderboard', roomCode); },
  };
}



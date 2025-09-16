"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { getGameHub, ensureStarted } from '@/lib/gameHub';

type Handlers = {
  onError?: (msg: string) => void;
  onRoomCreated?: (payload: any) => void;
  onJoinedGame?: (payload: any) => void;
  onPlayerJoined?: (payload: any) => void;
  onLobbyInfo?: (payload: any) => void;
  onLobbyUpdate?: (payload: any) => void;
  onGameStarted?: (payload: any) => void;
  onNewQuestion?: (payload: any) => void;
  onHostNewQuestion?: (payload: any) => void;
  onAnswerSubmitted?: (payload: any) => void;
  onPlayerQuestionResult?: (payload: any) => void;
  onQuestionTimeEnded?: (payload: any) => void;
  onQuestionResults?: (payload: any) => void;
  onProceedingToNextQuestion?: (payload: any) => void;
  onFinalResults?: (payload: any) => void;
  onGameEnded?: (payload: any) => void; // NEW
  onRoomStatus?: (payload: any) => void;
  onPlayerDisconnected?: (payload: any) => void;
  onHostDisconnected?: (payload: any) => void;
  onRoomClosed?: (payload: any) => void;
  onKickedFromGame?: (payload: any) => void;
  onReconnectState?: (payload: any) => void;
  onAllPlayersAnswered?: (payload: any) => void;
  onPlayerProgress?: (payload: any) => void;
};

export function useGameHub(handlers: Handlers = {}) {
  const connRef = useRef<ReturnType<typeof getGameHub> | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Handlers>({});
  // Keep latest handlers without resubscribing
  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  const connection = useMemo(() => {
    if (!connRef.current) {
      connRef.current = getGameHub();
    }
    return connRef.current;
  }, []);

  // Register handlers once, then start once
  useEffect(() => {
    let mounted = true;
    const c = connection;
    const off = (name: string) => c.off(name as any);
    const on = (name: string, fn?: (p: any) => void) => {
      if (fn) c.on(name as any, fn as any); else c.off(name as any);
    };

    const proxy = (key: keyof Handlers) => (p: any) => handlersRef.current[key]?.(p);

    on('Error', proxy('onError'));
    on('error', proxy('onError'));
    on('RoomCreated', proxy('onRoomCreated'));
    on('JoinedGame', proxy('onJoinedGame'));
    on('PlayerJoined', proxy('onPlayerJoined'));
    on('LobbyInfo', proxy('onLobbyInfo'));
    on('LobbyUpdate', proxy('onLobbyUpdate'));
    on('GameStarted', proxy('onGameStarted'));
    on('gamestarted', proxy('onGameStarted')); // Backend sends lowercase
    on('NewQuestion', proxy('onNewQuestion'));
    on('HostNewQuestion', proxy('onHostNewQuestion'));
    on('AnswerSubmitted', proxy('onAnswerSubmitted'));
    on('PlayerQuestionResult', proxy('onPlayerQuestionResult'));
    on('QuestionTimeEnded', proxy('onQuestionTimeEnded'));
    on('QuestionResults', proxy('onQuestionResults'));
    on('ProceedingToNextQuestion', proxy('onProceedingToNextQuestion'));
    on('FinalResults', proxy('onFinalResults'));
    on('GameEnded', proxy('onGameEnded')); // NEW subscription
    on('RoomStatus', proxy('onRoomStatus'));
    on('PlayerDisconnected', proxy('onPlayerDisconnected'));
    on('HostDisconnected', proxy('onHostDisconnected'));
    on('RoomClosed', proxy('onRoomClosed'));
    on('KickedFromGame', proxy('onKickedFromGame'));
    on('ReconnectState', proxy('onReconnectState'));
    on('AllPlayersAnswered', proxy('onAllPlayersAnswered'));
    on('PlayerProgress', proxy('onPlayerProgress'));

    const startIfNeeded = async () => {
      try {
        await ensureStarted(c);
        if (mounted) setConnected(true);
      } catch (err) {
        handlersRef.current.onError?.((err as Error)?.message || 'Failed to connect');
      }
    };
    // Start after handlers are attached to catch early server messages
    startIfNeeded();

    return () => {
      mounted = false;
      off('Error');
      off('RoomCreated');
      off('JoinedGame');
      off('PlayerJoined');
      off('LobbyInfo');
      off('LobbyUpdate');
      off('GameStarted');
      off('gamestarted');
      off('NewQuestion');
      off('HostNewQuestion');
      off('AnswerSubmitted');
      off('PlayerQuestionResult');
      off('QuestionTimeEnded');
      off('QuestionResults');
      off('ProceedingToNextQuestion');
      off('FinalResults');
      off('GameEnded'); // NEW cleanup
      off('RoomStatus');
      off('PlayerDisconnected');
      off('HostDisconnected');
      off('RoomClosed');
      off('KickedFromGame');
      off('ReconnectState');
      off('AllPlayersAnswered');
      off('PlayerProgress');
      off('error');
      // Only stop when unmounting page, not during re-renders (this effect runs once)
      // Optional: stop when truly leaving app. Avoid stopping during fast refresh
      // if (c.state === 'Connected' || c.state === 'Connecting') c.stop().catch(() => {});
    };
  }, [connection]);

  return {
    connected,
    client: connection,
    ensureConnected: () => ensureStarted(connection),
    // server actions (ensure hub started before invoking to avoid 'not Connected' errors)
    createGameRoom: async (gameId: string, autoShowResults = true) => {
      await ensureStarted(connection); return connection.invoke('CreateGameRoom', gameId, autoShowResults);
    },
    joinGame: async (roomCode: string, userName: string) => {
      await ensureStarted(connection); return connection.invoke('JoinGame', roomCode, userName);
    },
    startGame: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('StartGame', roomCode); },
    submitAnswer: async (answerId: string) => { await ensureStarted(connection); return connection.invoke('SubmitAnswer', answerId); },
    submitMultipleAnswers: async (answerIds: string[]) => { await ensureStarted(connection); return connection.invoke('SubmitMultipleAnswers', answerIds); },
    requestRoomStatus: async (roomCode?: string) => {
      await ensureStarted(connection);
      const candidates = ['GetRoomStatus', 'GetLobbyInfo', 'GetRoomInfo'];
      let lastErr: any = null;
      for (const m of candidates) {
        try {
          if (roomCode !== undefined) {
            return await connection.invoke(m, roomCode);
          }
          return await connection.invoke(m);
        } catch (err) {
          lastErr = err;
          const msg = String((err as any)?.message || err || '').toLowerCase();
            if (msg.includes('method does not exist') || msg.includes('no method')) {
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    },
    proceedToNextQuestion: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('ProceedToNextQuestion', roomCode); },
    showFinalLeaderboard: async (roomCode: string) => { await ensureStarted(connection); return connection.invoke('ShowFinalLeaderboard', roomCode); },
  };
}



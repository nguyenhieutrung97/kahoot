"use client";
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { getHubClient } from '@/lib/HubClient';
import type { HubEventPayloads } from '@/types/hub-events';

interface Player { userId?: string; userName?: string; score?: number; rank?: number; }
interface Question { index?: number; questionText?: string; timeLimitSeconds?: number; type?: string; answers?: any[]; }

interface GameSessionState {
  roomCode?: string;
  players: Player[];
  question?: Question;
  phase: 'idle' | 'lobby' | 'in-game' | 'finished';
  finalResults?: any;
  error?: string;
}

const initialState: GameSessionState = { players: [], phase: 'idle' };

type Action =
  | { type: 'ROOM_CREATED'; payload: HubEventPayloads['RoomCreated'] }
  | { type: 'JOINED_GAME'; payload: HubEventPayloads['JoinedGame'] }
  | { type: 'PLAYER_JOINED'; payload: HubEventPayloads['PlayerJoined'] }
  | { type: 'GAME_STARTED'; payload: HubEventPayloads['GameStarted'] }
  | { type: 'NEW_QUESTION'; payload: HubEventPayloads['NewQuestion'] }
  | { type: 'FINAL_RESULTS'; payload: HubEventPayloads['FinalResults'] }
  | { type: 'GAME_ENDED'; payload: HubEventPayloads['GameEnded'] }
  | { type: 'ERROR'; payload: string };

function reducer(state: GameSessionState, action: Action): GameSessionState {
  switch (action.type) {
    case 'ROOM_CREATED':
      return { ...state, roomCode: action.payload.roomCode, phase: 'lobby' };
    case 'JOINED_GAME':
      return { ...state, roomCode: action.payload.roomCode ?? state.roomCode, players: action.payload.players ?? state.players, phase: 'lobby' };
    case 'PLAYER_JOINED':
      return { ...state, players: mergePlayer(state.players, action.payload), phase: state.phase === 'idle' ? 'lobby' : state.phase };
    case 'GAME_STARTED':
      return { ...state, phase: 'in-game' };
    case 'NEW_QUESTION':
      return { ...state, question: { index: action.payload.index ?? action.payload.questionIndex, questionText: action.payload.questionText ?? action.payload.question?.title, timeLimitSeconds: action.payload.timeLimitSeconds, type: action.payload.type, answers: action.payload.answers ?? action.payload.choices }, phase: 'in-game' };
    case 'FINAL_RESULTS':
      return { ...state, finalResults: action.payload, phase: 'finished' };
    case 'GAME_ENDED':
      return { ...state, phase: 'finished' };
    case 'ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

function mergePlayer(list: Player[], payload: any): Player[] {
  if (!payload) return list;
  const id = payload.userId || payload.playerId || payload.id;
  if (!id) return list;
  const existing = list.find(p => p.userId === id);
  const updated: Player = {
    userId: id,
    userName: payload.userName || payload.name,
    score: payload.score,
    rank: payload.rank || payload.currentRank
  };
  if (existing) return list.map(p => p.userId === id ? { ...p, ...updated } : p);
  return [...list, updated];
}

const GameSessionContext = createContext<{ state: GameSessionState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export function GameSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  useEffect(() => {
    const hub = getHubClient();
    hub.start();
    const unsubs = [
      hub.on('RoomCreated', p => dispatch({ type: 'ROOM_CREATED', payload: p })),
      hub.on('JoinedGame', p => dispatch({ type: 'JOINED_GAME', payload: p })),
      hub.on('PlayerJoined', p => dispatch({ type: 'PLAYER_JOINED', payload: p })),
      hub.on('GameStarted', p => dispatch({ type: 'GAME_STARTED', payload: p })),
      hub.on('NewQuestion', p => dispatch({ type: 'NEW_QUESTION', payload: p })),
      hub.on('FinalResults', p => dispatch({ type: 'FINAL_RESULTS', payload: p })),
      hub.on('GameEnded', p => dispatch({ type: 'GAME_ENDED', payload: p })),
      hub.on('Error', p => dispatch({ type: 'ERROR', payload: typeof p === 'string' ? p : (p?.message || 'Error') }))
    ];
    return () => { unsubs.forEach(u => u()); };
  }, []);
  return <GameSessionContext.Provider value={{ state, dispatch }}>{children}</GameSessionContext.Provider>;
}

export function useGameSession() {
  const ctx = useContext(GameSessionContext);
  if (!ctx) throw new Error('useGameSession must be used within GameSessionProvider');
  return ctx.state;
}

export function useGameSessionDispatch() {
  const ctx = useContext(GameSessionContext);
  if (!ctx) throw new Error('useGameSessionDispatch must be used within GameSessionProvider');
  return ctx.dispatch;
}
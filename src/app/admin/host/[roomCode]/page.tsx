"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameHub } from '@/hooks/useGameHub';
import { GameHeader } from '@/components/ui/GameHeader';
import { Loader2, Users, Gamepad2, Timer, Trophy, ArrowLeft, Play, Crown } from 'lucide-react';

interface LobbyPlayer { id?: string; playerId?: string; userName?: string; name?: string; isConnected?: boolean; score?: number; rank?: number; progress?: any; }
interface QuestionEnvelope { questionIndex?: number; totalQuestions?: number; questionText?: string; answers?: any[]; timeLimitSeconds?: number; startTime?: string; isMultipleChoice?: boolean; correctAnswers?: any[]; correctAnswer?: any; questionType?: string; }

export default function AdminHostRoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = React.use(params);
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId') || undefined;
  const router = useRouter();

  // Log when admin host page is accessed
  console.log(`[HostPage] Admin host page accessed for room: ${roomCode}, gameId: ${gameId}`);

  const [phase, setPhase] = useState<'lobby' | 'game' | 'results'>('lobby');
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [question, setQuestion] = useState<QuestionEnvelope | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [lastResults, setLastResults] = useState<any | null>(null);
  const [finalResults, setFinalResults] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('Connecting...');
  const [canStart, setCanStart] = useState(false);
  const [autoShowResults, setAutoShowResults] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [isSessionActivated, setIsSessionActivated] = useState<boolean>(false);
  const timerRef = useRef<any>(null);
  const autoAdvanceTimerRef = useRef<any>(null);

  // First load reload mechanism to ensure clean GameHub connection
  const hasReloadedRef = useRef(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Auto-reload mechanism for connection failures
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionReloadAttempts, setConnectionReloadAttempts] = useState(0);
  const MAX_CONNECTION_RELOAD_ATTEMPTS = 3;
  const CONNECTION_TIMEOUT_MS = 10000; // 10 seconds

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  const stopAutoAdvanceTimer = () => { if (autoAdvanceTimerRef.current) { clearInterval(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; } };
  const startTimer = useCallback((payload?: QuestionEnvelope) => {
    stopTimer();
    if (!payload) return;
    let total = typeof payload.timeLimitSeconds === 'number' ? payload.timeLimitSeconds : 20;
    
    // Calculate elapsed time if startTime is provided
    if (payload.startTime) {
      const ms = Date.parse(payload.startTime);
      if (!isNaN(ms)) {
        const elapsed = (Date.now() - ms) / 1000;
        // Ensure we don't show negative time or time that's too short
        // If elapsed time is more than 80% of total time, use full time limit
        if (elapsed >= 0 && elapsed < total * 0.8) {
          total = Math.max(0, Math.round(total - elapsed));
        } else {
          // Use full time limit if elapsed time is suspicious
          total = typeof payload.timeLimitSeconds === 'number' ? payload.timeLimitSeconds : 20;
        }
      }
    }
    
    // Debug logging (remove in production)
    // console.log('Host Timer Debug:', { timeLimitSeconds: payload.timeLimitSeconds, startTime: payload.startTime, elapsed: payload.startTime ? (Date.now() - Date.parse(payload.startTime)) / 1000 : 0, finalTime: total });
    
    setTimeLeft(total);
    if (total <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return prev; if (prev <= 1) { stopTimer(); return 0; } return prev - 1;
      });
    }, 1000);
  }, []);
  useEffect(() => () => { stopTimer(); stopAutoAdvanceTimer(); }, []);

  // First load reload effect to ensure clean GameHub connection
  useEffect(() => {
    const handleFirstLoad = () => {
      // Check if this is truly the first load by looking at session storage
      const hasVisited = sessionStorage.getItem(`host-page-visited-${roomCode}`);
      
      if (!hasVisited && !hasReloadedRef.current && typeof window !== 'undefined') {
        console.log('[HostPage] First load detected, scheduling reload for better GameHub connection...');
        hasReloadedRef.current = true;
        sessionStorage.setItem(`host-page-visited-${roomCode}`, 'true');
        
        // Delay reload slightly to avoid immediate reload loop
        setTimeout(() => {
          console.log('[HostPage] Reloading page for clean GameHub connection...');
          window.location.reload();
        }, 500);
        return;
      }
      
      // If we've already visited, mark as not first load
      setIsFirstLoad(false);
      console.log('[HostPage] Not first load, proceeding with normal connection...');
    };

    handleFirstLoad();
  }, [roomCode]);

  // Connection timeout monitoring - auto reload if no connection after timeout
  useEffect(() => {
    // Don't start timeout monitoring during first load
    if (isFirstLoad) return;
    
    // Skip if we've exceeded max reload attempts
    if (connectionReloadAttempts >= MAX_CONNECTION_RELOAD_ATTEMPTS) {
      console.log('[HostPage] Max connection reload attempts reached, stopping auto-reload');
      return;
    }

    // Start connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      const status = getConnectionStatus();
      console.log('[HostPage] Connection timeout check:', status);
      
      if (!status.connected && status.state !== 'Connected') {
        const attemptNum = connectionReloadAttempts + 1;
        console.log(`[HostPage] No SignalR connection after ${CONNECTION_TIMEOUT_MS}ms, auto-reloading (attempt ${attemptNum}/${MAX_CONNECTION_RELOAD_ATTEMPTS})`);
        
        // Store attempt count in sessionStorage to persist across reloads
        sessionStorage.setItem(`connection-reload-attempts-${roomCode}`, attemptNum.toString());
        
        // Reload the page
        window.location.reload();
      } else {
        console.log('[HostPage] Connection timeout check passed - SignalR connected');
      }
    }, CONNECTION_TIMEOUT_MS);

    // Load attempt count from sessionStorage
    const storedAttempts = sessionStorage.getItem(`connection-reload-attempts-${roomCode}`);
    if (storedAttempts) {
      const attempts = parseInt(storedAttempts, 10);
      if (!isNaN(attempts) && attempts !== connectionReloadAttempts) {
        setConnectionReloadAttempts(attempts);
      }
    }

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
  }, [isFirstLoad, connectionReloadAttempts, roomCode]);

  const { ensureConnected, attachHost, startGame, proceedToNextQuestion, showFinalLeaderboard, requestRoomStatus, updateAutoShowResults, activateGameSession, getConnectionStatus, endRoomSession } = useGameHub({
    onLobbyInfo: (p: any) => { 
      setPlayers(p.players || []); 
      setCanStart(!!p.canStart || (p.players||[]).length>0); 
      setStatusMsg('Lobby active'); 
      setIsSessionActivated(true);
      if (typeof p.autoShowResults === 'boolean') setAutoShowResults(p.autoShowResults); 
    },
    onLobbyUpdate: (p: any) => { setPlayers(p.players || []); setCanStart(!!p.canStart || (p.players||[]).length>0); },
    onJoinedGame: (p: any) => {
      // Treat JoinedGame similarly to a lobby hydration event for host visibility (some flows may emit this instead of LobbyInfo)
      if (p && Array.isArray(p.players)) {
        setPlayers(prev => {
          const map = new Map<string, any>();
          prev.forEach(pl => { const k = (pl.playerId||pl.id||'').toString(); if (k) map.set(k, pl); });
          p.players.forEach((pl: any) => { const k = (pl.playerId||pl.id||'').toString(); if (k && !map.has(k)) map.set(k, normalizePlayer(pl)); });
          return Array.from(map.values());
        });
        setCanStart(true);
      }
    },
    onPlayerJoined: (p: any) => {
      const incoming = (p.players || []) as LobbyPlayer[];
      // If backend now provides players list, replace with normalized merge (preserve existing player objects w/ scores)
      if (Array.isArray(incoming) && incoming.length) {
        setPlayers(prev => {
          const index = new Map<string, LobbyPlayer>();
          prev.forEach(pl => { const key = (pl.playerId||pl.id||'').toString(); if (key) index.set(key, pl); });
          incoming.forEach(pl => {
            const key = (pl.playerId||pl.id||'').toString();
            if (!key) return;
            if (!index.has(key)) index.set(key, normalizePlayer(pl));
          });
          return Array.from(index.values());
        });
        setCanStart(true);
        return;
      }
      // Fallback: Attempt a lobby info request (prefer GetLobbyInfo) if players list absent
      (async () => { 
        try { 
          const status = await requestRoomStatus(roomCode); 
          if (status?.data?.players && Array.isArray(status.data.players)) {
            setPlayers(status.data.players.map((pl: any) => normalizePlayer(pl)));
            setCanStart((status.data.players||[]).length>0);
          }
        } catch {}
      })();
    },
    onGameStarted: () => { setPhase('game'); setStatusMsg('Game started'); setQuestion(null); setLeaderboard([]); },
    onHostNewQuestion: (payload: QuestionEnvelope) => {
      setQuestion(payload);
      setQuestionAnswers((payload.answers||[]).map((a:any,i:number)=>({ id: a.id||a.answerId||i, title: a.title||a.text||a.answer||`Answer ${i+1}`, isCorrect: !!(a.isCorrect || a.correct)})));
      setLastResults(null);
      startTimer(payload);
    },
    onQuestionResults: (payload: any) => { 
      setLastResults(payload); 
      if (Array.isArray(payload.leaderboard)) setLeaderboard(payload.leaderboard); 
      stopTimer(); 
      // Start auto-advance countdown if enabled
      if (autoShowResults) {
        setAutoAdvanceCountdown(1);
        stopAutoAdvanceTimer();
        autoAdvanceTimerRef.current = setInterval(() => {
          setAutoAdvanceCountdown(prev => {
            if (prev === null || prev <= 1) {
              stopAutoAdvanceTimer();
              // Auto-advance: either proceed to next question or show final leaderboard
              if (payload.isLastQuestion) {
                showFinalLeaderboard(roomCode);
              } else {
                proceedToNextQuestion(roomCode);
              }
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    },
    onProceedingToNextQuestion: () => { setQuestion(null); setQuestionAnswers([]); setLastResults(null); stopTimer(); stopAutoAdvanceTimer(); setAutoAdvanceCountdown(null); },
    onFinalResults: (payload: any) => { setFinalResults(payload); setPhase('results'); setStatusMsg('Final results'); },
    onGameEnded: (payload: any) => { setFinalResults(payload); setPhase('results'); setStatusMsg('Game ended'); },
    onError: (m: any) => setStatusMsg(typeof m === 'string' ? m : (m?.message || 'Error'))
  });

  // Clear connection reload attempts when successfully connected
  useEffect(() => {
    const status = getConnectionStatus();
    if (status.connected && status.state === 'Connected') {
      console.log('[HostPage] SignalR connected successfully, clearing reload attempts');
      sessionStorage.removeItem(`connection-reload-attempts-${roomCode}`);
      setConnectionReloadAttempts(0);
      
      // Clear the timeout if connection is established
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
  }, [getConnectionStatus, roomCode]);

  function normalizePlayer(raw: any): LobbyPlayer {
    if (!raw) return {};
    return {
      playerId: raw.playerId || raw.id || raw.userId || raw.connectionId || raw.PlayerId,
      userName: raw.userName || raw.name || raw.displayName || raw.UserName,
      name: raw.name || raw.userName || raw.displayName,
      isConnected: typeof raw.isConnected === 'boolean' ? raw.isConnected : (raw.connected ?? true),
      score: typeof raw.score === 'number' ? raw.score : (raw.currentScore || 0),
      rank: raw.rank,
      progress: raw.progress
    };
  }

  // Cleanup effect: End room session when host leaves
  // DISABLED: We want the room to remain active for players to join even after host navigates away
  // useEffect(() => {
  //   return () => {
  //     // Only end the room if we're in lobby phase (not during active game)
  //     if (phase === 'lobby') {
  //       endRoomSession(roomCode).catch(err => {
  //         console.warn('Failed to end room session on cleanup:', err);
  //       });
  //     }
  //   };
  // }, [phase, roomCode, endRoomSession]);

  const hostAttachedRef = useRef(false);
  const connectionAttemptsRef = useRef(0);
  const attachAttemptsRef = useRef(0);
  const orchestratingRef = useRef(false);
  const debugEnabled = typeof window !== 'undefined' && window.location.search.includes('hubDebug');
  const [debugLines, setDebugLines] = useState<string[]>([]);

  function logDebug(line: string) {
    if (!debugEnabled) return;
    setDebugLines(prev => [...prev, `${new Date().toISOString()} ${line}`].slice(-200));
    // eslint-disable-next-line no-console
    console.log('[HostDebug]', line);
  }

  useEffect(() => {
    // Don't start orchestration if we're about to reload on first load
    if (isFirstLoad) {
      console.log('[HostPage] Waiting for first load check before starting orchestration...');
      return;
    }
    
    if (orchestratingRef.current) return; // ensure single orchestrator
    orchestratingRef.current = true;
    let cancelled = false;
    let intervalId: NodeJS.Timeout | null = null;

    const tick = async () => {
      if (cancelled) return;
      if (hostAttachedRef.current) return; // done

      const status = getConnectionStatus();
      logDebug(`Connection status: ${status.state}, connected: ${status.connected}`);
      
      if (!status.connected) {
        // Force start the connection
        try {
          logDebug('Attempting ensureConnected()');
          await ensureConnected();
          logDebug('ensureConnected() resolved, checking status again...');
          
          // Wait a moment for connection to stabilize
          await new Promise(resolve => setTimeout(resolve, 100));
          const newStatus = getConnectionStatus();
          logDebug(`Post-connect status: ${newStatus.state}, connected: ${newStatus.connected}`);
          
          if (!newStatus.connected) {
            throw new Error(`Connection not established after ensureConnected(). State: ${newStatus.state}`);
          }
        } catch (err: any) {
          const attempt = ++connectionAttemptsRef.current;
          const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
          setStatusMsg(`Connecting to hub failed (attempt ${attempt}). Retrying in ${Math.round(backoff/1000)}s...`);
          logDebug(`Connection attempt ${attempt} failed: ${(err as Error)?.message}. Backoff ${backoff}ms`);
          setTimeout(tick, backoff);
          return;
        }
      }
      
      // Connected, attach host
      try {
        logDebug(`Invoking attachHost(${roomCode})`);
        await attachHost(roomCode);
        hostAttachedRef.current = true;
        setStatusMsg('Host attached. Checking room status...');
        logDebug('attachHost succeeded');
        
        // Check room status and auto-activate if needed
        const statusResult = await requestRoomStatus(roomCode);
        console.log('[HostPage] Room status result:', statusResult);
        logDebug(`Room status result: ${JSON.stringify(statusResult)}`);
        
        // If room is in Completed state (3), automatically activate it
        if (statusResult?.data?.state === 3) {
          console.log('[HostPage] Room is completed, auto-activating session...');
          logDebug('Room is completed, auto-activating session...');
          setStatusMsg('Activating game session...');
          try {
            console.log('[HostPage] Calling activateGameSession...');
            await activateGameSession(roomCode);
            console.log('[HostPage] Auto-activation succeeded');
            setStatusMsg('Game session activated - lobby ready');
            setIsSessionActivated(true);
            logDebug('Auto-activation succeeded');
          } catch (activateErr: any) {
            console.error('[HostPage] Auto-activation failed:', activateErr);
            logDebug(`Auto-activation failed: ${(activateErr as Error)?.message}`);
            setStatusMsg(`Failed to activate session: ${(activateErr as Error)?.message}`);
          }
        } else {
          console.log(`[HostPage] Room state is ${statusResult?.data?.state}, no activation needed`);
          setStatusMsg('Lobby active');
          setIsSessionActivated(true);
        }
        
        logDebug('Lobby status loaded');
        
        // Clear the polling interval once successful
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch (err: any) {
        const attempt = ++attachAttemptsRef.current;
        const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
        setStatusMsg(`AttachHost failed (attempt ${attempt}). Retrying in ${Math.round(backoff/1000)}s...`);
        logDebug(`AttachHost attempt ${attempt} failed: ${(err as Error)?.message}. Backoff ${backoff}ms`);
        setTimeout(tick, backoff);
      }
    };

    // Start immediate attempt, then set up polling
    logDebug('Starting host page orchestration');
    tick();
    
    // Also poll every 2 seconds as backup in case the connection drops
    intervalId = setInterval(() => {
      if (!hostAttachedRef.current) {
        logDebug('Polling tick - checking connection');
        tick();
      }
    }, 2000);

    return () => { 
      cancelled = true; 
      if (intervalId) clearInterval(intervalId);
      logDebug('Host page orchestration cleanup');
    };
  }, [roomCode, isFirstLoad]); // Include isFirstLoad to restart orchestration after first load check

  // Cleanup when host leaves the room (component unmount or navigation away)
  useEffect(() => {
    return () => {
      if (hostAttachedRef.current && roomCode) {
        logDebug('Host leaving room - initiating cleanup');
        // Cancel the room and remove all players when host leaves
        (async () => {
          try {
            // First try to end the room gracefully
            const status = getConnectionStatus();
            if (status.connected) {
              logDebug('Attempting to end room on host leave');
              // Call a backend method to end the room and kick all players
              await requestRoomStatus(roomCode).then(() => {
                // If we have access to an end room method, call it
                // This should set room state to Completed/Canceled and remove players
              }).catch(() => {
                // If requestRoomStatus fails, the connection might be down
                logDebug('Could not end room gracefully - connection lost');
              });
            }
          } catch (err) {
            logDebug(`Room cleanup failed: ${(err as Error)?.message}`);
          }
        })();
      }
    };
  }, [roomCode, getConnectionStatus, requestRoomStatus]);

  const handleStart = async () => { 
    try { 
      if (!isSessionActivated) {
        // First activate the session (transition from Completed to Lobby)
        await activateGameSession(roomCode);
        setStatusMsg('Game session activated - ready for players to join');
      } else {
        // Then start the game (transition from Lobby to InProgress)
        await startGame(roomCode);
      }
    } catch { 
      setStatusMsg('Operation failed'); 
    } 
  };
  const handleNext = async () => { try { await proceedToNextQuestion(roomCode); } catch { setStatusMsg('Next failed'); } };
  const handleShowFinal = async () => { try { await showFinalLeaderboard(roomCode); } catch { setStatusMsg('Show final failed'); } };
  const handleBack = () => router.push('/admin');
  const handleAutoShowResultsChange = async (checked: boolean) => {
    try {
      setAutoShowResults(checked);
      await updateAutoShowResults(roomCode, checked);
      setStatusMsg(`Auto-advance ${checked ? 'enabled' : 'disabled'}`);
    } catch (error) {
      setStatusMsg('Failed to update auto-advance setting');
      // Revert the checkbox state on error
      setAutoShowResults(!checked);
    }
  };

  const questionProgress = question ? `${question.questionIndex}/${question.totalQuestions}` : '';

  const Badge = ({ children, tone='gray'}: { children: any; tone?: 'gray'|'indigo'|'green'|'red'|'yellow' }) => {
    const map: Record<string,string> = { 
      gray:'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 shadow-sm', 
      indigo:'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-700 shadow-sm', 
      green:'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-700 shadow-sm', 
      red:'bg-gradient-to-r from-red-100 to-red-200 text-red-600 shadow-sm', 
      yellow:'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 shadow-sm'
    };
    return <span className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-300 hover:scale-105 ${map[tone]}`}>{children}</span>;
  };

  const SectionCard: React.FC<{ title: string; actions?: React.ReactNode; children: React.ReactNode; dense?: boolean; }> = ({ title, actions, children, dense }) => (
    <div className={`bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/50 rounded-2xl ${dense? 'p-6':'p-8'} shadow-xl hover:shadow-2xl transition-all duration-300 space-y-6 backdrop-blur-sm`}> 
      <div className="flex items-center justify-between gap-4 flex-wrap"> 
        <h3 className="font-semibold text-lg tracking-wide text-slate-800 flex items-center gap-2">{title}</h3> 
        {actions} 
      </div> 
      <div className="space-y-4">{children}</div> 
    </div>
  );

  const renderLobby = () => (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <SectionCard title="Lobby Players" actions={<Badge tone={canStart? 'green':'gray'}>{players.length} Joined</Badge>}>
          <div className="grid sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {players.map(p => {
              const id = p.playerId || p.id;
              return <div key={id} className="border border-slate-200/50 rounded-xl p-5 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white hover:from-indigo-50 hover:to-white hover:border-indigo-200 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg text-sm"> 
                <div className="flex flex-col min-w-0"> 
                  <span className="font-semibold truncate text-slate-800">{p.userName || p.name || id}</span> 
                </div> 
                <div className="flex items-center gap-3"> 
                  {p.isConnected ? <Badge tone="green">ONLINE</Badge> : <Badge tone="red">OFFLINE</Badge>} 
                </div> 
              </div>;
            })}
            {!players.length && <div className="text-[11px] text-gray-400 italic">No players yet</div>}
          </div>
        </SectionCard>
        <SectionCard title="Controls" dense>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleStart} disabled={!isSessionActivated && !canStart} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none">
              <Play className="w-4 h-4"/>
              {!isSessionActivated ? 'Activate Session' : 'Start Game'}
            </button>
            <button onClick={handleBack} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 text-xs font-medium transition-all duration-300 hover:scale-105 hover:shadow-md">
              <ArrowLeft className="w-4 h-4"/>Admin
            </button>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-gray-200/50">
            <div className="relative">
              <input 
                type="checkbox" 
                id="autoAdvance" 
                checked={autoShowResults} 
                onChange={(e) => handleAutoShowResultsChange(e.target.checked)}
                className="w-5 h-5 text-indigo-600 bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 hover:scale-110"
              />
              {autoShowResults && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <label htmlFor="autoAdvance" className="text-xs text-gray-700 font-medium cursor-pointer hover:text-indigo-600 transition-colors duration-300">
              Auto-advance questions (1 second delay)
            </label>
          </div>
          <div className="text-[11px] text-gray-500 pt-1">Game ID: {gameId || '—'} • Room: {roomCode} • Mode: {autoShowResults ? 'Auto Results':'Manual Results'}</div>
        </SectionCard>
      </div>
      <div className="space-y-6">
        <SectionCard title="Room Status">
          <div className="text-sm grid gap-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-200/50">
              <Users className="w-5 h-5 text-indigo-600"/>
              <span className="font-semibold text-slate-800">{players.length} Player{players.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/50">
              <Gamepad2 className="w-5 h-5 text-emerald-600"/>
              <span className="font-semibold text-slate-800">Can Start: {canStart? 'Yes':'No'}</span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200/50">
              <Timer className="w-5 h-5 text-blue-600"/>
              <span className="font-semibold text-slate-800">Phase: {isSessionActivated ? phase : 'Completed'}</span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100/50 border border-purple-200/50">
              <Trophy className="w-5 h-5 text-purple-600"/>
              <span className="font-semibold text-slate-800">Results Mode: {autoShowResults? 'Auto':'Manual'}</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="space-y-6">
      <SectionCard title="Current Question" actions={<div className="flex items-center gap-2"> {question && <Badge tone="indigo">{questionProgress}</Badge>} {typeof timeLeft==='number' && <Badge tone={timeLeft<=5? 'red':'gray'}>{timeLeft}s</Badge>} {autoShowResults && <Badge tone="green">Auto-Advance</Badge>} </div>}>
        {!question && <div className="text-xs text-gray-500">Waiting for question...</div>}
        {question && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/50 text-sm font-medium leading-relaxed shadow-sm">
              {question.questionText}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {questionAnswers.map(a => (
                <div key={a.id} className={`p-4 rounded-xl border text-xs flex justify-between items-center transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${a.isCorrect ? 'bg-gradient-to-r from-green-50 to-green-100/50 border-green-300 shadow-sm':'bg-gradient-to-r from-white to-gray-50 border-gray-200/50 hover:border-gray-300'}`}> 
                  <span className="truncate pr-2 font-medium text-gray-800">{a.title}</span> 
                  {a.isCorrect && <Badge tone="green">Correct</Badge>} 
                </div>
              ))}
              {!questionAnswers.length && <div className="text-[11px] text-gray-400 italic">No answers</div>}
            </div>
          </div>
        )}
        {lastResults && (
          <div className="mt-6 p-6 rounded-2xl border border-gray-200/50 bg-gradient-to-br from-white to-gray-50/50 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-700">Question Results</h4>
              {autoAdvanceCountdown !== null && autoShowResults && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Badge tone="green">Auto-advancing in {autoAdvanceCountdown}s</Badge>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600 font-medium">Answered: {lastResults.playersAnswered}/{lastResults.totalPlayers}</div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {leaderboard.map((p: any, idx:number) => (
                <div key={p.playerId || idx} className="flex items-center justify-between text-xs border border-gray-200/50 rounded-xl px-4 py-3 bg-gradient-to-r from-white to-gray-50/50 hover:from-indigo-50 hover:to-white hover:border-indigo-200 transition-all duration-300 hover:scale-[1.01] hover:shadow-sm"> 
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-[10px] font-bold text-gray-500 w-6 text-center">#{p.rank ?? (idx+1)}</span>
                    <span className="truncate font-medium text-gray-800">{p.userName || p.name}</span>
                    {idx===0 && <Crown className="w-4 h-4 text-yellow-500 animate-pulse"/>}
                  </div> 
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-indigo-600 font-semibold">{p.score} pts</span>
                    {typeof p.progress !== 'undefined' && <Badge tone="indigo">{p.progress}</Badge>}
                  </div> 
                </div>
              ))}
              {!leaderboard.length && <div className="text-[11px] text-gray-400 italic">No leaderboard data</div>}
            </div>
          </div>
        )}
        <div className="flex gap-4 pt-4 flex-wrap">
          <button onClick={handleNext} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg">
            Next Question
          </button>
          <button onClick={handleShowFinal} className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-xs font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg">
            Final Leaderboard
          </button>
          <button onClick={handleBack} className="px-6 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 rounded-xl text-xs font-medium transition-all duration-300 hover:scale-105 hover:shadow-md">
            End / Back
          </button>
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200/50">
          <div className="relative">
            <input 
              type="checkbox" 
              id="autoAdvanceGame" 
              checked={autoShowResults} 
              onChange={(e) => handleAutoShowResultsChange(e.target.checked)}
              className="w-5 h-5 text-indigo-600 bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 hover:scale-110"
            />
            {autoShowResults && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <label htmlFor="autoAdvanceGame" className="text-xs text-gray-700 font-medium cursor-pointer hover:text-indigo-600 transition-colors duration-300">
            Auto-advance questions (1 second delay)
          </label>
        </div>
      </SectionCard>
      <SectionCard title={`Players (${players.length})`}>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {players.map(p => (
            <div key={p.playerId || p.id} className="flex items-center justify-between text-xs border border-gray-200/50 rounded-xl px-4 py-3 bg-gradient-to-r from-white to-gray-50/50 hover:from-indigo-50 hover:to-white hover:border-indigo-200 transition-all duration-300 hover:scale-[1.01] hover:shadow-sm"> 
              <span className="truncate font-medium text-gray-800">{p.userName || p.name}</span> 
              <div className="flex items-center gap-2"> 
                {p.isConnected ? <Badge tone="green">on</Badge> : <Badge tone="red">off</Badge>} 
              </div> 
            </div>
          ))}
          {!players.length && <div className="text-[10px] text-gray-500 italic">No players</div>}
        </div>
      </SectionCard>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      <SectionCard title="Final Results" actions={<Badge tone="indigo">Room {roomCode}</Badge>}>
        {!finalResults && <div className="text-xs text-gray-500 italic">Awaiting final results...</div>}
        {finalResults && (
          <>
            <div className="grid sm:grid-cols-4 gap-4 text-xs mb-6">
              <div className="p-4 rounded-xl border border-gray-200/50 bg-gradient-to-br from-indigo-50 to-indigo-100/50 shadow-sm">
                <div className="font-semibold text-indigo-600 mb-1 uppercase tracking-wide">Players</div>
                <div className="text-lg font-bold text-gray-900">{finalResults.totalPlayers || finalResults.playerCount || players.length}</div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200/50 bg-gradient-to-br from-green-50 to-green-100/50 shadow-sm">
                <div className="font-semibold text-green-600 mb-1 uppercase tracking-wide">Questions</div>
                <div className="text-lg font-bold text-gray-900">{finalResults.totalQuestions || question?.totalQuestions || 0}</div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200/50 bg-gradient-to-br from-yellow-50 to-yellow-100/50 shadow-sm">
                <div className="font-semibold text-yellow-600 mb-1 uppercase tracking-wide">Winner</div>
                <div className="text-sm font-bold text-green-700 truncate">{(finalResults.finalLeaderboard || finalResults.topPlayers || [])[0]?.userName || (finalResults.first?.name)}</div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200/50 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow-sm">
                <div className="font-semibold text-purple-600 mb-1 uppercase tracking-wide">High Score</div>
                <div className="text-lg font-bold text-indigo-700">{(finalResults.finalLeaderboard || finalResults.topPlayers || [])[0]?.score || finalResults.highestScore || 0}</div>
              </div>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto border border-gray-200/50 rounded-2xl p-4 bg-gradient-to-br from-gray-50 to-white">
              {(finalResults.finalLeaderboard || finalResults.topPlayers || finalResults.leaderboard || []).map((p: any, idx: number) => (
                <div key={p.playerId || p.id || idx} className={`flex items-center justify-between text-xs border border-gray-200/50 rounded-xl px-4 py-3 transition-all duration-300 hover:scale-[1.01] hover:shadow-sm ${idx < 3 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100/50 shadow-sm' : 'bg-gradient-to-r from-white to-gray-50/50 hover:from-indigo-50 hover:to-white hover:border-indigo-200'}`}> 
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-[10px] font-bold text-gray-500 w-6 text-center">#{p.rank ?? (idx + 1)}</span>
                    <span className="truncate font-medium text-gray-800">{p.userName || p.name}</span>
                    {idx === 0 && <Crown className="w-4 h-4 text-yellow-500 animate-pulse"/>}
                  </div> 
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-indigo-600">{p.score} pts</span>
                    {typeof p.progress !== 'undefined' && <Badge tone="indigo">{p.progress}</Badge>}
                  </div> 
                </div>
              ))}
            </div>
            <div className="pt-4">
              <button onClick={handleBack} className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg">
                Back to Admin
              </button>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );

  // Show loading state during first load reload
  if (isFirstLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md mx-auto text-center space-y-4">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600"/>
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Initializing GameHub Connection</h2>
          <p className="text-slate-600 text-sm">Preparing optimal connection for room {roomCode}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Host Control
          </h1>
          <p className="text-slate-600">Room {roomCode} • Manage your quiz session</p>
        </div>
        {statusMsg && (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100/50 border border-yellow-200/50 text-yellow-800 px-6 py-3 rounded-2xl text-xs flex items-center gap-3 shadow-sm backdrop-blur-sm">
            <Loader2 className="w-4 h-4 animate-spin"/>
            <span className="font-medium">
              {statusMsg}
              {connectionReloadAttempts > 0 && (
                <span className="ml-2 text-orange-600">
                  (Auto-reload attempt {connectionReloadAttempts}/{MAX_CONNECTION_RELOAD_ATTEMPTS})
                </span>
              )}
            </span>
          </div>
        )}
        {connectionReloadAttempts >= MAX_CONNECTION_RELOAD_ATTEMPTS && (
          <div className="bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200/50 text-red-800 px-6 py-3 rounded-2xl text-xs flex items-center gap-3 shadow-sm backdrop-blur-sm">
            <span className="font-medium">⚠️ Connection issues detected. Please check your network and refresh manually.</span>
          </div>
        )}
        {debugEnabled && debugLines.length > 0 && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200/50 text-gray-700 px-4 py-3 rounded-2xl text-xs shadow-sm backdrop-blur-sm max-h-48 overflow-y-auto">
            <div className="font-semibold mb-2">Debug Log:</div>
            {debugLines.slice(-10).map((line, idx) => (
              <div key={idx} className="font-mono text-[10px] mb-1">{line}</div>
            ))}
          </div>
        )}
        {phase === 'lobby' && renderLobby()}
        {phase === 'game' && renderGame()}
        {phase === 'results' && renderResults()}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader, DashboardSidebar, GamesManager, QuestionsManager } from '@/components/admin';
import { useGames, useGameMutations } from '@/hooks/useGames';
import { isGameDraft } from '@/lib/state-parsers';
import { useGameHub } from '@/hooks/useGameHub';
import { GameHeader } from '@/components/ui/GameHeader';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { GameState } from '@/types/api';
import AIGameChat from '@/components/admin/AIGameChat';
import { RoomManagementPanel } from '@/components/RoomManagement';
import { useRoomManagement } from '@/hooks/useRoomManagement';

interface LobbyPlayer { id?: string; playerId?: string; userName?: string; name?: string; isConnected?: boolean; joinedAt?: string; score?: number; rank?: number; }
interface QuestionEnvelope { questionIndex?: number; totalQuestions?: number; questionText?: string; answers?: any[]; timeLimitSeconds?: number; startTime?: string; isMultipleChoice?: boolean; correctAnswers?: any[]; correctAnswer?: any; questionType?: string; }
interface ManagedRoom { roomCode: string; gameId?: string; createdAt: number; phase: 'setup'|'lobby'|'game'|'results'; players: number; autoShowResults?: boolean; title?: string; sessionState?: number; }

// Helper to parse backend session state to numeric code matching Backend.Domain.Enums.GameSessionState
// Backend: Lobby=0, InProgress=1, WaitingForHost=2, Completed=3, Canceled=4
const parseSessionState = (p: any): number | undefined => {
  if (!p) return undefined;
  const raw = p.sessionState ?? p.gameSessionState ?? p.state ?? p.status;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const map: Record<string, number> = {
      lobby: 0,
      inprogress: 1,
      waitingforhost: 2,
      completed: 3,
      canceled: 4,  // American spelling (matches backend)
    };
    return map[raw.replace(/\s+/g,'').toLowerCase()];
  }
};

export default function AdminGameManagerPage() {
  const router = useRouter();

  // Layout
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Flow (for active room only)
  const [phase, setPhase] = useState<'setup' | 'lobby' | 'game' | 'results'>('setup');

  // Games
  const gamesParams = useMemo(() => ({ take: 50 }), []);
  const { games, loading: loadingGames, refetch: refetchGames } = useGames(gamesParams);
  const { updateGameState } = useGameMutations();
  const [selectedGameId, setSelectedGameId] = useState('');
  const [autoShowResults, setAutoShowResults] = useState(true);

  // Active room state
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [canStart, setCanStart] = useState(false);

  // Gameplay
  const [question, setQuestion] = useState<QuestionEnvelope | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [lastResults, setLastResults] = useState<any | null>(null);
  const [finalResults, setFinalResults] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const setLoading = (k: string, v: boolean) => setLoadingMap(m => ({ ...m, [k]: v }));
  const Spinner = ({ size='w-4 h-4' }: { size?: string }) => <span className={`${size} inline-block border-2 border-current border-t-transparent rounded-full animate-spin`}></span>;
  const [showAI, setShowAI] = useState(false);
  const [activationFailed, setActivationFailed] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);

  // Room Management
  const roomManagement = useRoomManagement();

  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<any>(null);
  const autoAdvanceTimerRef = useRef<any>(null);
  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  const stopAutoAdvanceTimer = () => { if (autoAdvanceTimerRef.current) { clearInterval(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; } };
  const startTimer = useCallback((payload?: QuestionEnvelope) => {
    stopTimer();
    if (!payload) return;
    let total = typeof payload.timeLimitSeconds === 'number' ? payload.timeLimitSeconds : 20;
    if (payload.startTime) {
      const ms = Date.parse(payload.startTime);
      if (!isNaN(ms)) {
        const elapsed = (Date.now() - ms) / 1000;
        total = Math.max(0, Math.round(total - elapsed));
      }
    }
    setTimeLeft(total);
    if (total <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return prev;
        if (prev <= 1) { stopTimer(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);
  useEffect(() => () => stopTimer(), []);

  // Room registry (multi-room management)
  const [rooms, setRooms] = useState<ManagedRoom[]>([]);
  const upsertRoom = useCallback((rc: string, patch: Partial<ManagedRoom>) => {
    setRooms(prev => {
      const idx = prev.findIndex(r => r.roomCode === rc);
      if (idx === -1) return [...prev, { roomCode: rc, createdAt: Date.now(), phase: patch.phase || 'lobby', players: patch.players ?? 0, gameId: patch.gameId, autoShowResults: patch.autoShowResults, title: patch.title, sessionState: patch.sessionState }];
      const clone = [...prev];
      clone[idx] = { ...clone[idx], ...patch } as ManagedRoom;
      return clone;
    });
  }, []);

  const switchRoom = async (rc: string) => {
    if (!rc) return;
    setRoomCode(rc);
    setStatusMsg(`Switched to room ${rc}`);
    try {
      const res = await requestRoomStatus(rc);
      if(res?.ok && res.data){
        upsertRoom(rc, { sessionState: parseSessionState(res.data) });
      }
    } catch {}
  };
  const forgetRoom = (rc: string) => {
    setRooms(r => r.filter(x => x.roomCode !== rc));
    if (roomCode === rc) { setRoomCode(''); setPhase('setup'); setPlayers([]); setQuestion(null); setLeaderboard([]); setFinalResults(null); }
  };
  const endRoom = async (rc: string) => { try { if (client) await (client as any).invoke('ShowFinalLeaderboard', rc); } catch {} finally { upsertRoom(rc, { phase: 'results' }); } };

  // Manage mode (UI sections)
  const [manageMode, setManageMode] = useState<'control'|'rooms'|'games'|'questions'|'room-management'>('control');
  const [manageGameId, setManageGameId] = useState<string | null>(null);

  const safeGames = Array.isArray(games) ? games : [];
  const selectedGame = useMemo(()=> safeGames.find((g:any)=>g.id===manageGameId), [safeGames, manageGameId]);
  const suppressLobbyInfoRef = useRef(false); // suppress LobbyInfo right after creation

  // Hub wiring
  const { connected, reconnecting, connectionError, client, createGameRoom, startGame, proceedToNextQuestion, showFinalLeaderboard, requestRoomStatus, activateGameSession } = useGameHub({
    onRoomCreated: async (payload: any) => {
      const rc = payload.roomCode || '';
      const derivedTitle = payload.gameTitle || safeGames.find(g => g.id === selectedGameId)?.title || '';
      if (derivedTitle && !payload.gameTitle) payload.gameTitle = derivedTitle;
      setRoomCode(rc);
      setStatusMsg(`Room created${derivedTitle ? ` • ${derivedTitle}`:''} - Activating session...`);
      setPlayers(payload.players || []);
      setCanStart(!!payload.canStart || (payload.players||[]).length>0);
      const sessionState = parseSessionState(payload);
      if (rc) {
        upsertRoom(rc, { phase: 'setup', players: (payload.players||[]).length, gameId: selectedGameId, autoShowResults, title: derivedTitle || undefined, sessionState });
        setManageMode('rooms');
        
        // Automatically activate the session after a short delay
        try {
          setStatusMsg(`Room created${derivedTitle ? ` • ${derivedTitle}`:''} - Activating session...`);
          setActivationFailed(false);
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds for better reliability
          
          // Add timeout for session activation
          const activationPromise = activateGameSession(rc);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session activation timed out')), 8000)
          );
          
          await Promise.race([activationPromise, timeoutPromise]);
          setStatusMsg(`Room created${derivedTitle ? ` • ${derivedTitle}`:''} - Session activated! Players can now join. Go to "Rooms" tab to manage.`);
          setActivationFailed(false);
        } catch (error) {
          console.error('Session activation failed:', error);
          setStatusMsg(`Room created${derivedTitle ? ` • ${derivedTitle}`:''} - Session created but activation failed. Go to "Rooms" tab and click "Activate" to allow players to join.`);
          setActivationFailed(true);
        }
      }
    },
    onLobbyInfo: (p: any) => {
      setPlayers(p.players || []);
      setCanStart(!!p.canStart || (p.players||[]).length>0);
      if (roomCode) upsertRoom(roomCode, { players: (p.players||[]).length, phase: 'lobby', sessionState: parseSessionState(p) });
    },
    onPlayerJoined: (p: any) => {
      setPlayers(p.players || []);
      setCanStart((p.players||[]).length>0);
      if (roomCode) upsertRoom(roomCode, { players: (p.players||[]).length });
    },
    onLobbyUpdate: (p: any) => { setPlayers(p.players || []); setCanStart(!!p.canStart || (p.players||[]).length>0); if (roomCode) upsertRoom(roomCode, { players: (p.players||[]).length }); },
    onSessionActivated: (payload: any) => {
      setStatusMsg(`Session activated! ${payload.message || 'Players can now join the game.'}`);
      setActivationFailed(false); // Clear the failed flag when session is activated
      if (roomCode) upsertRoom(roomCode, { phase: 'lobby', sessionState: 1 }); // 1 = Lobby state
    },
    onGameStarted: () => { setPhase('game'); setStatusMsg('Game started'); setQuestion(null); setLeaderboard([]); if (roomCode) upsertRoom(roomCode, { phase: 'game' }); },
    onHostNewQuestion: (payload: QuestionEnvelope) => {
      setQuestion(payload);
      const answers = payload.answers || [];
      setQuestionAnswers(answers.map((a:any,i:number)=>({ id: String(a.id ?? a.answerId ?? a.key ?? i), title: a.title || a.text || a.answer || a.value || `Answer ${i+1}`, isCorrect: !!(a.isCorrect || a.correct) })));
      startTimer(payload);
      setLastResults(null);
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
                handleShowFinal();
              } else {
                handleNextQuestion();
              }
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    },
    onProceedingToNextQuestion: () => { setQuestion(null); setQuestionAnswers([]); setLastResults(null); stopTimer(); stopAutoAdvanceTimer(); setAutoAdvanceCountdown(null); },
    onFinalResults: (payload: any) => { setFinalResults(payload); setPhase('results'); stopAutoAdvanceTimer(); setAutoAdvanceCountdown(null); if (roomCode) upsertRoom(roomCode, { phase: 'results' }); },
    onGameEnded: (payload: any) => { setFinalResults(payload); setPhase('results'); stopAutoAdvanceTimer(); setAutoAdvanceCountdown(null); if (roomCode) upsertRoom(roomCode, { phase: 'results' }); },
    onError: (m: any) => setStatusMsg(typeof m === 'string' ? m : (m?.message || 'Error'))
  });

  // Actions
  const handleCreateRoom = async () => {
    if (!selectedGameId || loadingMap.createRoom) return;
    setLoading('createRoom', true);
    setActivationFailed(false); // Reset activation failed flag
    const game = safeGames.find(g => g.id === selectedGameId);
    try {
      if (game && isGameDraft(game.state)) {
        setStatusMsg('Preparing game (mark Ready)...');
        try {
          await updateGameState(game.id!, { id: game.id, userNTID: 'current-user-id', currentState: GameState.Draft, targetState: GameState.Ready });
          setStatusMsg('Game marked Ready. Creating room...');
          refetchGames?.();
        } catch (e:any) { setStatusMsg(`Failed to set Ready: ${(e as Error).message}`); return; }
      } else { setStatusMsg('Creating room...'); }
      
      // Use the new room management service
      try {
        const newRoom = await roomManagement.createRoom(selectedGameId, autoShowResults);
        setStatusMsg(`Room created successfully (code: ${newRoom.roomCode}) - Session activated! Players can now join. Go to "Rooms" tab to manage.`);
        if(!roomCode) setRoomCode(newRoom.roomCode);
        setActivationFailed(false);
      } catch (roomError) {
        // Fallback to SignalR method if API fails
        const createRoomPromise = createGameRoom(selectedGameId, autoShowResults);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Room creation timed out')), 10000)
        );
        
        const rc = await Promise.race([createRoomPromise, timeoutPromise]);
        if (rc && typeof rc === 'string' && rc.trim()) { 
          setStatusMsg(`Room created successfully (code: ${rc})`); 
          if(!roomCode) setRoomCode(rc);
        } else { 
          setStatusMsg('Room created successfully'); 
        }
      }
    } catch (e:any) { 
      console.error('Room creation failed:', e);
      setStatusMsg(`Failed to create room: ${(e?.message)||'Unknown error'}`); 
    }
    finally { setLoading('createRoom', false); }
  };
  const handleStartGame = async () => { if (!roomCode || loadingMap.startGame) return; setLoading('startGame', true); try { await startGame(roomCode); } catch { setStatusMsg('Failed to start'); } finally { setLoading('startGame', false); } };
  const handleNextQuestion = async () => { if (!roomCode || loadingMap.nextQuestion) return; setLoading('nextQuestion', true); try { await proceedToNextQuestion(roomCode); } catch { setStatusMsg('Failed next'); } finally { setLoading('nextQuestion', false); } };
  const handleShowFinal = async () => { if (!roomCode || loadingMap.showFinal) return; setLoading('showFinal', true); try { await showFinalLeaderboard(roomCode); } catch { setStatusMsg('Failed final'); } finally { setLoading('showFinal', false); } };
  const handleKick = async (playerId?: string) => { if (!client || !roomCode || !playerId) return; try { await (client as any).invoke('KickPlayer', roomCode, playerId); } catch { setStatusMsg('Kick failed'); } };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      stopAutoAdvanceTimer();
    };
  }, []);

  // Derived
  const totalQuestions = question?.totalQuestions || finalResults?.totalQuestions || 0;
  const Badge = ({ children, color = 'bg-gray-200 text-gray-700' }: any) => <span className={`px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${color}`}>{children}</span>;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(s => !s)} onMenuClick={() => {}} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <DashboardHeader sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(o => !o)} onProfileClick={() => {}} onSettingsClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Admin Game Control
            </h1>
            <p className="text-slate-600">Manage your quiz games and active sessions</p>
          </div>
          <div className="flex gap-1 flex-wrap">
            <button 
              onClick={() => setManageMode('control')} 
              className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                manageMode==='control'
                  ?'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                  :'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Session Control
            </button>
            <button 
              onClick={() => setManageMode('rooms')} 
              className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                manageMode==='rooms'
                  ?'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                  :'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Rooms
            </button>
            <button 
              onClick={() => setManageMode('room-management')} 
              className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                manageMode==='room-management'
                  ?'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                  :'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Room Management
            </button>
            <button 
              onClick={() => { setManageMode('games'); setManageGameId(null); }} 
              className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                manageMode==='games'
                  ?'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                  :'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Games
            </button>
            <button 
              onClick={() => { if (manageGameId) setManageMode('questions'); else setManageMode('games'); }} 
              disabled={!manageGameId} 
              className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                manageMode==='questions'
                  ?'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                  :'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              } ${!manageGameId?'opacity-50 cursor-not-allowed':''}`}
            >
              Questions
            </button>
            <button 
              onClick={()=> setShowAI(true)} 
              className="px-6 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 hover:from-purple-100 hover:to-purple-200 border border-purple-200 transition-all duration-300"
            >
              AI Builder
            </button>
          </div>
          {statusMsg && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50 text-amber-800 px-6 py-4 rounded-2xl text-sm font-medium shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span>{statusMsg}</span>
                {activationFailed && roomCode && (
                  <button
                    onClick={async () => {
                      try {
                        setLoading('activateSession', true);
                        await activateGameSession(roomCode);
                        setStatusMsg(`Session activated successfully! Players can now join room ${roomCode}.`);
                        setActivationFailed(false);
                      } catch (error) {
                        console.error('Manual activation failed:', error);
                        setStatusMsg(`Failed to activate session. Please try again or go to "Rooms" tab.`);
                      } finally {
                        setLoading('activateSession', false);
                      }
                    }}
                    disabled={loadingMap.activateSession}
                    className="ml-4 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingMap.activateSession && <Spinner size="w-3 h-3" />}
                    Activate Now
                  </button>
                )}
              </div>
            </div>
          )}

          {manageMode==='rooms' && (
            <div className="bg-gradient-to-br from-white to-slate-50/50 shadow-xl rounded-2xl p-8 border border-slate-200/50 space-y-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Managed Rooms
                  </h2>
                  <p className="text-slate-600 text-sm mt-1">{rooms.length} active room{rooms.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setManageMode('control')} 
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all duration-200 hover:shadow-sm"
                  >
                    Create New Room
                  </button>
                  <button 
                    onClick={() => setManageMode('room-management')} 
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all duration-200 hover:shadow-sm"
                  >
                    Advanced Management
                  </button>
                </div>
              </div>
              {!rooms.length && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Rooms Yet</h3>
                  <p className="text-gray-500 text-sm mb-4">Create your first game room to start hosting quiz sessions.</p>
                  <button 
                    onClick={() => setManageMode('control')} 
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 text-sm font-medium transition-all duration-200 hover:shadow-md"
                  >
                    Create Your First Room
                  </button>
                </div>
              )}
              {!!rooms.length && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 mt-0.5">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-blue-800 mb-1">How to Manage Rooms</h4>
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li><strong>Switch:</strong> Select this room for active management</li>
                          <li><strong>Activate/Host:</strong> {rooms.some(r => r.phase === 'setup') ? 'Activate completed sessions or open host control' : 'Open host control panel for active sessions'}</li>
                          <li><strong>End:</strong> End the current game session</li>
                          <li><strong>Forget:</strong> Remove from this management list</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="p-4 text-left font-semibold text-slate-700">Room</th>
                        <th className="p-4 text-left font-semibold text-slate-700">Game</th>
                        <th className="p-4 text-left font-semibold text-slate-700">Players</th>
                        <th className="p-4 text-left font-semibold text-slate-700">Phase</th>
                        <th className="p-4 text-left font-semibold text-slate-700">Mode</th>
                        <th className="p-4 text-left font-semibold text-slate-700">Created</th>
                        <th className="p-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(r => {
                        const title = r.title || safeGames.find(g => g.id === r.gameId)?.title || r.gameId || '—';
                        return (
                          <tr key={r.roomCode} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-200 ${roomCode===r.roomCode?'bg-indigo-50/50':''}`}>
                            <td className="p-4 font-semibold text-slate-900">{r.roomCode}</td>
                            <td className="p-4 truncate max-w-[160px] text-slate-700" title={title}>{title}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                {r.players}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                r.phase === 'setup' ? 'bg-amber-100 text-amber-800' :
                                r.phase === 'lobby' ? 'bg-blue-100 text-blue-800' :
                                r.phase === 'game' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {r.phase === 'setup' ? 'Completed' : r.phase}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                r.autoShowResults ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {r.autoShowResults? 'Auto':'Manual'}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600 text-sm">{new Date(r.createdAt).toLocaleTimeString()}</td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-2">
                                <button 
                                  onClick={() => switchRoom(r.roomCode)} 
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all duration-200 hover:shadow-sm"
                                  title="Switch to this room for management"
                                >
                                  Switch
                                </button>
                                <button 
                                  onClick={() => router.push(`/admin/host/${r.roomCode}?gameId=${r.gameId || ''}`)} 
                                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 text-xs font-medium transition-all duration-200 hover:shadow-md"
                                  title={r.phase === 'setup' ? 'Activate session to allow players to join' : 'Open host control panel'}
                                >
                                  {r.phase === 'setup' ? 'Activate' : 'Host'}
                                </button>
                                {r.phase!=='results' && (
                                  <button 
                                    onClick={() => endRoom(r.roomCode)} 
                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 text-xs font-medium transition-all duration-200 hover:shadow-md"
                                    title="End the current session"
                                  >
                                    End
                                  </button>
                                )}
                                <button 
                                  onClick={() => forgetRoom(r.roomCode)} 
                                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 text-xs font-medium transition-all duration-200 hover:shadow-md"
                                  title="Remove from managed rooms list"
                                >
                                  Forget
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
              {roomCode && <div className="text-[11px] text-gray-500">Active room: <span className="font-semibold">{roomCode}</span></div>}
            </div>
          )}

          {manageMode==='control' && phase==='setup' && (
            <div className="bg-white shadow rounded-xl p-6 border space-y-6">
              <h2 className="text-lg font-bold tracking-wide text-gray-800 flex items-center gap-3">
                Setup Room 
                <ConnectionStatus showDetails={true} />
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">Select Game</label>
                  <select value={selectedGameId} onChange={e => setSelectedGameId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500">
                    <option value="">-- Choose Game --</option>
                    {loadingGames && <option>Loading...</option>}
                    {safeGames.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">Auto Show Results</label>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={autoShowResults} onChange={e => setAutoShowResults(e.target.checked)} />
                    <span className="text-xs text-gray-600">Show each question's results automatically</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreateRoom} disabled={!selectedGameId || loadingMap.createRoom} className="px-5 py-2 rounded bg-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2">
                  {loadingMap.createRoom && <Spinner />}
                  {loadingMap.createRoom ? 'Creating...' : 'Create Room'}
                </button>
                <button onClick={() => setSelectedGameId('')} className="px-4 py-2 rounded border text-sm font-medium">Reset</button>
              </div>
            </div>
          )}

          {manageMode==='control' && phase==='lobby' && (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 bg-white p-6 rounded-xl border shadow space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-800 tracking-wide">Lobby</h3>
                    <Badge color="bg-indigo-100 text-indigo-700">Room {roomCode || '—'}</Badge>
                  </div>
                  {roomCode && <button onClick={()=>router.push(`/admin/host/${roomCode}?gameId=${selectedGameId}`)} className="px-3 py-1.5 text-xs rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Open Host View</button>}
                </div>
                <div className="text-xs text-gray-500">Players joined: {players.length}</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {players.map(p => { const id = p.playerId || p.id; return (
                    <div key={id} className="border rounded-lg p-3 flex justify-between items-center bg-gray-50">
                      <div className="text-sm font-semibold truncate">{p.userName || p.name || id}</div>
                      <div className="flex items-center gap-2">
                        {p.isConnected ? <Badge color="bg-green-100 text-green-700">On</Badge> : <Badge color="bg-red-100 text-red-600">Off</Badge>}
                        <button onClick={() => handleKick(id)} className="text-xs px-2 py-1 rounded bg-red-600 text-white">Kick</button>
                      </div>
                    </div> ); })}
                  {!players.length && <div className="text-xs text-gray-500 col-span-full">No players yet</div>}
                </div>
                <div className="flex gap-3 pt-2 flex-wrap">
                  <button onClick={handleStartGame} disabled={!canStart || loadingMap.startGame} className="px-5 py-2 rounded bg-green-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2">
                    {loadingMap.startGame && <Spinner />}
                    {loadingMap.startGame ? 'Starting...' : 'Start Game'}
                  </button>
                  <button onClick={() => { setPhase('setup'); setRoomCode(''); setPlayers([]); }} className="px-4 py-2 rounded border text-sm font-medium">Cancel Room</button>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border shadow space-y-3">
                <h4 className="font-semibold text-sm uppercase text-gray-700 tracking-wide flex items-center justify-between">Room Info {roomCode && <button onClick={()=>router.push(`/admin/host/${roomCode}?gameId=${selectedGameId}`)} className="ml-2 px-2 py-1 text-[11px] rounded bg-indigo-600 text-white hover:bg-indigo-700">Manage</button>}</h4>
                <div className="text-xs space-y-1">
                  <div><span className="font-semibold">Game:</span> {safeGames.find(g=>g.id===selectedGameId)?.title || '—'}</div>
                  <div><span className="font-semibold">Auto Results:</span> {autoShowResults? 'Yes':'No'}</div>
                  <div><span className="font-semibold">Room Code:</span> {roomCode || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {manageMode==='control' && phase==='game' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white rounded-xl border p-6 shadow space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2"><h3 className="font-bold text-gray-800 tracking-wide">Current Question</h3>{roomCode && <Badge color="bg-indigo-100 text-indigo-700">Room {roomCode}</Badge>}</div>
                    {roomCode && <button onClick={()=>router.push(`/admin/host/${roomCode}?gameId=${selectedGameId}`)} className="px-3 py-1.5 text-xs rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Host View</button>}
                  </div>
                  {!question && <div className="text-xs text-gray-500">Waiting for next question...</div>}
                  {question && (
                    <div className="space-y-4">
                      <div className="p-4 rounded bg-gray-50 border text-sm font-medium leading-relaxed">{question.questionText}</div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {questionAnswers.map(a => (
                          <div key={a.id} className={`p-3 rounded border text-sm flex justify-between items-center ${a.isCorrect? 'bg-green-50 border-green-300':'bg-white'}`}> <span className="truncate pr-2">{a.title}</span> {a.isCorrect && <Badge color="bg-green-600 text-white">Correct</Badge>} </div>
                        ))}
                        {!questionAnswers.length && <div className="text-xs text-gray-500">No answers provided</div>}
                      </div>
                    </div>
                  )}
                  {lastResults && (
                    <div className="mt-6 p-4 rounded border bg-white shadow-inner">
                      <h4 className="font-semibold text-sm uppercase text-gray-700 mb-2 tracking-wide">Question Results</h4>
                      <div className="text-xs text-gray-600 mb-3">Players answered: {lastResults.playersAnswered}/{lastResults.totalPlayers}</div>
                      <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                        {leaderboard.map((p, idx) => (
                          <div key={p.playerId || idx} className="flex items-center justify-between text-sm border rounded px-3 py-1 bg-gray-50">
                            <div className="flex items-center gap-2 truncate"><span className="text-xs font-bold text-gray-500 w-5">#{p.rank ?? (idx+1)}</span><span className="truncate">{p.userName || p.name}</span></div>
                            <div className="flex items-center gap-3"><span className="text-xs text-indigo-600 font-semibold">{p.score} pts</span>{typeof p.progress !== 'undefined' && <Badge>{p.progress}</Badge>}</div>
                          </div>
                        ))}
                        {!leaderboard.length && <div className="text-xs text-gray-500">No leaderboard data</div>}
                      </div>
                    </div>
                  )}
                  {/* Auto-advance countdown indicator */}
                  {autoAdvanceCountdown !== null && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">
                          Auto-advancing in {autoAdvanceCountdown} second{autoAdvanceCountdown !== 1 ? 's' : ''}...
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 pt-4 flex-wrap">
                    <button onClick={handleNextQuestion} disabled={loadingMap.nextQuestion} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                      {loadingMap.nextQuestion && <Spinner />}
                      {loadingMap.nextQuestion ? 'Loading...' : 'Next Question'}
                    </button>
                    <button onClick={handleShowFinal} disabled={loadingMap.showFinal} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                      {loadingMap.showFinal && <Spinner />}
                      {loadingMap.showFinal ? 'Showing...' : 'Show Final Leaderboard'}
                    </button>
                    <button onClick={() => { setPhase('setup'); setRoomCode(''); setPlayers([]); setQuestion(null); setLeaderboard([]); setFinalResults(null); }} className="px-4 py-2 border rounded text-sm font-medium">End Session</button>
                    {roomCode && <button onClick={()=>router.push(`/admin/host/${roomCode}?gameId=${selectedGameId}`)} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded text-sm font-medium hover:bg-indigo-100">Manage Room</button>}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border shadow space-y-3">
                    <h4 className="font-semibold text-sm uppercase text-gray-700 tracking-wide">Players ({players.length})</h4>
                    <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                      {players.map(p => (
                        <div key={p.playerId || p.id} className="flex items-center justify-between text-xs border rounded px-2 py-1 bg-gray-50">
                          <span className="truncate">{p.userName || p.name}</span>
                          <div className="flex items-center gap-1">
                            {p.isConnected ? <Badge color="bg-green-100 text-green-700">on</Badge> : <Badge color="bg-red-100 text-red-600">off</Badge>}
                            <button onClick={() => handleKick(p.playerId || p.id)} className="px-1.5 py-0.5 bg-red-500 text-white rounded">✕</button>
                          </div>
                        </div>
                      ))}
                      {!players.length && <div className="text-[10px] text-gray-500">No players</div>}
                    </div>
                  </div>
                  {lastResults && (
                    <div className="bg-white p-4 rounded-xl border shadow space-y-2">
                      <h4 className="font-semibold text-xs uppercase text-gray-700 tracking-wide">Answer Stats</h4>
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        {(lastResults.answersWithStats || []).map((a: any) => (
                          <div key={a.id} className={`flex items-center justify-between text-[11px] border rounded px-2 py-1 ${a.isCorrect ? 'bg-green-50 border-green-300':'bg-white'}`}>
                            <span className="truncate pr-2">{a.title || a.text || a.id}</span>
                            <span className="font-semibold text-gray-600">{a.playerCount}</span>
                          </div>
                        ))}
                        {!(lastResults.answersWithStats || []).length && <div className="text-[10px] text-gray-400">No stats</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {manageMode==='control' && phase==='results' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border shadow space-y-4">
                <h3 className="font-bold text-gray-800 tracking-wide flex items-center gap-3">Final Results {roomCode && <Badge color="bg-indigo-100 text-indigo-700">Room {roomCode}</Badge>} {roomCode && <button onClick={()=>router.push(`/admin/host/${roomCode}?gameId=${selectedGameId}`)} className="ml-auto px-3 py-1.5 text-xs rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Host View</button>}</h3>
                {!finalResults && <div className="text-xs text-gray-500">Waiting for final results...</div>}
                {finalResults && (
                  <>
                    <div className="grid md:grid-cols-4 gap-4 text-xs">
                      <div className="p-3 rounded border bg-gray-50"><div className="font-semibold text-gray-600 mb-1">Players</div><div className="text-lg font-bold text-gray-900">{finalResults.totalPlayers || finalResults.playerCount || players.length}</div></div>
                      <div className="p-3 rounded border bg-gray-50"><div className="font-semibold text-gray-600 mb-1">Questions</div><div className="text-lg font-bold text-gray-900">{finalResults.totalQuestions || totalQuestions}</div></div>
                      <div className="p-3 rounded border bg-gray-50"><div className="font-semibold text-gray-600 mb-1">Winner</div><div className="text-sm font-bold text-green-700 truncate">{(finalResults.finalLeaderboard || finalResults.topPlayers || [])[0]?.userName || (finalResults.first?.name)}</div></div>
                      <div className="p-3 rounded border bg-gray-50"><div className="font-semibold text-gray-600 mb-1">High Score</div><div className="text-lg font-bold text-indigo-700">{(finalResults.finalLeaderboard || finalResults.topPlayers || [])[0]?.score || finalResults.highestScore || 0}</div></div>
                    </div>
                    <div className="space-y-1 max-h-[420px] overflow-y-auto border rounded p-3 bg-gray-50">
                      {(finalResults.finalLeaderboard || finalResults.topPlayers || finalResults.leaderboard || []).map((p:any, idx:number) => (
                        <div key={p.playerId || p.id || idx} className={`flex items-center justify-between text-sm border rounded px-3 py-1 bg-white ${idx<3?'shadow-sm':''}`}> 
                          <div className="flex items-center gap-2 truncate"><span className="text-xs font-bold text-gray-500 w-5">#{p.rank ?? (idx+1)}</span><span className="truncate font-medium">{p.userName || p.name}</span>{idx===0 && <Badge color="bg-yellow-400 text-gray-800">Champion</Badge>}</div>
                          <div className="flex items-center gap-3"><span className="text-xs font-semibold text-indigo-600">{p.score} pts</span>{typeof p.progress !== 'undefined' && <Badge>{p.progress}</Badge>}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setPhase('setup'); setRoomCode(''); setPlayers([]); setQuestion(null); setLeaderboard([]); setFinalResults(null); }} className="px-5 py-2 rounded bg-red-600 text-white text-sm font-semibold">New Session</button>
                </div>
              </div>
            </div>
          )}

          {manageMode==='games' && (
            <div className="bg-white border rounded-xl shadow p-6 space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-lg font-bold tracking-wide text-gray-800 flex items-center gap-2">Games Library
                  {selectedGame && <span className="text-xs font-normal text-gray-500">/ {selectedGame.title}</span>}
                </h2>
                <div className="flex gap-2 text-xs">
                  <button onClick={()=>{ refetchGames?.(); setStatusMsg('Games reloaded'); }} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Refresh</button>
                  <button onClick={()=> setManageMode('control')} className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50">Back</button>
                  {selectedGame && <button onClick={()=> setManageMode('questions')} className="px-3 py-1.5 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Manage Questions</button>}
                </div>
              </div>
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-lg border bg-gray-50/80 p-3 text-[11px] text-gray-600 flex items-center justify-between flex-wrap gap-2">
                    <span>{selectedGame ? 'Review the selected game or proceed to manage its questions.' : 'Select a game from the list to view details and manage its questions.'}</span>
                    {selectedGame && <span className="inline-flex items-center gap-1"><span className="font-semibold text-gray-700">ID:</span><span className="font-mono text-[10px] bg-white border px-1.5 py-0.5 rounded">{selectedGame.id}</span></span>}
                  </div>
                  <GamesManager onSelectGame={(g:any)=>{ setManageGameId(g?.id||null); }} />
                </div>
                <div className="hidden lg:flex flex-col gap-4 text-xs text-gray-600">
                  <div className="p-4 rounded-lg border bg-gray-50 space-y-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">Tips</h3>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Pick a game to enable the Questions tab.</li>
                      <li>Use Refresh after creating or updating games elsewhere.</li>
                      <li>Draft games will be auto-marked Ready when creating a room.</li>
                    </ul>
                  </div>
                  {selectedGame && (
                    <div className="p-4 rounded-lg border bg-white space-y-2 shadow-sm">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">Selected Game</h4>
                      <div className="space-y-1">
                        <div><span className="font-semibold">Title:</span> {selectedGame.title}</div>
                        {selectedGame.state && <div><span className="font-semibold">State:</span> {selectedGame.state}</div>}
                        { (selectedGame as any)?.questions && Array.isArray((selectedGame as any).questions) && <div><span className="font-semibold">Questions:</span> {(selectedGame as any).questions.length}</div> }
                      </div>
                      <button onClick={()=> setManageMode('questions')} className="mt-2 w-full px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700">Manage Questions</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {manageMode==='questions' && <QuestionsManager gameId={manageGameId} onBack={()=>setManageMode('games')} />}
          
          {manageMode==='room-management' && (
            <div className="bg-white border rounded-xl shadow p-6 space-y-6">
              <RoomManagementPanel 
                onRoomSelected={(room) => {
                  console.log('Room selected:', room);
                  // You can add additional logic here if needed
                }}
                onBack={() => setManageMode('control')}
              />
            </div>
          )}
        </main>
      </div>
      <AIGameChat open={showAI} onClose={()=>setShowAI(false)} onGameCreated={(g)=>{ setShowAI(false); setStatusMsg(`AI created game: ${g.title}`); refetchGames?.(); setManageMode('games'); }} />
    </div>
  );
}

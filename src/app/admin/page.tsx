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
import { getGameSessionStateString } from '@/services/roomManagementService';

interface LobbyPlayer { id?: string; playerId?: string; userName?: string; name?: string; isConnected?: boolean; joinedAt?: string; score?: number; rank?: number; }
interface QuestionEnvelope { questionIndex?: number; totalQuestions?: number; questionText?: string; answers?: any[]; timeLimitSeconds?: number; startTime?: string; isMultipleChoice?: boolean; correctAnswers?: any[]; correctAnswer?: any; questionType?: string; }
interface ManagedRoom { roomCode: string; gameId?: string; createdAt: number; phase: 'setup'|'lobby'|'game'|'results'; players: number; autoShowResults?: boolean; title?: string; sessionState?: number; }

// Helper to parse backend session state to numeric code matching Backend.Domain.Enums.GameSessionState
// Backend: Lobby=0, InProgress=1, WaitingForHost=2, Completed=3, Canceled=4
const parseSessionState = (p: any): number | undefined => {
  if (!p) return undefined;
  
  // Try multiple possible field names and formats
  const raw = p.sessionState ?? p.gameSessionState ?? p.state ?? p.status ?? p.SessionState ?? p.GameSessionState ?? p.State ?? p.Status;
  
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const map: Record<string, number> = {
      lobby: 0,
      inprogress: 1,
      waitingforhost: 2,
      completed: 3,
      canceled: 4,  // American spelling (matches backend)
      cancelled: 4, // British spelling
    };
    return map[raw.replace(/\s+/g,'').toLowerCase()];
  }
  
  // If we can't parse it, log for debugging
  console.warn('Could not parse session state from:', p);
  return undefined;
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

  // Room Management
  const { 
    rooms: managedRooms, 
    loading: loadingManagedRooms, 
    error: roomManagementError,
    loadRooms: loadManagedRooms,
    endRoom: endManagedRoom,
    deleteRoom: deleteManagedRoom
  } = useRoomManagement();

  // Confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<{ roomCode: string; gameTitle: string } | null>(null);

  // Active room state
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [canStart, setCanStart] = useState(false);
  

  // Restore room state from localStorage on component mount
  useEffect(() => {
    const savedRoomCode = localStorage.getItem('admin_current_room');
    const savedGameId = localStorage.getItem('admin_selected_game');
    const savedAutoShowResults = localStorage.getItem('admin_auto_show_results');
    
    if (savedRoomCode && savedRoomCode.trim()) {
      setRoomCode(savedRoomCode);
      setStatusMsg(`Restored room ${savedRoomCode}`);
    }
    
    if (savedGameId && savedGameId.trim()) {
      setSelectedGameId(savedGameId);
    }
    
    if (savedAutoShowResults !== null) {
      setAutoShowResults(savedAutoShowResults === 'true');
    }
  }, []);
  
  
  // Save room code to localStorage whenever it changes
  useEffect(() => {
    if (roomCode && roomCode.trim()) {
      localStorage.setItem('admin_current_room', roomCode);
    } else {
      localStorage.removeItem('admin_current_room');
    }
  }, [roomCode]);
  
  // Save selected game ID to localStorage whenever it changes
  useEffect(() => {
    if (selectedGameId && selectedGameId.trim()) {
      localStorage.setItem('admin_selected_game', selectedGameId);
    } else {
      localStorage.removeItem('admin_selected_game');
    }
  }, [selectedGameId]);
  
  // Save autoShowResults to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('admin_auto_show_results', autoShowResults.toString());
  }, [autoShowResults]);

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
    // console.log('Admin Timer Debug:', { timeLimitSeconds: payload.timeLimitSeconds, startTime: payload.startTime, elapsed: payload.startTime ? (Date.now() - Date.parse(payload.startTime)) / 1000 : 0, finalTime: total });
    
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
    setStatusMsg(`Switching to room ${rc}...`);
    
    // Find the room in our managed rooms to get additional info
    const managedRoom = rooms.find(r => r.roomCode === rc);
    if (managedRoom) {
      setSelectedGameId(managedRoom.gameId || '');
      setAutoShowResults(managedRoom.autoShowResults || true);
      setStatusMsg(`Switched to room ${rc} - using cached data`);
    }
    
    // Try to load fresh status from server
    if (connected) {
      try {
        const res = await requestRoomStatus(rc);
        if(res?.ok && res.data){
          const sessionState = parseSessionState(res.data);
          upsertRoom(rc, { sessionState });
          
           // Update phase based on session state
           if (sessionState === 3) { // Completed
             setPhase('setup');
           } else if (sessionState === 0) { // Lobby
             setPhase('lobby');
           } else if (sessionState === 1) { // InProgress
             setPhase('game');
           } else if (sessionState === 2) { // WaitingForHost
             setPhase('results');
           }
          
          setStatusMsg(`Switched to room ${rc} - ${sessionState} state`);
        } else {
          // If server status fails, use cached data if available
          if (managedRoom) {
            setStatusMsg(`Switched to room ${rc} - using cached data (server unavailable)`);
            setPhase(managedRoom.phase as any || 'setup');
          } else {
            setStatusMsg(`Switched to room ${rc} - server status unavailable`);
          }
        }
      } catch (error) {
        console.error('Failed to get room status:', error);
        // Use cached data if available
        if (managedRoom) {
          setStatusMsg(`Switched to room ${rc} - using cached data (${managedRoom.phase})`);
          setPhase(managedRoom.phase as any || 'setup');
        } else {
          setStatusMsg(`Switched to room ${rc} - server unavailable, no cached data`);
        }
      }
    } else {
      // Not connected, use cached data if available
      if (managedRoom) {
        setStatusMsg(`Switched to room ${rc} - using cached data (offline)`);
        setPhase(managedRoom.phase as any || 'setup');
      } else {
        setStatusMsg(`Switched to room ${rc} - not connected and no cached data`);
      }
    }
  };
  const forgetRoom = (rc: string) => {
    setRooms(r => r.filter(x => x.roomCode !== rc));
    if (roomCode === rc) { 
      setRoomCode(''); 
      setPhase('setup'); 
      setPlayers([]); 
      setQuestion(null); 
      setLeaderboard([]); 
      setFinalResults(null);
      // Clear localStorage when forgetting the current room
      localStorage.removeItem('admin_current_room');
      setStatusMsg('Room forgotten and cleared');
    }
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

  // Function to load room status and update state
  const loadRoomStatus = useCallback(async (rc: string) => {
    if (!rc || !connected) {
      if (!connected) {
        setStatusMsg(`Cannot load room ${rc} - not connected to server`);
      }
      return;
    }
    
    // Prevent multiple simultaneous calls for the same room
    const loadingKey = `loadRoomStatus_${rc}`;
    if (loadingMap[loadingKey]) {
      console.log(`Already loading room ${rc} status, skipping...`);
      return;
    }
    
     try {
       setLoading(loadingKey, true);
       setStatusMsg(`Loading room ${rc} status...`);
       const res = await requestRoomStatus(rc);
       
       // Debug logging to help understand response format
       console.log(`Room ${rc} status response:`, res);
      
       if (res?.ok && res.data) {
         const sessionState = parseSessionState(res.data);
         
         if (sessionState !== undefined) {
           upsertRoom(rc, { sessionState });
           
           // Update phase based on session state
           if (sessionState === 3) { // Completed
             setPhase('setup');
           } else if (sessionState === 0) { // Lobby
             setPhase('lobby');
           } else if (sessionState === 1) { // InProgress
             setPhase('game');
           } else if (sessionState === 2) { // WaitingForHost
             setPhase('results');
           }
           
           const stateNames = ['Lobby', 'InProgress', 'WaitingForHost', 'Completed', 'Canceled'];
           const stateName = stateNames[sessionState] || `Unknown(${sessionState})`;
           setStatusMsg(`Room ${rc} loaded successfully - ${stateName} state`);
         } else {
           // Session state parsing failed, try API fallback
           console.warn(`Could not parse session state for room ${rc}, trying API fallback`);
           setStatusMsg(`Room ${rc} - Could not parse server response. Trying API fallback...`);
           
           try {
             await roomManagement.loadRoomInfo(rc);
             const roomInfo = roomManagement.currentRoom;
             if (roomInfo) {
               upsertRoom(rc, { 
                 sessionState: (() => {
                 const stateMap: Record<string, number> = {
                   'Completed': 3,
                   'Lobby': 0,
                   'InProgress': 1,
                   'WaitingForHost': 2
                 };
                 return stateMap[roomInfo.state] ?? 3;
               })(),
                 gameId: roomInfo.gameId,
                 title: roomInfo.gameTitle,
                 players: roomInfo.playerCount
               });
               setStatusMsg(`Room ${rc} loaded via API - ${roomInfo.state} state`);
             } else {
               setStatusMsg(`Room ${rc} - Server response unclear and API fallback failed`);
             }
           } catch (apiError) {
             console.error('API fallback failed:', apiError);
             setStatusMsg(`Room ${rc} - Could not parse server response and API fallback failed`);
           }
         }
       } else if (res?.ok && !res.data) {
         // Server responded OK but no data - room might not exist
         setStatusMsg(`Room ${rc} - Server responded but room not found. Trying API fallback...`);
         
         // Try API fallback
         try {
           await roomManagement.loadRoomInfo(rc);
           const roomInfo = roomManagement.currentRoom;
           if (roomInfo) {
             upsertRoom(rc, { 
               sessionState: (() => {
                 const stateMap: Record<string, number> = {
                   'Completed': 3,
                   'Lobby': 0,
                   'InProgress': 1,
                   'WaitingForHost': 2
                 };
                 return stateMap[roomInfo.state] ?? 3;
               })(),
               gameId: roomInfo.gameId,
               title: roomInfo.gameTitle,
               players: roomInfo.playerCount
             });
             setStatusMsg(`Room ${rc} found via API - ${roomInfo.state} state`);
           } else {
             setStatusMsg(`Room ${rc} not found on server or API`);
           }
         } catch (apiError) {
           console.error('API fallback failed:', apiError);
           setStatusMsg(`Room ${rc} not found on server or API`);
         }
      } else if (res?.reason === 'missing-methods') {
        setStatusMsg(`Room ${rc} - Server doesn't support room status methods. Room may still be active.`);
        // Set a default state for the room
        upsertRoom(rc, { sessionState: 3 }); // Completed
        setPhase('setup');
      } else if (res?.reason === 'error') {
        setStatusMsg(`Room ${rc} - ${res.error || 'Unknown error'}. Room may not exist on server.`);
         // Try to use room management service as fallback
         try {
           await roomManagement.loadRoomInfo(rc);
           const roomInfo = roomManagement.currentRoom;
           if (roomInfo) {
             upsertRoom(rc, { 
               sessionState: (() => {
                 const stateMap: Record<string, number> = {
                   'Completed': 3,
                   'Lobby': 0,
                   'InProgress': 1,
                   'WaitingForHost': 2
                 };
                 return stateMap[roomInfo.state] ?? 3;
               })(),
               gameId: roomInfo.gameId,
               title: roomInfo.gameTitle,
               players: roomInfo.playerCount
             });
             setStatusMsg(`Room ${rc} loaded via API - ${roomInfo.state} state`);
           }
         } catch (apiError) {
           console.error('API fallback also failed:', apiError);
           setStatusMsg(`Room ${rc} not found on server. It may have been deleted or expired.`);
         }
       } else {
         // Handle unknown response format
         console.log('Unknown response format:', res);
         setStatusMsg(`Room ${rc} - Server returned unexpected response format. Trying API fallback...`);
         
         // Try API fallback for unknown responses
         try {
           await roomManagement.loadRoomInfo(rc);
           const roomInfo = roomManagement.currentRoom;
           if (roomInfo) {
             upsertRoom(rc, { 
               sessionState: (() => {
                 const stateMap: Record<string, number> = {
                   'Completed': 3,
                   'Lobby': 0,
                   'InProgress': 1,
                   'WaitingForHost': 2
                 };
                 return stateMap[roomInfo.state] ?? 3;
               })(),
               gameId: roomInfo.gameId,
               title: roomInfo.gameTitle,
               players: roomInfo.playerCount
             });
             setStatusMsg(`Room ${rc} loaded via API - ${roomInfo.state} state`);
           } else {
             setStatusMsg(`Room ${rc} - No data available from server or API`);
           }
         } catch (apiError) {
           console.error('API fallback failed:', apiError);
           setStatusMsg(`Room ${rc} - Server response unclear and API fallback failed`);
         }
       }
    } catch (error) {
      console.error('Failed to load room status:', error);
      const errorMsg = (error as Error).message;
      
      // Check if it's a connection error
      if (errorMsg.includes('connection') || errorMsg.includes('network')) {
        setStatusMsg(`Room ${rc} - Connection error. Please check your internet connection.`);
      } else if (errorMsg.includes('timeout')) {
        setStatusMsg(`Room ${rc} - Request timed out. Server may be slow.`);
      } else {
        setStatusMsg(`Room ${rc} - Error: ${errorMsg}`);
      }
      
       // Try API fallback even on error
       try {
         await roomManagement.loadRoomInfo(rc);
         const roomInfo = roomManagement.currentRoom;
         if (roomInfo) {
           const stateMap: Record<string, number> = {
             'Completed': 3,
             'Lobby': 0,
             'InProgress': 1,
             'WaitingForHost': 2
           };
           upsertRoom(rc, { 
             sessionState: stateMap[roomInfo.state] ?? 3,
             gameId: roomInfo.gameId,
             title: roomInfo.gameTitle,
             players: roomInfo.playerCount
           });
           setStatusMsg(`Room ${rc} loaded via API fallback - ${roomInfo.state} state`);
         }
       } catch (apiError) {
         console.error('API fallback failed:', apiError);
       }
    } finally {
      setLoading(loadingKey, false);
    }
  }, [connected, requestRoomStatus, upsertRoom, roomManagement, loadingMap, setLoading]);

  // Load room status when roomCode changes and we're connected
  useEffect(() => {
    if (roomCode && connected) {
      loadRoomStatus(roomCode);
    }
  }, [roomCode, connected]); // Removed loadRoomStatus from dependencies to prevent infinite loop

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
        setRoomCode(newRoom.roomCode); // Always set the new room code
        setActivationFailed(false);
        setPhase('lobby'); // Set phase to lobby since room is created and activated
      } catch (roomError) {
        // Fallback to SignalR method if API fails
        const createRoomPromise = createGameRoom(selectedGameId, autoShowResults);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Room creation timed out')), 10000)
        );
        
        const rc = await Promise.race([createRoomPromise, timeoutPromise]);
        if (rc && typeof rc === 'string' && rc.trim()) { 
          setStatusMsg(`Room created successfully (code: ${rc})`); 
          setRoomCode(rc); // Always set the new room code
          setPhase('lobby'); // Set phase to lobby since room is created
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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(s => !s)} onMenuClick={() => {}} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden relative z-10">
        <DashboardHeader sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(o => !o)} onProfileClick={() => {}} onSettingsClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent leading-tight">
                  Game Control Center
                </h1>
                <p className="text-slate-600 text-sm sm:text-base lg:text-lg font-medium">Manage your quiz games and active sessions</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => setManageMode('control')} 
              className={`group relative px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all duration-300 transform hover:scale-105 flex-1 sm:flex-none min-w-0 ${
                manageMode==='control'
                  ?'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-indigo-500/25'
                  :'bg-white/80 backdrop-blur-sm text-slate-700 hover:text-slate-900 hover:bg-white/90 border border-slate-200/50 shadow-lg hover:shadow-xl'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2 justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <span className="truncate">Session Control</span>
              </div>
            </button>
            <button 
              onClick={() => {
                setManageMode('rooms');
                loadManagedRooms(); // Load active rooms from server
              }} 
              className={`group relative px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all duration-300 transform hover:scale-105 flex-1 sm:flex-none min-w-0 ${
                manageMode==='rooms'
                  ?'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-indigo-500/25'
                  :'bg-white/80 backdrop-blur-sm text-slate-700 hover:text-slate-900 hover:bg-white/90 border border-slate-200/50 shadow-lg hover:shadow-xl'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2 justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="truncate">Rooms</span>
              </div>
            </button>
            <button 
              onClick={() => setManageMode('room-management')} 
              className={`group relative px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all duration-300 transform hover:scale-105 flex-1 sm:flex-none min-w-0 ${
                manageMode==='room-management'
                  ?'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-indigo-500/25'
                  :'bg-white/80 backdrop-blur-sm text-slate-700 hover:text-slate-900 hover:bg-white/90 border border-slate-200/50 shadow-lg hover:shadow-xl'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2 justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate hidden sm:inline">Room Management</span>
                <span className="truncate sm:hidden">Rooms</span>
              </div>
            </button>
            <button 
              onClick={() => { setManageMode('games'); setManageGameId(null); }} 
              className={`group relative px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all duration-300 transform hover:scale-105 flex-1 sm:flex-none min-w-0 ${
                manageMode==='games'
                  ?'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-indigo-500/25'
                  :'bg-white/80 backdrop-blur-sm text-slate-700 hover:text-slate-900 hover:bg-white/90 border border-slate-200/50 shadow-lg hover:shadow-xl'
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-2 justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="truncate">Games</span>
              </div>
            </button>
            <button 
              onClick={() => { if (manageGameId) setManageMode('questions'); else setManageMode('games'); }} 
              disabled={!manageGameId} 
              className={`group relative px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm transition-all duration-300 transform hover:scale-105 flex-1 sm:flex-none min-w-0 ${
                manageMode==='questions'
                  ?'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-indigo-500/25'
                  :'bg-white/80 backdrop-blur-sm text-slate-700 hover:text-slate-900 hover:bg-white/90 border border-slate-200/50 shadow-lg hover:shadow-xl'
              } ${!manageGameId?'opacity-50 cursor-not-allowed hover:scale-100':''}`}
            >
              <div className="flex items-center gap-1 sm:gap-2 justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="truncate">Questions</span>
              </div>
            </button>
            <button 
              onClick={()=> setShowAI(true)} 
              className="group relative px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm flex-1 sm:flex-none min-w-0"
            >
              <div className="flex items-center gap-1 sm:gap-2 justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="truncate hidden sm:inline">AI Builder</span>
                <span className="truncate sm:hidden">AI</span>
              </div>
            </button>
          </div>
          {statusMsg && (
            <div className="bg-gradient-to-r from-amber-50/80 to-yellow-50/80 border border-amber-200/50 text-amber-800 px-6 py-4 rounded-2xl text-sm font-medium shadow-lg backdrop-blur-md border-l-4 border-l-amber-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="font-semibold">{statusMsg}</span>
                </div>
                <div className="flex gap-2">
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
                      className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loadingMap.activateSession && <Spinner size="w-3 h-3" />}
                      Activate Now
                    </button>
                  )}
                  {statusMsg.includes('Unknown response') && roomCode && (
                    <button
                      onClick={() => loadRoomStatus(roomCode)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-2"
                    >
                      Retry
                    </button>
                  )}
                  {statusMsg.includes('Server response unclear') && roomCode && (
                    <button
                      onClick={() => loadRoomStatus(roomCode)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-2"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {manageMode==='rooms' && (
            <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 space-y-4 sm:space-y-6 lg:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent leading-tight">
                      Managed Rooms
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base lg:text-lg font-medium mt-1">{managedRooms.length} active room{managedRooms.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex gap-2 sm:gap-3 flex-wrap">
                  <button 
                    onClick={() => setManageMode('control')} 
                    className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 text-xs sm:text-sm font-semibold transition-all duration-300 hover:shadow-lg transform hover:scale-105 flex-1 sm:flex-none"
                  >
                    <div className="flex items-center gap-1 sm:gap-2 justify-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="truncate hidden sm:inline">Create New Room</span>
                      <span className="truncate sm:hidden">Create</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => setManageMode('room-management')} 
                    className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 text-xs sm:text-sm font-semibold transition-all duration-300 hover:shadow-lg transform hover:scale-105 flex-1 sm:flex-none"
                  >
                    <div className="flex items-center gap-1 sm:gap-2 justify-center">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate hidden sm:inline">Advanced Management</span>
                      <span className="truncate sm:hidden">Advanced</span>
                    </div>
                  </button>
                </div>
              </div>
              {loadingManagedRooms && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">Loading Rooms...</h3>
                  <p className="text-slate-600 text-lg">Fetching active rooms from server</p>
                </div>
              )}
              {roomManagementError && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-red-800 mb-3">Error Loading Rooms</h3>
                  <p className="text-red-600 text-lg mb-8 max-w-md mx-auto">{roomManagementError}</p>
                  <button 
                    onClick={() => loadManagedRooms()} 
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-pink-600 to-red-700 text-white hover:from-red-700 hover:via-pink-700 hover:to-red-800 text-lg font-semibold transition-all duration-300 hover:shadow-xl transform hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry
                    </div>
                  </button>
                </div>
              )}
              {!loadingManagedRooms && !roomManagementError && !managedRooms.length && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">No Rooms Yet</h3>
                  <p className="text-slate-600 text-lg mb-8 max-w-md mx-auto">Create your first game room to start hosting quiz sessions and engage with your audience.</p>
                  <button 
                    onClick={() => setManageMode('control')} 
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-800 text-lg font-semibold transition-all duration-300 hover:shadow-xl transform hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Your First Room
                    </div>
                  </button>
                </div>
              )}
              {!loadingManagedRooms && !roomManagementError && !!managedRooms.length && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/50 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-blue-900 mb-2">How to Manage Rooms</h4>
                        <ul className="text-sm text-blue-800 space-y-2">
                          <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-full"></span><strong>Switch:</strong> Select this room for active management</li>
                          <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-full"></span><strong>Activate/Host:</strong> {managedRooms.some(r => getGameSessionStateString(r.state) === 'Completed' || getGameSessionStateString(r.state) === 'Canceled') ? 'Activate completed/canceled sessions to allow players to join' : 'End active sessions first, then activate to host new games'}</li>
                          <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-full"></span><strong>End:</strong> End active sessions (Lobby/InProgress/WaitingForHost) to allow hosting new games</li>
                          <li className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-full"></span><strong>Delete:</strong> Permanently delete room from the system</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    {managedRooms.map(r => {
                      const title = r.gameTitle || safeGames.find(g => g.id === r.gameId)?.title || r.gameId || '—';
                      return (
                        <div key={r.roomCode} className={`group relative bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                          roomCode===r.roomCode 
                            ? 'border-indigo-300 shadow-lg shadow-indigo-500/20' 
                            : 'border-slate-200/50 shadow-lg hover:border-slate-300'
                        }`}>
                          {/* Room Code Header */}
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-bold text-xs sm:text-sm">{r.roomCode.slice(0, 2)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate">{r.roomCode}</h3>
                                <p className="text-xs sm:text-sm text-slate-600">{new Date(r.createdAt).toLocaleTimeString()}</p>
                              </div>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${
                              getGameSessionStateString(r.state) === 'Completed' ? 'bg-amber-400' :
                              getGameSessionStateString(r.state) === 'Lobby' ? 'bg-blue-400' :
                              getGameSessionStateString(r.state) === 'InProgress' ? 'bg-green-400' :
                              'bg-purple-400'
                            }`}></div>
                          </div>

                          {/* Game Info */}
                          <div className="mb-3 sm:mb-4">
                            <h4 className="font-semibold text-slate-800 mb-1 text-sm sm:text-base">Game</h4>
                            <p className="text-slate-600 text-xs sm:text-sm truncate" title={title}>{title}</p>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                              <span className="text-xs sm:text-sm font-medium text-slate-700">{r.playerCount} players</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className={`text-xs sm:text-sm font-medium ${
                                r.autoShowResults ? 'text-emerald-700' : 'text-slate-700'
                              }`}>
                                {r.autoShowResults ? 'Auto' : 'Manual'}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="mb-4 sm:mb-6">
                            <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
                              getGameSessionStateString(r.state) === 'Completed' ? 'bg-amber-100 text-amber-800' :
                              getGameSessionStateString(r.state) === 'Lobby' ? 'bg-blue-100 text-blue-800' :
                              getGameSessionStateString(r.state) === 'InProgress' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {getGameSessionStateString(r.state)}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            <button 
                              onClick={() => switchRoom(r.roomCode)} 
                              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-slate-700 text-xs font-semibold transition-all duration-200 hover:shadow-md"
                              title="Switch to this room for management"
                            >
                              Switch
                            </button>
                            <button 
                              onClick={() => loadRoomStatus(r.roomCode)} 
                              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-slate-700 text-xs font-semibold transition-all duration-200 hover:shadow-md"
                              title="Refresh room status from server"
                            >
                              Refresh
                            </button>
                            <button 
                              onClick={() => router.push(`/admin/host/${r.roomCode}?gameId=${r.gameId || ''}`)} 
                              className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all duration-200 hover:shadow-md ${
                                getGameSessionStateString(r.state) === 'Completed' || getGameSessionStateString(r.state) === 'Canceled'
                                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800'
                                  : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed opacity-60'
                              }`}
                              disabled={getGameSessionStateString(r.state) !== 'Completed' && getGameSessionStateString(r.state) !== 'Canceled'}
                              title={
                                getGameSessionStateString(r.state) === 'Completed' || getGameSessionStateString(r.state) === 'Canceled'
                                  ? 'Activate session to allow players to join'
                                  : 'End the current game first to host a new session'
                              }
                            >
                              {getGameSessionStateString(r.state) === 'Completed' || getGameSessionStateString(r.state) === 'Canceled' ? 'Activate' : 'End First'}
                            </button>
                            {getGameSessionStateString(r.state) !== 'Completed' && getGameSessionStateString(r.state) !== 'Canceled' && (
                              <button 
                                onClick={async () => {
                                  try {
                                    await endManagedRoom(r.roomCode);
                                    await loadManagedRooms(); // Refresh the rooms list
                                    setStatusMsg(`Room ${r.roomCode} ended successfully`);
                                  } catch (error) {
                                    console.error('Failed to end room:', error);
                                    setStatusMsg(`Failed to end room ${r.roomCode}`);
                                  }
                                }} 
                                className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 text-xs font-semibold transition-all duration-200 hover:shadow-md"
                                title="End the current session to allow hosting new games"
                              >
                                End
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setRoomToDelete({ roomCode: r.roomCode, gameTitle: title });
                                setShowDeleteConfirm(true);
                              }} 
                              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 text-xs font-semibold transition-all duration-200 hover:shadow-md"
                              title="Delete room permanently from the system"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {roomCode && <div className="text-[11px] text-gray-500">Active room: <span className="font-semibold">{roomCode}</span></div>}
            </div>
          )}

          {manageMode==='control' && phase==='setup' && (
            <div className="bg-white shadow rounded-xl p-6 border space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-wide text-gray-800 flex items-center gap-3">
                  Setup Room 
                  <ConnectionStatus showDetails={true} />
                </h2>
                {roomCode && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadRoomStatus(roomCode)}
                      className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                      title="Retry loading room status"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => {
                        setRoomCode('');
                        setPhase('setup');
                        setPlayers([]);
                        setQuestion(null);
                        setLeaderboard([]);
                        setFinalResults(null);
                        localStorage.removeItem('admin_current_room');
                        setStatusMsg('Room cleared');
                      }}
                      className="px-3 py-1.5 text-xs rounded bg-red-600 text-white font-semibold hover:bg-red-700"
                    >
                      Clear Room
                    </button>
                  </div>
                )}
              </div>
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
      
      {/* Beautiful Delete Confirmation Modal */}
        {showDeleteConfirm && roomToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 max-w-md w-full shadow-2xl border border-white/20 transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Delete Room</h3>
                <p className="text-sm sm:text-base text-slate-600">This action cannot be undone</p>
              </div>
            </div>

            {/* Content */}
            <div className="mb-6 sm:mb-8">
              <p className="text-slate-700 text-base sm:text-lg mb-3 sm:mb-4">
                Are you sure you want to permanently delete room <span className="font-bold text-slate-900">{roomToDelete.roomCode}</span>?
              </p>
              {roomToDelete.gameTitle && (
                <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200">
                  <p className="text-xs sm:text-sm text-slate-600 mb-1">Game:</p>
                  <p className="font-semibold text-sm sm:text-base text-slate-800">{roomToDelete.gameTitle}</p>
                </div>
              )}
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 rounded-xl sm:rounded-2xl border border-red-200">
                <div className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-red-800 mb-1">Warning</p>
                    <p className="text-xs sm:text-sm text-red-700">This will permanently remove the room and all its data from the system.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setRoomToDelete(null);
                }}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 text-xs sm:text-sm font-semibold transition-all duration-300 hover:shadow-lg transform hover:scale-105"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteManagedRoom(roomToDelete.roomCode);
                    await loadManagedRooms(); // Refresh the rooms list
                    setStatusMsg(`Room ${roomToDelete.roomCode} deleted successfully`);
                    setShowDeleteConfirm(false);
                    setRoomToDelete(null);
                  } catch (error) {
                    console.error('Failed to delete room:', error);
                    setStatusMsg(`Failed to delete room ${roomToDelete.roomCode}`);
                  }
                }}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 text-xs sm:text-sm font-semibold transition-all duration-300 hover:shadow-xl transform hover:scale-105"
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="truncate">Delete Room</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

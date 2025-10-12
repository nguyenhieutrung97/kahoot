"use client";

import { useCallback, useEffect, useRef, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameHub } from '@/hooks/useGameHub';
import { GameHeader } from '@/components/ui/GameHeader';
import { Loader2, Users, Gamepad2, Timer, Trophy, ArrowLeft, Play, Crown } from 'lucide-react';

interface LobbyPlayer { id?: string; playerId?: string; userName?: string; name?: string; isConnected?: boolean; score?: number; rank?: number; progress?: any; }
interface QuestionEnvelope { questionIndex?: number; totalQuestions?: number; questionText?: string; answers?: any[]; timeLimitSeconds?: number; startTime?: string; isMultipleChoice?: boolean; correctAnswers?: any[]; correctAnswer?: any; questionType?: string; }

export default function AdminHostRoomPage(props: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(props.params);
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId') || undefined;
  const router = useRouter();

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
        if (prev === null) return prev; if (prev <= 1) { stopTimer(); return 0; } return prev - 1;
      });
    }, 1000);
  }, []);
  useEffect(() => () => { stopTimer(); stopAutoAdvanceTimer(); }, []);

  const { ensureConnected, startGame, proceedToNextQuestion, showFinalLeaderboard, requestRoomStatus, updateAutoShowResults, activateGameSession } = useGameHub({
    onLobbyInfo: (p: any) => { 
      setPlayers(p.players || []); 
      setCanStart(!!p.canStart || (p.players||[]).length>0); 
      setStatusMsg('Lobby active'); 
      setIsSessionActivated(true);
      if (typeof p.autoShowResults === 'boolean') setAutoShowResults(p.autoShowResults); 
    },
    onLobbyUpdate: (p: any) => { setPlayers(p.players || []); setCanStart(!!p.canStart || (p.players||[]).length>0); },
    onPlayerJoined: (p: any) => { setPlayers(p.players || []); setCanStart((p.players||[]).length>0); },
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

  useEffect(() => { (async() => { try { await ensureConnected(); await requestRoomStatus(roomCode); setStatusMsg('Connected - Game session is in Completed state. Click "Activate Session" to allow players to join.'); } catch (e:any) { console.error('[HostRoom] initial connect failed', e); setStatusMsg(`Unable to connect: ${e?.message||'error'}`); } })(); }, [roomCode, ensureConnected, requestRoomStatus]);

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
            <span className="font-medium">{statusMsg}</span>
          </div>
        )}
        {phase === 'lobby' && renderLobby()}
        {phase === 'game' && renderGame()}
        {phase === 'results' && renderResults()}
      </div>
    </div>
  );
}

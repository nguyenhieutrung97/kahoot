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
  const timerRef = useRef<any>(null);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
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
  useEffect(() => () => stopTimer(), []);

  const { ensureConnected, startGame, proceedToNextQuestion, showFinalLeaderboard, requestRoomStatus } = useGameHub({
    onLobbyInfo: (p: any) => { setPlayers(p.players || []); setCanStart(!!p.canStart || (p.players||[]).length>0); setStatusMsg('Lobby active'); if (typeof p.autoShowResults === 'boolean') setAutoShowResults(p.autoShowResults); },
    onLobbyUpdate: (p: any) => { setPlayers(p.players || []); setCanStart(!!p.canStart || (p.players||[]).length>0); },
    onPlayerJoined: (p: any) => { setPlayers(p.players || []); setCanStart((p.players||[]).length>0); },
    onGameStarted: () => { setPhase('game'); setStatusMsg('Game started'); setQuestion(null); setLeaderboard([]); },
    onHostNewQuestion: (payload: QuestionEnvelope) => {
      setQuestion(payload);
      setQuestionAnswers((payload.answers||[]).map((a:any,i:number)=>({ id: a.id||a.answerId||i, title: a.title||a.text||a.answer||`Answer ${i+1}`, isCorrect: !!(a.isCorrect || a.correct)})));
      setLastResults(null);
      startTimer(payload);
    },
    onQuestionResults: (payload: any) => { setLastResults(payload); if (Array.isArray(payload.leaderboard)) setLeaderboard(payload.leaderboard); stopTimer(); },
    onProceedingToNextQuestion: () => { setQuestion(null); setQuestionAnswers([]); setLastResults(null); stopTimer(); },
    onFinalResults: (payload: any) => { setFinalResults(payload); setPhase('results'); setStatusMsg('Final results'); },
    onGameEnded: (payload: any) => { setFinalResults(payload); setPhase('results'); setStatusMsg('Game ended'); },
    onError: (m: any) => setStatusMsg(typeof m === 'string' ? m : (m?.message || 'Error'))
  });

  useEffect(() => { (async() => { try { await ensureConnected(); await requestRoomStatus(roomCode); setStatusMsg('Connected'); } catch (e:any) { console.error('[HostRoom] initial connect failed', e); setStatusMsg(`Unable to connect: ${e?.message||'error'}`); } })(); }, [roomCode, ensureConnected, requestRoomStatus]);

  const handleStart = async () => { try { await startGame(roomCode); } catch { setStatusMsg('Start failed'); } };
  const handleNext = async () => { try { await proceedToNextQuestion(roomCode); } catch { setStatusMsg('Next failed'); } };
  const handleShowFinal = async () => { try { await showFinalLeaderboard(roomCode); } catch { setStatusMsg('Show final failed'); } };
  const handleBack = () => router.push('/admin');

  const questionProgress = question ? `${question.questionIndex}/${question.totalQuestions}` : '';

  const Badge = ({ children, tone='gray'}: { children: any; tone?: 'gray'|'indigo'|'green'|'red'|'yellow' }) => {
    const map: Record<string,string> = { gray:'bg-gray-200 text-gray-700', indigo:'bg-indigo-100 text-indigo-700', green:'bg-green-100 text-green-700', red:'bg-red-100 text-red-600', yellow:'bg-yellow-100 text-yellow-700'};
    return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${map[tone]}`}>{children}</span>;
  };

  const SectionCard: React.FC<{ title: string; actions?: React.ReactNode; children: React.ReactNode; dense?: boolean; }> = ({ title, actions, children, dense }) => (
    <div className={`bg-white border rounded-xl ${dense? 'p-4':'p-6'} shadow-sm space-y-4`}> <div className="flex items-center justify-between gap-4 flex-wrap"> <h3 className="font-semibold text-sm tracking-wide text-gray-700 flex items-center gap-2">{title}</h3> {actions} </div> <div className="space-y-3">{children}</div> </div>
  );

  const renderLobby = () => (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <SectionCard title="Lobby Players" actions={<Badge tone={canStart? 'green':'gray'}>{players.length} Joined</Badge>}>
          <div className="grid sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {players.map(p => {
              const id = p.playerId || p.id;
              return <div key={id} className="border rounded-lg p-3 flex justify-between items-center bg-gray-50 hover:bg-white transition text-xs"> <div className="flex flex-col min-w-0"> <span className="font-semibold truncate">{p.userName || p.name || id}</span> </div> <div className="flex items-center gap-2"> {p.isConnected ? <Badge tone="green">ON</Badge> : <Badge tone="red">OFF</Badge>} </div> </div>;
            })}
            {!players.length && <div className="text-[11px] text-gray-400">No players yet</div>}
          </div>
        </SectionCard>
        <SectionCard title="Controls" dense>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleStart} disabled={!canStart} className="inline-flex items-center gap-1 px-4 py-2 rounded bg-green-600 text-white text-xs font-semibold disabled:opacity-40"><Play className="w-3 h-3"/>Start Game</button>
            <button onClick={handleBack} className="inline-flex items-center gap-1 px-4 py-2 rounded border text-xs font-medium"><ArrowLeft className="w-3 h-3"/>Admin</button>
          </div>
          <div className="text-[11px] text-gray-500 pt-1">Game ID: {gameId || '—'} • Room: {roomCode} • Mode: {autoShowResults ? 'Auto Results':'Manual Results'}</div>
        </SectionCard>
      </div>
      <div className="space-y-6">
        <SectionCard title="Room Status">
          <div className="text-xs grid gap-2">
            <div className="flex items-center gap-2"><Users className="w-3 h-3 text-indigo-600"/><span>{players.length} Player(s)</span></div>
            <div className="flex items-center gap-2"><Gamepad2 className="w-3 h-3 text-indigo-600"/><span>Can Start: {canStart? 'Yes':'No'}</span></div>
            <div className="flex items-center gap-2"><Timer className="w-3 h-3 text-indigo-600"/><span>Phase: {phase}</span></div>
            <div className="flex items-center gap-2"><Trophy className="w-3 h-3 text-indigo-600"/><span>Results Mode: {autoShowResults? 'Auto':'Manual'}</span></div>
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="space-y-6">
      <SectionCard title="Current Question" actions={<div className="flex items-center gap-2"> {question && <Badge tone="indigo">{questionProgress}</Badge>} {typeof timeLeft==='number' && <Badge tone={timeLeft<=5? 'red':'gray'}>{timeLeft}s</Badge>} </div>}>
        {!question && <div className="text-xs text-gray-500">Waiting for question...</div>}
        {question && (
          <div className="space-y-4">
            <div className="p-4 rounded bg-gray-50 border text-sm font-medium leading-relaxed">{question.questionText}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {questionAnswers.map(a => (
                <div key={a.id} className={`p-3 rounded border text-xs flex justify-between items-center ${a.isCorrect ? 'bg-green-50 border-green-300':'bg-white'}`}> <span className="truncate pr-2 font-medium">{a.title}</span> {a.isCorrect && <Badge tone="green">Correct</Badge>} </div>
              ))}
              {!questionAnswers.length && <div className="text-[11px] text-gray-400">No answers</div>}
            </div>
          </div>
        )}
        {lastResults && (
          <div className="mt-4 p-4 rounded border bg-white shadow-inner space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wide text-gray-700">Question Results</h4>
            <div className="text-[11px] text-gray-500">Answered: {lastResults.playersAnswered}/{lastResults.totalPlayers}</div>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {leaderboard.map((p: any, idx:number) => (
                <div key={p.playerId || idx} className="flex items-center justify-between text-xs border rounded px-3 py-1 bg-gray-50"> <div className="flex items-center gap-2 truncate"><span className="text-[10px] font-bold text-gray-500 w-5">#{p.rank ?? (idx+1)}</span><span className="truncate font-medium">{p.userName || p.name}</span>{idx===0 && <Crown className="w-3 h-3 text-yellow-500"/>}</div> <div className="flex items-center gap-3"><span className="text-[10px] text-indigo-600 font-semibold">{p.score} pts</span>{typeof p.progress !== 'undefined' && <Badge tone="indigo">{p.progress}</Badge>}</div> </div>
              ))}
              {!leaderboard.length && <div className="text-[11px] text-gray-400">No leaderboard data</div>}
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-2 flex-wrap">
          <button onClick={handleNext} className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-semibold">Next Question</button>
          <button onClick={handleShowFinal} className="px-4 py-2 bg-green-600 text-white rounded text-xs font-semibold">Final Leaderboard</button>
          <button onClick={handleBack} className="px-4 py-2 border rounded text-xs font-medium">End / Back</button>
        </div>
      </SectionCard>
      <SectionCard title={`Players (${players.length})`}>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {players.map(p => (
            <div key={p.playerId || p.id} className="flex items-center justify-between text-[11px] border rounded px-2 py-1 bg-gray-50"> <span className="truncate font-medium">{p.userName || p.name}</span> <div className="flex items-center gap-1"> {p.isConnected ? <Badge tone="green">on</Badge> : <Badge tone="red">off</Badge>} </div> </div>
          ))}
          {!players.length && <div className="text-[10px] text-gray-500">No players</div>}
        </div>
      </SectionCard>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      <SectionCard title="Final Results" actions={<Badge tone="indigo">Room {roomCode}</Badge>}>
        {!finalResults && <div className="text-xs text-gray-500">Awaiting final results...</div>}
        {finalResults && (
          <>
            <div className="grid sm:grid-cols-4 gap-3 text-[11px] mb-2">
              <div className="p-3 rounded border bg-gray-50"><div className="font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">Players</div><div className="text-base font-bold text-gray-900">{finalResults.totalPlayers || finalResults.playerCount || players.length}</div></div>
              <div className="p-3 rounded border bg-gray-50"><div className="font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">Questions</div><div className="text-base font-bold text-gray-900">{finalResults.totalQuestions || question?.totalQuestions || 0}</div></div>
              <div className="p-3 rounded border bg-gray-50"><div className="font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">Winner</div><div className="text-xs font-bold text-green-700 truncate">{(finalResults.finalLeaderboard || finalResults.topPlayers || [])[0]?.userName || (finalResults.first?.name)}</div></div>
              <div className="p-3 rounded border bg-gray-50"><div className="font-semibold text-gray-600 mb-0.5 uppercase tracking-wide">High Score</div><div className="text-base font-bold text-indigo-700">{(finalResults.finalLeaderboard || finalResults.topPlayers || [])[0]?.score || finalResults.highestScore || 0}</div></div>
            </div>
            <div className="space-y-1 max-h-[420px] overflow-y-auto border rounded p-3 bg-gray-50">
              {(finalResults.finalLeaderboard || finalResults.topPlayers || finalResults.leaderboard || []).map((p: any, idx: number) => (
                <div key={p.playerId || p.id || idx} className={`flex items-center justify-between text-xs border rounded px-3 py-1 bg-white ${idx < 3 ? 'shadow-sm' : ''}`}> <div className="flex items-center gap-2 truncate"><span className="text-[10px] font-bold text-gray-500 w-5">#{p.rank ?? (idx + 1)}</span><span className="truncate font-medium">{p.userName || p.name}</span>{idx === 0 && <Crown className="w-3 h-3 text-yellow-500"/>}</div> <div className="flex items-center gap-3"><span className="text-[10px] font-semibold text-indigo-600">{p.score} pts</span>{typeof p.progress !== 'undefined' && <Badge tone="indigo">{p.progress}</Badge>}</div> </div>
              ))}
            </div>
            <div className="pt-3"><button onClick={handleBack} className="px-5 py-2 rounded bg-red-600 text-white text-xs font-semibold">Back to Admin</button></div>
          </>
        )}
      </SectionCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <GameHeader title={`Host • Room ${roomCode}`} withSvgBorder />
        {statusMsg && <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded text-xs flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/>{statusMsg}</div>}
        {phase === 'lobby' && renderLobby()}
        {phase === 'game' && renderGame()}
        {phase === 'results' && renderResults()}
      </div>
    </div>
  );
}

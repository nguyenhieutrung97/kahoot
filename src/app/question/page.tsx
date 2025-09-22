"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GameHeader } from '@/components/ui/GameHeader';
import { GameButton } from '@/components/ui/GameButton';
import { useGameHub } from '@/hooks/useGameHub';
import { useFinalResult } from '@/context/FinalResultContext';
import { normalizeLeaderboard, NormalizedLeaderboardPlayer } from '@/lib/normalizers/leaderboard';
import TopPlayersList from '@/components/ui/TopPlayersList';
import { useGameAudio } from '@/hooks/useGameAudio';

type Answer = {
  id: string;
  text: string;
};

// Lightweight event payload typing (extend as needed)
interface NewQuestionPayload {
  questionIndex?: number;
  index?: number;
  questionText?: string;
  question?: any;
  answers?: any[];
  choices?: any[];
  isMultipleChoice?: boolean;
  isMultiple?: boolean;
  isMultipleAnswers?: boolean;
  multiple?: boolean;
  questionType?: string;
  type?: string;
  timeLimitSeconds?: number;
  startTime?: string;
}

// Helper to extract answer display text
const extractAnswerText = (a: any): string => {
  if (a == null) return '';
  if (typeof a === 'string' || typeof a === 'number') return String(a);
  const candidates = [a.title, a.text, a.answer, a.value, a.label, a.display, a.content];
  for (const c of candidates) {
    if (c == null) continue;
    if (typeof c === 'string' || typeof c === 'number') return String(c);
    if (typeof c === 'object' && c.text) return String(c.text);
  }
  try { return JSON.stringify(a); } catch { return String(a); }
};

export default function QuestionPage() {
  const { setResult } = useFinalResult();
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = searchParams.get('gameId') || '';
  const playerName = searchParams.get('name') || '';
  const questionNumber = Number(searchParams.get('questionNumber') || '1');

  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // for MultipleChoice
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showResult, setShowResult] = useState<{ correct: boolean; message: string } | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [playerScore, setPlayerScore] = useState<number | null>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [normalizedTopPlayers, setNormalizedTopPlayers] = useState<NormalizedLeaderboardPlayer[]>([]); // NEW normalized list
  const [fatalError, setFatalError] = useState<string | null>(null); // NEW
  const timerRef = useRef<number | null>(null);
  const autoFinalTimeoutRef = useRef<any>(null); // NEW
  const lastQuestionDoneRef = useRef(false); // NEW
  // New state to reflect current question number driven by NewQuestion events
  const [displayQuestionNumber, setDisplayQuestionNumber] = useState<number>(questionNumber);
  const [totalTime, setTotalTime] = useState<number | null>(null); // NEW total time for progress bar
  
  // Music centralized via useGameAudio hook (replaces legacy inline audio logic)
  const {
    musicEnabled, setMusicEnabled,
    bgTrack, setBgTrack,
    isBgPlaying,
    playEffect,
    startBackground: startBackgroundMusic,
    stopBackground: stopBackgroundMusic
  } = useGameAudio();

  const { connected, submitAnswer, submitMultipleAnswers } = useGameHub({
    onError: (msg) => { // NEW
      const m = typeof msg === 'string' ? msg : (msg && (msg as any).message) || 'Unknown error';
      const lower = m.toLowerCase();
      if (lower.includes('session not found')) {
        setFatalError('Sorry player, game session not found. Redirecting to home...');
      } else {
        setFatalError('Sorry player, an error occurred. Redirecting to home...');
      }
      clearTimer();
      try { if (autoFinalTimeoutRef.current) clearTimeout(autoFinalTimeoutRef.current); } catch {}
      setTimeout(() => router.push('/'), 2000);
    },
    onFinalResults: (payload) => { setResult(payload); router.push('/final'); },
    onGameEnded: (payload) => { try { setResult(payload); } catch {}; router.push('/final'); },
    onNewQuestion: (payload) => {
      try {
        // Derive question index (0-based from server) and map to 1-based for display
        const rawIndex = typeof payload?.questionIndex === 'number'
          ? payload.questionIndex
          : typeof payload?.index === 'number'
            ? payload.index
            : (displayQuestionNumber - 1);
        setDisplayQuestionNumber(rawIndex);

        // Robustly extract question text
        const qText = payload?.questionText || (payload as any)?.question?.text || (payload as any)?.text || (payload as any)?.question || '';
        setQuestionText(typeof qText === 'string' ? qText : JSON.stringify(qText));

        const answerArray = (payload.answers || payload.choices || []) as any[];
        setAnswers(answerArray.map((a: any, idx: number) => ({ id: String(a?.id ?? a?.answerId ?? a?.key ?? idx), text: extractAnswerText(a) })));

        const multi = !!(
          payload?.isMultipleChoice ||
          payload?.isMultiple ||
          payload?.isMultipleAnswers ||
          payload?.multiple ||
          payload?.questionType === 'MultipleChoice' ||
          payload?.type === 'MultipleChoice'
        );
        setIsMultipleChoice(multi);

        setSelectedIds([]);
        setSelected(null);
        setHasSubmitted(false);
        setShowResult(null);
        setCorrectAnswers([]);

        // Determine total time limit strictly from timeLimitSeconds (fallback to 20 if missing)
        const totalLimit = (typeof payload?.timeLimitSeconds === 'number' && !isNaN(payload.timeLimitSeconds)) ? payload.timeLimitSeconds : 20;
        setTotalTime(totalLimit); // track total
        let remaining = totalLimit;
        if (payload?.startTime && totalLimit > 0) {
          const startMs = Date.parse(payload.startTime);
          if (!isNaN(startMs)) {
            const elapsed = (Date.now() - startMs) / 1000;
            remaining = Math.max(0, Math.round(totalLimit - elapsed));
          }
        }
        startTimer(remaining);
        
        // Play question start sound
        playEffect('question');
        // Start background music for question
        startBackgroundMusic();
      } catch (e) {
        console.error('Failed to prepare question', e);
      }
    },
    onQuestionTimeEnded: (payload) => {
      setTimeLeft(0);
      if (!hasSubmitted) {
        // Try to extract correctness, message, and correct answers from payload
        let correct = false;
        let message = 'Time is up!';
        let correctAns: string[] = [];
        if (payload && typeof payload === 'object') {
          if ('correct' in payload) correct = !!(payload as any).correct;
          if ('isCorrect' in payload) correct = !!(payload as any).isCorrect;
          if (typeof (payload as any).message === 'string') message = (payload as any).message;
          if (Array.isArray((payload as any).correctAnswers)) {
            correctAns = (payload as any).correctAnswers.map((a: any) => typeof a === 'object' && a.id ? String(a.id) : String(a));
          } else if (Array.isArray((payload as any).answers)) {
            // fallback: look for answers with isCorrect flag
            correctAns = (payload as any).answers.filter((a: any) => a.isCorrect || a.correct).map((a: any) => String(a.id ?? a.answerId ?? a.key ?? a.text ?? a));
          }
        }
        setShowResult({ correct, message });
        setCorrectAnswers(correctAns);
        
        // Play timeout sound
        playEffect('timeout');
      }
      // Fade out background
      stopBackgroundMusic();
      // Mark that time ended for potential final redirect gating
      if (payload?.totalQuestions && payload?.questionIndex && (payload.questionIndex >= payload.totalQuestions)) {
        lastQuestionDoneRef.current = true;
      }
    },
    onProceedingToNextQuestion: () => {},
    onPlayerQuestionResult: (payload) => {
      try {
        clearTimer();
        setTimeLeft(0);
        // Extract correctness
        const isCorrect = !!(payload?.isCorrect || payload?.correct);
        // Extract correct answers ids
        let correctIds: string[] = [];
        if (Array.isArray(payload?.correctAnswers) && payload.correctAnswers.length) {
          correctIds = payload.correctAnswers.map((a: any) => String(a?.id ?? a?.answerId ?? a));
        } else if (Array.isArray(payload?.answers)) {
          correctIds = payload.answers.filter((a: any) => a?.isCorrect || a?.correct).map((a: any) => String(a?.id ?? a?.answerId ?? a?.key ?? a));
        } else if (payload?.correctAnswer) {
          correctIds = [String((payload as any).correctAnswer.id || (payload as any).correctAnswer.answerId || (payload as any).correctAnswer)];
        }
        setCorrectAnswers(correctIds);
        const msg = isCorrect ? 'Correct!' : 'Incorrect';
        setShowResult({ correct: isCorrect, message: msg });
        playEffect(isCorrect ? 'correct' : 'incorrect');
        stopBackgroundMusic();
        if (typeof payload?.currentRank === 'number') setPlayerRank(payload.currentRank);
        if (typeof payload?.score === 'number') setPlayerScore(payload.score);
        // Normalize leaderboard data from payload
        const lb = normalizeLeaderboard(payload);
        setNormalizedTopPlayers(lb.players.slice(0, 5));
        setTopPlayers(lb.players.slice(0, 5).map(p => ({
          playerId: p.id,
            userName: p.name,
            score: p.score,
            rank: p.rank || undefined,
            // keep any original timing fields
            timeTaken: (p.raw && (p.raw.timeTaken ?? p.raw.answerTime))
        })));
        setHasSubmitted(true);
      } catch (e) {
        console.error('Failed handling PlayerQuestionResult', e);
      }
    }
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((initial: number) => {
    clearTimer();
    if (initial <= 0) { setTimeLeft(0); return; }
    setTimeLeft(initial);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) { clearTimer(); return 0; }
        
        // Play tick sound for last 5 seconds
        if (prev <= 5) {
          playEffect('tick');
        }
        
        return prev - 1;
      });
    }, 1000) as any;
  }, [clearTimer, playEffect]);

  useEffect(() => () => { clearTimer(); }, [clearTimer]);

  const handleSelect = (id: string) => {
    if (!connected || hasSubmitted || (timeLeft !== null && timeLeft <= 0)) return;
    if (isMultipleChoice) {
      // Toggle selection (allow deselect)
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      return;
    }
    // SingleChoice: just select, do not submit yet
    setSelected(id);
  };

  const handleSubmitSingle = async () => {
    if (hasSubmitted || !selected) return;
    setHasSubmitted(true);
    setShowResult(null);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await submitAnswer(selected);
    } catch (e) {
      console.error('Submit failed', e);
      setHasSubmitted(false);
    }
  };

  const handleSubmitMultiple = async () => {
    if (hasSubmitted || selectedIds.length === 0) return;
    setHasSubmitted(true);
    setShowResult(null);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await submitMultipleAnswers(selectedIds);
      // show confirmation (hasSubmitted already true)
    } catch (e) {
      console.error('Submit multiple failed', e);
      setHasSubmitted(false);
    }
  };

  // Early error UI
  if (fatalError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GameHeader title="QUESTION" withSvgBorder />
        <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-red-200 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 uppercase tracking-wide mb-4">ERROR</h2>
            <div className="w-16 h-1 bg-red-600 mx-auto mb-4" />
            <p className="text-gray-700 font-medium mb-6">{fatalError}</p>
            <p className="text-xs text-gray-400">If not redirected automatically, <button onClick={() => router.push('/')} className="underline text-red-600">click here</button>.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <GameHeader title="QUESTION" withSvgBorder />
      <main className="px-6 py-6 max-w-3xl mx-auto">
        <div className="bg-white/90 backdrop-blur rounded-xl p-6 shadow-xl border border-gray-200/70 relative overflow-hidden">
          {!connected && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
              <div className="text-xs font-semibold text-gray-600 tracking-wider uppercase">Connecting…</div>
            </div>
          )}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_20%_20%,#f87171,transparent_60%)]" />
          {/* Timer Progress */}
          {totalTime !== null && timeLeft !== null && (
            <div className="mb-5">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-600 transition-[width] duration-1000 ease-linear"
                  style={{ width: `${Math.max(0, Math.min(100, (timeLeft / (totalTime || 1)) * 100))}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] font-medium tracking-wide text-gray-500">
                <span>Time Remaining</span>
                <span>{timeLeft}s</span>
              </div>
            </div>
          )}

          <h2 className="text-sm font-semibold tracking-widest text-red-600 mb-1">QUESTION {displayQuestionNumber}</h2>
          <h3 className="text-xl font-bold mb-4 leading-snug text-gray-800 min-h-[2.5rem] transition-colors">
            {questionText || 'Waiting for question...'}
          </h3>
          <div className="flex items-center justify-between mb-4 text-xs uppercase tracking-wide">
            <div className={`px-2 py-1 rounded-full border ${isMultipleChoice ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{isMultipleChoice ? 'Multiple Choice' : 'Single Choice'}</div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMusicEnabled(!musicEnabled)}
                className={`px-2 py-1 rounded-full border text-xs font-medium transition-colors ${
                  musicEnabled 
                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
                title={musicEnabled ? 'Disable sounds' : 'Enable sounds'}
              >
                {musicEnabled ? '🔊' : '🔇'} {musicEnabled ? 'Sound On' : 'Sound Off'}
              </button>
              <select
                value={bgTrack}
                onChange={(e) => setBgTrack((e.target.value as 'energy' | 'mystery'))}
                disabled={!musicEnabled}
                className={`px-2 py-1 rounded-full border text-xs font-medium transition-colors ${!musicEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                title="Background track"
              >
                <option value="energy">Energy</option>
                <option value="mystery">Mystery</option>
              </select>
              <button
                onClick={() => (isBgPlaying ? stopBackgroundMusic(true) : startBackgroundMusic())}
                disabled={!musicEnabled}
                className={`px-2 py-1 rounded-full border text-xs font-medium transition-colors ${
                  isBgPlaying
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                } ${!musicEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                title={isBgPlaying ? 'Stop background music' : 'Start background music'}
              >
                {isBgPlaying ? '🎼 Playing' : '▶️ Music'}
              </button>
              <div className="text-gray-400 font-medium">Player: <span className="text-gray-600">{playerName || 'You'}</span></div>
            </div>
          </div>

          {isMultipleChoice && !hasSubmitted && (
            <div className="mb-3 text-[11px] font-medium text-blue-600 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Select all applicable answers then press Submit.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5" key={displayQuestionNumber}>
            {answers.length > 0 ? answers.map((a, idx) => {
              const isSelected = selectedIds.includes(a.id) || selected === a.id;
              const isCorrect = showResult && correctAnswers.includes(a.id);
              const isIncorrectSelection = showResult && !isCorrect && isSelected;
              // Removed (isMultipleChoice && isSelected) from disabled condition to allow toggling
              const disabled = !connected || hasSubmitted || (timeLeft !== null && timeLeft <= 0);
              const base = 'relative group p-4 rounded-xl border transition-all text-left shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2';
              const stateColor = isCorrect
                ? 'border-green-600 bg-green-50'
                : isIncorrectSelection
                  ? 'border-red-600 bg-red-50'
                  : isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-300';
              return (
                <button
                  key={a.id}
                  onClick={() => handleSelect(a.id)}
                  disabled={disabled}
                  className={`${base} ${stateColor} ${disabled && !showResult ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 shadow ${isCorrect ? 'bg-green-600 text-white' : isIncorrectSelection ? 'bg-red-600 text-white' : isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors'}`}>{String.fromCharCode(65 + idx)}</div>
                    <div className="flex-1 text-sm text-gray-700 font-medium leading-snug">{a.text}</div>
                    {isCorrect ? <div className="text-green-600 font-bold text-lg leading-none">✓</div> : null}
                    {isIncorrectSelection ? <div className="text-red-600 font-bold text-lg leading-none">✗</div> : null}
                    {!isCorrect && !isIncorrectSelection && isSelected ? <div className="text-indigo-500 font-bold text-lg leading-none">•</div> : null}
                  </div>
                </button>
              );
            }) : (
              <div className="col-span-full flex flex-col items-center justify-center py-10 text-center" aria-live="polite">
                <div className="w-12 h-12 border-4 border-indigo-500/60 border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-sm font-medium text-gray-600">Loading answers…</div>
                <div className="text-[11px] text-gray-400 mt-1">Waiting for host to send options</div>
              </div>
            )}
          </div>

          {/* Submit control for both types */}
          {isMultipleChoice ? (
            <div className="mt-1">
              <GameButton onClick={handleSubmitMultiple} disabled={!connected || hasSubmitted || selectedIds.length === 0}>
                {hasSubmitted ? 'Submitted' : `Submit Selected (${selectedIds.length})`}
              </GameButton>
              {hasSubmitted ? <div className="text-xs text-green-600 mt-2 font-medium">Answer submitted!</div> : null}
            </div>
          ) : (
            <div className="mt-1">
              <GameButton onClick={handleSubmitSingle} disabled={!connected || hasSubmitted || !selected}>
                {hasSubmitted ? 'Submitted' : 'Submit'}
              </GameButton>
              {hasSubmitted ? <div className="text-xs text-green-600 mt-2 font-medium">Answer submitted!</div> : null}
            </div>
          )}

          {showResult && (
            <div className={`mt-6 p-4 rounded-lg text-center font-semibold text-sm tracking-wide ${showResult.correct ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200'}`}>
              <div className="flex items-center justify-center gap-2">
                {showResult.correct ? <span className="text-lg">🎉</span> : <span className="text-lg">⚠️</span>}
                <span>{showResult.message}</span>
              </div>
              {correctAnswers.length > 0 && (
                <div className="mt-2 text-xs font-normal text-gray-700">
                  Correct answer{correctAnswers.length > 1 ? 's' : ''}: {answers.filter(a => correctAnswers.includes(a.id) || correctAnswers.includes(a.text)).map(a => a.text).join(', ')}
                </div>
              )}
            </div>
          )}

          {showResult && topPlayers.length > 0 && (
            <TopPlayersList
              players={normalizedTopPlayers}
              playerRank={playerRank}
              playerScore={playerScore}
              className="mt-6"
            />
          )}

          <div className="mt-8 flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <div>Player: <span className="text-gray-700 font-semibold">{playerName || 'You'}</span></div>
            {totalTime !== null && (
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>{timeLeft !== null ? `${timeLeft}s / ${totalTime}s` : '--'}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFinalResult } from '@/context/FinalResultContext';
import { GameHeader } from '@/components/ui/GameHeader';
import { GameButton } from '@/components/ui/GameButton';
import { useGameHub } from '@/hooks/useGameHub';
import { normalizeLeaderboard, NormalizedLeaderboardPlayer } from '@/lib/normalizers/leaderboard';
import TopPlayersList from '@/components/ui/TopPlayersList';
import PodiumTop3 from '@/components/ui/PodiumTop3';
import { useGameAudio } from '@/hooks/useGameAudio';

export default function FinalPage() {
  const { result, setResult } = useFinalResult();
  const router = useRouter();

  const [gotQuestionTimeEnded, setGotQuestionTimeEnded] = useState(false);
  const [gotPlayerQuestionResult, setGotPlayerQuestionResult] = useState(false);
  const [playerResultPayload, setPlayerResultPayload] = useState<any>(null);
  // NEW readiness related state
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [finalResultsTimeoutReached, setFinalResultsTimeoutReached] = useState(false);
  const finalResultsTimerRef = useRef<number | null>(null);

  const { connected, client } = useGameHub({
    onQuestionTimeEnded: (payload) => { 
      setGotQuestionTimeEnded(true); 
      try {
        const tq = payload?.totalQuestions ?? payload?.TotalQuestions ?? payload?.questionCount;
        const qi = payload?.questionIndex ?? payload?.QuestionIndex ?? payload?.index ?? payload?.questionNumber;
        if (typeof tq === 'number' && typeof qi === 'number') {
          // Backend might be 0 or 1 based; treat last if qi >= tq - 1 (0-based) OR qi === tq (1-based)
            if (qi === tq || qi === tq - 1) setIsLastQuestion(true);
        }
      } catch {}
    },
    onPlayerQuestionResult: (payload) => { 
      setGotPlayerQuestionResult(true); 
      setPlayerResultPayload(payload); 
      try {
        const tq = payload?.totalQuestions ?? payload?.TotalQuestions ?? payload?.questionCount;
        const qi = payload?.questionIndex ?? payload?.QuestionIndex ?? payload?.index ?? payload?.questionNumber;
        if (typeof tq === 'number' && typeof qi === 'number') {
          if (qi === tq || qi === tq - 1) setIsLastQuestion(true);
        }
      } catch {}
    },
    onFinalResults: (payload) => { 
      try { setResult(payload); } catch {}; 
      // If final results arrive, cancel fallback timer
      if (finalResultsTimerRef.current) { clearTimeout(finalResultsTimerRef.current); finalResultsTimerRef.current = null; }
    },
    onGameEnded: () => { /* optional */ }
  });

  // Start fallback timer only when last question result received but final results not yet present.
  useEffect(() => {
    if (result) { // final results arrived
      if (finalResultsTimerRef.current) { clearTimeout(finalResultsTimerRef.current); finalResultsTimerRef.current = null; }
      return;
    }
    if (isLastQuestion && gotPlayerQuestionResult && !finalResultsTimeoutReached) {
      if (!finalResultsTimerRef.current) {
        finalResultsTimerRef.current = window.setTimeout(() => {
          setFinalResultsTimeoutReached(true);
          finalResultsTimerRef.current = null;
        }, 4000); // 4s grace period for host to publish final results
      }
    }
    return () => {
      if (!result && finalResultsTimerRef.current && !(isLastQuestion && gotPlayerQuestionResult)) {
        clearTimeout(finalResultsTimerRef.current);
        finalResultsTimerRef.current = null;
      }
    };
  }, [result, isLastQuestion, gotPlayerQuestionResult, finalResultsTimeoutReached]);

  const ready = !!result || (isLastQuestion && gotPlayerQuestionResult && finalResultsTimeoutReached);

  // Normalized leaderboard result (unifies shapes from various backend payloads)
  const normalized = useMemo(() => {
    if (result) return normalizeLeaderboard(result);
    if (isLastQuestion && gotPlayerQuestionResult && finalResultsTimeoutReached && playerResultPayload) {
      return normalizeLeaderboard(playerResultPayload);
    }
    return { players: [], first: undefined };
  }, [result, playerResultPayload, isLastQuestion, gotPlayerQuestionResult, finalResultsTimeoutReached]);

  const players = normalized.players;
  const first = normalized.first;
  const firstName = first?.name || 'Unknown';
  const firstScore = first?.score;
  const topFive: NormalizedLeaderboardPlayer[] = players.slice(0, 5);

  // Centralized audio (champion music)
  const { musicEnabled: musicOn, setMusicEnabled: setMusicOn, startChampionMusic, stopChampionMusic, championPlaying } = useGameAudio();

  useEffect(() => {
    if (ready && musicOn) { startChampionMusic(); } else { stopChampionMusic(); }
    return () => { // stop on unmount / route change
      stopChampionMusic();
    };
  }, [ready, musicOn, startChampionMusic, stopChampionMusic]);

  // Also stop champion music on browser/tab unload just in case
  useEffect(() => {
    const handler = () => { try { stopChampionMusic(); } catch {} };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [stopChampionMusic]);

  // Cleanup and navigate home without keeping session
  const handleBackHome = () => {
    try { stopChampionMusic(); } catch {}
    try { setResult(null as any); } catch {}
    try { (client as any)?.stop?.(); } catch {}
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <GameHeader title="LEADERBOARD" withSvgBorder />
      <main className="px-6 py-10 max-w-3xl mx-auto">
        {!ready && (
          <div className="bg-white/90 backdrop-blur rounded-xl p-8 shadow-xl border border-gray-200/70 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_30%_30%,#dc2626,transparent_60%)]" />
            <h2 className="text-lg font-bold mb-3 tracking-wide text-gray-800">Preparing Final Leaderboard</h2>
            <div className="mx-auto mb-5 w-14 h-14 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 font-medium">
              Waiting for {gotQuestionTimeEnded ? '' : 'question end event'}{!gotQuestionTimeEnded && !gotPlayerQuestionResult ? ' and ' : ''}{gotPlayerQuestionResult ? '' : 'player results'}...
            </p>
            <p className="text-[11px] text-gray-400 mt-4">If this takes too long, the host may not have published results yet.</p>
            <div className="mt-6">
              <GameButton size="sm" variant="secondary" onClick={() => router.push('/')}>Home</GameButton>
            </div>
          </div>
        )}
        {ready && (
          <div className="bg-white/90 backdrop-blur rounded-2xl p-10 shadow-2xl border border-gray-200/70 relative overflow-hidden">
            {!connected && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
                <div className="text-xs font-semibold text-gray-600 tracking-wider uppercase">Connecting…</div>
              </div>
            )}
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_70%_40%,#fbbf24,transparent_60%)]" />
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-amber-500">Final Leaderboard</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMusicOn(v => !v)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wide transition-colors ${musicOn ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                  title={musicOn ? 'Turn music off' : 'Turn music on'}
                >
                  {musicOn ? '🎵 Music On' : '🔇 Music Off'}
                </button>
              </div>
            </div>

            {/* Podium for Top 3 */}
            {/* Replaced podium & list with reusable components */}
            <PodiumTop3 players={players} className="mb-10" />
            <TopPlayersList
              players={players}
              title="Final Leaderboard"
              limit={10}
              className="mb-10"
            />

            {/* Bottom large Back to Home button */}
            <div className="mt-10">
              <GameButton size="lg" variant="primary" fullWidth onClick={handleBackHome}>Back to Home</GameButton>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

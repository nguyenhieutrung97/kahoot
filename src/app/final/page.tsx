"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFinalResult } from '@/context/FinalResultContext';
import { GameHeader } from '@/components/ui/GameHeader';
import { GameButton } from '@/components/ui/GameButton';
import { useGameHub } from '@/hooks/useGameHub';

export default function FinalPage() {
  const { result, setResult } = useFinalResult();
  const router = useRouter();

  const [gotQuestionTimeEnded, setGotQuestionTimeEnded] = useState(false);
  const [gotPlayerQuestionResult, setGotPlayerQuestionResult] = useState(false);
  const [playerResultPayload, setPlayerResultPayload] = useState<any>(null);

  useGameHub({
    onQuestionTimeEnded: () => {
      setGotQuestionTimeEnded(true);
    },
    onPlayerQuestionResult: (payload) => {
      setGotPlayerQuestionResult(true);
      setPlayerResultPayload(payload);
    },
    onFinalResults: (payload) => {
      try { setResult(payload); } catch {}
    },
    onGameEnded: (payload) => {
      try { setResult(payload); } catch {}
    }
  });

  const ready = !!result || (gotQuestionTimeEnded && gotPlayerQuestionResult);

  const leaderboardData = useMemo(() => {
    if (result) {
      return result.finalLeaderboard || result.FinalLeaderboard || result.topPlayers || result.TopPlayers || result.leaderboard || [];
    }
    if (playerResultPayload) {
      return playerResultPayload.topPlayers || playerResultPayload.TopPlayers || [];
    }
    return [];
  }, [result, playerResultPayload]);

  const first = Array.isArray(leaderboardData) && leaderboardData.length > 0 ? leaderboardData[0] : null;
  const firstName = first?.name || first?.playerName || first?.userName || first?.Name || first?.PlayerName || 'Unknown';
  const firstScore = first?.score ?? first?.Score ?? first?.playerScore ?? undefined;

  const topFive = Array.isArray(leaderboardData) ? leaderboardData.slice(0, 5) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <GameHeader title="LEADERBOARD" withSvgBorder />
      <main className="px-6 py-8 max-w-xl mx-auto">
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
          <div className="bg-white/90 backdrop-blur rounded-xl p-8 shadow-xl border border-gray-200/70 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_70%_40%,#fbbf24,transparent_60%)]" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-amber-500">Final Leaderboard</h2>
              <GameButton size="sm" variant="secondary" onClick={() => router.push('/')}>Home</GameButton>
            </div>
            <div className="mb-6 p-5 rounded-2xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-xl font-black text-white shadow">1</div>
                <div>
                  <div className="text-lg font-bold text-gray-800 leading-none">{firstName}</div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-amber-600 mt-1">Champion</div>
                </div>
              </div>
              {firstScore !== undefined && (
                <div className="text-right">
                  <div className="text-base font-extrabold text-gray-800">{firstScore}</div>
                  <div className="text-[10px] tracking-wider font-semibold text-gray-500">POINTS</div>
                </div>
              )}
            </div>
            {topFive.length > 1 && (
              <ul className="space-y-3">
                {topFive.slice(1).map((p: any, i: number) => {
                  const rank = i + 2;
                  const name = p.name || p.playerName || p.userName || 'Unknown';
                  const score = p.score ?? p.Score ?? p.playerScore ?? 0;
                  const colors = rank === 2 ? 'border-slate-300 bg-slate-50' : rank === 3 ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white';
                  return (
                    <li key={p.playerId || name + rank} className={`p-4 rounded-xl border ${colors} flex items-center justify-between shadow-sm`}> 
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-bold">{rank}</div>
                        <span className="font-semibold text-gray-700 text-sm">{name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-800">{score}</div>
                        <div className="text-[10px] tracking-wider font-semibold text-gray-400">PTS</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {!first && (
              <div className="text-gray-500 text-sm italic">No leaderboard data yet.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GameHeader } from '@/components/ui/GameHeader';
// import { GameButton } from '@/components/ui/GameButton';
import { useGameHub } from '@/hooks/useGameHub';

// Type for leaderboard player
interface LeaderboardPlayer {
  id?: string;
  userName?: string;
  name?: string;
  score?: number;
  rank?: number;
  timeTaken?: number;
  answerTime?: number;
}

export default function LeaderboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = searchParams.get('gameId') || '';
  const playerName = searchParams.get('name') || '';
  const questionNumber = Number(searchParams.get('questionNumber') || '1');

  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for leaderboard updates and next question event from the hub
  const { connected } = useGameHub({
    onPlayerQuestionResult: (payload: any) => {
      // Try to extract leaderboard from multiple possible property names
      const lb = payload?.TopPlayers || payload?.topPlayers || payload?.currentLeaderboard || payload?.leaderboard || payload?.players || [];
      setLeaderboard(Array.isArray(lb) ? lb : []);
      setLoading(false);
    },
    onProceedingToNextQuestion: (payload: any) => {
      // Auto-advance to next question
      const next = Number(payload?.nextQuestionIndex ?? (questionNumber + 1));
      const params = new URLSearchParams();
      if (gameId) params.set('gameId', gameId);
      if (playerName) params.set('name', playerName);
      params.set('questionNumber', String(next));
      router.push(`/question?${params.toString()}`);
    }
  });

  // If no leaderboard after a short delay, show fallback
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);



  // Sort leaderboard by score descending
  const sorted = [...leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50">
      <GameHeader title="LEADERBOARD" withSvgBorder />
      <main className="px-6 py-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-gray-200 relative">
          {!connected && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-3" />
              <div className="text-xs font-semibold text-gray-600 tracking-wider uppercase">Connecting…</div>
            </div>
          )}
          <h2 className="text-xl font-bold mb-4">Current Leaderboard</h2>
          {loading ? (
            <div className="text-gray-500 italic">Loading leaderboard...</div>
          ) : sorted.length === 0 ? (
            <div className="text-gray-500 italic">No leaderboard data available</div>
          ) : (
            <div>
              <div className="flex font-semibold border-b pb-2 mb-2">
                <div className="w-8">#</div>
                <div className="flex-1">Player</div>
                <div className="w-24 text-right">Time (s)</div>
                <div className="w-20 text-right">Score</div>
              </div>
              {sorted.map((player, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const medals = ['🥇', '🥈', '🥉'];
                const medalIcon = rank <= 3 ? medals[rank - 1] : '🏅';
                const playerDisplay = player.userName || player.name || `Player ${rank}`;
                // Use timeTaken or answerTime, fallback to --
                const time = player.timeTaken ?? player.answerTime;

                // Color schemes for top 3
                const getTop3Styles = (rank: number) => {
                  switch (rank) {
                    case 1:
                      return 'bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-400 text-yellow-900 shadow-lg ring-2 ring-yellow-200';
                    case 2:
                      return 'bg-gradient-to-r from-gray-100 to-slate-100 border-gray-400 text-gray-800 shadow-md ring-2 ring-gray-200';
                    case 3:
                      return 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-400 text-orange-900 shadow-md ring-2 ring-orange-200';
                    default:
                      return 'bg-gray-100 border-gray-200 text-gray-700';
                  }
                };

                return (
                  <div 
                    key={player.id || playerDisplay} 
                    className={`flex items-center py-4 px-4 mb-3 rounded-xl border-2 font-bold transition-all duration-300 hover:scale-[1.02] ${isTop3 ? getTop3Styles(rank) : 'bg-gray-100 border-gray-200 text-gray-700'}`}
                  >
                    <div className="w-10 text-3xl flex items-center justify-center">
                      {medalIcon}
                    </div>
                    <div className="flex-1 ml-3">
                      <div className={`text-lg font-bold ${isTop3 ? 'text-xl' : ''}`}>
                        {playerDisplay}
                      </div>
                      {isTop3 && (
                        <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                          TOP {rank} PLAYER
                        </div>
                      )}
                    </div>
                    <div className="w-24 text-right text-sm font-mono">
                      {typeof time === 'number' ? time.toFixed(2) : '--'}s
                    </div>
                    <div className={`w-20 text-right font-mono font-bold ${isTop3 ? 'text-lg' : 'text-base'}`}>
                      {player.score ?? 0} pts
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

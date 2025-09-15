"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useFinalResult } from '@/context/FinalResultContext';
import { GameHeader } from '@/components/ui/GameHeader';
import { GameButton } from '@/components/ui/GameButton';

export default function FinalPage() {
  const { result } = useFinalResult();
  const router = useRouter();

  const data = result || {} as any;

  // Player-centric fields with backward-compatible fallbacks
  const yourRank = data.yourRank ?? data.YourRank ?? data.rank ?? data.Rank;
  const yourScore = data.yourScore ?? data.YourScore ?? data.score ?? data.Score;
  const yourProgress = data.yourProgress ?? data.YourProgress;

  // Top three and leaderboard fallbacks
  const topThree = data.topThreePlayers || data.TopThreePlayers || data.topThree || data.Top3 || [];
  const leaderboard = data.finalLeaderboard || data.FinalLeaderboard || data.topPlayers || data.TopPlayers || data.leaderboard || [];

  const isInTopThree = (yourRank && yourRank <= 3) || false;

  return (
    <div className="min-h-screen bg-gray-50">
      <GameHeader title="FINAL RESULTS" withSvgBorder />
      <main className="px-6 py-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold mb-4">Game Results</h2>
            <GameButton variant="secondary" size="sm" onClick={() => router.push('/')}>Back to Home</GameButton>
          </div>

          {/* Player summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-gray-50 text-center">
              <div className="text-sm text-gray-600">Final Rank</div>
              <div className="text-3xl font-bold">{yourRank ?? '—'}</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 text-center">
              <div className="text-sm text-gray-600">Final Score</div>
              <div className="text-3xl font-bold">{yourScore ?? '—'}</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 text-center">
              <div className="text-sm text-gray-600">Progress</div>
              <div className="text-3xl font-bold">{yourProgress ?? '—'}</div>
            </div>
          </div>

          {/* Top three */}
          {Array.isArray(topThree) && topThree.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3">Top 3</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topThree.slice(0,3).map((p: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg text-center ${idx===0 ? 'bg-yellow-100' : idx===1 ? 'bg-gray-100' : 'bg-red-50'}`}>
                    <div className="text-sm text-gray-600">#{idx + 1}</div>
                    <div className="text-lg font-bold">{p.name || p.playerName || p.Name || p.PlayerName || '—'}</div>
                    <div className="text-sm text-gray-700">{p.score ?? p.Score ?? p.playerScore ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full leaderboard */}
          <div>
            <h3 className="text-xl font-semibold mb-3">Leaderboard</h3>
            <div className="space-y-2">
              {(Array.isArray(leaderboard) && leaderboard.length > 0) ? (
                leaderboard.map((pl: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg flex justify-between items-center ${i < 3 ? 'border-l-4' : 'border'} ${i===0 ? 'border-yellow-400' : i===1 ? 'border-gray-400' : i===2 ? 'border-red-300' : 'border-gray-200'}`}>
                    <div className="flex items-center space-x-3">
                      <div className="text-lg font-bold">#{i + 1}</div>
                      <div className="font-medium">{pl.name || pl.playerName || pl.Name || pl.PlayerName || 'Unknown'}</div>
                    </div>
                    <div className="font-semibold">{pl.score ?? pl.Score ?? pl.playerScore ?? '--'}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">No leaderboard available</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

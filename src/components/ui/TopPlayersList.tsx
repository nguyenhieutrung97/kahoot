"use client";
import React from 'react';
import { NormalizedLeaderboardPlayer } from '@/lib/normalizers/leaderboard';

export interface TopPlayersListProps {
  players: NormalizedLeaderboardPlayer[];
  title?: string;
  limit?: number; // slice players (default 5)
  playerRank?: number | null;
  playerScore?: number | null;
  className?: string;
  showMedals?: boolean;
}

// Presentational list for top players (podium style for top 3)
export const TopPlayersList: React.FC<TopPlayersListProps> = ({
  players,
  title = 'Top Players',
  limit = 5,
  playerRank,
  playerScore,
  className = '',
  showMedals = true,
}) => {
  const limited = players.slice(0, limit);

  const getTop3Styles = (r: number) => {
    switch (r) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 text-yellow-800 shadow-lg';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300 text-gray-700 shadow-md';
      case 3:
        return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300 text-orange-800 shadow-md';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const getMedalIcon = (r: number) => {
    if (!showMedals) return '';
    switch (r) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  };

  if (!limited.length) return null;

  return (
    <div className={`bg-white/80 backdrop-blur border border-gray-200 rounded-lg p-4 ${className}`}>      
      <h3 className="font-bold text-gray-800 mb-2 text-xs uppercase tracking-wider">{title}</h3>
      <ul className="space-y-2 text-sm">
        {limited.map((p, idx) => {
          const rank = p.rank || (idx + 1);
          const isTop3 = rank <= 3;
          return (
            <li
              key={p.id}
              className={`flex items-center justify-between p-3 rounded-lg border-2 font-medium transition-all duration-200 ${isTop3 ? getTop3Styles(rank) : 'bg-gray-50 border-gray-200 text-gray-600'}`}
            >
              <div className="flex items-center gap-3">
                {showMedals && <span className="text-lg">{getMedalIcon(rank)}</span>}
                <span className={`font-bold ${isTop3 ? 'text-lg' : ''}`}>{rank}. {p.name}</span>
                {isTop3 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-white/70 font-bold uppercase tracking-wider">
                    TOP {rank}
                  </span>
                )}
              </div>
              <span className={`font-bold ${isTop3 ? 'text-lg' : 'font-semibold'}`}>{p.score} pts</span>
            </li>
          );
        })}
      </ul>
      {(playerRank !== null || playerScore !== null) && (
        <div className="mt-3 text-[11px] text-gray-600">Your Rank: {playerRank ?? '-'} | Score: {playerScore ?? 0}</div>
      )}
    </div>
  );
};

export default TopPlayersList;

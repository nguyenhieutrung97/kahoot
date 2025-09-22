"use client";
import React from 'react';
import { NormalizedLeaderboardPlayer } from '@/lib/normalizers/leaderboard';

export interface PodiumTop3Props {
  players: NormalizedLeaderboardPlayer[]; // full list, we slice internally
  className?: string;
  title?: string;
  showScores?: boolean;
  highlightChampion?: boolean;
}

/*
  PodiumTop3 replicates an elevated layout for the first three ranks.
  - Center (rank 1) is tallest
  - Left (rank 2) medium
  - Right (rank 3) shorter
  Gracefully handles < 3 players (empty slots shown as em dash).
*/
export const PodiumTop3: React.FC<PodiumTop3Props> = ({
  players,
  className = '',
  title = 'Podium',
  showScores = true,
  highlightChampion = true,
}) => {
  const first = players[0];
  const second = players[1];
  const third = players[2];

  const Pill = ({ label }: { label: string }) => (
    <div className="text-xs px-2 py-0.5 rounded-full bg-white/70 font-bold uppercase tracking-wider shadow-sm">
      {label}
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 -z-10 opacity-30 bg-[radial-gradient(circle_at_50%_-20%,#fde68a,transparent_55%)]" />
      {title && (
        <h3 className="text-center mb-6 text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-red-600">
          {title}
        </h3>
      )}
      <div className="grid grid-cols-3 gap-4 items-end">
        {/* Second */}
        <div className="flex flex-col items-center">
          <div className="mb-2 text-sm font-bold text-slate-700">2nd</div>
          <div className="w-full bg-gradient-to-t from-slate-200 to-slate-50 rounded-t-xl border-2 border-slate-300 h-40 shadow-inner flex items-end justify-center p-3 relative overflow-hidden">
            <div className="absolute inset-x-4 bottom-1 h-1 rounded-full bg-slate-400/40 blur-sm" />
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white font-black flex items-center justify-center mx-auto mb-2">2</div>
              <div className="text-sm font-semibold text-gray-800 truncate max-w-[7.5rem]">{second?.name ?? '—'}</div>
              {showScores && second && (
                <div className="text-[10px] font-semibold text-gray-600 mt-0.5">{second.score} pts</div>
              )}
            </div>
          </div>
        </div>
        {/* First */}
        <div className="flex flex-col items-center">
          <div className="mb-2 text-sm font-extrabold text-amber-700 flex items-center gap-1">
            {highlightChampion && <span>🏆</span>} Champion
          </div>
          <div className="relative w-full bg-gradient-to-t from-amber-200 to-yellow-50 rounded-t-2xl border-2 border-amber-400 h-56 shadow-inner flex items-end justify-center p-5 overflow-hidden">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl">{highlightChampion ? '👑' : '⭐'}</div>
            <div className="absolute inset-x-6 bottom-2 h-1 rounded-full bg-amber-400/50 blur-sm" />
            <div className="text-center relative z-10">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-white font-black flex items-center justify-center mx-auto mb-2">1</div>
              <div className="text-base font-extrabold text-gray-900 truncate max-w-[9rem]">{first?.name ?? '—'}</div>
              {showScores && first && (
                <div className="text-[11px] font-semibold text-gray-700 mt-1">{first.score} pts</div>
              )}
            </div>
          </div>
        </div>
        {/* Third */}
        <div className="flex flex-col items-center">
          <div className="mb-2 text-sm font-bold text-orange-700">3rd</div>
            <div className="w-full bg-gradient-to-t from-orange-200 to-orange-50 rounded-t-xl border-2 border-orange-300 h-32 shadow-inner flex items-end justify-center p-3 relative overflow-hidden">
              <div className="absolute inset-x-3 bottom-1 h-1 rounded-full bg-orange-400/40 blur-sm" />
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 text-white font-black flex items-center justify-center mx-auto mb-2">3</div>
                <div className="text-sm font-semibold text-gray-800 truncate max-w-[7.5rem]">{third?.name ?? '—'}</div>
                {showScores && third && (
                  <div className="text-[10px] font-semibold text-gray-600 mt-0.5">{third.score} pts</div>
                )}
              </div>
            </div>
        </div>
      </div>
      {/* Mini legend under podium */}
      <div className="mt-4 flex justify-center gap-4 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
        {first && <Pill label="1st" />}
        {second && <Pill label="2nd" />}
        {third && <Pill label="3rd" />}
      </div>
    </div>
  );
};

export default PodiumTop3;

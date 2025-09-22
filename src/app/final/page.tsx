"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
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

  const { connected } = useGameHub({
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

  // Champion background music
  const [musicOn, setMusicOn] = useState(true);
  const championAudioRef = useRef<HTMLAudioElement | null>(null);
  const startChampionMusic = async () => {
    if (!musicOn) return;
    try {
      if (championAudioRef.current) {
        try { championAudioRef.current.pause(); } catch {}
        championAudioRef.current = null;
      }
      const audio = new Audio('/sounds/champion.mp3');
      audio.loop = true;
      audio.volume = 0.12;
      championAudioRef.current = audio;
      await audio.play();
    } catch {}
  };
  const stopChampionMusic = () => {
    try {
      if (championAudioRef.current) {
        championAudioRef.current.pause();
        championAudioRef.current.currentTime = 0;
        championAudioRef.current = null;
      }
    } catch {}
  };

  useEffect(() => {
    if (ready && musicOn) {
      startChampionMusic();
    } else {
      stopChampionMusic();
    }
    return () => { stopChampionMusic(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, musicOn]);

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
            <div className="mb-10 relative">
              <div className="absolute inset-0 -z-10 opacity-30 bg-[radial-gradient(circle_at_50%_-20%,#fde68a,transparent_50%)]" />
              <div className="grid grid-cols-3 gap-3 items-end">
                {/* Second */}
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-sm font-bold text-slate-700">2nd</div>
                  <div className="w-full bg-gradient-to-t from-slate-200 to-slate-50 rounded-t-xl border-2 border-slate-300 h-40 shadow-inner flex items-end justify-center p-3">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white font-black flex items-center justify-center mx-auto mb-2">2</div>
                      <div className="text-sm font-semibold text-gray-800 truncate max-w-[10rem]">{(leaderboardData[1]?.name || leaderboardData[1]?.userName) ?? '—'}</div>
                    </div>
                  </div>
                </div>
                {/* First */}
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-sm font-extrabold text-amber-700 flex items-center gap-1">🏆 Champion</div>
                  <div className="relative w-full bg-gradient-to-t from-amber-200 to-yellow-50 rounded-t-2xl border-2 border-amber-400 h-56 shadow-inner flex items-end justify-center p-5">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl">👑</div>
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-white font-black flex items-center justify-center mx-auto mb-2">1</div>
                      <div className="text-base font-extrabold text-gray-900 truncate max-w-[12rem]">{firstName}</div>
                      {firstScore !== undefined && (
                        <div className="text-xs font-semibold text-gray-700 mt-1">{firstScore} pts</div>
                      )}
                    </div>
                    <div className="absolute inset-x-6 bottom-2 h-1 rounded-full bg-amber-400/50 blur-sm" />
                  </div>
                </div>
                {/* Third */}
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-sm font-bold text-orange-700">3rd</div>
                  <div className="w-full bg-gradient-to-t from-orange-200 to-orange-50 rounded-t-xl border-2 border-orange-300 h-32 shadow-inner flex items-end justify-center p-3">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 text-white font-black flex items-center justify-center mx-auto mb-2">3</div>
                      <div className="text-sm font-semibold text-gray-800 truncate max-w-[10rem]">{(leaderboardData[2]?.name || leaderboardData[2]?.userName) ?? '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {topFive.length > 1 && (
              <ul className="space-y-4">
                {topFive.slice(1).map((p: any, i: number) => {
                  const rank = i + 2;
                  const name = p.name || p.playerName || p.userName || 'Unknown';
                  const score = p.score ?? p.Score ?? p.playerScore ?? 0;
                  const isTop3 = rank <= 3;

                  // Enhanced color schemes for top 3
                  const getTop3Styles = (rank: number) => {
                    switch (rank) {
                      case 2:
                        return 'bg-gradient-to-r from-gray-100 to-slate-100 border-gray-400 text-gray-800 shadow-lg ring-2 ring-gray-200';
                      case 3:
                        return 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-400 text-orange-900 shadow-lg ring-2 ring-orange-200';
                      default:
                        return 'border-gray-200 bg-white text-gray-700 shadow-sm';
                    }
                  };

                  const getMedalIcon = (rank: number) => {
                    switch (rank) {
                      case 2: return '🥈';
                      case 3: return '🥉';
                      default: return '🏅';
                    }
                  };

                  const getRankBadgeStyle = (rank: number) => {
                    switch (rank) {
                      case 2:
                        return 'bg-gradient-to-br from-gray-400 to-slate-600 text-white';
                      case 3:
                        return 'bg-gradient-to-br from-orange-400 to-amber-600 text-white';
                      default:
                        return 'bg-gray-800 text-white';
                    }
                  };

                  return (
                    <li 
                      key={p.playerId || name + rank} 
                      className={`p-5 rounded-2xl border-2 ${isTop3 ? getTop3Styles(rank) : 'border-gray-200 bg-white text-gray-700 shadow-sm'} flex items-center justify-between transition-all duration-300 hover:scale-[1.02]`}
                    > 
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${getRankBadgeStyle(rank)} flex items-center justify-center text-lg font-black shadow-lg`}>
                            {rank}
                          </div>
                          <div className="text-2xl">{getMedalIcon(rank)}</div>
                        </div>
                        <div>
                          <div className={`font-bold ${isTop3 ? 'text-lg' : 'text-base'} text-gray-800`}>
                            {name}
                          </div>
                          {isTop3 && (
                            <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                              TOP {rank} PLAYER
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${isTop3 ? 'text-lg' : 'text-base'} text-gray-800`}>
                          {score}
                        </div>
                        <div className="text-[10px] tracking-wider font-semibold text-gray-400">PTS</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Bottom large Back to Home button */}
            <div className="mt-10">
              <GameButton size="lg" variant="primary" fullWidth onClick={() => router.push('/')}>Back to Home</GameButton>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

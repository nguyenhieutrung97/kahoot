"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LeaderboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get("roomId") || "ROOM123";
  const currentPlayerName = searchParams.get("name") || "Player";

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  // Mock leaderboard data - would come from server
  const leaderboard = [
    {
      rank: 1,
      name: "Alice",
      score: 950,
      correctAnswers: 8,
      totalQuestions: 10,
      avatar: "🏆",
      badge: "👑"
    },
    {
      rank: 2,
      name: "Bob",
      score: 820,
      correctAnswers: 7,
      totalQuestions: 10,
      avatar: "🥈",
      badge: "🥈"
    },
    {
      rank: 3,
      name: "Charlie",
      score: 750,
      correctAnswers: 6,
      totalQuestions: 10,
      avatar: "🥉",
      badge: "🥉"
    }
  ];

  const currentPlayerRank = leaderboard.findIndex(p => p.name === currentPlayerName) + 1;

  useEffect(() => {
    // Show fireworks first
    setShowFireworks(true);
    
    // Then show leaderboard after fireworks start
    const leaderboardTimer = setTimeout(() => setShowLeaderboard(true), 1000);
    
    return () => clearTimeout(leaderboardTimer);
  }, []);

  const handlePlayAgain = () => {
    router.push(`/lobby?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(currentPlayerName)}`);
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return { emoji: "🥇", color: "text-yellow-400", bgColor: "bg-gradient-to-br from-yellow-400 to-yellow-600" };
      case 2:
        return { emoji: "🥈", color: "text-gray-400", bgColor: "bg-gradient-to-br from-gray-400 to-gray-600" };
      case 3:
        return { emoji: "🥉", color: "text-orange-400", bgColor: "bg-gradient-to-br from-orange-400 to-orange-600" };
      default:
        return { emoji: "🎯", color: "text-blue-400", bgColor: "bg-gradient-to-br from-blue-400 to-blue-600" };
    }
  };

  const Firework = ({ delay, left, animationDuration }: { delay: number; left: string; animationDuration: string }) => (
    <div
      className="absolute top-1/4 pointer-events-none"
      style={{ left, animationDelay: `${delay}ms` }}
    >
      <div
        className="relative"
        style={{
          animation: `firework ${animationDuration} ease-out infinite`
        }}
      >
        {/* Central burst */}
        <div className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
        
        {/* Sparks */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 rounded-full"
            style={{
              transform: `rotate(${i * 45}deg) translateY(-20px)`,
              animation: `spark ${animationDuration} ease-out infinite ${delay}ms`
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col relative overflow-hidden">
      {/* Fireworks */}
      {showFireworks && (
        <>
          <Firework delay={0} left="10%" animationDuration="2s" />
          <Firework delay={500} left="90%" animationDuration="2.5s" />
          <Firework delay={1000} left="25%" animationDuration="2s" />
          <Firework delay={1500} left="75%" animationDuration="2.2s" />
          <Firework delay={2000} left="50%" animationDuration="2.8s" />
          <Firework delay={2500} left="15%" animationDuration="2.3s" />
          <Firework delay={3000} left="85%" animationDuration="2.6s" />
        </>
      )}

      {/* Header */}
      <header className="p-6 flex justify-between items-center text-white relative z-10">
        <div className="text-lg font-semibold">Room: {roomId}</div>
        <div className="text-lg font-semibold">🏁 Final Results</div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Title */}
        <div
          className={`text-center mb-12 transition-all duration-1000 ${showLeaderboard ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        >
          <div className="text-8xl mb-4">🎉</div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500 bg-clip-text text-transparent">
            Game Complete!
          </h1>
          <p className="text-xl text-purple-200">All questions finished - here are the champions!</p>
        </div>

        {/* Podium */}
        <div
          className={`flex items-end justify-center space-x-8 mb-12 transition-all duration-1000 delay-500 ${showLeaderboard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {/* 2nd Place */}
          {leaderboard[1] && (
            <div className="text-center">
              <div className="relative">
                <div className={`${getRankDisplay(2).bgColor} p-6 rounded-lg mb-4 h-32 flex flex-col justify-center items-center shadow-lg`}>
                  <div className="text-4xl mb-2">{getRankDisplay(2).emoji}</div>
                  <div className="text-white font-bold text-lg">{leaderboard[1].name}</div>
                  <div className="text-white text-sm opacity-90">{leaderboard[1].score} pts</div>
                </div>
                <div className="text-6xl">{leaderboard[1].badge}</div>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {leaderboard[0] && (
            <div className="text-center">
              <div className="relative transform scale-110">
                <div className={`${getRankDisplay(1).bgColor} p-8 rounded-lg mb-4 h-40 flex flex-col justify-center items-center shadow-2xl border-4 border-yellow-300`}>
                  <div className="text-5xl mb-2">{getRankDisplay(1).emoji}</div>
                  <div className="text-white font-bold text-xl">{leaderboard[0].name}</div>
                  <div className="text-white text-lg opacity-90">{leaderboard[0].score} pts</div>
                </div>
                <div className="text-7xl animate-bounce">{leaderboard[0].badge}</div>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {leaderboard[2] && (
            <div className="text-center">
              <div className="relative">
                <div className={`${getRankDisplay(3).bgColor} p-6 rounded-lg mb-4 h-28 flex flex-col justify-center items-center shadow-lg`}>
                  <div className="text-3xl mb-2">{getRankDisplay(3).emoji}</div>
                  <div className="text-white font-bold text-lg">{leaderboard[2].name}</div>
                  <div className="text-white text-sm opacity-90">{leaderboard[2].score} pts</div>
                </div>
                <div className="text-5xl">{leaderboard[2].badge}</div>
              </div>
            </div>
          )}
        </div>

        {/* Current Player Stats */}
        <div
          className={`bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 mb-8 max-w-md w-full text-center border border-white border-opacity-20 transition-all duration-1000 delay-1000 ${showLeaderboard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <h3 className="text-xl font-bold text-white mb-4">Your Performance</h3>
          <div className="text-white space-y-2">
            <div className="flex justify-between">
              <span>Player:</span>
              <span className="font-semibold">{currentPlayerName}</span>
            </div>
            {currentPlayerRank > 0 && (
              <div className="flex justify-between">
                <span>Final Rank:</span>
                <span className="font-semibold text-yellow-400">#{currentPlayerRank}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Correct Answers:</span>
              <span className="font-semibold text-green-400">7/10</span>
            </div>
            <div className="flex justify-between">
              <span>Final Score:</span>
              <span className="font-semibold text-blue-400">820 pts</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className={`flex flex-col sm:flex-row gap-4 transition-all duration-1000 delay-1500 ${showLeaderboard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <button
            onClick={handlePlayAgain}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold text-lg hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            🎮 Play Again
          </button>
          <button
            onClick={handleBackToHome}
            className="px-8 py-3 bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-lg font-bold text-lg hover:bg-opacity-30 transform hover:scale-105 transition-all duration-200 border border-white border-opacity-30"
          >
            🏠 Back to Home
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes firework {
          0% {
            transform: translateY(0) scale(0);
            opacity: 1;
          }
          15% {
            transform: translateY(-100px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-200px) scale(1);
            opacity: 0;
          }
        }

        @keyframes spark {
          0% {
            transform: rotate(var(--rotation)) translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--rotation)) translateY(-60px) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

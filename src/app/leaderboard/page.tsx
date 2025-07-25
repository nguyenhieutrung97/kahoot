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
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
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
      <header className="bg-white shadow-sm p-6 flex justify-between items-center text-gray-800 relative z-10 border-b-4 border-red-600">
        <div className="text-lg font-semibold text-gray-600">Room: {roomId}</div>
        <div className="text-lg font-bold text-red-600">FINAL RESULTS</div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Title */}
        <div
          className={`text-center mb-12 transition-all duration-1000 ${showLeaderboard ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 uppercase tracking-wide">
            GAME COMPLETE
          </h1>
          <div className="w-24 h-1 bg-red-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-medium">Excellence in every answer</p>
        </div>

        {/* Podium */}
        <div
          className={`flex items-end justify-center space-x-8 mb-12 transition-all duration-1000 delay-500 ${showLeaderboard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {/* 2nd Place */}
          {leaderboard[1] && (
            <div className="text-center">
              <div className="relative">
                <div className="bg-white border-4 border-gray-400 p-6 rounded-lg mb-4 h-32 flex flex-col justify-center items-center shadow-lg">
                  <div className="text-4xl mb-2 text-gray-600">2</div>
                  <div className="text-gray-900 font-bold text-lg">{leaderboard[1].name}</div>
                  <div className="text-gray-600 text-sm font-medium">{leaderboard[1].score} PTS</div>
                </div>
                <div className="absolute -top-2 -right-2 bg-gray-400 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {leaderboard[0] && (
            <div className="text-center">
              <div className="relative transform scale-110">
                <div className="bg-white border-4 border-red-600 p-8 rounded-lg mb-4 h-40 flex flex-col justify-center items-center shadow-xl">
                  <div className="text-5xl mb-2 text-red-600 font-bold">1</div>
                  <div className="text-gray-900 font-bold text-xl">{leaderboard[0].name}</div>
                  <div className="text-red-600 text-lg font-bold">{leaderboard[0].score} PTS</div>
                </div>
                <div className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">1</div>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {leaderboard[2] && (
            <div className="text-center">
              <div className="relative">
                <div className="bg-white border-4 border-orange-500 p-6 rounded-lg mb-4 h-28 flex flex-col justify-center items-center shadow-lg">
                  <div className="text-3xl mb-2 text-orange-600">3</div>
                  <div className="text-gray-900 font-bold text-lg">{leaderboard[2].name}</div>
                  <div className="text-gray-600 text-sm font-medium">{leaderboard[2].score} PTS</div>
                </div>
                <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
              </div>
            </div>
          )}
        </div>

        {/* Current Player Stats */}
        <div
          className={`bg-white rounded-lg p-6 mb-8 max-w-md w-full text-center border-2 border-gray-200 shadow-lg transition-all duration-1000 delay-1000 ${showLeaderboard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wide">YOUR PERFORMANCE</h3>
          <div className="w-12 h-1 bg-red-600 mx-auto mb-4"></div>
          <div className="text-gray-700 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Player:</span>
              <span className="font-bold text-gray-900">{currentPlayerName}</span>
            </div>
            {currentPlayerRank > 0 && (
              <div className="flex justify-between items-center">
                <span className="font-medium">Final Rank:</span>
                <span className="font-bold text-red-600 text-lg">#{currentPlayerRank}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-medium">Correct Answers:</span>
              <span className="font-bold text-green-600">7/10</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Final Score:</span>
              <span className="font-bold text-gray-900 text-lg">820 PTS</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className={`flex flex-col sm:flex-row gap-4 transition-all duration-1000 delay-1500 ${showLeaderboard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <button
            onClick={handlePlayAgain}
            className="px-8 py-4 bg-red-600 text-white rounded font-bold text-lg uppercase tracking-wide hover:bg-red-700 transition-all duration-200 shadow-lg border-2 border-red-600"
          >
            PLAY AGAIN
          </button>
          <button
            onClick={handleBackToHome}
            className="px-8 py-4 bg-white text-gray-900 rounded font-bold text-lg uppercase tracking-wide hover:bg-gray-50 transition-all duration-200 border-2 border-gray-300"
          >
            BACK TO HOME
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

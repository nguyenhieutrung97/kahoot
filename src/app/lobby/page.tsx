"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Player {
  id: string;
  name: string;
  avatar: {
    color: string;
    initials: string;
  };
}

const AVATAR_COLORS = [
  "bg-red-600",
  "bg-gray-600",
  "bg-blue-600",
  "bg-green-600",
  "bg-orange-600",
  "bg-purple-600",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-pink-600",
  "bg-yellow-600",
];

const generatePlayerId = () => {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const numbers = Math.floor(Math.random() * 900) + 100;
  return `${letter}${numbers}`;
};

const getRandomAvatar = (name: string) => {
  const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
  const initials = name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return {
    color: AVATAR_COLORS[colorIndex],
    initials: initials || "?",
  };
};

// Mock data for demonstration
const mockPlayers: Player[] = [
  {
    id: "A123",
    name: "Steve Joke",
    avatar: { color: "bg-red-500", initials: "SJ" },
  },
  {
    id: "A345",
    name: "Đỗ Nam Trump",
    avatar: { color: "bg-blue-500", initials: "ĐN" },
  },
  {
    id: "A675",
    name: "Buffalo",
    avatar: { color: "bg-green-500", initials: "B" },
  },
  {
    id: "B665",
    name: "Zed",
    avatar: { color: "bg-purple-500", initials: "Z" },
  },
];

export default function Lobby() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get("roomId") || "ROOM123";
  const playerName = searchParams.get("name") || "";

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Add current player if they just joined
    if (playerName && !currentPlayer) {
      const newPlayer: Player = {
        id: generatePlayerId(),
        name: playerName,
        avatar: getRandomAvatar(playerName),
      };
      setCurrentPlayer(newPlayer);
      setPlayers([...mockPlayers, newPlayer]);
    } else {
      setPlayers(mockPlayers);
    }
  }, [playerName, currentPlayer]);

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle navigation when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      // Use setTimeout to defer navigation to next tick
      const timeoutId = setTimeout(() => {
        router.push(
          `/question?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(playerName)}`,
        );
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [countdown, router, roomId, playerName]);

  const maxSlots = 12;
  const emptySlots = Array(Math.max(0, maxSlots - players.length)).fill(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm flex justify-between items-start p-6 border-b-4 border-red-600">
        <h1 className="text-2xl font-bold text-red-600 uppercase tracking-wide">GAME LOBBY</h1>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900 uppercase tracking-wide">
            WAITING ROOM
          </div>
          <div className="text-sm text-gray-600 font-medium">Room ID: {roomId}</div>
        </div>
      </header>

      <main className="px-6 pb-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide mb-4">PARTICIPANTS</h2>
          <div className="w-16 h-1 bg-red-600 mx-auto"></div>
        </div>

        <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto">
          {/* Render existing players */}
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-white rounded-lg p-4 shadow-lg border-2 border-gray-200 hover:border-red-600 transition-colors"
            >
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center border-2 border-gray-200">
                <div
                  className={`w-16 h-16 ${player.avatar.color} rounded-full flex items-center justify-center text-white text-lg font-bold`}
                >
                  {player.avatar.initials}
                </div>
              </div>
              <div className="text-sm text-center">
                <div className="font-bold text-gray-900 truncate uppercase tracking-wide text-xs">
                  {player.name}
                </div>
                <div className="text-gray-500 font-medium mt-1">{player.id}</div>
              </div>
            </div>
          ))}

          {/* Render empty slots */}
          {emptySlots.map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-white rounded-lg p-4 shadow-lg border-2 border-gray-200 opacity-40"
            >
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 border-2 border-gray-200 border-dashed"></div>
              <div className="text-sm text-center">
                <div className="h-4 bg-gray-100 rounded mb-1"></div>
                <div className="h-3 bg-gray-100 rounded w-16 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>

        {players.length > 0 && (
          <div className="mt-12 text-center bg-white rounded-lg p-6 shadow-lg border-2 border-gray-200 max-w-md mx-auto">
            <div className="text-sm text-gray-600 mb-2 font-medium uppercase tracking-wide">
              {players.length} of {maxSlots} participants ready
            </div>
            <div className="w-12 h-1 bg-red-600 mx-auto mb-4"></div>
            <div className="text-2xl font-bold text-red-600 uppercase tracking-wide">
              START IN {countdown}S
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

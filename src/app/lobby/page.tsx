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
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
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
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push(
            `/question?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(playerName)}`,
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, roomId, playerName]);

  const maxSlots = 12;
  const emptySlots = Array(Math.max(0, maxSlots - players.length)).fill(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-start p-6">
        <h1 className="text-2xl font-bold text-blue-600">LOBBY</h1>
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-800">
            The Room Title
          </div>
          <div className="text-sm text-gray-600">The Room ID: {roomId}</div>
        </div>
      </header>

      <main className="px-6 pb-6">
        <div className="grid grid-cols-4 gap-4 max-w-4xl">
          {/* Render existing players */}
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              <div className="aspect-square bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                <div
                  className={`w-16 h-16 ${player.avatar.color} rounded-full flex items-center justify-center text-white text-lg font-bold`}
                >
                  {player.avatar.initials}
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-800 truncate">
                  {player.name}
                </div>
                <div className="text-gray-500">{player.id}</div>
              </div>
            </div>
          ))}

          {/* Render empty slots */}
          {emptySlots.map((_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 opacity-50"
            >
              <div className="aspect-square bg-gray-100 rounded-lg mb-3"></div>
              <div className="text-sm">
                <div className="h-4 bg-gray-100 rounded mb-1"></div>
                <div className="h-3 bg-gray-100 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>

        {players.length > 0 && (
          <div className="mt-8 text-center">
            <div className="text-sm text-gray-600 mb-2">
              {players.length} of {maxSlots} players joined
            </div>
            <div className="text-lg font-semibold text-blue-600">
              Game starting in {countdown} seconds...
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

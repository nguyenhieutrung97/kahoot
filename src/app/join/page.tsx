"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function JoinRoom() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<{
    color: string;
    initials: string;
  } | null>(null);
  const router = useRouter();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);

    if (newName.trim()) {
      setAvatar(getRandomAvatar(newName));
    } else {
      setAvatar(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && avatar) {
      const searchParams = new URLSearchParams(window.location.search);
      const roomId = searchParams.get("roomId") || "ROOM123";
      router.push(
        `/lobby?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(name.trim())}`,
      );
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="p-6">
        <h1 className="text-2xl font-bold text-blue-600">DASHBOARD</h1>
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            Enter Your Name
          </h2>

          {avatar && (
            <div className="flex justify-center mb-6">
              <div
                className={`w-20 h-20 ${avatar.color} rounded-full flex items-center justify-center text-white text-2xl font-bold`}
              >
                {avatar.initials}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Join Game
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

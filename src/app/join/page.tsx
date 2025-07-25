"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <header className="bg-white shadow-sm p-6 border-b-4 border-red-600">
        <h1 className="text-2xl font-bold text-red-600 uppercase tracking-wide">PLAYER REGISTRATION</h1>
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 border-2 border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide mb-4">
              ENTER YOUR NAME
            </h2>
            <div className="w-16 h-1 bg-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Precision starts with identity</p>
          </div>

          {avatar && (
            <div className="flex justify-center mb-6">
              <div
                className={`w-20 h-20 ${avatar.color} rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-gray-200`}
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
                placeholder="YOUR NAME"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded font-medium text-center uppercase tracking-wide focus:outline-none focus:border-red-600 focus:ring-0 transition-colors"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded font-bold uppercase tracking-wide hover:bg-gray-50 transition-colors"
              >
                BACK
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded font-bold uppercase tracking-wide hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed border-2 border-red-600 disabled:border-gray-300"
              >
                JOIN GAME
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

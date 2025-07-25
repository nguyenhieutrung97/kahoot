"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/join?roomId=${encodeURIComponent(roomId)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-6 border-b-4 border-red-600">
        <h1 className="text-2xl font-bold text-red-600 uppercase tracking-wide">QUIZ PLATFORM</h1>
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border-2 border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 uppercase tracking-wide mb-4">JOIN ROOM</h2>
            <div className="w-16 h-1 bg-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Innovation through knowledge</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="ENTER ROOM ID"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded font-medium text-center uppercase tracking-wide focus:outline-none focus:border-red-600 focus:ring-0 transition-colors"
            />
            <button
              type="submit"
              className="w-full px-6 py-4 bg-red-600 text-white rounded font-bold text-lg uppercase tracking-wide hover:bg-red-700 transition-all duration-200 border-2 border-red-600"
            >
              ENTER ROOM
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

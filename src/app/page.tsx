"use client";

import { useState } from "react";

export default function Dashboard() {
  const [roomId, setRoomId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      console.log("Entering room:", roomId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="p-6">
        <h1 className="text-2xl font-bold text-blue-600">DASHBOARD</h1>
      </header>

      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Enter
          </button>
        </form>
      </main>
    </div>
  );
}

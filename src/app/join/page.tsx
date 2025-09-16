"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GameHeader } from "@/components/ui/GameHeader";
import { GameInput } from "@/components/ui/GameInput";
import { GameButton } from "@/components/ui/GameButton";
import { buildNavigationUrl } from "@/lib/game-utils";
import { isValidPlayerName, isValidRoomCode } from "@/lib/game-utils";

const SESSION_KEY = "kahoot_player_session";

type Session = {
  roomCode: string;
  userName: string;
  playerId?: string;
  timestamp: number;
};

export default function JoinPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Redirecting to home...
    </div>
  );
}

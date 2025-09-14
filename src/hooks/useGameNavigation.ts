import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { buildNavigationUrl, getSearchParam } from '@/lib/game-utils';
import { ROUTES, DEFAULTS } from '@/constants/game';
import type { NavigationParams } from '@/types/game';

interface UseGameNavigationReturn {
  // Current URL parameters
  gameId: string;
  playerName: string;
  answer: string;
  questionNumber: string;
  
  // Navigation functions
  goToHome: () => void;
  goToJoin: (roomCode: string) => void;
  goToLobby: (params: Pick<NavigationParams, 'gameId' | 'name'>) => void;
  goToQuestion: (params: Pick<NavigationParams, 'gameId' | 'name'>) => void;
  goToResults: (params: Pick<NavigationParams, 'gameId' | 'name' | 'answer'>) => void;
  goToLeaderboard: (params: Pick<NavigationParams, 'gameId' | 'name'>) => void;
  
  // Utility functions
  navigateWithDelay: (path: string, delay?: number) => void;
}

export const useGameNavigation = (): UseGameNavigationReturn => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current URL parameters with fallbacks
  const gameId = getSearchParam(searchParams, 'gameId', DEFAULTS.ROOM_CODE);
  const playerName = getSearchParam(searchParams, 'name', DEFAULTS.PLAYER_NAME);
  const answer = getSearchParam(searchParams, 'answer', '');
  const questionNumber = getSearchParam(searchParams, 'questionNumber', '1');

  // Navigation helper with delay
  const navigateWithDelay = useCallback((path: string, delay: number = 0) => {
    if (delay > 0) {
      setTimeout(() => router.push(path), delay);
    } else {
      router.push(path);
    }
  }, [router]);

  // Navigation functions
  const goToHome = useCallback(() => {
    router.push(ROUTES.HOME);
  }, [router]);

  const goToJoin = useCallback((roomCode: string) => {
    const url = buildNavigationUrl(ROUTES.JOIN, { roomCode });
    router.push(url);
  }, [router]);

  const goToLobby = useCallback((params: Pick<NavigationParams, 'gameId' | 'name'>) => {
    const url = buildNavigationUrl(ROUTES.LOBBY, params);
    router.push(url);
  }, [router]);

  const goToQuestion = useCallback((params: Pick<NavigationParams, 'gameId' | 'name'>) => {
    const url = buildNavigationUrl(ROUTES.QUESTION, params);
    router.push(url);
  }, [router]);

  const goToResults = useCallback((params: Pick<NavigationParams, 'gameId' | 'name' | 'answer'>) => {
    const url = buildNavigationUrl(ROUTES.RESULTS, params);
    router.push(url);
  }, [router]);

  const goToLeaderboard = useCallback((params: Pick<NavigationParams, 'gameId' | 'name'>) => {
    const url = buildNavigationUrl(ROUTES.LEADERBOARD, params);
    router.push(url);
  }, [router]);

  return {
    // Current parameters
    gameId,
    playerName,
    answer,
    questionNumber,
    
    // Navigation functions
    goToHome,
    goToJoin,
    goToLobby,
    goToQuestion,
    goToResults,
    goToLeaderboard,
    
    // Utilities
    navigateWithDelay,
  };
};

// Parsers for backend game/session states. Backend enums:
// GameState: Draft=0, Published=1, Archived=2
// GameSessionState: Lobby=0, InProgress=1, WaitingForHost=2, Completed=3, Canceled=4

export type RawState = number | string | undefined | null;

export const parseGameState = (raw?: RawState): number | undefined => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') return raw;
  const map: Record<string, number> = {
    draft: 0,
    published: 1,
    archived: 2,
    // historical aliases for backward compatibility
    ready: 1,
    active: 1,
    live: 1,
    inactive: 2,
    closed: 2
  };
  return map[String(raw).replace(/\s+/g, '').toLowerCase()];
};

export const parseSessionState = (raw?: RawState): number | undefined => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') return raw;
  const map: Record<string, number> = {
    lobby: 0,
    active: 0, // alias sometimes used
    inprogress: 1,
    waitingforhost: 2,
    completed: 3,
    cancelled: 4, // British spelling
    canceled: 4,  // American spelling (matches backend)
  };
  return map[String(raw).replace(/\s+/g, '').toLowerCase()];
};

// Semantic helpers
export const isGameReadyForLobby = (raw?: RawState): boolean => {
  // Backend: InLobby = 2 represents playable/lobby state
  const n = parseGameState(raw);
  return n === 2;
};

export const isGameDraft = (raw?: RawState): boolean => {
  const n = parseGameState(raw);
  return n === 0;
};

export const isSessionLobby = (raw?: RawState): boolean => {
  const n = parseSessionState(raw);
  return n === 0;
};

export default {
  parseGameState,
  parseSessionState,
  isGameReadyForLobby,
  isSessionLobby,
  isGameDraft,
};

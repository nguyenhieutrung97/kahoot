export interface RawPlayerLike {
  id?: string;
  playerId?: string;
  userId?: string;
  name?: string;
  userName?: string;
  playerName?: string;
  Name?: string;
  PlayerName?: string;
  score?: number;
  Score?: number;
  playerScore?: number;
  rank?: number;
  Rank?: number;
  position?: number;
  // allow any other fields
  [k: string]: any;
}

export interface NormalizedLeaderboardPlayer {
  id: string;
  name: string;
  score: number;
  rank: number | null; // rank might be absent in some interim payloads
  raw: RawPlayerLike; // keep original for debugging / extra data
}

export interface NormalizedLeaderboardResult {
  players: NormalizedLeaderboardPlayer[];
  first?: NormalizedLeaderboardPlayer;
}

/**
 * Attempt to extract an array of player-like objects from a wide variety of backend shapes.
 */
export function extractRawPlayers(source: any): RawPlayerLike[] {
  if (!source) return [];
  // If source itself is an array of players
  if (Array.isArray(source)) return source as RawPlayerLike[];
  // Try common container properties
  const candidates = [
    source.finalLeaderboard,
    source.FinalLeaderboard,
    source.topPlayers,
    source.TopPlayers,
    source.leaderboard,
    source.players,
    source.playerResults,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as RawPlayerLike[];
  }
  return [];
}

/**
 * Normalize a single raw player shape to a unified model.
 */
export function normalizePlayer(raw: RawPlayerLike, index: number): NormalizedLeaderboardPlayer {
  const id = String(
    raw.id ?? raw.playerId ?? raw.userId ?? `player-${index}`
  );
  const name = (
    raw.name || raw.playerName || raw.userName || raw.Name || raw.PlayerName || 'Unknown'
  );
  const score = (
    typeof raw.score === 'number' ? raw.score :
    typeof raw.Score === 'number' ? raw.Score :
    typeof raw.playerScore === 'number' ? raw.playerScore : 0
  );
  const rank = (
    typeof raw.rank === 'number' ? raw.rank :
    typeof raw.Rank === 'number' ? raw.Rank :
    typeof raw.position === 'number' ? raw.position : null
  );
  return { id, name, score, rank, raw };
}

/**
 * Given an event payload (final results or interim), return a normalized leaderboard result.
 */
export function normalizeLeaderboard(payload: any): NormalizedLeaderboardResult {
  const rawPlayers = extractRawPlayers(payload);
  const players = rawPlayers.map(normalizePlayer);
  // If rank is not provided, infer by score (stable) preserving original order as tie-breaker
  if (players.some(p => p.rank == null)) {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const rankMap = new Map<string, number>();
    let currentRank = 1;
    let lastScore: number | null = null;
    for (const p of sorted) {
      if (lastScore === null || p.score < lastScore) {
        currentRank = rankMap.size + 1;
        lastScore = p.score;
      }
      rankMap.set(p.id, currentRank);
    }
    for (const p of players) {
      p.rank = rankMap.get(p.id) ?? null;
    }
  }
  // Ensure players sorted by rank ascending (then score desc if same rank)
  const ranked = [...players].sort((a, b) => {
    if (a.rank == null && b.rank == null) return b.score - a.score;
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return b.score - a.score;
  });
  // With exactOptionalPropertyTypes, omit 'first' when empty to avoid assigning undefined
  return ranked.length > 0
    ? { players: ranked, first: ranked[0]! }
    : { players: ranked };
}

# Frontend Refactor Overview

## Goals
Reduce coupling between UI components and raw SignalR connection logic, provide structured state management, and make event handling testable.

## Key Changes
1. Introduced `HubClient` wrapper (`src/lib/HubClient.ts`) centralizing connection lifecycle and method invocations.
2. Added `GameSessionContext` (`src/context/GameSessionContext.tsx`) with a reducer-driven state model (room, players, question, phase, final results).
3. Refactored `useGameHub` hook to delegate connection start/reconnect & invocations to `HubClient` while retaining its public API.
4. Established event normalization patterns (mapping multiple backend field aliases to unified state fields).
5. Prepared ground for strict typing & unit tests without requiring a live SignalR backend.

## Next Steps
- Harden event payload types (replace `any` with specific interfaces for players, leaderboard, answers).
- Add a lightweight test harness (Vitest or Jest) for HubClient connection/reconnect flows.
- Integrate error boundary and connection status components.
- Consolidate shared DTOs with backend (FinalResults / PersonalizedFinalResults) into a neutral contract package.
- Debounce high-frequency events (e.g. progress updates) if necessary.

## Migration Notes
Existing components using `useGameHub` should continue to function—the API shape is preserved. New components can instead consume `GameSessionContext` for derived state rather than manually wiring event handlers.

## Event Mapping Strategy
Incoming hub events often provide alternative property names (e.g. `index` vs `questionIndex`). The reducer normalizes these. Keep alias mapping close to where state updates occur for clarity.

## Testing Strategy (Planned)
Mock the underlying `HubConnection` by stubbing `.on` and `.invoke`. Emit synthetic events to validate reducer transitions.

---
Generated on: 2025-10-13
# Implementation Bugs: Season Screens

## Scope
- `src/screens/ScheduleScreen.tsx`
- `src/screens/StandingsScreen.tsx`
- `src/screens/PlayoffBracketScreen.tsx`
- `src/screens/GameSimScreen.tsx`
- `src/screens/GamecastScreen.tsx`

---

## High Severity Bugs

### ScheduleScreen.tsx:184 - Tie games displayed as losses
**Severity:** HIGH
**Type:** Logic Bug

```typescript
displayGame.result = {
  userScore,
  opponentScore,
  won: userScore > opponentScore,
};
```

**Issue:** When a game is tied, `game.result.won` will be false (since `userScore > opponentScore` is false), so it displays "L" and uses the loss color. But the game is actually a tie, not a loss!

**Impact:** Tie games incorrectly shown as losses in the UI.

**Fix:** Add a `tie` property:
```typescript
won: userScore > opponentScore,
tie: userScore === opponentScore,
```

---

### ScheduleScreen.tsx:165-167 - Opponent record missing ties
**Severity:** HIGH
**Type:** Missing Data

```typescript
record: opponent
  ? `${opponent.currentRecord.wins}-${opponent.currentRecord.losses}`
  : '0-0',
```

**Issue:** Opponent record display doesn't include ties.

**Impact:** Incomplete record display for opponents with ties.

**Fix:**
```typescript
record: opponent
  ? `${opponent.currentRecord.wins}-${opponent.currentRecord.losses}${opponent.currentRecord.ties > 0 ? `-${opponent.currentRecord.ties}` : ''}`
  : '0-0',
```

---

### LiveGameSimulationScreen.tsx - No tie handling
**Severity:** HIGH
**Type:** Missing Feature

**Issue:** No handling for tie games in live simulation display.

**Impact:** Ties not properly represented during live game.

---

## Medium Severity Bugs

### GamecastScreen.tsx - No tie handling
**Severity:** MEDIUM
**Type:** Display Bug

**Issue:** GamecastScreen doesn't handle tie scenarios - only win/loss styling.

**Impact:** Tie results styled incorrectly.

---

### ScheduleScreen.tsx - Missing bye week indication
**Severity:** MEDIUM
**Type:** UX Issue

**Issue:** Bye weeks may not be clearly indicated in schedule display.

**Impact:** Users may be confused about missing game weeks.

---

### StandingsScreen.tsx - Tie count affects win percentage
**Severity:** LOW (Verified Working)
**Type:** N/A

**Verification:** StandingsService.ts:37-40 correctly handles ties:
```typescript
function calculatePct(wins: number, losses: number, ties: number): number {
  const total = wins + losses + ties;
  if (total === 0) return 0;
  return (wins + ties * 0.5) / total;
}
```

This is correct - ties count as 0.5 wins for win percentage calculation.

---

## Implementation Tasks

- [ ] **ScheduleScreen.tsx**
  - [ ] Add `tie` property to game result object
  - [ ] Update UI to show "T" for ties with neutral color
  - [ ] Include ties in opponent record display
  - [ ] Add clear bye week indication

- [ ] **GamecastScreen.tsx**
  - [ ] Add tie result styling
  - [ ] Update result display logic for ties

- [ ] **LiveGameSimulationScreen.tsx**
  - [ ] Add tie handling in game result display

---

## Testing Commands

```bash
npm run typecheck
npm test -- --testPathPattern="Schedule|Standings|Playoff|GameSim|Gamecast"
```

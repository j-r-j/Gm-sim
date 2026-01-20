# Implementation Bugs: Navigation/Dashboard Screens

## Scope
- `src/screens/StartScreen.tsx`
- `src/screens/TeamSelectionScreen.tsx`
- `src/screens/GMDashboardScreen.tsx`
- `src/screens/SettingsScreen.tsx`

---

## Critical Bugs

### GMDashboardScreen.tsx:178 - Missing userTeam null check
**Severity:** CRITICAL
**Type:** Crash Risk

```typescript
const userTeam: Team = gameState.teams[gameState.userTeamId];
```

**Issue:** If `gameState.userTeamId` is invalid or the team doesn't exist, `userTeam` will be undefined, causing crashes when accessing properties on lines 341-344, 362, 374, 376, 381, 445, etc.

**Impact:** Screen crashes when rendering team banner and status bars.

---

### GMDashboardScreen.tsx:224 - Missing opponent null check
**Severity:** CRITICAL
**Type:** Crash Risk

```typescript
const opponent = gameState.teams[opponentId];
```

**Issue:** No null check before accessing `opponent.nickname` and `opponent.currentRecord` on lines 227-228.

**Impact:** Crash if opponent team doesn't exist in teams object.

---

### GMDashboardScreen.tsx:326 - Missing divisionTeams empty array check
**Severity:** CRITICAL
**Type:** Crash Risk

```typescript
const divisionLeader = divisionTeams[0];
```

**Issue:** If `divisionTeams` is empty, `divisionLeader` is undefined, then accessing `divisionLeader.currentRecord` on line 330 crashes.

**Impact:** Crash during division leader calculation.

---

## High Severity Bugs

### GMDashboardScreen.tsx:192 - Unsafe PHASE_NAMES lookup
**Severity:** HIGH
**Type:** Display Bug

```typescript
return PHASE_NAMES[offseasonPhase];
```

**Issue:** If `offseasonPhase` is null (set on line 184), this looks up `PHASE_NAMES[null]` which returns undefined.

**Impact:** Shows "undefined" text instead of fallback.

---

### GMDashboardScreen.tsx:666-680 - Missing careerStats existence check
**Severity:** HIGH
**Type:** Crash Risk

```typescript
gameState.careerStats.seasonsCompleted
```

**Issue:** Multiple accesses to `gameState.careerStats` properties without verifying `careerStats` exists.

**Impact:** Crash if careerStats is undefined.

---

### GMDashboardScreen.tsx:179 - Missing league null check
**Severity:** HIGH
**Type:** Crash Risk

```typescript
const { calendar } = gameState.league;
```

**Issue:** If league is undefined, this crashes.

**Impact:** Crash when destructuring league.

---

### SettingsScreen.tsx:164,170,176 - Missing settings prop validation
**Severity:** HIGH
**Type:** Crash Risk

```typescript
settings.simulationSpeed
settings.autoSaveEnabled
settings.notificationsEnabled
```

**Issue:** Directly accesses settings properties without null/undefined check. If `settings` prop is undefined, all 3 lines crash.

**Impact:** Screen crashes if settings object not provided properly.

---

## Medium Severity Bugs

### StartScreen.tsx:156-164 - Missing fallback text for undefined summary
**Severity:** MEDIUM
**Type:** Display Bug

```typescript
slotInfo.summary?.teamName
slotInfo.summary?.userName
```

**Issue:** Uses optional chaining but no fallback text. If summary is undefined, displays "undefined" instead of placeholder like "N/A".

**Impact:** Shows "undefined" text in modal.

---

### SettingsScreen.tsx:133 - Silent failure if onClearData missing
**Severity:** MEDIUM
**Type:** Silent Failure

```typescript
onClearData?.();
```

**Issue:** Optional chaining means nothing happens silently if callback isn't provided.

**Impact:** No error feedback if onClearData is not implemented.

---

## Low Severity Bugs

### StartScreen.tsx:74 - No UX feedback for empty saves
**Severity:** LOW
**Type:** UX Issue

**Issue:** Boolean check `hasSavedGames` works, but no UX feedback for why Continue button is hidden.

**Impact:** User confusion - "where's the Continue button?"

---

## Implementation Tasks

- [x] Add null checks for `userTeam` in GMDashboardScreen
- [x] Add null checks for `opponent` lookup
- [x] Add empty array check for `divisionTeams`
- [x] Add null coalescing for `PHASE_NAMES` lookup
- [x] Add existence check for `careerStats`
- [x] Add null check for `league` destructuring
- [x] Add settings prop validation
- [x] Add fallback text for save slot summary
- [ ] Add user feedback when no saved games exist (LOW - deferred)

---

## Testing Commands

```bash
npm run typecheck
npm test -- --testPathPattern="StartScreen|TeamSelection|GMDashboard|Settings"
```

# Implementation Bugs: Roster Screens

## Scope
- `src/screens/RosterScreen.tsx`
- `src/screens/DepthChartScreen.tsx`
- `src/screens/PlayerProfileScreen.tsx`
- `src/core/roster/DepthChartManager.ts` (helper used by screens)

**Note:** `InjuryReportScreen.tsx` does not exist at the specified path.

---

## Critical Bugs

### DepthChartManager.ts:364-373 - getDepthLabel() missing return statement
**Severity:** CRITICAL
**Type:** Missing Return Value

```typescript
export function getDepthLabel(depth: DepthSlot): string {
  switch (depth) {
    case 1:
      return 'Starter';
    case 2:
      return 'Backup';
    case 3:
      return '3rd String';
  }
  // No default case - returns undefined for unexpected values
}
```

**Issue:** Switch statement has no `default` case with return value. If unexpected depth value (not 1, 2, or 3) is passed, returns `undefined`.

**Impact:** Causes blank text rendering in DepthChartScreen at lines 65 and 88 where depth labels are displayed.

---

## High Severity Bugs

### RosterScreen.tsx:511-525 - No empty state message
**Severity:** HIGH
**Type:** Missing UI Feedback

**Issue:** When roster is empty, FlatList renders nothing with no user feedback. User might think data is still loading or not rendering.

**Impact:** Users see blank screen with no explanation when roster is empty.

**Fix:** Add "No players on roster" message when `filteredPlayers.length === 0`.

---

### DepthChartScreen.tsx:261-268 - No empty state handling
**Severity:** HIGH
**Type:** Missing UI Feedback

**Issue:** When `positionDepths` array is empty, renders nothing. No message indicating depth chart is incomplete or empty.

**Impact:** Users see blank screen with no explanation for missing depth chart data.

---

### PlayerProfileScreen.tsx:114 - Default to QB for unknown positions
**Severity:** HIGH
**Type:** Logic Bug

```typescript
// In getPositionGroup()
default:
  return 'QB';
```

**Issue:** `getPositionGroup()` returns 'QB' by default for any unmatched position. If invalid position is passed, user sees QB skills instead of error or empty state.

**Impact:** Could display completely wrong skills for a player with unrecognized position.

---

## Medium Severity Bugs

### RosterScreen.tsx:407-410 - Silent filtering of missing player data
**Severity:** MEDIUM
**Type:** Data Integrity

```typescript
const rosterPlayers = rosterIds
  .map((id) => players[id])
  .filter(Boolean);  // Silently removes missing players
```

**Issue:** Players referenced in `rosterIds` but not found in `players` object are silently removed via `.filter(Boolean)`. No warning or indication that player data is missing.

**Impact:** Could hide bugs where player data isn't properly synced between roster and player database.

---

### PlayerProfileScreen.tsx:319-332 - Silently filtering out missing skills
**Severity:** MEDIUM
**Type:** Data Display

**Issue:** When `skills[skillName]` doesn't exist, returns null instead of showing missing data. UI silently hides skills that should display.

**Impact:** No indication which skills are unavailable or why - could mask data issues.

---

### PlayerProfileScreen.tsx:439-443 - Using array index as key for visibleTraits
**Severity:** MEDIUM
**Type:** React Best Practice

```typescript
{report.visibleTraits.map((trait, index) => (
  <TraitBadge key={index} trait={trait} />
))}
```

**Issue:** Using array index as key for visibleTraits. If traits array changes, React loses track of component identity.

**Impact:** Potential rendering inconsistencies if traits order changes dynamically.

**Fix:** Use `trait.id` or `trait.name` for stable keys.

---

### DepthChartScreen.tsx:263 - Using Position enum value as FlatList key
**Severity:** LOW
**Type:** Code Quality

```typescript
key={positionDepth.position}
```

**Issue:** Using `Position` enum value as FlatList key. While positions should be unique, using enums as keys is fragile.

**Impact:** Could cause issues if position values conflict or change.

---

## Missing Screens

The following screen was requested but does not exist:
- `InjuryReportScreen.tsx` - NOT FOUND

Injury-related data may be displayed in:
- `RosterScreen.tsx` - Shows injury status inline with roster
- `PlayerProfileScreen.tsx` - Shows injury history section

---

## Implementation Tasks

- [x] **DepthChartManager.ts**
  - [x] Add default case to `getDepthLabel()` returning "Reserve"

- [x] **RosterScreen.tsx**
  - [x] Add empty state message when roster is empty
  - [ ] Add warning/logging for missing player data instead of silent filtering (MEDIUM - deferred)

- [x] **DepthChartScreen.tsx**
  - [x] Add empty state message when depth chart is empty
  - [ ] Review key strategy for FlatList items (LOW - deferred)

- [ ] **PlayerProfileScreen.tsx** (MEDIUM - deferred)
  - [ ] Handle unknown positions gracefully (show warning or generic skills)
  - [ ] Show indicator for missing skills instead of silent filtering
  - [ ] Use stable keys for trait badges instead of index

---

## Testing Commands

```bash
npm run typecheck
npm test -- --testPathPattern="Roster|DepthChart|PlayerProfile"
```

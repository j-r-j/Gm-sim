# Implementation Bugs: Draft Screens

## Scope
- `src/screens/DraftBoardScreen.tsx`
- `src/screens/DraftRoomScreen.tsx`
- `src/screens/ScoutingReportsScreen.tsx`
- `src/screens/SinglePlayerCardScreen.tsx`

---

## Critical Bugs

### DraftRoomScreen.tsx:151-152 - Missing null check on tradeOffers
**Severity:** CRITICAL
**Type:** Crash Risk

```typescript
const pendingTradeOffers = tradeOffers.filter((t) => t.status === 'pending');
```

**Issue:** If `tradeOffers` is `undefined` or `null`, this will crash immediately.

**Impact:** Runtime crash if tradeOffers array is not initialized.

---

### DraftRoomScreen.tsx:393 - Missing empty check in upcomingPicks map
**Severity:** CRITICAL
**Type:** Crash Risk

```typescript
{upcomingPicks.map((pick, index) => renderPickItem(pick, index, false))}
```

**Issue:** Unlike `recentPicks` on line 383-387 which checks `recentPicks.length > 0`, the `upcomingPicks.map()` has no guard. If `upcomingPicks` is `undefined` or `null`, this will crash.

**Impact:** Crash if upcomingPicks array is undefined.

---

## High Severity Bugs

### SinglePlayerCardScreen.tsx:400-404 - Optional field access without null check
**Severity:** HIGH
**Type:** Type Safety

```typescript
{report.ceiling && report.floor && (
  <Text style={styles.ceilingFloorText}>
    Ceiling: {report.ceiling} | Floor: {report.floor}
  </Text>
)}
```

**Issue:** Accessing optional fields `report.ceiling` and `report.floor` directly. These are optional fields (marked with `?` in ScoutReport type) that only exist on focus reports.

**Impact:** May show undefined values for non-focus reports.

---

### ScoutingReportsScreen.tsx:259 - Potential undefined property access in sort
**Severity:** HIGH
**Type:** Crash Risk

```typescript
(a, b) => a.draftProjection.roundMin - b.draftProjection.roundMin
```

**Issue:** While `draftProjection` is required on ScoutReport, if a report is malformed or `roundMin` is missing, this could cause NaN issues or crashes.

**Impact:** NaN comparison or crash in sorting.

---

### SinglePlayerCardScreen.tsx:687-700 - Missing skill data handling
**Severity:** HIGH
**Type:** Display Bug

```typescript
<SkillRangeDisplay
  skillName={skillName}
  perceivedMin={skill.perceivedMin}
  perceivedMax={skill.perceivedMax}
  playerAge={age}
  maturityAge={skill.maturityAge}
/>
```

**Issue:** The code checks `if (!skill)` but doesn't verify that `skill.perceivedMin`, `skill.perceivedMax`, or `skill.maturityAge` exist.

**Impact:** Component receives undefined values.

---

## Medium Severity Bugs

### DraftRoomScreen.tsx:299-300 - Redundant conditional nesting
**Severity:** MEDIUM
**Type:** Logic Bug

```typescript
{isUserPick && (
  <View>
    ...
    {isUserPick && !autoPickEnabled && (
      <Text>Long press a prospect to draft</Text>
    )}
  </View>
)}
```

**Issue:** Line 283 already checks `isUserPick`, so the inner check on line 299 is redundant.

**Impact:** Code smell, unnecessary nested check.

---

### DraftRoomScreen.tsx:160 - Truncating prospect list without indication
**Severity:** MEDIUM
**Type:** UX Issue

```typescript
return result.slice(0, 20); // Limit for performance in draft room
```

**Issue:** When filtering available prospects, the list is silently truncated to 20 items. Users won't know if prospects are hidden.

**Impact:** Users can't find specific prospects in large draft classes.

---

### DraftBoardScreen.tsx:158-168 - Null coalescing could hide data issues
**Severity:** MEDIUM
**Type:** Data Masking

```typescript
return (a.overallRank ?? 999) - (b.overallRank ?? 999);
```

**Issue:** Using 999 as fallback for undefined `overallRank` masks data issues. Prospects with null rank get sorted to the end unexpectedly.

**Impact:** Prospects marked as "unranked" hidden at bottom.

---

## Low Severity Bugs

### ScoutingReportsScreen.tsx:495,511 - Hardcoded marginBottom
**Severity:** LOW
**Type:** Style Issue

```typescript
marginBottom: 2,
```

**Issue:** Should use `spacing.xxs` for consistency.

**Impact:** Minor style inconsistency.

---

## Implementation Tasks

- [x] Add null check for `tradeOffers` array before filtering
- [x] Add empty array guard for `upcomingPicks.map()`
- [ ] Verify optional fields exist before accessing in scout reports (MEDIUM - deferred)
- [ ] Add defensive fallback for `draftProjection.roundMin` sorting (MEDIUM - deferred)
- [ ] Validate skill properties exist before passing to display component (MEDIUM - deferred)
- [x] Remove redundant `isUserPick` check
- [ ] Add UI indication when prospect list is truncated (MEDIUM - UX enhancement)
- [ ] Handle null `overallRank` explicitly instead of using high fallback (MEDIUM - deferred)

---

## Testing Commands

```bash
npm run typecheck
npm test -- --testPathPattern="DraftBoard|DraftRoom|ScoutingReports|SinglePlayerCard"
```

# Implementation Bugs: News Screens

## Scope
- `src/screens/NewsScreen.tsx`
- `src/screens/StatsScreen.tsx` (league leaders)
- `src/screens/WeeklyDigestScreen.tsx`
- `src/screens/RumorMillScreen.tsx`

**Note:** The following requested screens do not exist:
- `TransactionLogScreen.tsx` - NOT FOUND
- `AwardsScreen.tsx` - NOT FOUND
- `LeagueLeadersScreen.tsx` - NOT FOUND

---

## High Severity Bugs

### NewsScreen.tsx:318-324 - Breaking/Unread border style conflict
**Severity:** HIGH
**Type:** Style Bug

**Issue:** Cards can have BOTH `breakingCard` (red left border) AND `unreadCard` (blue left border) styles applied simultaneously. The `unreadCard` style will override `breakingCard` since it appears last in the array, making breaking unread items lose their visual priority indicator.

**Impact:** Breaking unread news doesn't show the breaking indicator if unread.

---

### NewsScreen.tsx:365-373 - Breaking badge positioning bug
**Severity:** HIGH
**Type:** Layout Bug

```typescript
breakingBadge: {
  position: 'absolute',
  top: spacing.sm,
  right: spacing.sm,
}
```

**Issue:** The BREAKING badge uses `position: 'absolute'` but the parent card (TouchableOpacity) doesn't have `position: 'relative'`. This causes the badge to overlap with the headline text instead of sitting cleanly above it.

**Impact:** BREAKING news badge overlaps content and may be unreadable.

---

### NewsScreen.tsx:145-151 - News sorting missing time component
**Severity:** HIGH
**Type:** Logic Bug

```typescript
// Sort: year desc, week desc, breaking first
const sorted = [...items].sort((a, b) => {
  if (a.year !== b.year) return b.year - a.year;
  if (a.week !== b.week) return b.week - a.week;
  if (a.priority === 'breaking' && b.priority !== 'breaking') return -1;
  if (b.priority === 'breaking' && a.priority !== 'breaking') return 1;
  return 0;
});
```

**Issue:** Sort logic only uses `year` and `week`, then `priority`. The NewsItem has a `date` field (line 19) but it's never used. If multiple news items occur in the same week, insertion order is preserved instead of chronological order.

**Impact:** Newest-first sorting may be incorrect within the same week.

---

## Medium Severity Bugs

### NewsScreen.tsx:92 - Incomplete date/time formatting
**Severity:** MEDIUM
**Type:** Display Bug

```typescript
// Only shows "Week {item.week}"
```

**Issue:** Date display only shows week number - doesn't include year or actual calendar date. Makes it impossible to distinguish between news from different years.

**Impact:** Cross-year news sorting is ambiguous to users.

---

### NewsScreen.tsx:127-128 - Unused current week/year parameters
**Severity:** MEDIUM
**Type:** Code Smell

```typescript
_currentWeek,
_currentYear,
```

**Issue:** `currentWeek` and `currentYear` are destructured but never used (prefixed with underscore). These could enhance date formatting to show relative dates like "This week" vs "Week 5, Year 2".

**Impact:** Lost opportunity for better UX, code smell.

---

### StatsScreen.tsx:457-460 - Ambiguous stat labels
**Severity:** MEDIUM
**Type:** UX Bug

**Issue:** In `TeamStatsView`, when `statType === 'defense'`, the header shows `PPG, YPG, TO` but these are defensive metrics (points ALLOWED, yards ALLOWED, turnovers FORCED). The labels should clarify they're defensive stats. Header at line 714 doesn't distinguish from offense.

**Impact:** User confusion - "PPG" could mean either points for or points against.

---

### StatsScreen.tsx:973-974 - Missing division filter state reset
**Severity:** MEDIUM
**Type:** State Bug

**Issue:** In `handleScopeChange`, when setting `filterScope = 'team'`, it sets `selectedConference` and `selectedDivision` from user team. However, if user had previously selected a different division, those old values remain in state and may cause filter confusion on subsequent scope changes.

**Impact:** Filter state can be inconsistent.

---

## Implementation Tasks

- [x] **NewsScreen.tsx**
  - [x] Fix style precedence for breaking vs unread cards
  - [x] Add `position: 'relative'` to parent card for breaking badge
  - [x] Use `date` field in sorting for same-week news
  - [ ] Add year to date display (LOW - deferred)
  - [ ] Use currentWeek/currentYear for relative date formatting (LOW - deferred)

- [ ] **StatsScreen.tsx** (MEDIUM - deferred)
  - [ ] Clarify defensive stat labels (e.g., "PPG Allowed" vs "PPG")
  - [ ] Reset filter state properly on scope change

---

## Missing Screens

The following screens were requested but do not exist in the codebase:
- `TransactionLogScreen.tsx`
- `AwardsScreen.tsx`
- `LeagueLeadersScreen.tsx`

These may need to be created or may have been renamed. Related functionality exists in:
- `StatsScreen.tsx` - Has a "leaders" tab with league leaders
- `NewsScreen.tsx` - Could contain transaction news

---

## Testing Commands

```bash
npm run typecheck
npm test -- --testPathPattern="News|Stats|WeeklyDigest|RumorMill"
```

# Implementation Bugs: Staff Screens

## Scope
- `src/screens/StaffScreen.tsx`
- `src/screens/CoachProfileScreen.tsx`
- `src/screens/ScoutProfileScreen.tsx`
- `src/screens/OwnerRelationsScreen.tsx`
- `src/screens/CoachHiringScreen.tsx`
- `src/screens/StaffHiringScreen.tsx`

---

## Critical Bugs

### StaffScreen.tsx:97 - Missing null check on scout
**Severity:** CRITICAL
**Type:** Crash Risk

```typescript
<ScoutAccuracyBadge scout={scout} size="sm" />
```

**Issue:** ScoutAccuracyBadge receives scout without checking if it exists.

**Impact:** Component could crash if scout is null/undefined.

---

### StaffScreen.tsx:177-289 - No null checks on array data
**Severity:** CRITICAL
**Type:** Crash Risk

**Issue:** `coaches` and `scouts` arrays are used without null/undefined checks. Direct FlatList usage without validating arrays exist.

**Impact:** Runtime error if arrays are null.

---

### OwnerRelationsScreen.tsx:210 - Missing null check on patienceView properties
**Severity:** CRITICAL
**Type:** Crash Risk

```typescript
const status = patienceView?.status || owner.jobSecurityStatus;
```

**Issue:** If patienceView exists but is incomplete, subsequent lines (220, 231-264) will fail with multiple unsafe property accesses.

**Impact:** Crash if patienceView is partial object.

---

### OwnerRelationsScreen.tsx:365 - No null check on owner.activeDemands
**Severity:** CRITICAL
**Type:** Crash Risk

```typescript
demands={owner.activeDemands}
```

**Issue:** `owner.activeDemands` could be undefined.

**Impact:** DemandsSection receives undefined, rendering fails.

---

### CoachHiringScreen.tsx:29-36 - Incomplete role mapping
**Severity:** CRITICAL
**Type:** Logic Bug

```typescript
function getRoleDisplayName(role) {
  // Only maps 3 roles: headCoach, offensiveCoordinator, defensiveCoordinator
}
```

**Issue:** Missing mappings for: specialTeamsCoordinator, qbCoach, wrCoach, rbCoach, teCoach, olCoach, dlCoach, lbCoach, dbCoach.

**Impact:** Can't hire position coaches - only shows raw enum value.

---

### CoachHiringScreen.tsx:41-52 - Missing role mappings in candidate generation
**Severity:** CRITICAL
**Type:** Logic Bug

**Issue:** `mapRoleToCandidateRole()` only handles 3 roles. Missing mappings for position-specific coaching roles.

**Impact:** Candidates can't be generated for coordinator positions.

---

### StaffHiringScreen.tsx:1103-1108 - Unsafe coach modal usage
**Severity:** HIGH
**Type:** Crash Risk

```typescript
<CoachCard coach={viewingCoach} currentYear={currentYear} onClose={() => setViewingCoach(null)} isModal={true} />
```

**Issue:** No null check on `viewingCoach` before passing to component.

**Impact:** Component receives null/undefined when modal is supposed to be hidden.

---

## High Severity Bugs

### StaffScreen.tsx:87 - Wrong avatar context for scouts
**Severity:** HIGH
**Type:** Display Bug

```typescript
<Avatar id={scout.id} size="sm" context="coach" accentColor={colors.accent} />
```

**Issue:** Avatar context is hardcoded to `"coach"` for scouts - should be `"scout"` or different context.

**Impact:** Scout avatars display with coach styling instead of scout styling.

---

### OwnerRelationsScreen.tsx - MISSING SECTION: No financial expectations display
**Severity:** HIGH
**Type:** Missing Feature

**Issue:** Owner has salary cap preferences but never shown on screen. Missing section for: `owner.salaryCapTolerance`, `owner.spendingTendency`.

**Impact:** GMs don't know owner's budget expectations.

---

## Medium Severity Bugs

### StaffScreen.tsx:79-80 - Coach data hidden (scheme/tendencies)
**Severity:** MEDIUM
**Type:** Missing Data Display

**Issue:** Coach schemes and tendencies NOT shown in list view - only role, age, experience, reputation. Missing: coach personality traits, coaching tree, scheme type.

**Impact:** Users can't see key coach attributes at a glance.

---

### CoachProfileScreen.tsx:232-240 - No personality synergy display
**Severity:** MEDIUM
**Type:** Missing Feature

**Issue:** Personality badges shown but NO explanation of who they work well/poorly with. Missing: `coach.personality.synergizesWith` and `coach.personality.conflictsWith` arrays never displayed.

**Impact:** Users can't assess coordinator chemistry without going to hire screen.

---

### CoachProfileScreen.tsx:242-243 - Coaching tree data unused
**Severity:** MEDIUM
**Type:** Missing Feature

```typescript
<CoachTreeCard tree={coach.tree} />
```

**Issue:** CoachTreeCard is imported and displayed but tree details not explained. No explanation of how tree affects coaching (personality synergies, scheme philosophy).

**Impact:** Users don't understand coaching tree importance.

---

### OwnerRelationsScreen.tsx:164-169 - Incomplete owner personality display
**Severity:** MEDIUM
**Type:** Missing Data

**Issue:** Only shows 4 basic traits (patience, spending, control, loyalty). Missing: `owner.leadership`, `owner.ambition`, `owner.marketExpectations`.

**Impact:** Users don't see full owner personality affecting decisions.

---

### ScoutingReportsScreen.tsx:202 - Missing scout quality/experience display
**Severity:** MEDIUM
**Type:** Missing Data

```typescript
<Text style={styles.metaText}>Scout: {displayReport.header.scoutName}</Text>
```

**Issue:** Shows scout name but NOT their experience level, position specialty, accuracy rating. Scout accuracy badge component exists but never integrated into report view.

**Impact:** No context about who performed the scouting or how reliable they are.

---

### CoachHiringScreen.tsx:118-123 - Missing coach personality info
**Severity:** MEDIUM
**Type:** Missing Data

**Issue:** Shows only: name, current role, current team, age, experience, scheme. Missing: personality type, coaching tree, weakness analysis.

**Impact:** Incomplete hiring decision information.

---

### StaffHiringScreen.tsx:880-882 - Missing validation before completion
**Severity:** MEDIUM
**Type:** Validation Bug

```typescript
if (selectedHC && selectedOC && selectedDC) { onComplete(...) }
```

**Issue:** Doesn't check that all three coaches have valid contract terms and aren't over budget.

**Impact:** Could pass invalid staff configuration to onComplete callback.

---

## Implementation Tasks

- [ ] **StaffScreen.tsx**
  - [ ] Add null check for scout before ScoutAccuracyBadge
  - [ ] Add null/undefined checks for coaches and scouts arrays
  - [ ] Change avatar context from "coach" to "scout" for scouts
  - [ ] Display coach schemes and tendencies in list view

- [ ] **CoachProfileScreen.tsx**
  - [ ] Display personality synergies and conflicts
  - [ ] Add explanation for coaching tree effects

- [ ] **OwnerRelationsScreen.tsx**
  - [ ] Add null check for patienceView and its properties
  - [ ] Add null check for owner.activeDemands
  - [ ] Display all owner personality traits
  - [ ] Add financial expectations section

- [ ] **CoachHiringScreen.tsx**
  - [ ] Complete role mapping for all positions
  - [ ] Add personality and weakness info to candidate display

- [ ] **StaffHiringScreen.tsx**
  - [ ] Add null check for viewingCoach in modal
  - [ ] Add budget validation before completion

- [ ] **ScoutingReportsScreen.tsx**
  - [ ] Add scout experience and accuracy to report display

---

## Testing Commands

```bash
npm run typecheck
npm test -- --testPathPattern="Staff|Coach|Scout|Owner"
```

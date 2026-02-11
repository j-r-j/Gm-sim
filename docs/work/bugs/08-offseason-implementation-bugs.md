# Implementation Bugs: Offseason Screens

## Scope
- `src/screens/OffseasonScreen.tsx`
- `src/screens/TrainingCampScreen.tsx`
- `src/screens/OTAsScreen.tsx`
- `src/screens/FinalCutsScreen.tsx`
- `src/screens/PreseasonScreen.tsx`

---

## High Severity Bugs

### FinalCutsScreen.tsx:420-436 - Cuts tab missing detailed player list
**Severity:** HIGH
**Type:** Incomplete Implementation

```typescript
{activeTab === 'cuts' && (
  <>
    <Text style={styles.sectionTitle}>Released Players ({summary.playersCut})</Text>
    {summary.playersCut === 0 ? (
      <Text style={styles.emptyText}>No players have been released yet</Text>
    ) : (
      // We'd need the cut players list - for now show summary
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>
          {summary.playersCut} player{summary.playersCut !== 1 ? 's' : ''} released
        </Text>
        ...
      </View>
    )}
  </>
)}
```

**Issue:** The cuts tab shows only a count summary (comment on line 426 indicates incomplete implementation). No list of cut players with details like salary savings, dead cap impact, or cut reason.

**Impact:** Players cannot see detailed information about which players were cut or the financial impact.

---

### OTAsScreen.tsx:457-461 - Incomplete attendance tracking
**Severity:** HIGH
**Type:** Missing Data Display

```typescript
const allReports = useMemo(() => {
  return [...summary.standouts, ...summary.concerns].sort((a, b) =>
    a.playerName.localeCompare(b.playerName)
  );
}, [summary]);
```

**Issue:** The `allReports` array only combines standouts and concerns, completely excluding all players with `impression` values of 'solid', 'average', 'injury', etc.

**Impact:** Users cannot see full OTA attendance/participation tracking. Players with average impressions are missing.

---

### OTAsScreen.tsx:536 - Attendance tab missing majority of roster
**Severity:** HIGH
**Type:** Missing Data Display

```typescript
{activeTab === 'attendance' && (
  <>
    <Text style={styles.sectionTitle}>Player Attendance</Text>
    {allReports.map((report) => (
      <AttendanceItem key={report.playerId} report={report} ... />
    ))}
  </>
)}
```

**Issue:** Related to bug above. The attendance tab should show ALL roster player participation, not just standouts and concerns. The `OTASummary` contains all reports but only the filtered set is displayed.

**Impact:** OTA attendance/participation tracking is incomplete and misleading.

---

## Medium Severity Bugs

### FinalCutsScreen.tsx:256-260 - Confusing Practice Squad UI
**Severity:** MEDIUM
**Type:** Logic Error / UI Design

```typescript
function PracticeSquadCard({
  player,
  onPress,
  onSignToPS,
}: {...}): React.JSX.Element {
  return (
    <View style={styles.psCard}>
      ...
      {onSignToPS && (
        <TouchableOpacity style={styles.signPSButton} onPress={onSignToPS}>
          <Text style={styles.signPSButtonText}>Sign to PS</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

**Issue:** The `PracticeSquadCard` has a "Sign to PS" button despite the card being used to display players already on the practice squad. The button logic doesn't make sense in this context.

**Impact:** Confusing user experience - button offers redundant action.

---

### FinalCutsScreen.tsx:439-456 - Missing Practice Squad capacity warning
**Severity:** MEDIUM
**Type:** Missing Validation

**Issue:** The screen displays `maxPracticeSquadSize` in the header (line 442) but doesn't warn users when the practice squad reaches capacity or show which eligible players couldn't be signed due to roster limits.

**Impact:** Users won't know if there are more practice squad eligible players that couldn't be signed due to the 16-player limit.

---

### TrainingCampScreen.tsx:489-499 - Filtered development reveals
**Severity:** MEDIUM
**Type:** Display Bug

```typescript
{summary.developmentReveals.filter((r) => r.impact === 'positive').length > 0 && (
  <>
    <Text style={styles.sectionTitle}>Key Developments</Text>
    {summary.developmentReveals
      .filter((r) => r.impact === 'positive')
      .slice(0, 3)
      .map((reveal, i) => (
        <DevelopmentCard key={i} reveal={reveal} onPlayerPress={handlePlayerPress} />
      ))}
  </>
)}
```

**Issue:** On the overview tab, only development reveals with positive impact are shown. Negative developments are relegated to the separate "Development" tab.

**Impact:** Overview tab misses important negative player development information that affects roster decisions.

---

### PreseasonScreen.tsx:394-557 - No roster validation/display
**Severity:** MEDIUM
**Type:** Missing Validation

**Issue:** The preseason screen shows games and evaluations but doesn't display or validate:
- Current roster size is finalized at 53 players
- Final cuts phase was completed
- Roster status before preseason begins

**Impact:** Users cannot verify roster is correct before preseason games start. No enforcement that final cuts were completed.

---

### OffseasonScreen.tsx:260-273 - Validation only handles one condition
**Severity:** LOW
**Type:** Incomplete Logic

```typescript
const getValidationInfo = (task: OffSeasonTask): string | undefined => {
  if (task.actionType !== 'validate') return undefined;

  switch (task.completionCondition) {
    case 'rosterSize<=53':
      if (rosterSize !== undefined) {
        return rosterSize > 53
          ? `Current roster: ${rosterSize}/53 (need to cut ${rosterSize - 53})`
          : `Roster at ${rosterSize}/53 - Ready!`;
      }
      return undefined;
    default:
      return undefined;
  }
};
```

**Issue:** Only handles the `rosterSize<=53` completion condition. Other validation tasks with different completion conditions (like `draftComplete`, `hasSigned`) don't provide validation info/feedback.

**Impact:** Users don't get helpful validation messages for other validation-type tasks.

---

## Implementation Tasks

- [ ] **FinalCutsScreen.tsx** (MEDIUM - deferred)
  - [ ] Implement full cut players list with details (salary, dead cap, reason)
  - [ ] Fix Practice Squad card button logic (remove or repurpose "Sign to PS")
  - [ ] Add warning when practice squad is at capacity

- [ ] **OTAsScreen.tsx** (HIGH - architectural change required)
  - [ ] Include ALL roster players in attendance tracking (requires OTASummary to include allReports)
  - [ ] Show full participation status for entire roster

- [x] **TrainingCampScreen.tsx**
  - [x] Show both positive AND negative development reveals on overview

- [ ] **PreseasonScreen.tsx** (MEDIUM - deferred)
  - [ ] Add roster validation display
  - [ ] Show roster count before preseason
  - [ ] Verify final cuts completed

- [ ] **OffseasonScreen.tsx** (LOW - deferred)
  - [ ] Add validation info for other completion conditions

---

## Testing Commands

```bash
npm run typecheck
npm test -- --testPathPattern="Offseason|TrainingCamp|OTAs|FinalCuts|Preseason"
```

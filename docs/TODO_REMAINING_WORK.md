# GM Sim - Remaining Work Implementation Plan

This document outlines all remaining work to complete the GM Sim app.

**Last Updated:** 2026-01-14
**Previous Phases Completed:** Phase 0-2 (Screens Created)
**Current Completion:** ~60%

---

## Table of Contents
1. [Validation Gate System](#validation-gate-system)
2. [Phase A: Critical Persistence Fixes](#phase-a-critical-persistence-fixes)
3. [Phase B: Wire Draft Room](#phase-b-wire-draft-room)
4. [Phase C: Free Agency Screen](#phase-c-free-agency-screen)
5. [Phase D: Roster Operations](#phase-d-roster-operations)
6. [Phase E: League Simulation](#phase-e-league-simulation)
7. [Phase F: News System Integration](#phase-f-news-system-integration)
8. [Phase G: Career & Firing System](#phase-g-career--firing-system)
9. [Phase H: Offseason Flow](#phase-h-offseason-flow)
10. [Phase I: Final Polish](#phase-i-final-polish)
11. [Appendix: Complete Issue Registry](#appendix-complete-issue-registry)

---

## Validation Gate System

Each phase has a **Validation Gate** that MUST pass before proceeding. Gates consist of Boolean checks.

### Gate Check Format
```
GATE: [Phase Name]
├── [ ] Check 1: Description
├── [ ] Check 2: Description
├── [ ] Check 3: Description
├── [ ] TypeScript compiles: npx tsc --noEmit
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to next phase
```

### Gate Failure Protocol
1. **STOP** - Do not proceed to next phase
2. **IDENTIFY** - Which check(s) failed
3. **FIX** - Address the failing check(s)
4. **RETEST** - Run all gate checks again
5. **PROCEED** - Only when ALL checks pass

---

## Phase A: Critical Persistence Fixes

**Priority:** CRITICAL
**Goal:** Ensure all state changes persist to storage

### A.1 Game Results Not Persisted

**Current Issue:** `App.tsx:592-614` - onGameEnd updates state but never saves to storage

**Location:** `/home/user/Gm-sim/App.tsx`

**Implementation:**
```typescript
// In onGameEnd callback, after setGameState:
const updatedState = { ...gameState, teams: { ...gameState.teams, [userTeam.id]: updatedTeam } };
setGameState(updatedState);
await gameStorage.save(gameState.saveSlot, updatedState);
```

**Validation Checks:**
```
[ ] Game result persists after closing/reopening app
[ ] Team record updates persist
[ ] Win/loss streak persists
```

---

### A.2 Prospect Flag Changes Not Persisted

**Current Issue:** `App.tsx:638-653` - Flag toggles update memory only

**Implementation:**
```typescript
// After updating gameState with new flag value:
await gameStorage.save(gameState.saveSlot, updatedState);
```

**Validation Checks:**
```
[ ] Flagged prospects remain flagged after restart
[ ] Unflagged prospects remain unflagged after restart
```

---

### A.3 Settings Changes Not Persisted

**Current Issue:** `App.tsx:294-301` - Settings update state but don't save

**Implementation:**
```typescript
// After updating gameSettings:
const updatedState = { ...gameState, gameSettings: { ...currentSettings, ...updates } };
setGameState(updatedState);
await gameStorage.save(gameState.saveSlot, updatedState);
```

**Validation Checks:**
```
[ ] Simulation speed setting persists
[ ] Auto-save setting persists
[ ] Notification setting persists
```

---

### A.4 News Read Status Persistence

**Current Issue:** `App.tsx:498-501` - onMarkRead only logs to console

**Implementation:**
1. Add `newsReadStatus: Record<string, boolean>` to GameState
2. Update read status in game state
3. Save to storage

**Validation Checks:**
```
[ ] Read news items stay marked as read after restart
[ ] Unread count updates correctly
```

---

### GATE: Phase A Complete
```
├── [ ] Game results persist through app restart
├── [ ] Prospect flags persist through app restart
├── [ ] Settings persist through app restart
├── [ ] News read status persists through app restart
├── [ ] TypeScript compiles: npx tsc --noEmit
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase B
```

---

## Phase B: Wire Draft Room

**Priority:** CRITICAL
**Goal:** Connect existing DraftRoomScreen to app navigation

### B.1 Export and Import DraftRoomScreen

**Current Issue:** DraftRoomScreen.tsx exists but never exported or used

**Files to Modify:**
- `/home/user/Gm-sim/src/screens/index.ts` - Add export
- `/home/user/Gm-sim/App.tsx` - Add import and navigation

**Implementation:**
1. Export DraftRoomScreen from screens/index.ts
2. Add 'draftRoom' to Screen type union
3. Add import in App.tsx
4. Navigate to draftRoom when in draft phase

---

### B.2 Draft State Management

**Implementation:**
1. Add draft state to GameState:
   ```typescript
   interface DraftState {
     isActive: boolean;
     currentRound: number;
     currentPick: number;
     draftOrder: string[]; // Team IDs in pick order
     completedPicks: DraftPick[];
   }
   ```
2. Initialize draft state when entering draft phase
3. Update after each pick

---

### B.3 Process Draft Picks

**Implementation:**
1. When user selects prospect:
   - Convert Prospect → Player (use existing ProspectToPlayerConverter)
   - Generate rookie contract
   - Add to team roster
   - Remove from prospect pool
   - Advance to next pick
2. Process AI picks between user turns

---

### B.4 Draft-to-Roster Pipeline

**Files:**
- Create `/home/user/Gm-sim/src/services/DraftService.ts`

**Validation Checks:**
```
[ ] DraftRoomScreen accessible when draft phase active
[ ] User can select and draft a prospect
[ ] Drafted player appears on team roster
[ ] Rookie contract generated correctly
[ ] Prospect removed from draft board
[ ] AI teams make picks automatically
[ ] Draft order advances correctly
[ ] All 7 rounds (224 picks) can complete
```

---

### GATE: Phase B Complete
```
├── [ ] DraftRoomScreen renders without errors
├── [ ] Can navigate to draft room during draft phase
├── [ ] User can draft prospects
├── [ ] Drafted players appear on roster with contracts
├── [ ] AI completes all non-user picks
├── [ ] Draft progress persists through save/load
├── [ ] TypeScript compiles: npx tsc --noEmit
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase C
```

---

## Phase C: Free Agency Screen

**Priority:** CRITICAL
**Goal:** Create and wire Free Agency screen

### C.1 Create FreeAgencyScreen

**Current Issue:** Shows "Coming Soon" alert (`App.tsx:196-198`)

**Files to Create:**
- `/home/user/Gm-sim/src/screens/FreeAgencyScreen.tsx`

**Existing Backend to Wire:**
- `/home/user/Gm-sim/src/core/freeAgency/FreeAgencyManager.ts`
- `/home/user/Gm-sim/src/core/freeAgency/FreeAgentMarket.ts`
- `/home/user/Gm-sim/src/core/freeAgency/AIFreeAgencyLogic.ts`
- `/home/user/Gm-sim/src/core/freeAgency/MarketValueCalculator.ts`
- `/home/user/Gm-sim/src/core/freeAgency/ContractNegotiator.ts`

**Features:**
- List of available free agents
- Position filters
- Sort by: Market Value, Age, Position
- Player card: Name, Position, Age, Key skills, Contract demands
- Cap space indicator (always visible)
- Make Offer button → Contract offer modal
- Offer: Years (1-5), Annual salary, Guaranteed money
- AI response: Accept, Reject, Counter

---

### C.2 Wire Navigation

**Implementation:**
1. Add 'freeAgency' to Screen type (already exists)
2. Remove Alert.alert, add setCurrentScreen('freeAgency')
3. Add screen rendering block

---

### C.3 Contract Negotiation

**Implementation:**
1. Create offer modal component
2. Use ContractNegotiator for AI response
3. Process accepted offers: add player to roster, deduct cap space

---

### C.4 AI Free Agency

**Implementation:**
1. During offseason free agency phase:
   - AI teams evaluate and sign free agents
   - Process signings over multiple days/weeks
   - Update rosters and cap space
   - Generate news for signings

**Validation Checks:**
```
[ ] FreeAgencyScreen renders without errors
[ ] Free agent pool populated during offseason
[ ] Position filters work
[ ] Sorting works
[ ] Cap space displays correctly
[ ] Contract offer modal opens
[ ] Offer can be submitted
[ ] AI responds to offers appropriately
[ ] Signed player joins roster
[ ] Signed player removed from free agent pool
[ ] Cap space updates after signing
[ ] AI teams sign free agents
```

---

### GATE: Phase C Complete
```
├── [ ] FreeAgencyScreen fully functional
├── [ ] Can view and filter free agents
├── [ ] Can make contract offers
├── [ ] Signed players join roster with contract
├── [ ] AI teams actively sign free agents
├── [ ] All signings persist through save/load
├── [ ] TypeScript compiles: npx tsc --noEmit
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase D
```

---

## Phase D: Roster Operations

**Priority:** HIGH
**Goal:** Enable player management (cut, trade, extend)

### D.1 Cut Player Functionality

**Current Issue:** `CutCalculator.ts` exists but never called from UI

**Files:**
- `/home/user/Gm-sim/src/core/contracts/CutCalculator.ts` (exists)

**Implementation:**
1. Add "Cut" button to RosterScreen player actions
2. Show cut preview: dead money, cap savings
3. Confirmation dialog
4. Process cut:
   - Remove from roster
   - Apply dead money
   - Add to free agent pool (if not retired)

**Validation Checks:**
```
[ ] Cut button appears on eligible players
[ ] Cut preview shows accurate dead money
[ ] Cut preview shows accurate cap savings
[ ] Confirmation required before cut
[ ] Cut removes player from roster
[ ] Dead money applied to cap
[ ] Cut player added to free agency
[ ] Cut persists through save/load
```

---

### D.2 Trade System

**Current Issue:** Trade infrastructure exists but no UI

**Existing Code:**
- `/home/user/Gm-sim/src/core/draft/TradeValueCalculator.ts`
- Potentially other trade files

**Files to Create:**
- `/home/user/Gm-sim/src/screens/TradeScreen.tsx`

**Features:**
- Select trade partner team
- Add assets to offer (players, draft picks)
- Add assets to request
- Trade value indicator
- Submit proposal
- AI evaluation and response

**Validation Checks:**
```
[ ] TradeScreen renders without errors
[ ] Can select trade partner
[ ] Can add players to trade
[ ] Can add draft picks to trade
[ ] Trade value calculates correctly
[ ] AI evaluates and responds
[ ] Accepted trades process correctly
[ ] Rosters update after trade
[ ] Draft picks transfer correctly
[ ] Trade generates news
```

---

### D.3 Contract Extensions

**Current Issue:** `ExtensionSystem.ts` exists but unreachable

**Files:**
- `/home/user/Gm-sim/src/core/contracts/ExtensionSystem.ts` (exists)

**Implementation:**
1. Add "Extend" button on eligible players (final year of contract)
2. Extension negotiation modal
3. AI responds to offer
4. Process accepted extension

**Validation Checks:**
```
[ ] Extension button appears for eligible players
[ ] Extension terms can be negotiated
[ ] AI responds to extension offers
[ ] Accepted extensions update contract
[ ] Cap implications calculated correctly
```

---

### GATE: Phase D Complete
```
├── [ ] Can cut players with proper cap implications
├── [ ] Can propose and complete trades
├── [ ] Can extend player contracts
├── [ ] All roster operations persist through save/load
├── [ ] All operations generate appropriate news
├── [ ] TypeScript compiles: npx tsc --noEmit
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase E
```

---

## Phase E: League Simulation

**Priority:** HIGH
**Goal:** Full league simulation with all 32 teams

### E.1 Simulate All Games on Week Advance

**Current Issue:** Only user team games simulate; other teams don't play

**Files:**
- `/home/user/Gm-sim/src/core/season/WeekSimulator.ts` (exists, unused)
- `/home/user/Gm-sim/App.tsx` - handleAdvanceWeek

**Implementation:**
1. On "Advance Week":
   - Get all games for current week from schedule
   - Simulate each game using GameRunner
   - Update all team records
   - Recalculate standings
   - Check for injuries
   - Generate news

---

### E.2 Injury System Integration

**Current Issue:** `InjuryProcessor.ts` exists but injuries never triggered

**Files:**
- `/home/user/Gm-sim/src/core/engine/InjuryProcessor.ts` (exists)

**Implementation:**
1. Run injury checks during game simulation
2. Generate injury with type, severity, duration
3. Update player status (injured, IR, etc.)
4. Process recovery over time
5. Generate injury news

**Validation Checks:**
```
[ ] Injuries can occur during games
[ ] Injury has type, severity, weeks out
[ ] Player status updates to injured
[ ] Player unavailable while injured
[ ] Recovery happens over time
[ ] Injury news generated
```

---

### E.3 Statistics Tracking

**Current Issue:** `StatisticsTracker.ts` exists but stats never recorded

**Files:**
- `/home/user/Gm-sim/src/core/game/StatisticsTracker.ts` (exists)

**Implementation:**
1. Track stats during game simulation
2. Accumulate season stats for players
3. Store in gameState

**Validation Checks:**
```
[ ] Player stats tracked during games
[ ] Stats accumulate over season
[ ] Stats display correctly in player profile
[ ] Stats persist through save/load
```

---

### E.4 Playoff Seeding & Bracket

**Current Issue:** `calculatePlayoffSeeds()` exists but never called

**Files:**
- `/home/user/Gm-sim/src/services/StandingsService.ts` - calculatePlayoffSeeds

**Implementation:**
1. After week 18, calculate playoff seeds
2. Generate playoff bracket (14 teams)
3. Display bracket screen
4. Simulate playoff games through Super Bowl

**Files to Create:**
- `/home/user/Gm-sim/src/screens/PlayoffBracketScreen.tsx`

**Validation Checks:**
```
[ ] Playoff seeds calculate correctly after week 18
[ ] Playoff bracket displays 14 teams correctly
[ ] Wild card round simulates
[ ] Divisional round simulates
[ ] Conference championships simulate
[ ] Super Bowl simulates
[ ] Champion determined and recorded
[ ] Season transitions to offseason
```

---

### GATE: Phase E Complete
```
├── [ ] League-wide simulation works (all 32 teams play)
├── [ ] All team records update accurately
├── [ ] Injury system functional
├── [ ] Statistics track and persist
├── [ ] Playoff seeding calculates correctly
├── [ ] Playoff bracket generates and displays
├── [ ] Playoffs simulate through Super Bowl
├── [ ] Season correctly transitions to offseason
├── [ ] TypeScript compiles: npx tsc --noEmit
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase F
```

---

## Phase F: News System Integration

**Priority:** MEDIUM
**Goal:** Connect NewsFeedManager to generate dynamic news

### F.1 Wire NewsFeedManager

**Current Issue:** Hardcoded placeholder news in App.tsx:462-488

**Files:**
- `/home/user/Gm-sim/src/core/news/NewsFeedManager.ts` (exists, unused)
- `/home/user/Gm-sim/src/core/news/generators/` (multiple generators exist)

**Implementation:**
1. Initialize NewsFeedManager in game state or as service
2. Generate news on game events:
   - Game results (wins, losses, upsets)
   - Injuries
   - Trades
   - Free agent signings
   - Draft picks
   - Season milestones
   - Playoff clinching/elimination
3. Store news in gameState.news
4. Display from game state instead of hardcoded

---

### F.2 News Generation Triggers

**Implementation:**
Add news generation calls at:
- End of each game simulation
- After trade completion
- After free agent signing
- After draft pick
- At phase transitions

**Validation Checks:**
```
[ ] News generates after game simulation
[ ] News generates for trades
[ ] News generates for injuries
[ ] News generates for signings
[ ] News persists in save file
[ ] News displays dynamically based on events
```

---

### GATE: Phase F Complete
```
├── [ ] NewsFeedManager integrated
├── [ ] Dynamic news generates based on game events
├── [ ] News persists through save/load
├── [ ] News screen shows real game news
├── [ ] TypeScript compiles: npx tsc --noEmit
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase G
```

---

## Phase G: Career & Firing System

**Priority:** MEDIUM
**Goal:** GM can be fired based on performance

### G.1 Owner Patience System

**Current Issue:** Career systems exist but not connected

**Files:**
- `/home/user/Gm-sim/src/core/career/PatienceMeterManager.ts` (exists)
- `/home/user/Gm-sim/src/core/career/FiringMechanics.ts` (exists)
- `/home/user/Gm-sim/src/core/career/OwnerExpectationsSystem.ts` (exists)

**Implementation:**
1. Track owner patience meter
2. Update based on:
   - Win/loss record vs expectations
   - Playoff performance
   - Draft pick success
   - Cap management
3. Display patience indicator on dashboard
4. Trigger firing when patience depleted

---

### G.2 Firing & Game Over

**Implementation:**
1. When patience reaches zero:
   - Show firing alert
   - Display career summary
   - Option to: Find new job / Start over
2. Job market for fired GMs
3. New team selection flow

**Validation Checks:**
```
[ ] Patience meter displays on dashboard
[ ] Patience updates based on performance
[ ] Firing triggers when patience depleted
[ ] Career summary shows on firing
[ ] Can find new job after being fired
[ ] Game over option available
```

---

### GATE: Phase G Complete
```
├── [ ] Patience meter functional
├── [ ] Firing mechanics work
├── [ ] Career summary displays
├── [ ] Job market accessible after firing
├── [ ] TypeScript compiles: npx tsc --noEmit
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase H
```

---

## Phase H: Offseason Flow

**Priority:** MEDIUM
**Goal:** Implement all 12 offseason phases

### H.1 Offseason Phase Manager

**Current Issue:** All phase files exist but never called

**Files:**
- `/home/user/Gm-sim/src/core/offseason/OffSeasonPhaseManager.ts` (exists)
- `/home/user/Gm-sim/src/core/offseason/phases/` - 12 phase files

**Implementation:**
1. Wire OffSeasonPhaseManager to game state
2. Display current phase with tasks
3. Allow user to complete phase tasks
4. Auto/manual advance between phases
5. Track phase completion

**Phases to Wire:**
1. SeasonEndPhase - Awards, recap
2. CoachingDecisionsPhase - Hire/fire coaches
3. ContractManagementPhase - Expiring contracts
4. CombinePhase - Prospect evaluation
5. ProDaysPhase - Additional scouting
6. FreeAgencyPhase - Sign free agents
7. DraftPhase - NFL Draft
8. RookieSigningsPhase - Sign picks
9. OTAsPhase - Offseason workouts
10. MinicampPhase - Team activities
11. TrainingCampPhase - Roster battles
12. FinalCutsPhase - Cut to 53

---

### H.2 Season End Awards

**Implementation:**
1. Calculate awards: MVP, OPOY, DPOY, OROY, DROY, etc.
2. Display awards screen
3. Record in history

---

### H.3 Scouting System

**Current Issue:** Complete scouting system never shown to user

**Files:**
- `/home/user/Gm-sim/src/core/scouting/` - many files exist

**Implementation:**
1. Enable scout assignments during scouting phases
2. Reveal prospect attributes over time
3. Integrate with draft board

**Validation Checks:**
```
[ ] Offseason starts after Super Bowl
[ ] Phase indicator shows current phase
[ ] Each phase has associated tasks
[ ] Can advance through all 12 phases
[ ] Awards calculate and display
[ ] Scouting reveals information
[ ] Offseason ends → Preseason begins
```

---

### GATE: Phase H Complete
```
├── [ ] All 12 offseason phases work
├── [ ] Awards calculate and display
├── [ ] Scouting system functional
├── [ ] Year increments correctly
├── [ ] New season begins properly
├── [ ] TypeScript compiles: npx tsc --noEmit
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase I
```

---

## Phase I: Final Polish

**Priority:** LOW
**Goal:** Clean up and polish

### I.1 Remove Hardcoded Values

| Location | Current | Fix |
|----------|---------|-----|
| App.tsx:433 | `salaryCap = 255000000` | Use league salary cap from state |
| App.tsx:370 | `\|\| 50000000` fallback | Calculate from team finances |
| FinancesScreen.tsx:149-150 | Fake cap hits | Use actual contract data |

---

### I.2 Staff Screen Enhancements

**Current Issue:** Can view staff but can't hire/fire

**Implementation:**
1. Add hire/fire functionality to StaffScreen
2. Wire CoachingStaffManager
3. Wire ScoutingDepartmentManager

---

### I.3 Clean Up Console.logs

**Remove all console.log from:**
- App.tsx:500 (onMarkRead)
- Any other console.log statements in production code

---

### I.4 Player Profile Navigation

**Current Issue:** Clicking player in roster shows Alert, should navigate

**Implementation:**
1. Navigate to PlayerProfileScreen from RosterScreen
2. Navigate to PlayerProfileScreen from FinancesScreen
3. Show full player details

---

### I.5 Box Score Screen

**Current Issue:** Box score button in gamecast does nothing

**Implementation:**
1. Create BoxScoreScreen or modal
2. Display detailed game statistics
3. Wire navigation from gamecast

---

### GATE: Phase I Complete (APP COMPLETE)
```
├── [ ] All hardcoded values replaced
├── [ ] Staff hire/fire functional
├── [ ] No console.log in production code
├── [ ] Player profile navigation works
├── [ ] Box score accessible
├── [ ] All screens fully functional
├── [ ] All persistence working
├── [ ] Full app tested end-to-end
├── [ ] TypeScript compiles: npx tsc --noEmit
├── [ ] All tests pass: npm test
└── PASS: All checks true → APP 100% COMPLETE
```

---

## Appendix: Complete Issue Registry

### Severity: CRITICAL
| Issue | File | Line | Phase |
|-------|------|------|-------|
| Game results not saved | App.tsx | 592-614 | A |
| DraftRoom disconnected | DraftRoomScreen.tsx | - | B |
| Free Agency "Coming Soon" | App.tsx | 196-198 | C |

### Severity: HIGH
| Issue | File | Line | Phase |
|-------|------|------|-------|
| News system unused | core/news/* | - | F |
| No player trading | - | - | D |
| No contract management | - | - | D |
| No playoff seeding | StandingsService.ts | - | E |
| Game stats not saved | GameRunner.ts | - | E |
| Prospect flags not saved | App.tsx | 638-653 | A |

### Severity: MEDIUM
| Issue | File | Line | Phase |
|-------|------|------|-------|
| Settings not saved | App.tsx | 294-301 | A |
| News read status not saved | App.tsx | 498-501 | A |
| SeasonManager unused | core/season/ | - | E |
| OffseasonPhaseManager unused | core/offseason/ | - | H |
| StatisticsTracker unused | core/game/ | - | E |
| Scouting system unused | core/scouting/ | - | H |
| Owner patience unused | core/career/ | - | G |
| Injuries not simulated | core/engine/ | - | E |

### Severity: LOW
| Issue | File | Line | Phase |
|-------|------|------|-------|
| Salary cap hardcoded | App.tsx | 433 | I |
| Cap space fallback hardcoded | App.tsx | 370 | I |
| Contract cap hits fake | FinancesScreen.tsx | 149-150 | I |
| Staff can't hire/fire | - | - | I |
| Console.log statements | various | - | I |

---

## Summary Statistics

- **Total Phases:** 9 (A through I)
- **Total Validation Gates:** 9
- **Critical Issues:** 3
- **High Priority Issues:** 7
- **Medium Priority Issues:** 9
- **Low Priority Issues:** 5
- **Backend Systems to Wire:** 15+
- **New Screens to Create:** 3 (FreeAgency, Trade, PlayoffBracket)
- **Current Completion:** ~60%
- **Target Completion:** 100%

---

## Execution Order

1. **Phase A** - Fix persistence (all state changes save)
2. **Phase B** - Wire DraftRoom (already built)
3. **Phase C** - Create FreeAgency screen
4. **Phase D** - Enable roster operations (cut/trade/extend)
5. **Phase E** - Full league simulation
6. **Phase F** - Dynamic news system
7. **Phase G** - Career/firing mechanics
8. **Phase H** - Offseason flow
9. **Phase I** - Final polish

Each phase must pass its validation gate before proceeding to the next.

# GM Sim - Complete Implementation Plan

This document outlines the comprehensive plan for completing all unfinished features in GM Sim.

**Last Updated:** 2026-01-13
**Estimated Completion:** ~40-50% of intended functionality currently incomplete

---

## Table of Contents
1. [Validation Gate System](#validation-gate-system)
2. [Phase 0: Critical Fixes](#phase-0-critical-fixes)
3. [Phase 1: Core Data Integration](#phase-1-core-data-integration)
4. [Phase 2: Season Experience Screens](#phase-2-season-experience-screens)
5. [Phase 3: Player Acquisition](#phase-3-player-acquisition)
6. [Phase 4: Roster Management](#phase-4-roster-management)
7. [Phase 5: League Simulation](#phase-5-league-simulation)
8. [Phase 6: Offseason Flow](#phase-6-offseason-flow)
9. [Phase 7: Team Management](#phase-7-team-management)
10. [Phase 8: Polish & Settings](#phase-8-polish--settings)
11. [Appendix: Complete Issue Registry](#appendix-complete-issue-registry)

---

## Validation Gate System

Each phase has a **Validation Gate** that MUST pass before proceeding to the next phase. Gates consist of Boolean checks that verify functionality is working and tested.

### Gate Check Format
```
GATE: [Phase Name]
├── [ ] Check 1: Description
├── [ ] Check 2: Description
├── [ ] Check 3: Description
└── PASS: All checks true → Proceed to next phase
```

### Gate Failure Protocol
If any check fails:
1. STOP - Do not proceed to next phase
2. IDENTIFY - Which check(s) failed
3. FIX - Address the failing check(s)
4. RETEST - Run all gate checks again
5. PROCEED - Only when ALL checks pass

---

## Phase 0: Critical Fixes

**Priority:** BLOCKING
**Goal:** Fix issues that prevent basic functionality

### 0.1 Remove Mock Data from Production Paths

**Current Issue:**
- `App.tsx:26` imports `mockProspects`, `mockPlayerProfile`, `mockGameSetup`
- `App.tsx:335` uses `mockGameSetup` for GamecastScreen
- `App.tsx:376` uses `mockProspects` for DraftBoardScreen

**Files to Modify:**
- `/home/user/Gm-sim/App.tsx`

**Implementation:**
1. Generate real prospect pool during `createNewGame()`
2. Create game setup from actual team rosters
3. Pass real data to screens instead of mock data

**Validation Checks:**
```
[ ] mockProspects import removed from App.tsx
[ ] mockGameSetup import removed from App.tsx
[ ] DraftBoardScreen receives prospects from gameState.prospects
[ ] GamecastScreen receives setup from actual team rosters
[ ] App compiles without mock data imports
```

---

### 0.2 Fix Hardcoded Values

**Current Issues:**
| Location | Issue | Fix |
|----------|-------|-----|
| `GamecastScreen.tsx:346` | `homeTimeouts={3}` hardcoded | Get from game state |
| `NewGameService.ts:58-64` | Team history randomized | Generate meaningful defaults |
| `JobMarketManager.ts:143` | Playoff history random | Track from actual data |

**Implementation:**
1. Add timeout tracking to game simulation state
2. Initialize team history with sensible defaults (0 championships for new save)
3. Track playoff appearances in career stats

**Validation Checks:**
```
[ ] Timeouts display actual values from game state
[ ] Team history initializes to known values (not random)
[ ] No Math.random() calls for historical data
```

---

### 0.3 Connect Unused Callbacks

**Current Issues:**
| Location | Callback | Status |
|----------|----------|--------|
| `App.tsx:382-384` | `onToggleFlag` | `console.log` only |
| `PlayerProfileScreen.tsx:162-163` | `onUpdateNotes`, `onUpdateTier` | Prefixed with `_`, unused |
| `DraftBoardScreen.tsx:121` | `onSetUserTier` | Prefixed with `_`, unused |

**Implementation:**
1. Implement flag persistence in game state
2. Wire up notes/tier updates to prospect data
3. Save changes to storage

**Validation Checks:**
```
[ ] Flagging a prospect persists across screen navigation
[ ] Flagging persists after app restart (save/load)
[ ] User tier changes persist
[ ] Notes changes persist
```

---

### GATE: Phase 0 Complete
```
├── [ ] No mock data imports in App.tsx
├── [ ] All hardcoded values replaced with state values
├── [ ] All callbacks functional (no console.log placeholders)
├── [ ] All tests pass: npm test
├── [ ] App builds without errors: npm run build
└── PASS: All checks true → Proceed to Phase 1
```

---

## Phase 1: Core Data Integration

**Priority:** HIGH
**Goal:** Wire up existing backend systems to game state

### 1.1 Prospect Pool Generation

**Current Issue:** `gameState.prospects` initialized empty, never filled

**Existing Code (unused):**
- `/home/user/Gm-sim/src/core/draft/DraftClassGenerator.ts`
- `/home/user/Gm-sim/src/core/scouting/BigBoardGenerator.ts`

**Implementation:**
1. Call `DraftClassGenerator` during `createNewGame()`
2. Populate `gameState.prospects` with generated class
3. Generate big board rankings

**Validation Checks:**
```
[ ] New game creates 250+ prospects
[ ] Prospects have all required fields populated
[ ] Prospects accessible from DraftBoardScreen
[ ] Prospect data persists in save file
```

---

### 1.2 Schedule Integration

**Current Issue:** Schedule created but only user games shown, no league-wide simulation

**Existing Code (unused):**
- `/home/user/Gm-sim/src/core/season/ScheduleGenerator.ts`
- `/home/user/Gm-sim/src/core/season/WeekSimulator.ts`

**Implementation:**
1. Generate full league schedule on new game
2. Store schedule in `gameState.league.schedule`
3. Display user's schedule in UI (Phase 2)
4. Enable league-wide simulation (Phase 5)

**Validation Checks:**
```
[ ] League schedule has 272 regular season games (17 weeks × 16 games)
[ ] User team has 17 games scheduled
[ ] Bye week properly assigned
[ ] Schedule persists in save file
```

---

### 1.3 Standings Calculation

**Current Issue:** Standings never updated after games

**Implementation:**
1. Create `StandingsService.ts` utility
2. Calculate standings from team records
3. Update after each game simulation
4. Include tiebreakers

**Validation Checks:**
```
[ ] Standings calculate correctly from team records
[ ] Standings update after game simulation
[ ] Division standings sort correctly
[ ] Conference standings sort correctly
[ ] Tiebreakers apply (division record, head-to-head)
```

---

### 1.4 Career Stats Tracking

**Current Issue:** `careerStats` initialized but never updated, `updateCareerStatsAfterSeason()` never called

**Location:** `/home/user/Gm-sim/src/core/models/game/GameState.ts:365`

**Implementation:**
1. Call `updateCareerStatsAfterSeason()` at season end
2. Track wins, losses, playoff appearances
3. Persist in save file

**Validation Checks:**
```
[ ] Career stats update after season completion
[ ] Stats persist across save/load
[ ] GMDashboardScreen displays accurate career stats
```

---

### GATE: Phase 1 Complete
```
├── [ ] Prospect pool generates on new game (250+ prospects)
├── [ ] League schedule generates correctly (272 games)
├── [ ] Standings calculate from team records
├── [ ] Career stats track and persist
├── [ ] All data persists through save/load cycle
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase 2
```

---

## Phase 2: Season Experience Screens

**Priority:** HIGH
**Goal:** Implement core season UI screens

### 2.1 Schedule Screen

**Current State:** Shows "Coming Soon" alert

**UI Components:**
- `src/screens/ScheduleScreen.tsx` (NEW)
- `src/components/schedule/ScheduleGameCard.tsx` (NEW)

**Features:**
- Week-by-week view of 17 regular season games
- Past games show final scores with W/L indicator
- Upcoming games show opponent, home/away status
- Current week highlighted
- Bye week indicator
- Tap game to view details/start simulation

**Data Model:**
```typescript
interface ScheduleGame {
  gameId: string;
  week: number;
  opponent: {
    id: string;
    name: string;
    abbr: string;
    record: { wins: number; losses: number };
  };
  isHome: boolean;
  date: string;
  time: string;
  result?: {
    userScore: number;
    opponentScore: number;
    won: boolean;
  };
  isBye: boolean;
  isPlayoffs: boolean;
}
```

**Integration:**
1. Add `'schedule'` to Screen type in App.tsx
2. Extract user schedule from `gameState.league.schedule`
3. Navigate from dashboard action

**Validation Checks:**
```
[ ] ScheduleScreen renders without errors
[ ] Shows all 17 weeks (16 games + bye)
[ ] Bye week displays correctly
[ ] Past games show scores
[ ] Future games show opponent info
[ ] Current week is highlighted
[ ] Back navigation works
[ ] Screen accessible from dashboard
```

---

### 2.2 Standings Screen

**Current State:** Shows "Coming Soon" alert

**UI Components:**
- `src/screens/StandingsScreen.tsx` (NEW)
- `src/components/standings/StandingsTable.tsx` (NEW)
- `src/components/standings/TeamRow.tsx` (NEW)

**Features:**
- View toggle: By Division / By Conference
- Division headers with division name
- Team rows: Rank, Team, W-L, PCT, PF, PA, DIFF, Streak
- User's team highlighted
- Playoff indicators (clinched division, wild card, eliminated)
- Tap team to view details

**Data Model:**
```typescript
interface StandingsEntry {
  teamId: string;
  teamName: string;
  teamAbbr: string;
  conference: 'AFC' | 'NFC'; // or equivalent
  division: string;
  wins: number;
  losses: number;
  ties: number;
  pct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
  streak: string; // "W3", "L1", etc.
  divisionRecord: string; // "4-2"
  conferenceRecord: string; // "8-4"
  isUserTeam: boolean;
  playoffStatus: 'clinched-div' | 'clinched-wc' | 'in-hunt' | 'eliminated' | null;
  seed?: number;
}
```

**Validation Checks:**
```
[ ] StandingsScreen renders without errors
[ ] Division view shows 8 divisions with 4 teams each
[ ] Conference view shows 2 conferences with 16 teams each
[ ] Teams sorted by record within division/conference
[ ] User's team visually highlighted
[ ] PCT calculates correctly
[ ] Point differential calculates correctly
[ ] Back navigation works
```

---

### 2.3 News Screen

**Current State:** Shows "Coming Soon" alert

**UI Components:**
- `src/screens/NewsScreen.tsx` (NEW)
- `src/components/news/NewsCard.tsx` (NEW)
- `src/services/NewsService.ts` (NEW)

**Features:**
- Chronological news feed
- Categories: Trades, Injuries, Team News, League, Your Team
- Category filter tabs
- News cards: Headline, summary, date, category badge
- Expandable for full article
- Unread indicator

**News Generation Triggers:**
- Game results (wins, losses, upsets)
- Injuries during games
- Trades completed
- Free agent signings
- Draft picks
- Season milestones
- Playoff clinching/elimination

**Data Model:**
```typescript
interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  fullText: string;
  category: 'trade' | 'injury' | 'team' | 'league' | 'yourTeam' | 'draft' | 'freeAgency';
  date: string;
  week: number;
  year: number;
  relatedTeamIds: string[];
  relatedPlayerId?: string;
  isRead: boolean;
  priority: 'breaking' | 'normal' | 'minor';
}
```

**Validation Checks:**
```
[ ] NewsScreen renders without errors
[ ] News generates after game simulation
[ ] Category filters work correctly
[ ] News persists in save file
[ ] Unread count shows on dashboard
[ ] News expands to show full text
[ ] Back navigation works
```

---

### GATE: Phase 2 Complete
```
├── [ ] ScheduleScreen fully functional
├── [ ] StandingsScreen fully functional
├── [ ] NewsScreen fully functional
├── [ ] All three screens accessible from dashboard
├── [ ] All three screens have working back navigation
├── [ ] Data displays correctly from game state
├── [ ] Visual tests pass (no layout issues)
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase 3
```

---

## Phase 3: Player Acquisition

**Priority:** HIGH
**Goal:** Complete draft and free agency flows

### 3.1 Draft Room Integration

**Current State:** `DraftRoomScreen.tsx` exists but not connected to App.tsx

**Existing Code:**
- `/home/user/Gm-sim/src/screens/DraftRoomScreen.tsx` (complete UI)
- `/home/user/Gm-sim/src/core/draft/DraftRoomSimulator.ts` (logic exists)
- `/home/user/Gm-sim/src/core/draft/AIDraftStrategy.ts` (AI logic exists)

**Missing Integration:**
1. Add `'draftRoom'` to Screen type
2. Import DraftRoomScreen in App.tsx
3. Navigate from dashboard during draft phase
4. Connect to draft simulation loop
5. Wire AI draft picks for other teams

**Implementation:**
1. Add draft state to GameState: `currentPick`, `draftOrder`, `completedPicks`
2. Create `DraftService.ts` to manage draft flow
3. Implement pick timer and auto-advance
4. Process AI picks between user turns
5. Update rosters after picks

**Validation Checks:**
```
[ ] DraftRoomScreen accessible from dashboard during draft phase
[ ] Current pick displays correctly
[ ] User can select prospect to draft
[ ] Draft pick updates roster
[ ] AI teams make picks automatically
[ ] Pick history shows correctly
[ ] Draft order advances properly
[ ] Drafted prospects removed from board
[ ] Draft completes all 7 rounds (224 picks)
```

---

### 3.2 Draft-to-Roster Pipeline

**Current Issue:** Prospects never transition to Players after draft

**Implementation:**
1. Create `DraftPickProcessor.ts`
2. Convert Prospect → Player on draft
3. Generate rookie contract
4. Add to team roster
5. Remove from prospect pool

**Validation Checks:**
```
[ ] Drafted prospect becomes Player in roster
[ ] Rookie contract generated with correct values
[ ] Player has all skills transferred from prospect
[ ] Player appears in team roster screen
[ ] Prospect removed from draft board
```

---

### 3.3 Free Agency Screen

**Current State:** Shows "Coming Soon" alert

**Existing Code (unused):**
- `/home/user/Gm-sim/src/core/freeAgency/FreeAgencyManager.ts`
- `/home/user/Gm-sim/src/core/freeAgency/FreeAgentMarket.ts`
- `/home/user/Gm-sim/src/core/freeAgency/AIFreeAgencyLogic.ts`

**UI Components:**
- `src/screens/FreeAgencyScreen.tsx` (NEW)
- `src/components/freeAgency/FreeAgentCard.tsx` (NEW)
- `src/components/freeAgency/ContractOfferModal.tsx` (NEW)

**Features:**
- List of available free agents
- Position filters (reuse from DraftBoard)
- Sort by: Market Value, Age, Position
- Player card: Name, Position, Age, Skills preview, Contract demands
- Cap space indicator (always visible)
- Make Offer button → Contract offer modal
- Offer: Years (1-5), Annual salary, Guaranteed money
- AI negotiation response: Accept, Reject, Counter

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
```

---

### 3.4 AI Free Agency

**Current Issue:** `AIFreeAgencyLogic.ts` exists but other teams never sign players

**Implementation:**
1. Enable AI teams to evaluate free agents
2. Process AI signings during free agency phase
3. Update other teams' rosters
4. Generate news for significant signings

**Validation Checks:**
```
[ ] AI teams sign free agents
[ ] AI respects salary cap
[ ] AI fills roster needs
[ ] Signings generate news
[ ] Free agent pool depletes over time
```

---

### GATE: Phase 3 Complete
```
├── [ ] Draft Room fully integrated and functional
├── [ ] User can draft all 7+ picks
├── [ ] AI teams complete their draft picks
├── [ ] Drafted players appear on rosters
├── [ ] Free Agency screen fully functional
├── [ ] User can sign free agents
├── [ ] AI teams sign free agents
├── [ ] Cap space updates correctly
├── [ ] All acquisitions persist through save/load
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase 4
```

---

## Phase 4: Roster Management

**Priority:** MEDIUM
**Goal:** Enable roster operations

### 4.1 Roster Screen

**Current State:** Dashboard "Roster" navigates to PlayerProfile as placeholder

**UI Components:**
- `src/screens/RosterScreen.tsx` (NEW)
- `src/components/roster/RosterPlayerCard.tsx` (NEW)
- `src/components/roster/RosterFilters.tsx` (NEW)

**Features:**
- Full 53-man roster view
- Position group tabs (Offense/Defense/Special Teams)
- Player cards: Name, Position, Age, Contract, Key skills
- Tap player → PlayerProfileScreen
- Action buttons: Cut, Trade, Extend (context-dependent)
- Roster count indicator (X/53)
- Cap space indicator

**Validation Checks:**
```
[ ] RosterScreen renders full roster
[ ] Position filters work
[ ] Tap player navigates to profile
[ ] Roster count accurate
[ ] Cap space accurate
```

---

### 4.2 Cut Players

**Current Issue:** `CutCalculator.ts` exists but never called from UI

**Existing Code:**
- `/home/user/Gm-sim/src/core/contracts/CutCalculator.ts`

**Implementation:**
1. Add "Cut" button to player actions
2. Show cut cost (dead money, cap savings)
3. Confirmation dialog with financial details
4. Process cut: remove from roster, apply dead money
5. Add player to free agent pool (if not retired)

**Validation Checks:**
```
[ ] Cut button appears for cuttable players
[ ] Cut preview shows accurate dead money
[ ] Cut preview shows accurate cap savings
[ ] Confirmation required before cut
[ ] Cut removes player from roster
[ ] Dead money applied to cap
[ ] Player added to free agency (if applicable)
[ ] Cut persists through save/load
```

---

### 4.3 Trade System

**Current Issue:** Trade infrastructure exists but no UI

**Existing Code:**
- `/home/user/Gm-sim/src/core/trades/TradeEvaluator.ts`
- `/home/user/Gm-sim/src/core/trades/TradeValueCalculator.ts`
- `/home/user/Gm-sim/src/core/trades/TradeProposalManager.ts`

**UI Components:**
- `src/screens/TradeScreen.tsx` (NEW)
- `src/components/trade/TradeBuilder.tsx` (NEW)
- `src/components/trade/TradeAssetCard.tsx` (NEW)

**Features:**
- Select trade partner
- Add assets to offer (players, draft picks)
- Add assets to request (players, draft picks)
- Trade value indicator (fair/unfair)
- Submit proposal
- AI response: Accept, Reject, Counter
- Trade history log

**Validation Checks:**
```
[ ] TradeScreen renders without errors
[ ] Can select trade partner
[ ] Can add players to trade
[ ] Can add draft picks to trade
[ ] Trade value calculates
[ ] AI evaluates and responds
[ ] Accepted trades process correctly
[ ] Rosters update after trade
[ ] Draft picks transfer correctly
[ ] Trade generates news
```

---

### 4.4 Contract Extensions

**Current Issue:** `ExtensionSystem.ts` exists but unreachable

**Existing Code:**
- `/home/user/Gm-sim/src/core/contracts/ExtensionSystem.ts`

**Implementation:**
1. Add "Extend" button on eligible players
2. Show extension calculator
3. AI negotiation for terms
4. Process extension: update contract

**Validation Checks:**
```
[ ] Extension available for eligible players
[ ] Extension terms can be negotiated
[ ] AI responds to extension offers
[ ] Accepted extensions update contract
[ ] Cap implications calculated correctly
```

---

### GATE: Phase 4 Complete
```
├── [ ] RosterScreen fully functional
├── [ ] Can cut players with proper cap implications
├── [ ] Can propose and complete trades
├── [ ] Can extend player contracts
├── [ ] All roster operations persist through save/load
├── [ ] All operations generate appropriate news
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase 5
```

---

## Phase 5: League Simulation

**Priority:** MEDIUM
**Goal:** Enable full league simulation

### 5.1 Simulate Other Teams' Games

**Current Issue:** Only user team games simulatable

**Existing Code:**
- `/home/user/Gm-sim/src/core/season/WeekSimulator.ts`
- `/home/user/Gm-sim/src/core/game/GameRunner.ts`

**Implementation:**
1. On "Advance Week", simulate all league games
2. Update all team records
3. Recalculate standings
4. Generate news for notable results

**Validation Checks:**
```
[ ] Advancing week simulates all games
[ ] All team records update
[ ] Standings reflect new records
[ ] News generated for upsets/milestones
[ ] Simulation completes in <5 seconds
```

---

### 5.2 Injury System

**Current Issue:** `InjuryProcessor.ts` exists but injuries never triggered

**Existing Code:**
- `/home/user/Gm-sim/src/core/injuries/InjuryProcessor.ts`

**Implementation:**
1. Trigger injury checks during game simulation
2. Generate injury with type, severity, duration
3. Update player status
4. Track on injured reserve
5. Process recovery over time
6. Generate injury news

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

### 5.3 Playoff System

**Current Issue:** `PlayoffGenerator.ts` exists but unreachable

**Existing Code:**
- `/home/user/Gm-sim/src/core/playoffs/PlayoffGenerator.ts`

**Implementation:**
1. Generate playoff bracket after week 18
2. Display playoff bracket screen
3. Simulate playoff games
4. Advance through rounds
5. Crown Super Bowl champion
6. End season → Offseason transition

**UI Components:**
- `src/screens/PlayoffBracketScreen.tsx` (NEW)

**Validation Checks:**
```
[ ] Playoff bracket generates correctly (14 teams)
[ ] Seeds assigned by standings
[ ] Bracket displays correctly
[ ] Wild card round simulates
[ ] Divisional round simulates
[ ] Conference championships simulate
[ ] Super Bowl simulates
[ ] Champion determined and recorded
[ ] Season transitions to offseason
```

---

### GATE: Phase 5 Complete
```
├── [ ] League-wide simulation works
├── [ ] All 32 teams have accurate records
├── [ ] Injury system functional
├── [ ] Playoff bracket generates and displays
├── [ ] Playoffs simulate through Super Bowl
├── [ ] Season correctly transitions to offseason
├── [ ] All simulation results persist
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase 6
```

---

## Phase 6: Offseason Flow

**Priority:** MEDIUM
**Goal:** Implement offseason phase progression

### 6.1 Offseason Phase Manager Integration

**Current Issue:** All 12 phase files exist but never imported or called

**Existing Code (all in `/home/user/Gm-sim/src/core/offseason/phases/`):**
1. `SeasonEndPhase.ts` - Awards, recap
2. `CoachingDecisionsPhase.ts` - Hire/fire coaches
3. `ContractManagementPhase.ts` - Expiring contracts, decisions
4. `CombinePhase.ts` - Prospect evaluation
5. `ProDaysPhase.ts` - Additional scouting
6. `FreeAgencyPhase.ts` - Sign free agents
7. `DraftPhase.ts` - NFL Draft
8. `RookieSigningsPhase.ts` - Sign draft picks
9. `OTAsPhase.ts` - Offseason workouts
10. `MinicampPhase.ts` - Team activities
11. `TrainingCampPhase.ts` - Roster battles
12. `FinalCutsPhase.ts` - Cut to 53

**Implementation:**
1. Create offseason navigation flow
2. Display current phase with tasks
3. Allow user to complete phase tasks
4. Auto-advance or manual advance between phases
5. Track phase completion

**Validation Checks:**
```
[ ] Offseason starts after Super Bowl
[ ] Phase indicator shows current phase
[ ] Each phase has associated tasks/screens
[ ] Can advance through all 12 phases
[ ] Phase completion persists
[ ] Offseason ends → Preseason begins
```

---

### 6.2 Season End / Awards

**Current Issue:** Awards never calculated or displayed

**Implementation:**
1. Calculate end-of-season awards
2. MVP, OPOY, DPOY, OROY, DROY, etc.
3. Display awards screen
4. Record in game history

**Validation Checks:**
```
[ ] Awards calculate based on stats
[ ] Awards screen displays correctly
[ ] User team players can win awards
[ ] Awards recorded in history
```

---

### 6.3 Scouting System Integration

**Current Issue:** Complete 10+ file scouting system never shown to user

**Existing Code (all in `/home/user/Gm-sim/src/core/scouting/`):**
- `ScoutingManager.ts`
- `AutoScoutingSystem.ts`
- `BigBoardGenerator.ts`
- `FocusPlayerSystem.ts`
- `ProspectEvaluator.ts`
- etc.

**Implementation:**
1. Enable scout assignments
2. Show scouting reports
3. Reveal prospect attributes over time
4. Integrate with draft board

**Validation Checks:**
```
[ ] Can assign scouts to prospects
[ ] Scouting reveals information over time
[ ] Scouting reports display
[ ] Revealed info shows on draft board
```

---

### GATE: Phase 6 Complete
```
├── [ ] Offseason flow works through all 12 phases
├── [ ] Awards calculate and display
├── [ ] Scouting system functional
├── [ ] Offseason transitions to new season
├── [ ] Year increments correctly
├── [ ] All offseason data persists
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase 7
```

---

## Phase 7: Team Management

**Priority:** LOW
**Goal:** Staff and financial management

### 7.1 Staff Screen

**Current State:** Shows "Coming Soon" alert

**Existing Code (unused):**
- `/home/user/Gm-sim/src/core/coaching/CoachingStaffManager.ts`
- `/home/user/Gm-sim/src/core/coaching/CoachEvaluationSystem.ts`
- `/home/user/Gm-sim/src/core/coaching/ChemistryCalculator.ts`

**UI Components:**
- `src/screens/StaffScreen.tsx` (NEW)
- `src/components/staff/StaffCard.tsx` (NEW)
- `src/components/staff/HireModal.tsx` (NEW)

**Features:**
- Tabs: Coaches / Scouts
- Staff list with roles, ratings, salaries
- Fire button with confirmation
- Hire button → available candidates
- Staff effects on team performance

**Validation Checks:**
```
[ ] StaffScreen renders staff list
[ ] Can fire staff members
[ ] Can hire new staff
[ ] Staff affects team (scouting accuracy, development)
[ ] Staff persists through save/load
```

---

### 7.2 Finances Screen

**Current State:** Shows "Coming Soon" alert

**UI Components:**
- `src/screens/FinancesScreen.tsx` (NEW)
- `src/components/finances/CapSpaceBar.tsx` (NEW)
- `src/components/finances/ContractList.tsx` (NEW)

**Features:**
- Salary cap overview
- Visual cap bar (used/available/dead money)
- Player contracts sorted by cap hit
- Contract details: years, guaranteed, cap hit
- Future year projections
- Position group breakdown

**Validation Checks:**
```
[ ] FinancesScreen renders without errors
[ ] Cap calculations accurate
[ ] Contract list shows all players
[ ] Future projections calculate
[ ] Position breakdown accurate
```

---

### GATE: Phase 7 Complete
```
├── [ ] StaffScreen fully functional
├── [ ] Can hire/fire staff
├── [ ] FinancesScreen fully functional
├── [ ] All financial calculations accurate
├── [ ] Staff and finances persist through save/load
├── [ ] All tests pass: npm test
└── PASS: All checks true → Proceed to Phase 8
```

---

## Phase 8: Polish & Settings

**Priority:** LOW
**Goal:** Final polish and user preferences

### 8.1 Settings Screen

**Current State:** Placeholder in App.tsx (lines 281-296)

**UI Components:**
- `src/screens/SettingsScreen.tsx` (NEW)
- `src/services/SettingsService.ts` (NEW)

**Features:**
- Game settings: Simulation speed, Auto-save, Difficulty
- Display settings: Theme (future), Text size
- Data settings: Clear data, Export, Reset
- About section: Version, Credits

**Validation Checks:**
```
[ ] SettingsScreen renders without errors
[ ] Settings persist to AsyncStorage
[ ] Settings load on app start
[ ] Simulation speed affects game sim
[ ] Difficulty affects AI behavior
[ ] Clear data works with confirmation
```

---

### 8.2 UI Polish

**Issues to Fix:**
| Location | Issue |
|----------|-------|
| `TraitBadges.tsx:56-85` | Emoji icons → proper assets |
| Various | Missing loading states |
| Various | Missing error boundaries |

**Validation Checks:**
```
[ ] No emoji used as icons (proper assets)
[ ] All async operations have loading states
[ ] Error boundaries catch crashes gracefully
[ ] Consistent styling across all screens
```

---

### 8.3 Input Validation

**Current Issues:**
- GM name has no validation
- No character limits on inputs
- No sanitization

**Validation Checks:**
```
[ ] GM name has min/max length
[ ] GM name has character restrictions
[ ] All user inputs validated
[ ] Error messages display for invalid input
```

---

### 8.4 Box Score Navigation

**Current Issue:** `GamecastScreen.tsx:301-303` - Box score button does nothing

**Implementation:**
1. Create `BoxScoreScreen.tsx` or modal
2. Display detailed game statistics
3. Wire up navigation from gamecast

**Validation Checks:**
```
[ ] Box score button navigates to box score
[ ] Box score displays accurate stats
[ ] Can return from box score
```

---

### GATE: Phase 8 Complete
```
├── [ ] SettingsScreen fully functional
├── [ ] All UI polish items addressed
├── [ ] All input validation implemented
├── [ ] Box score accessible
├── [ ] No placeholder text/icons remaining
├── [ ] No console.log statements in production code
├── [ ] All tests pass: npm test
├── [ ] Full app tested end-to-end
└── PASS: All checks true → APP COMPLETE
```

---

## Appendix: Complete Issue Registry

### A. Mock/Placeholder Data
| File | Line | Issue | Phase |
|------|------|-------|-------|
| App.tsx | 26 | Mock imports | 0 |
| App.tsx | 335 | mockGameSetup | 0 |
| App.tsx | 376 | mockProspects | 0 |
| GameSetup.ts | 290-348 | Placeholder players | 1 |
| mockData.ts | 429-430 | `as any` casts | 0 |

### B. Hardcoded Values
| File | Line | Issue | Phase |
|------|------|-------|-------|
| GamecastScreen.tsx | 346 | Timeouts = 3 | 0 |
| NewGameService.ts | 58-64 | Random history | 0 |
| JobMarketManager.ts | 143 | Random playoffs | 0 |

### C. Dead/Unused Code
| File | Description | Phase |
|------|-------------|-------|
| DraftRoomScreen.tsx | Not integrated | 3 |
| HomeScreen.tsx | Not used | N/A |
| All offseason phases | Never called | 6 |
| All coaching files | Never used | 7 |
| All scouting files | Never used | 6 |

### D. Console.log Placeholders
| File | Line | Callback | Phase |
|------|------|----------|-------|
| App.tsx | 382-384 | onToggleFlag | 0 |
| PlayerProfileScreen.tsx | 162-163 | onUpdateNotes/Tier | 0 |

### E. Coming Soon Alerts
| Dashboard Action | Phase |
|-----------------|-------|
| schedule | 2 |
| standings | 2 |
| freeAgency | 3 |
| staff | 7 |
| finances | 7 |
| news | 2 |

### F. Missing CRUD Operations
| Operation | Status | Phase |
|-----------|--------|-------|
| Cut player | Not wired | 4 |
| Trade player | Not wired | 4 |
| Extend contract | Not wired | 4 |
| Restructure contract | Not wired | 4 |
| Release player | Not wired | 4 |

### G. Missing Confirmations
| Action | Has Confirmation |
|--------|-----------------|
| Cut player | No |
| Trade | No |
| Clear save data | No |
| Fire staff | No |

---

## Summary Statistics

- **Total Phases:** 8 (+ Phase 0 Critical Fixes)
- **Total Validation Gates:** 9
- **Estimated Screens to Create:** 8
- **Estimated Components to Create:** 15+
- **Existing Code to Integrate:** 50+ files
- **Current Completion:** ~50%
- **Target Completion:** 100%

---

## Brand Guidelines Reminder

Per project brand guidelines:
- **NO overall player ratings** - Use skill ranges and tiers instead
- Focus on projected value and user evaluation
- Maintain GM perspective (not player control)
- Keep UI consistent with existing screens (colors, spacing, typography from `src/styles`)

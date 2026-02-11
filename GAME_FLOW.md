# Game Flow Design Document

> Linear game flow specification synthesized from comprehensive audit of all 50+ screens, 43 GM actions, 12 offseason phases, and the full season arc. This document defines the **critical path** (what the user MUST do), the **ancillary depth** (what the user CAN do), and the **roadmap** to make it all work end-to-end.

---

## Table of Contents

1. [The Critical Path](#1-the-critical-path)
2. [Ancillary Depth](#2-ancillary-depth)
3. [Current State vs Ideal State](#3-current-state-vs-ideal-state)
4. [Weekly Loop Redesign](#4-weekly-loop-redesign)
5. [Multi-Season Requirements](#5-multi-season-requirements)
6. [Priority Roadmap](#6-priority-roadmap)

---

## 1. The Critical Path

The critical path is the linear sequence every user follows. No branching. No optional steps on the spine. Every step must be completable end-to-end for the game to function.

```
NEW GAME
  |
  v
TEAM SELECTION
  |
  v
STAFF DECISION ──(optional)──> STAFF HIRING
  |
  v
GM DASHBOARD (Week 1, Preseason or Regular Season)
  |
  v
==========================================
WEEKLY LOOP (repeat 18 times for regular season)
==========================================
  |
  Dashboard
    |
    v
  [PLAY WEEK] ──> Pre-Game ──> Live Sim ──> Post-Game
    |
    v
  Week Summary (other scores, standings, news)
    |
    v
  Weekly Systems Process (injuries, waivers, patience, news, awards)
    |
    v
  Dashboard (Week N+1)
==========================================
  |
  v
PLAYOFFS (if qualified, 1-4 rounds)
  Same weekly loop with playoff bracket context
  |
  v
SEASON END
  |
  v
==========================================
OFFSEASON (12 phases, linear)
==========================================
  Phase 1:  Season Recap
  Phase 2:  Coaching Decisions
  Phase 3:  Contract Management
  Phase 4:  NFL Combine
  Phase 5:  Free Agency
  Phase 6:  NFL Draft
  Phase 7:  UDFA Signing
  Phase 8:  OTAs
  Phase 9:  Training Camp
  Phase 10: Preseason Games
  Phase 11: Final Cuts (to 53)
  Phase 12: Season Start
==========================================
  |
  v
NEXT SEASON (year+1, loop back to Weekly Loop)
```

---

### Step-by-Step Detail

#### STEP 1: New Game Setup

| Step | User Sees/Does | Required? | Status |
|------|----------------|-----------|--------|
| **Start Screen** | Title screen with New Game, Continue (3 slots), Settings | Required | **Working** |
| **Team Selection** | 32 NFL teams in grid. Select team, enter GM name, pick save slot. Team info panel shows record, cap, key players, difficulty. | Required | **Working** |
| **Staff Decision** | "Keep Current Staff" (quick start) or "Clean House" (hire new). Shows current HC/OC/DC with ratings. | Required | **Working** |
| **Staff Hiring** | 3-step wizard: HC, OC, DC. Each step shows candidates with attributes, scheme, contract. | Optional (only if Clean House) | **Working** |
| **Loading/Generation** | 1,700+ players, 32 teams, schedules, contracts generated. | Required (automatic) | **Partial** - No loading screen, runs synchronously, can freeze UI for 2-3 seconds |
| **Dashboard Arrival** | GM Dashboard for Week 1 with ActionPrompt CTA | Required | **Working** |

**Current issues:**
- No loading screen during game creation (synchronous generation of 1,700+ players)
- No onboarding/tutorial for first-time players hitting a complex dashboard

---

#### STEP 2: Weekly Loop (The Core Gameplay)

This loop runs 18 times during the regular season. It is the most repeated interaction in the game.

| Step | User Sees/Does | Required? | Status |
|------|----------------|-----------|--------|
| **Dashboard** | Team record, next matchup, job security, cap space. Primary CTA: "Play Week N" | Required (entry point) | **Working** |
| **Pre-Game** | Matchup card (teams, records, weather, key matchup, injury report). Optional prediction. Two buttons: "Simulate Game" / "Watch Live" | Required | **Working** (inside GameDayScreen) |
| **Live Simulation** | Scoreboard, play-by-play feed, field visualization. Speed controls: 1x/2x/4x/Skip. Injury alerts interrupt. | Required (or Skip) | **Working** (inside GameDayScreen) |
| **Post-Game (in-game)** | Final score, box score tabs, key plays, MVP. "Continue" button. | Required | **Working** (inside GameDayScreen) |
| **Post-Game Summary** | Separate screen: detailed stats, passing/rushing/receiving leaders, key plays. | Duplicate - should be removed | **Broken** - Duplicate of GameDayScreen's post-game phase |
| **Week Summary** | All other game scores, division standings, notable results. "Advance to Week N+1" button. | Required per spec | **Missing** - Not implemented as standalone step |
| **Weekly Systems** | News generation, patience meter update, waiver wire processing, trade offers refresh, injury recovery, fatigue reset | Required (automatic) | **Partial** - Some systems skipped during advance |
| **Advance to Next Week** | Calendar advances, new matchup loaded | Required | **Working** but skips systems |

**Bye Week variant:** Dashboard shows "Your team is on bye. View league results." User goes to WeeklySchedule to sim other games and advance.

**Current issues:**
1. **Duplicate post-game**: GameDayScreen has built-in post-game phase, THEN navigates to PostGameSummaryScreen (same data shown twice)
2. **Missing Week Summary**: Product spec defines it but it is not implemented as a distinct step
3. **Weekly systems skipped**: "Continue to Next Week" in WeeklySchedule bypasses news generation, patience meter updates, waiver wire processing, trade offer refresh, and weekly awards
4. **No "sim quickly" option**: Must go through full GameDay flow even to fast-sim
5. **No halftime decisions**: GameState has `halftimeDecisions` field but UI never surfaces it
6. **Duplicate game entry points**: `playWeek` (GameDayScreen), `gamecast` (WeeklySchedule), `advanceWeek` (direct advance) - confusing for users

---

#### STEP 3: Playoffs

| Step | User Sees/Does | Required? | Status |
|------|----------------|-----------|--------|
| **Playoff Qualification** | Standings screen with playoff picture. 7 teams per conference qualify. | Required (automatic) | **Working** - Tiebreaker system is comprehensive |
| **Playoff Bracket** | Visual bracket showing all matchups. User's team highlighted. "Play [Round] Game" CTA. | Required | **Working** (PlayoffBracketScreen) |
| **Playoff Game** | Same GameDay flow as regular season but with playoff context (round name, stakes text) | Required | **Working** |
| **Elimination** | If user loses: consolation message, proceed to offseason | Required | **Partial** - No dedicated elimination screen |
| **Super Bowl Win** | Championship celebration screen with confetti, MVP, GM rating | Required per spec | **Missing** - No dedicated championship celebration |
| **Proceed to Offseason** | Transition from playoffs/season end to offseason Phase 1 | Required | **Working** (via dashboard "Offseason" action) |

**Current issues:**
1. No dedicated Super Bowl celebration screen (product spec calls for confetti, haptics, dynasty points)
2. No elimination consolation screen
3. Playoff bracket navigation works but "sim other playoff games" flow is unclear
4. No bye-round handling display for #1 seeds

---

#### STEP 4: Offseason (12 Phases)

The offseason is managed by `OffSeasonPhaseManager` with a task-based system. Each phase has required and optional tasks. Users advance when required tasks are complete.

| Phase | Name | User Does | Can Skip? | Status |
|-------|------|-----------|-----------|--------|
| 1 | **Season Recap** | View season grades, awards, draft order. Narrative write-up. | View-only, auto-advances | **Working** (SeasonRecapScreen) |
| 2 | **Coaching Decisions** | Keep/Fire/Extend HC, OC, DC. If firing, interview and hire replacements. | Can keep all (quick advance) | **Working** (CoachingTree, JobMarket, Interview, CoachHiring screens) |
| 3 | **Contract Management** | Handle expiring contracts: re-sign, franchise tag, let walk. Restructure existing deals. Cut players. | Must address expiring contracts | **Partial** - ContractManagementScreen works, but Franchise Tag and Restructure have no dedicated UI despite engine support |
| 4 | **NFL Combine** | View combine results, pro day results. Evaluate prospects. | View-only | **Working** (CombineProDayScreen) |
| 5 | **Free Agency** | Sign free agents. Day 1 frenzy, trickle phase. Budget management. | Can skip (AI fills gaps) | **Working** (FreeAgencyScreen) |
| 6 | **NFL Draft** | 7-round draft. View board, make picks, receive trade offers. | Can auto-pick | **Working** (DraftRoomScreen, DraftBoardScreen, BigBoardScreen) |
| 7 | **UDFA Signing** | Sign undrafted free agents to fill roster gaps | Can skip | **Working** (handled in engine) |
| 8 | **OTAs** | View rookie integration, first impressions, position battles preview | View-only | **Working** (OTAsScreen) |
| 9 | **Training Camp** | Position battles, development reveals, camp injuries | View-only + decisions | **Working** (TrainingCampScreen) |
| 10 | **Preseason** | Exhibition games, final evaluations | Sim games | **Working** (PreseasonScreen) |
| 11 | **Final Cuts** | Cut roster to 53 players. Practice squad assignments. | Required (must reach 53) | **Working** (FinalCutsScreen with validation gate) |
| 12 | **Season Start** | View owner expectations, set season goals, prepare for Week 1 | View-only | **Partial** - Tasks defined but no transition to new season |

**Current issues:**
1. **No offseason CTA on dashboard**: During offseason phase, the dashboard's ActionPrompt does not reliably show the offseason entry point
2. **Phase 12 dead end**: "Season Start" phase has no handler to generate a new schedule and transition to Week 1 of the next season
3. **No franchise tag UI**: Engine supports `FranchiseTagSystem` but no screen surfaces it
4. **No restructure UI**: Engine supports `RestructureSystem` but no screen surfaces it
5. **RFA, CompPicks, Combine** have no dashboard menu cards (orphaned from navigation)

---

#### STEP 5: Multi-Season Transition

| Step | What Happens | Status |
|------|-------------|--------|
| **Advance Year** | `league.calendar.currentYear++`, reset week to 1 | **Missing** |
| **Player Aging** | All players `age++`, affects development curves | **Missing** in interactive mode (exists in `HistoryOffseasonProcessor` for pre-history) |
| **Contract Advancement** | All contracts advance 1 year, expired contracts create free agents | **Missing** in interactive mode (exists in `HistoryOffseasonProcessor`) |
| **Player Retirement** | Veterans with declining skills retire | **Missing** in interactive mode (exists in `RetirementSystem` + `HistoryOffseasonProcessor`) |
| **Player Development/Regression** | Young players improve, old players decline based on coach influence | **Missing** in interactive mode (exists in `PlayerProgression` + `HistoryOffseasonProcessor`) |
| **New Draft Class Generation** | Generate 250+ new prospects for next draft | **Missing** in interactive mode (exists in `DraftClassGenerator`) |
| **Career Stat Updates** | Update `careerStats` with season results | **Missing** |
| **Season History Recording** | Record season summary in `league.seasonHistory` | **Missing** |
| **Schedule Generation** | Generate new 18-week schedule based on previous year standings | **Missing** in interactive mode |
| **Reset Season State** | Clear `seasonStats`, `offseasonState`, `weeklyGamePlan`, etc. | **Missing** |
| **Draft Pick Updates** | Create new draft picks for the new year | **Missing** |
| **Standings Reset** | Clear standings, reset team records | **Missing** |

**Key insight:** ALL of this logic exists in `HistoryOffseasonProcessor.ts` for pre-game history simulation. It just needs to be wired up for the interactive offseason-to-new-season transition.

---

## 2. Ancillary Depth

Every screen/action not on the critical path, categorized by availability.

### Always Available (from Dashboard at any time)

| Screen | Description | Dashboard Card | Status |
|--------|-------------|---------------|--------|
| **Roster** | Full team roster with sorting, filtering, player tap-through | Yes | **Working** |
| **Depth Chart V2** | Full NFL position system, drag-to-reorder, auto-generate | Yes | **Working** |
| **Staff** | Coach profiles, coordinator tendencies, scout reports | Yes | **Working** |
| **Finances** | Cap space, salary breakdown, dead money | Yes | **Partial** - Uses fake cap hits, ContractManagement has real data |
| **Contracts** | Player contracts, expiring deals, cap projections | Yes | **Working** |
| **Schedule** | Full 18-week schedule with results | Yes | **Working** |
| **Standings** | Division standings, wild card race, playoff picture | Yes | **Working** |
| **Stats** | League stat leaders, team stats | Yes | **Working** |
| **News** | News feed with game results, transactions, league events | Yes | **Working** |
| **Owner Relations** | Owner satisfaction, patience meter, demands | Yes | **Working** |
| **Career Legacy** | GM career record, team history, legacy score | Yes | **Working** |
| **Career Summary** | Detailed career statistics and achievements | Yes | **Working** |
| **Settings** | Simulation speed, auto-save, notifications | Yes | **Working** |
| **Save Game** | Manual save to current slot | Yes | **Working** |

### Phase-Gated (only relevant during certain game phases)

| Screen | Available During | Dashboard Card | Status |
|--------|-----------------|---------------|--------|
| **Game Plan** | Regular season (before games) | Yes (season only) | **Working** |
| **Start/Sit** | Regular season (questionable players) | Yes (season only) | **Working** |
| **Waiver Wire** | Regular season | Yes (season only) | **Working** |
| **Trade Offers** | Regular season | Yes (season only) | **Working** |
| **Trade Screen** | Regular season | Via Trade Offers | **Working** |
| **Weekly Awards** | Regular season (after games played) | Yes (season only) | **Working** |
| **Playoff Bracket** | Playoffs only | Via standings/dashboard | **Working** |
| **Offseason Hub** | Offseason only | Yes (offseason only) | **Working** |
| **Season Recap** | Offseason Phase 1 | Via Offseason Hub | **Working** |
| **Coaching Tree** | Offseason Phase 2 | Via Offseason Hub | **Working** |
| **Job Market** | Offseason Phase 2 (after firing) | Via Coaching Tree | **Working** |
| **Interview** | Offseason Phase 2 (hiring) | Via Job Market | **Working** |
| **Coach Hiring** | Offseason Phase 2 (hiring) | Via Interview | **Working** |
| **Combine/Pro Day** | Offseason Phase 4 | Via Offseason Hub | **Working** |
| **Scouting Reports** | Offseason Phases 4-6 | Via Offseason Hub | **Working** |
| **Big Board** | Offseason Phases 4-6 | Via Offseason Hub | **Working** |
| **Draft Board** | Offseason Phase 6 | Via Offseason Hub | **Working** |
| **Draft Room** | Offseason Phase 6 | Via Offseason Hub | **Working** |
| **Free Agency** | Offseason Phase 5 | Via Offseason Hub | **Working** |
| **OTAs** | Offseason Phase 8 | Via Offseason Hub | **Working** |
| **Training Camp** | Offseason Phase 9 | Via Offseason Hub | **Working** |
| **Preseason** | Offseason Phase 10 | Via Offseason Hub | **Working** |
| **Final Cuts** | Offseason Phase 11 | Via Offseason Hub | **Working** |

### Deep Dive (multiple taps to reach)

| Screen | Reached Via | Status |
|--------|------------|--------|
| **Player Profile** | Tap any player name in Roster, Depth Chart, Stats, etc. | **Working** |
| **Single Player Card** | Tap player in various contexts | **Working** |
| **Coach Profile** | Tap coach in Staff screen | **Working** |
| **Coaching Tree** | Coaching Decisions phase | **Working** |

### Orphaned/Broken Screens (exist but unreachable or broken)

| Screen | Issue | Status |
|--------|-------|--------|
| **RFA Screen** | Has no dashboard menu card, action `'rfa'` exists but no card triggers it | **Orphaned** |
| **CompPick Tracker** | Has no dashboard menu card, action `'compPicks'` exists but no card triggers it | **Orphaned** |
| **Rumor Mill** | Has dashboard card but uses mock/placeholder data | **Mock data** |
| **Weekly Digest** | Has dashboard card but uses placeholder data | **Mock data** |
| **DepthChartScreen (V1)** | Superseded by DepthChartScreenV2, still exists as dead code | **Deprecated** |

### Recommended Before (suggested pre-game prep)

| Screen | Visit Before | Reason |
|--------|-------------|--------|
| **Depth Chart** | Each game | Ensure starters are set correctly, especially after injuries |
| **Game Plan** | Each game | Set weekly practice focus for matchup bonuses |
| **Start/Sit** | Each game (if questionable players) | Decide on injured players |
| **Roster/Waiver Wire** | After injuries | Pick up replacements |
| **Scouting Reports** | Before Draft | Evaluate prospects before picking |
| **Big Board** | Before Draft | Set draft priorities and rankings |

---

## 3. Current State vs Ideal State

### Critical Path Step-by-Step Comparison

#### New Game Setup

| Aspect | Current State | Ideal State | Gap |
|--------|--------------|-------------|-----|
| Start screen | Working, 3 save slots | Add loading indicators for save detection | Minor polish |
| Team selection | Working, 32 teams | Add difficulty ratings, team previews | Minor polish |
| Staff decision | Working | Working as intended | None |
| Game generation | Synchronous, freezes UI 2-3s | Async with loading screen, progress bar | **P0 - UX blocker** |
| First dashboard | Drops user in with no guidance | Add onboarding tooltip or "first steps" prompt | **P1** |

#### Weekly Loop

| Aspect | Current State | Ideal State | Gap |
|--------|--------------|-------------|-----|
| Dashboard CTA | ActionPrompt shows "Play Week N" | Working as intended | None |
| Pre-game | GameDayScreen pre-game phase, working | Working as intended | None |
| Simulation | Play-by-play with speed controls, working | Add halftime decisions | **P2** |
| Post-game (in-game) | GameDayScreen post-game phase shows box score | Single post-game, remove duplicate | **P0** |
| Post-game summary | PostGameSummaryScreen (DUPLICATE) | Remove this screen entirely, use GameDayScreen post-game | **P0** |
| Week summary | Does not exist as standalone step | New screen: other scores, standings snapshot, notable results, headlines | **P0** |
| Weekly systems | advanceWeek only does injury recovery + fatigue | Must also process: news, patience, waivers, trades, awards | **P0** |
| Sim quickly | Must go through full game flow | Add "Quick Sim" button on dashboard that skips to week summary | **P1** |
| Bye week | WeeklySchedule handles it but flow is awkward | Streamline: dashboard shows bye message, one-tap to sim league and advance | **P1** |

#### Playoffs

| Aspect | Current State | Ideal State | Gap |
|--------|--------------|-------------|-----|
| Qualification | Standings + determinePlayoffTeams works | Working | None |
| Bracket | PlayoffBracketScreen renders correctly | Add seeding, bye round display | Minor polish |
| Playoff games | Same GameDay flow | Add playoff-specific stakes text, crowd intensity | **P2** |
| Championship win | No celebration screen | Full celebration: confetti, haptics, MVP, GM grade, dynasty points | **P1** |
| Elimination | No consolation screen | "Season Over" screen with season summary, "proceed to offseason" | **P1** |
| Transition to offseason | Manual via dashboard Offseason button | Auto-navigate after final playoff game | **P0** |

#### Offseason

| Aspect | Current State | Ideal State | Gap |
|--------|--------------|-------------|-----|
| Offseason hub | OffseasonScreen with phase tracker, working | Working | None |
| Phase navigation | Task-based system with advance gates | Working | None |
| Season Recap (Ph 1) | Working with grades, awards, narrative | Working | None |
| Coaching (Ph 2) | Full hire/fire/extend pipeline | Working | None |
| Contracts (Ph 3) | ContractManagementScreen works | Add Franchise Tag UI, Restructure UI | **P1** |
| Combine (Ph 4) | CombineProDayScreen works | Working | None |
| Free Agency (Ph 5) | FreeAgencyScreen with Day 1 frenzy | Working | None |
| Draft (Ph 6) | DraftRoom + DraftBoard + BigBoard | Working | None |
| UDFA (Ph 7) | Engine handles it | Working | None |
| OTAs (Ph 8) | OTAsScreen works | Working | None |
| Training Camp (Ph 9) | TrainingCampScreen works | Working | None |
| Preseason (Ph 10) | PreseasonScreen works | Working | None |
| Final Cuts (Ph 11) | FinalCutsScreen with 53-man validation | Working | None |
| Season Start (Ph 12) | Tasks defined, but NO transition logic | Must: advance year, age players, generate schedule, reset state | **P0 - BLOCKER** |

#### Multi-Season Transition

| Aspect | Current State | Ideal State | Gap |
|--------|--------------|-------------|-----|
| Year advance | Not implemented | Increment year, reset week to 1 | **P0** |
| Player aging | Not implemented in interactive | `age++` for all players | **P0** |
| Contract advancement | Not implemented in interactive | Advance all contracts 1 year, expire finished ones | **P0** |
| Retirement | `RetirementSystem` exists but not wired | Process retirements based on age/decline | **P0** |
| Development | `PlayerProgression` exists but not wired | Apply offseason progression to all players | **P0** |
| New draft class | `DraftClassGenerator` exists but not wired | Generate 250+ prospects for next year | **P0** |
| Schedule generation | `generateSeasonSchedule` exists but not called | Generate new schedule from previous standings | **P0** |
| Season history | Not recorded | Save season summary to `league.seasonHistory` | **P0** |
| Career stats update | Not implemented | Update `careerStats` with season results | **P1** |
| State reset | Not implemented | Clear transient state (seasonStats, offseasonState, etc.) | **P0** |

---

## 4. Weekly Loop Redesign

The weekly loop is the **most repeated interaction** in the game (18+ times per season, potentially hundreds across a career). Every unnecessary tap compounds into significant friction.

### Current Flow (6-7 taps minimum)

```
Dashboard ──[Play Week]──> GameDayScreen (pre-game)
  ──[Simulate/Watch]──> GameDayScreen (live sim)
  ──[Continue]──> GameDayScreen (post-game)
  ──[Continue]──> PostGameSummaryScreen (DUPLICATE)
  ──[Continue]──> WeeklySchedulePopup (other scores)
  ──[Continue to Next Week]──> Dashboard (systems NOT processed)
```

Problems:
- PostGameSummaryScreen duplicates GameDayScreen post-game data
- WeeklySchedulePopup handles "Continue to Next Week" but skips weekly systems
- No quick-sim option
- 6-7 mandatory taps even when user just wants to advance

### Proposed Flow (4 taps standard, 2 taps quick-sim)

#### Standard Path (4 taps)

```
Dashboard ──[Play Week N]──> GameDayScreen
  |
  Pre-Game: matchup, prediction, [Simulate] / [Watch Live]
  |
  Live Sim: play-by-play with speed controls (or instant skip)
  |
  Post-Game: final score, box score, MVP, key plays
    [View Full Stats] (expands in-place, no new screen)
    [Continue]
  |
  v
Week Summary Screen (NEW - replaces WeeklySchedulePopup role)
  |
  Shows: your result hero card, other scores grid, division standings,
         notable results, headlines, injury updates, award winners
  |
  [Advance to Week N+1]
    |
    Automatically processes ALL weekly systems:
    - News generation
    - Patience meter update
    - Waiver wire processing
    - Trade offer refresh
    - Injury recovery
    - Fatigue reset
    - Weekly awards
    - Auto-save
  |
  v
Dashboard (Week N+1)
```

#### Quick-Sim Path (2 taps)

```
Dashboard ──[Quick Sim Week N]──> Processing overlay (1-2 seconds)
  |
  Automatically:
  - Simulates user's game
  - Simulates all other games
  - Processes all weekly systems
  |
  v
Week Summary Screen
  |
  Shows same data as standard path
  [Advance to Week N+1]
  |
  v
Dashboard (Week N+1)
```

#### Bye Week Path (2 taps)

```
Dashboard ──[Sim Bye Week]──> Processing overlay
  |
  Simulates all other games, processes systems
  |
  v
Week Summary Screen (no hero card, just league results)
  |
  [Advance to Week N+1]
  |
  v
Dashboard (Week N+1)
```

### Implementation Changes Required

1. **Remove PostGameSummaryScreen**: Delete the screen. GameDayScreen already has a complete post-game phase with box scores and key plays.

2. **Replace WeeklySchedulePopup with WeekSummaryScreen**: New screen that combines:
   - User's game result (hero card)
   - All other scores (compact grid)
   - Division standings snapshot
   - Notable results / headlines
   - Injury updates
   - "Advance to Next Week" CTA that processes ALL systems

3. **Add Quick Sim to Dashboard**: New button alongside "Play Week N":
   - Runs game simulation instantly (no pre-game, no play-by-play)
   - Navigates directly to WeekSummaryScreen with results

4. **Consolidate `advanceWeek` logic**: Move ALL weekly system processing into a single `processWeekEnd()` function called from WeekSummaryScreen's advance button:
   ```typescript
   function processWeekEnd(gameState: GameState): GameState {
     let state = gameState;
     state = generateAndAddLeagueNews(state);
     state = updatePatienceValue(state);
     state = processWaiverWire(state);
     state = refreshTradeOffers(state);
     state = processInjuryRecovery(state);
     state = resetFatigue(state);
     state = processWeeklyAwards(state);
     state = advanceCalendar(state);
     state = autoSave(state);
     return state;
   }
   ```

5. **Simplify game entry points**: Remove `gamecast` and `advanceWeek` from dashboard actions. Only two entry points:
   - `playWeek` -> GameDayScreen (full experience)
   - `quickSim` -> Process + WeekSummaryScreen (fast path)

---

## 5. Multi-Season Requirements

Everything needed for the year-over-year transition. The good news: **most of this logic already exists** in `HistoryOffseasonProcessor.ts` (used for pre-game history simulation). It needs to be extracted and wired into the interactive offseason flow.

### 5.1 Player Aging

**Existing code:** `HistoryOffseasonProcessor.processPlayerProgression()` handles age-based development
**What to do:**
- Call `player.age++` for every player in `gameState.players`
- Apply age-based development curves from `PlayerProgression.getAgeModifier()`
- Young players (21-25): potential improvement
- Prime players (26-29): maintenance
- Veterans (30+): regression risk

### 5.2 Contract Advancement/Expiration

**Existing code:** `HistoryOffseasonProcessor.processContractExpirations()` and `Contract.advanceContractYear()`
**What to do:**
- Call `advanceContractYear()` for every contract in `gameState.contracts`
- Contracts with 0 years remaining -> player becomes free agent
- Dead money from previous cuts carries forward
- Salary cap increases by ~$10M/year (configurable)

### 5.3 Player Retirement

**Existing code:** `RetirementSystem` (complete with legacy tiers, HoF status, career highlights) and `HistoryOffseasonProcessor.processRetirements()`
**What to do:**
- Evaluate all players 32+ for retirement probability
- Factors: age, overall rating, recent injuries, recent playing time
- Generate retirement announcement news items
- Record career stats to history

### 5.4 New Draft Class Generation

**Existing code:** `DraftClassGenerator.generateDraftClass()` - complete with positional distribution, class strength variation, college programs
**What to do:**
- Call `generateDraftClass()` with class size ~250
- Apply `ClassStrengthSystem` for year-to-year variation
- Generate combine data (auto-run combine)
- Populate `gameState.prospects`

### 5.5 Career Stat Updates

**Existing code:** `CareerRecordTracker` tracks GM career, `PlayerHistoryTracker` tracks player careers
**What to do:**
- Update `gameState.careerStats.seasonsCompleted++`
- Update win/loss totals
- Record playoff result
- Record championship if won
- Update player career histories with season logs

### 5.6 Season History Recording

**Existing code:** `League.seasonHistory` array exists, `SeasonSummary` type defined
**What to do:**
- Create `SeasonSummary` from current season data:
  - Final standings
  - Playoff results
  - Award winners
  - Champion
  - Draft order
- Push to `league.seasonHistory`
- This powers "Season History" screen (future feature)

### 5.7 Player Development/Regression

**Existing code:** `PlayerProgression.processTeamProgression()` - complete with coach influence, scheme fit, age curves
**What to do:**
- Run development for all 1,700+ players
- Coach quality affects development speed
- Scheme fit matters
- Generate development news items for notable changes on user's team

### 5.8 Schedule Generation

**Existing code:** `ScheduleGenerator.generateSeasonSchedule()` with 5-component NFL formula, 14 validation gates
**What to do:**
- Use previous season's final standings as input
- Generate new 18-week schedule
- Assign bye weeks
- Set to `gameState.league.schedule`

### 5.9 State Reset

**What to clear:**
- `gameState.seasonStats` -> empty
- `gameState.offseasonState` -> null
- `gameState.offseasonData` -> null
- `gameState.weeklyGamePlan` -> null
- `gameState.tradeOffers` -> null
- `gameState.startSitDecisions` -> null
- `gameState.weeklyAwards` -> null
- `gameState.waiverWire` -> null
- `gameState.halftimeDecisions` -> null
- `gameState.league.calendar.currentWeek` -> 1
- `gameState.league.calendar.currentPhase` -> 'regularSeason'
- `gameState.league.calendar.currentYear` -> year + 1
- Reset all team records to 0-0

### 5.10 Draft Pick Updates

**Existing code:** `HistoryOffseasonProcessor.createDraftPicksForYear()`
**What to do:**
- Create 7 rounds x 32 teams = 224 base picks
- Account for traded picks from previous seasons
- Set to `gameState.draftPicks`

### 5.11 Implementation Approach

Create a single `SeasonTransitionService` that orchestrates all of the above:

```typescript
function transitionToNewSeason(gameState: GameState): GameState {
  let state = gameState;

  // 1. Record season history
  state = recordSeasonHistory(state);

  // 2. Process retirements
  state = processRetirements(state);

  // 3. Advance contracts (creates free agents)
  state = advanceAllContracts(state);

  // 4. Age all players
  state = ageAllPlayers(state);

  // 5. Apply development/regression
  state = applyPlayerDevelopment(state);

  // 6. Generate new draft class
  state = generateNewDraftClass(state);

  // 7. Create draft picks for new year
  state = createNewDraftPicks(state);

  // 8. Generate new schedule
  state = generateNewSchedule(state);

  // 9. Update career stats
  state = updateCareerStats(state);

  // 10. Reset transient state
  state = resetSeasonState(state);

  return state;
}
```

This function should be called when the user completes offseason Phase 12 (Season Start) and taps "Begin Season."

---

## 6. Priority Roadmap

### P0: Critical Path Must Work End-to-End (Single Season)

These are **blockers** preventing a complete single-season playthrough.

| # | Item | Effort | Impact | Files Affected |
|---|------|--------|--------|---------------|
| P0-1 | **Remove PostGameSummary duplicate** | Small | Eliminates confusion, reduces taps | `ScreenWrappers.tsx`, remove `PostGameSummaryScreen` navigation |
| P0-2 | **Implement Week Summary screen** | Medium | Fills missing critical path step, surfaces weekly news/standings | New `WeekSummaryScreen.tsx`, modify `ScreenWrappers.tsx` |
| P0-3 | **Process ALL weekly systems on advance** | Medium | Fixes news, patience, waivers, trades, awards being skipped | `ScreenWrappers.tsx` `handleAdvanceWeek`, create `processWeekEnd()` |
| P0-4 | **Add loading screen for game creation** | Small | Prevents UI freeze on new game | `ScreenWrappers.tsx` TeamSelection wrapper |
| P0-5 | **Fix offseason CTA on dashboard** | Small | Users can find offseason entry during offseason phase | `GMDashboardScreen.tsx` ActionPrompt logic |
| P0-6 | **Auto-transition to offseason after final game** | Small | Prevents dead-end after playoffs/season end | `ScreenWrappers.tsx` post-playoff logic |
| P0-7 | **Implement Season Transition Service** | Large | Enables multi-season play (the #1 most impactful item) | New `SeasonTransitionService.ts`, wire to Phase 12 |
| P0-8 | **Wire Phase 12 to new season** | Medium | Completes the offseason->new season loop | `ScreenWrappers.tsx` Offseason advance handler |
| P0-9 | **Consolidate game entry points** | Small | Remove `gamecast`/`advanceWeek` confusion on dashboard | `GMDashboardScreen.tsx`, `ScreenWrappers.tsx` |

### P1: Multi-Season Viability & Key Missing Features

| # | Item | Effort | Impact | Notes |
|---|------|--------|--------|-------|
| P1-1 | **Quick Sim option** | Medium | Huge QoL for repeat play, casual users | Add "Quick Sim" button to dashboard |
| P1-2 | **Championship celebration screen** | Medium | Major emotional payoff moment | New screen with confetti, haptics, MVP, dynasty points |
| P1-3 | **Elimination/Season Over screen** | Small | Graceful end to season | New screen with season summary, "proceed to offseason" |
| P1-4 | **Franchise Tag UI** | Medium | Engine supports it, users expect it | New section in ContractManagementScreen or dedicated screen |
| P1-5 | **Contract Restructure UI** | Medium | Engine supports it, key GM tool | New section in ContractManagementScreen |
| P1-6 | **Finances screen with real cap data** | Medium | Currently uses fake cap hits | Wire FinancesScreen to actual contract data |
| P1-7 | **First-time onboarding** | Medium | New players need guidance on complex dashboard | Tooltip tour or "first steps" prompt |
| P1-8 | **Bye week streamlining** | Small | Current bye flow is awkward | Dashboard CTA for bye: "Sim League Week" -> Week Summary |
| P1-9 | **Career stats persistence across seasons** | Medium | Dynasty builders need this | Update careerStats in SeasonTransitionService |

### P2: Polish Existing Screens

| # | Item | Effort | Impact | Notes |
|---|------|--------|--------|-------|
| P2-1 | **Wire RFA screen to dashboard** | Small | Orphaned feature becomes accessible | Add menu card in offseason context |
| P2-2 | **Wire CompPick Tracker to dashboard** | Small | Orphaned feature becomes accessible | Add menu card in offseason context |
| P2-3 | **Replace Rumor Mill mock data** | Medium | Currently shows placeholder data | Wire to actual trade/FA rumors from engine |
| P2-4 | **Replace Weekly Digest mock data** | Medium | Currently shows placeholder data | Wire to actual weekly data from engine |
| P2-5 | **Remove DepthChartScreen V1** | Small | Dead code cleanup | Delete file, remove from navigation |
| P2-6 | **Halftime decisions UI** | Medium | GameState has field, no UI | Surface during live sim at halftime |
| P2-7 | **Playoff bracket polish** | Small | Better seeding display, bye round handling | Update PlayoffBracketScreen |
| P2-8 | **IR management UI** | Medium | Engine likely supports it, no UI | Add IR placement/return to roster screen |
| P2-9 | **Improve auto-save reliability** | Small | Ensure save after every critical action | Audit all state-changing operations |

### P3: Nice-to-Have Depth (New Features)

| # | Item | Effort | Notes |
|---|------|--------|-------|
| P3-1 | **Sim entire season** | Large | `simSeason` action exists on dashboard but needs full implementation |
| P3-2 | **Season History screen** | Medium | View past seasons, records, champions |
| P3-3 | **Hall of Fame** | Medium | RetirementSystem has HoF status logic |
| P3-4 | **Trade deadline** | Medium | Time-limited trade window mid-season |
| P3-5 | **Injured Reserve management** | Medium | Place players on IR, activate from IR |
| P3-6 | **Player comparison tool** | Small | Side-by-side player stat comparison |
| P3-7 | **Draft trade calculator** | Small | Trade value chart for draft picks |
| P3-8 | **Coaching tree visualization** | Medium | See coach hiring/firing history across league |
| P3-9 | **Dynasty mode features** | Large | Multi-decade play with legacy tracking, HoF ceremonies |

---

## Appendix A: Screen Inventory (52 Screens)

| # | Screen | File | Critical Path? | Status |
|---|--------|------|---------------|--------|
| 1 | Start | `StartScreen.tsx` | Yes | Working |
| 2 | Team Selection | `TeamSelectionScreen.tsx` | Yes | Working |
| 3 | Staff Decision | `StaffDecisionScreen.tsx` | Yes | Working |
| 4 | Staff Hiring | `StaffHiringScreen.tsx` | Conditional | Working |
| 5 | GM Dashboard | `GMDashboardScreen.tsx` | Yes | Working |
| 6 | Game Day | `GameDayScreen.tsx` | Yes | Working |
| 7 | Post Game Summary | `PostGameSummaryScreen.tsx` | **Remove** | Duplicate |
| 8 | Weekly Schedule | `WeeklySchedulePopup.tsx` | **Replace** | Replace with WeekSummary |
| 9 | Roster | `RosterScreen.tsx` | No | Working |
| 10 | Depth Chart V2 | `DepthChartScreenV2.tsx` | No | Working |
| 11 | Depth Chart V1 | `DepthChartScreen.tsx` | **Remove** | Deprecated |
| 12 | Staff | `StaffScreen.tsx` | No | Working |
| 13 | Finances | `FinancesScreen.tsx` | No | Partial (fake data) |
| 14 | Contracts | `ContractManagementScreen.tsx` | No | Working |
| 15 | Schedule | `ScheduleScreen.tsx` | No | Working |
| 16 | Standings | `StandingsScreen.tsx` | No | Working |
| 17 | Stats | `StatsScreen.tsx` | No | Working |
| 18 | News | `NewsScreen.tsx` | No | Working |
| 19 | Player Profile | `PlayerProfileScreen.tsx` | No | Working |
| 20 | Single Player Card | `SinglePlayerCardScreen.tsx` | No | Working |
| 21 | Coach Profile | `CoachProfileScreen.tsx` | No | Working |
| 22 | Coaching Tree | `CoachingTreeScreen.tsx` | No | Working |
| 23 | Owner Relations | `OwnerRelationsScreen.tsx` | No | Working |
| 24 | Career Legacy | `CareerLegacyScreen.tsx` | No | Working |
| 25 | Career Summary | `CareerSummaryScreen.tsx` | No | Working |
| 26 | Playoff Bracket | `PlayoffBracketScreen.tsx` | Conditional | Working |
| 27 | Offseason Hub | `OffseasonScreen.tsx` | Yes | Working |
| 28 | Season Recap | `SeasonRecapScreen.tsx` | Yes | Working |
| 29 | Coach Hiring | `CoachHiringScreen.tsx` | Conditional | Working |
| 30 | Job Market | `JobMarketScreen.tsx` | Conditional | Working |
| 31 | Interview | `InterviewScreen.tsx` | Conditional | Working |
| 32 | Combine/Pro Day | `CombineProDayScreen.tsx` | Yes | Working |
| 33 | Scouting Reports | `ScoutingReportsScreen.tsx` | No | Working |
| 34 | Big Board | `BigBoardScreen.tsx` | No | Working |
| 35 | Draft Board | `DraftBoardScreen.tsx` | Yes | Working |
| 36 | Draft Room | `DraftRoomScreen.tsx` | Yes | Working |
| 37 | Free Agency | `FreeAgencyScreen.tsx` | Yes | Working |
| 38 | OTAs | `OTAsScreen.tsx` | Yes | Working |
| 39 | Training Camp | `TrainingCampScreen.tsx` | Yes | Working |
| 40 | Preseason | `PreseasonScreen.tsx` | Yes | Working |
| 41 | Final Cuts | `FinalCutsScreen.tsx` | Yes | Working |
| 42 | Game Plan | `GamePlanScreen.tsx` | No | Working |
| 43 | Start/Sit | `StartSitScreen.tsx` | No | Working |
| 44 | Waiver Wire | `WaiverWireScreen.tsx` | No | Working |
| 45 | Trade Screen | `TradeScreen.tsx` | No | Working |
| 46 | Trade Offers | `TradeOffersScreen.tsx` | No | Working |
| 47 | Weekly Awards | `WeeklyAwardsScreen.tsx` | No | Working |
| 48 | RFA | `RFAScreen.tsx` | No | Orphaned |
| 49 | CompPick Tracker | `CompPickTrackerScreen.tsx` | No | Orphaned |
| 50 | Rumor Mill | `RumorMillScreen.tsx` | No | Mock data |
| 51 | Weekly Digest | `WeeklyDigestScreen.tsx` | No | Mock data |
| 52 | Settings | `SettingsScreen.tsx` | No | Working |

## Appendix B: ScreenWrappers.tsx Decomposition Plan

`ScreenWrappers.tsx` is currently **6,767 lines** containing ALL business logic for ALL screen wrappers. This is the single largest technical debt item in the codebase.

Recommended decomposition:
1. `wrappers/StartupWrappers.ts` - Start, TeamSelection, StaffDecision, StaffHiring
2. `wrappers/DashboardWrapper.ts` - GMDashboard with all action handlers
3. `wrappers/GameFlowWrappers.ts` - GameDay, WeekSummary (new), PostGame
4. `wrappers/SeasonWrappers.ts` - Schedule, Standings, Stats, PlayoffBracket
5. `wrappers/RosterWrappers.ts` - Roster, DepthChart, WaiverWire, StartSit, Trade
6. `wrappers/StaffWrappers.ts` - Staff, CoachProfile, CoachingTree, JobMarket, Interview, CoachHiring
7. `wrappers/OffseasonWrappers.ts` - Offseason, SeasonRecap, Combine, FreeAgency, Draft, OTAs, TrainingCamp, Preseason, FinalCuts
8. `wrappers/MiscWrappers.ts` - News, Finances, Contracts, OwnerRelations, Career, Settings

Each file would be ~500-800 lines, making the codebase dramatically more maintainable.

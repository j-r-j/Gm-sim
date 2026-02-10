# Test Coverage Analysis

## Current Coverage Summary

| Metric     | Covered | Total  | Percentage |
|------------|---------|--------|------------|
| Statements | 15,249  | 34,486 | 44.21%     |
| Branches   | 8,358   | 22,202 | 37.64%     |
| Functions  | 2,263   | 7,705  | 29.37%     |
| Lines      | 14,292  | 31,778 | 44.97%     |

**Test suites:** 125 passed | **Tests:** 3,450 passed

---

## Priority 1 (Critical) -- Zero-Coverage Core Systems

These files contain substantial business logic and have **0% coverage**. They are the highest-risk areas in the codebase.

### 1. Offseason Phase System (~6,500 lines, 0% coverage)

**Files:** All 12 files in `src/core/offseason/phases/`

| File | Lines |
|------|-------|
| `CoachingDecisionsPhase.ts` | 579 |
| `TrainingCampPhase.ts` | 494 |
| `SeasonStartPhase.ts` | 443 |
| `CombinePhase.ts` | 428 |
| `DraftPhase.ts` | 423 |
| `FinalCutsPhase.ts` | 420 |
| `PreseasonPhase.ts` | 416 |
| `SeasonEndPhase.ts` | 364 |
| `OTAsPhase.ts` | 337 |
| `ContractManagementPhase.ts` | 333 |
| `UDFAPhase.ts` | 325 |
| `FreeAgencyPhase.ts` | 306 |

**Why this matters:** The offseason is one of two core user flows (the other being weekly game progression). Every phase mutates GameState -- untested state transitions here could silently corrupt save data or produce impossible game states. The `OffSeasonPhaseManager` itself is well tested (91.8%), but none of the actual phase implementations it delegates to are covered.

**Recommended tests:**
- Unit tests for each phase's `execute()` method verifying GameState mutations
- Boundary tests: entering a phase with missing/unexpected data
- Integration test: run all 12 phases sequentially and verify end-to-end GameState consistency

### 2. Offseason Orchestration & Bridges (~2,400 lines, 0% coverage)

**Files:**
- `OffseasonOrchestrator.ts` (777 lines)
- `PhaseStateMappers.ts` (861 lines)
- `OffseasonPersistentData.ts` (351 lines)
- `bridges/PhaseGenerators.ts` (870 lines)
- `bridges/PhaseDataFlow.ts` (377 lines)
- `bridges/UDFABridge.ts` (230 lines)
- `bridges/CombineBridge.ts` (139 lines)

**Why this matters:** The orchestrator coordinates the full offseason flow and bridges handle data transformation between phases. Bugs here could cause phases to run out of order, skip phases, or lose data between phases.

**Recommended tests:**
- Test phase ordering and transition guards in the orchestrator
- Test each bridge's data transformation input/output contracts
- Test PhaseStateMappers for each phase type

### 3. Game Flow Management (~1,240 lines, 0% coverage)

**Files:**
- `GameFlowManager.ts` (702 lines) -- orchestrates weekly game flow
- `GameDayFlow.ts` (537 lines) -- manages game day progression

**Why this matters:** These files control the primary weekly loop: Dashboard -> Pre-Game -> Game -> Post-Game -> Summary. `WeekProgressionService` and `GameSimulationEngine` (which sit alongside these) are well tested (~83-87%), but the higher-level orchestrators that call them are not.

**Recommended tests:**
- State machine transitions for each game day step
- Error handling when a step fails mid-flow
- Edge cases: bye weeks, playoff weeks, season-ending games

### 4. AI Trade System (466 lines, 0% coverage)

**File:** `core/trade/AITradeOfferGenerator.ts`

**Why this matters:** Trade logic directly affects competitive balance. Bad trade valuations could make the AI either too passive or exploitable, breaking the simulation's credibility.

**Recommended tests:**
- Trade offer generation for different scenarios (rebuilding team, contender, etc.)
- Value calculation accuracy for different player tiers and pick positions
- Validation that generated trades don't violate salary cap rules

### 5. Week Flow State Machine (416 lines, 0% coverage)

**File:** `core/simulation/WeekFlowState.ts`

**Why this matters:** This state machine enforces that weekly steps happen in order. Without tests, there's no guarantee invalid transitions are blocked.

**Recommended tests:**
- Valid transition sequences
- Invalid transition rejection
- State reset between weeks

### 6. Game Plan Manager (367 lines, 0% coverage)

**File:** `core/gameplan/GamePlanManager.ts`

**Recommended tests:**
- Game plan creation and modification
- Scheme-specific plan validation
- Plans correctly influencing play calling

---

## Priority 2 (High) -- Low-Coverage Core Systems

These modules have tests but significant coverage gaps, especially in branches and functions.

### 7. Free Agency Subsystem (overall ~40% coverage)

Most files are between 23-61% line coverage. Key gaps:

| File | Stmts | Branches | Functions |
|------|-------|----------|-----------|
| `TricklePhaseManager.ts` | 24.0% | 9.2% | 18.5% |
| `Day1FrenzySimulator.ts` | 38.5% | 18.3% | 39.3% |
| `LegalTamperingPhase.ts` | 39.2% | 10.2% | 40.7% |
| `RFATenderSystem.ts` | 42.7% | 26.7% | 40.7% |
| `FreeAgentSeeder.ts` | 0% | 0% | 0% |
| `FreeAgencyManager.ts` | 51.4% | 51.3% | 25.6% |

**Why this matters:** Free agency is a core offseason feature. There's only 1 test file (`freeAgency.test.ts`) covering 9 source files. The branch coverage is especially concerning -- many conditional paths in market valuation and AI decision-making are untested.

**Recommended tests:**
- `FreeAgentSeeder`: test free agent pool generation for various market conditions
- `TricklePhaseManager` / `Day1FrenzySimulator`: test the simulation progression and AI signing logic
- `LegalTamperingPhase`: test tampering period mechanics and early-deal tracking
- Expand the existing `freeAgency.test.ts` or split into per-file test suites

### 8. Season Management (overall ~65% but with critical gaps)

| File | Stmts | Branches | Functions |
|------|-------|----------|-----------|
| `SeasonManager.ts` | 26.7% | 12.6% | 55.3% |
| `DraftOrderCalculator.ts` | 6.1% | 0% | 0% |
| `WeeklyAwards.ts` | 0% | 0% | 0% |
| `ByeWeekManager.ts` | 41.2% | 9.4% | 36.4% |
| `WeekSimulator.ts` | 64.4% | 50.0% | 81.3% |

**Why this matters:** `SeasonManager` orchestrates the entire season lifecycle. `DraftOrderCalculator` at 6% coverage is particularly risky since incorrect draft order affects future seasons.

**Recommended tests:**
- `DraftOrderCalculator`: test lottery logic, tiebreakers, traded picks
- `SeasonManager`: test season phase transitions, playoff seeding triggers
- `WeeklyAwards`: test MVP/player-of-week selection logic
- `ByeWeekManager`: test bye week scheduling constraints

### 9. Roster Management (overall ~42% coverage)

| File | Stmts | Branches | Functions |
|------|-------|----------|-----------|
| `StartSitManager.ts` | 0% | 0% | 0% |
| `WaiverWireManager.ts` | 0% | 0% | 0% |
| `DepthChartManager.ts` | 26.7% | 19.3% | 15.4% |
| `DepthChartService.ts` | 60.6% | 44.4% | 56.4% |

**Recommended tests:**
- `StartSitManager`: test lineup setting logic and position constraints
- `WaiverWireManager`: test waiver order, claim resolution, roster limit enforcement
- `DepthChartManager`: test auto-sort logic, injury promotion, position eligibility

### 10. Engine Subsystem (7 tests for 21 source files)

The 7 existing engine tests are solid, but 14 source files have no dedicated tests:

| File | Lines | Description |
|------|-------|-------------|
| `EnhancedPlayResolver.ts` | 755 | Enhanced play resolution with advanced mechanics |
| `InjuryProcessor.ts` | 598 | Injury determination and severity |
| `SchemeMatchupEffects.ts` | 530 | Scheme vs scheme modifiers |
| `PlayCaller.ts` | 499 | Play selection logic |
| `PlayDescriptionGenerator.ts` | 487 | Narrative text generation |
| `SituationalModifiers.ts` | 435 | Game situation (clock, score) effects |
| `PersonnelPackages.ts` | 417 | Personnel grouping logic |
| `PassRushPhases.ts` | 416 | Pass rush progression |
| `FatigueCurves.ts` | 389 | Fatigue curve definitions |
| `PresnapReads.ts` | 356 | Pre-snap read logic |
| `TeamCompositeRatings.ts` | 798 | Team-level composite calculations |
| `FatigueSystem.ts` | 327 | Per-play fatigue tracking |
| `MatchupResolver.ts` | 279 | Player vs player matchups |
| `PlayActionEffectiveness.ts` | 279 | Play action mechanics |

Some of these may have indirect coverage through `playResolver.test.ts`, but the lack of targeted tests means edge cases in injury, fatigue, and situational modifiers are likely untested.

**Recommended tests (highest value first):**
- `InjuryProcessor`: test injury probability by position, severity distribution, season-ending injury handling
- `FatigueSystem` + `FatigueCurves`: test fatigue accumulation across games, recovery rates
- `PlayCaller`: test play selection given different game situations (blowout, 2-minute drill, red zone)
- `MatchupResolver`: test position-vs-position matchup calculations
- `SituationalModifiers`: test score differential, clock, and weather effects

---

## Priority 3 (Medium) -- Services & Supporting Systems

### 11. Services Layer (0% except GameStorage)

| File | Lines | Coverage |
|------|-------|----------|
| `NewGameService.ts` | 434 | 0% |
| `StandingsService.ts` | 260 | 0% |
| `flow/WeekFlowManager.ts` | 385 | 0% |

**Why this matters:** `NewGameService` generates the initial state for every new game. If it produces invalid GameState, everything downstream breaks. `WeekFlowManager` coordinates the weekly user-facing flow.

**Recommended tests:**
- `NewGameService`: test that generated GameState has valid teams, rosters, and schedules
- `StandingsService`: test standings calculations match `StandingsCalculator` core logic
- `WeekFlowManager`: test step-by-step flow coordination

### 12. Game Subsystem Gaps

| File | Lines | Coverage |
|------|-------|----------|
| `HalftimeAdjustments.ts` | 315 | 0% |
| `SeasonStatsAggregator.ts` | 641 | 0% |

**Recommended tests:**
- `HalftimeAdjustments`: test adjustment calculations based on first-half performance
- `SeasonStatsAggregator`: test season-long stat accumulation and leader boards

### 13. Coaching Subsystem Gaps

Files with no dedicated tests:
- `CoachManagementActions.ts` -- coach hiring/firing actions
- `CoachRevelationSystem.ts` -- hidden coaching attribute revelation
- `CoachScoutingReport.ts` -- coaching candidate evaluation
- `SchemeFitCalculator.ts` -- scheme fit calculations
- `StaffBudgetManager.ts` -- staff salary management

---

## Priority 4 (Lower) -- UI and Screens

All 54 screen files and most component files have 0% coverage. Only 2 screen tests and 1 component test exist. While UI testing is less critical than core logic testing, key screens warrant tests:

**High-value screen tests:**
- `GMDashboardScreen.tsx` (1,194 lines) -- central navigation hub
- `DraftRoomScreen.tsx` (738 lines) -- complex interactive draft UI
- `GameDayScreen.tsx` (1,253 lines) -- already has a test file, could be expanded
- `FreeAgencyScreen.tsx` (475 lines) -- interactive free agent signing

**Recommended approach:** Focus on testing state-dependent rendering and user interaction flows rather than pixel-perfect layout.

---

## Recommendations Summary

### Immediate Actions (biggest risk reduction)
1. **Add offseason phase tests** -- 6,500 lines of GameState-mutating code with zero coverage
2. **Add trade system tests** -- AI trade logic directly impacts simulation integrity
3. **Test WeekFlowState** -- state machine that guards the primary user loop
4. **Test DraftOrderCalculator** -- currently 6% coverage, affects future seasons

### Short-term (fill critical gaps)
5. Expand free agency test coverage from 1 file to per-module tests
6. Add engine tests for `InjuryProcessor`, `FatigueSystem`, `PlayCaller`
7. Test `NewGameService` to validate initial game state generation
8. Test `SeasonManager` season lifecycle transitions

### Medium-term (deepen coverage)
9. Add `HalftimeAdjustments` and `SeasonStatsAggregator` tests
10. Test roster management: `StartSitManager`, `WaiverWireManager`
11. Test gameflow orchestrators: `GameFlowManager`, `GameDayFlow`
12. Add coaching subsystem gap tests

### Structural Improvements
- **Function coverage is weakest at 29.37%** -- many exported functions lack any test calls. A sweep identifying untested public functions would be valuable.
- **Branch coverage at 37.64%** -- conditional paths in AI decision-making (trade, free agency, draft strategy) need more scenario-based tests.
- **Consider adding coverage thresholds** to `jest.config.js` to prevent regressions (e.g., `coverageThreshold: { global: { lines: 45 } }` as a starting baseline, incrementing as coverage improves).

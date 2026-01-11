# PR-08: Season Loop & Standings Implementation Plan

## Overview

This PR implements the complete season simulation system including schedule generation, standings calculation, playoff seeding, and week-by-week simulation flow.

## Dependencies

- PR-01 through PR-06: Foundation, generation, engine ✅
- PR-07: Single Game Resolution ✅

## Files to Create

```
src/core/season/
├── index.ts                    # Barrel export
├── ByeWeekManager.ts          # Bye week assignment
├── ScheduleGenerator.ts        # Season schedule generation (2025 NFL template)
├── StandingsCalculator.ts      # Standings with tiebreakers
├── WeekSimulator.ts            # Weekly game simulation
├── PlayoffGenerator.ts         # Playoff bracket management
├── DraftOrderCalculator.ts     # Draft order calculation
├── SeasonManager.ts            # Season orchestration
└── __tests__/
    ├── scheduleGenerator.test.ts
    ├── standingsCalculator.test.ts
    ├── weekSimulator.test.ts
    ├── playoffGenerator.test.ts
    └── seasonManager.test.ts
```

## Implementation Details

### 1. ByeWeekManager.ts

Assigns bye weeks to all 32 teams:
- Byes occur weeks 5-14 (10 week window)
- Each team gets exactly 1 bye
- Division rivals don't share the same bye week
- Uses deterministic assignment based on 2025 NFL template

### 2. ScheduleGenerator.ts

Generates the 17-week regular season schedule using 2025 NFL schedule as template:
- 6 divisional games (home/away vs 3 division rivals)
- 4 games vs another division in same conference (rotates yearly)
- 4 games vs a division from other conference (rotates yearly)
- 2 games vs same-place finishers from other divisions in conference
- 1 game vs same-place finisher from other conference

Key interfaces:
- `ScheduledGame`: Individual game with teams, week, and results
- `SeasonSchedule`: Full season with regular and playoff schedules

### 3. StandingsCalculator.ts

Calculates standings with full NFL tiebreaker procedures:
1. Head-to-head record
2. Division record
3. Common games record
4. Conference record
5. Strength of victory
6. Strength of schedule
7. Points differential (conference)
8. Points differential (all games)
9. Net touchdowns (all games)
10. Coin toss

Key interfaces:
- `TeamStanding`: Complete standing with tiebreaker components
- `DivisionStandings`: Standings organized by conference/division

### 4. WeekSimulator.ts

Simulates all games in a week:
- Uses GameRunner for each game
- Updates standings after week completion
- Generates playoff implications
- Tracks injuries and news headlines
- Handles bye weeks

Key interfaces:
- `WeekResults`: Results of all games plus standings
- `PlayoffImplication`: Clinch/elimination notifications
- `InjuryReportEntry`: Player injury status
- `NewsHeadline`: Notable events

### 5. PlayoffGenerator.ts

Manages the playoff bracket:
- 7 teams per conference (4 division winners + 3 wild cards)
- #1 seed gets bye in wild card round
- Bracket reseeding after each round
- Home field to higher seed

Key interfaces:
- `PlayoffSchedule`: Complete bracket structure
- `PlayoffMatchup`: Individual playoff game

### 6. DraftOrderCalculator.ts

Calculates draft order based on final standings:
- Picks 1-18: Non-playoff teams (worst to best)
- Picks 19-32: Playoff teams based on elimination round
- Super Bowl winner picks 32nd
- Applies reverse tiebreakers (worse record wins)

### 7. SeasonManager.ts

Orchestrates the complete season flow:
- Manages season phases (preseason → week 1-18 → playoffs → offseason)
- Coordinates schedule, simulation, and standings
- Handles user team game separation
- Generates season summary at end

## 2025 NFL Schedule Template

Using the 2025 NFL schedule as a template for matchup patterns:
- Division rotation matchups are fixed
- Intra-conference matchups based on previous year standings
- Bye week distribution follows NFL pattern

### Division Matchup Rotation

AFC divisions play vs:
- AFC intra-conference division (rotates yearly)
- NFC inter-conference division (rotates yearly)

NFC divisions play vs:
- NFC intra-conference division (rotates yearly)
- AFC inter-conference division (rotates yearly)

## Testing Strategy

### scheduleGenerator.test.ts
- Validates 17 games per team
- Validates 6 divisional games per team
- Validates bye week assignment
- Validates home/away balance

### standingsCalculator.test.ts
- Tests basic standings calculation
- Tests tiebreaker scenarios
- Tests playoff team determination
- Tests division winner selection

### weekSimulator.test.ts
- Tests week simulation completion
- Tests standings update after week
- Tests playoff implication detection
- Tests injury tracking

### playoffGenerator.test.ts
- Tests bracket generation
- Tests correct seeding
- Tests bracket advancement
- Tests Super Bowl setup

### seasonManager.test.ts
- Tests full season simulation
- Tests phase transitions
- Tests playoff integration
- Tests season completion

## Brand Guidelines Compliance

- ✅ Standings are public information (visible to user)
- ✅ Playoff implications visible
- ✅ Draft order visible after season
- ✅ No engine internals exposed in season flow
- ✅ Game results show outcomes, not mechanics

## Checkpoints

1. All files created ✅
2. TypeScript compiles without errors ✅
3. All tests pass ✅
4. Schedule generates 17 games per team ✅
5. Standings calculate correctly ✅
6. Full season can complete ✅
7. Draft order calculates correctly ✅

# Implementation Plan: Wiring Unused Systems

This document outlines a phased approach to integrate two fully-built but disconnected systems:
1. **Phase 1: League Statistics Integration** (Quick Win)
2. **Phase 2: Coach Development System** (High Impact)

Each step includes a **GATE** - a verification checkpoint that must pass before proceeding.

---

## Phase 1: League Statistics Integration

**Goal:** Wire the existing `SeasonStatsAggregator` functions to `StatsScreen.tsx`

**Current State:**
- `src/core/game/SeasonStatsAggregator.ts` has 6 fully implemented leader functions
- `StatsScreen.tsx` manually calculates stats instead of using these functions
- TODO at line 304: *"Pull actual yardage stats from gameState.seasonStats when implemented"*

### Step 1.1: Verify SeasonStats Population

**Task:** Confirm that `gameState.seasonStats` is being populated during game simulation.

**Files to check:**
- `src/core/game/GameRunner.ts` - Should call `updateSeasonStatsFromGame()`
- `src/core/models/game/GameState.ts` - Should have `seasonStats: Record<string, PlayerSeasonStats>`

**Implementation:**
```typescript
// In GameRunner.ts or PostGameProcessor.ts, after each game:
import { updateSeasonStatsFromGame } from './SeasonStatsAggregator';

const updatedSeasonStats = updateSeasonStatsFromGame(
  gameState.seasonStats ?? {},
  gameResult
);
// Update gameState with new seasonStats
```

**GATE 1.1:**
```bash
# Write a test that:
# 1. Simulates a game
# 2. Verifies gameState.seasonStats[playerId] has updated values
npm test -- --testPathPattern="SeasonStatsAggregator" --testNamePattern="updates season stats"
```
- [ ] Test passes showing seasonStats populates after game simulation

---

### Step 1.2: Import Leader Functions into StatsScreen

**Task:** Replace manual stat calculations with `SeasonStatsAggregator` functions.

**File:** `src/screens/StatsScreen.tsx`

**Changes:**
```typescript
// Add imports
import {
  getLeagueLeaders,
  getPasserRatingLeaders,
  getYardsPerCarryLeaders,
  getYardsPerReceptionLeaders,
  getFantasyLeaders,
  PlayerSeasonStats,
} from '@core/game/SeasonStatsAggregator';
```

**GATE 1.2:**
```bash
# Verify imports compile without errors
npm run typecheck
```
- [ ] TypeCheck passes with new imports

---

### Step 1.3: Refactor Leader Calculation Logic

**Task:** Replace the manual `leaders` useMemo calculation with the aggregator functions.

**Current code (lines ~523-540):**
```typescript
const leaders = useMemo(() => {
  const playerStats = filteredPlayers.map((player) => ({
    player,
    stats: getPlayerSeasonStats(gameState, player.id),
  }));
  // ... manual sorting ...
}, [filteredPlayers, selectedStatCategory, gameState]);
```

**New code:**
```typescript
const leaders = useMemo(() => {
  // Get all player season stats from gameState
  const allPlayerStats = Object.values(gameState.seasonStats ?? {});

  // Use appropriate leader function based on category
  let leaderIds: { playerId: string; value: number }[];

  switch (selectedStatCategory.key) {
    case 'passing':
      leaderIds = getLeagueLeaders(allPlayerStats, 'passing', 50);
      break;
    case 'rushing':
      leaderIds = getLeagueLeaders(allPlayerStats, 'rushing', 50);
      break;
    case 'receiving':
      leaderIds = getLeagueLeaders(allPlayerStats, 'receiving', 50);
      break;
    case 'sacks':
      leaderIds = getLeagueLeaders(allPlayerStats, 'sacks', 50);
      break;
    case 'interceptions':
      leaderIds = getLeagueLeaders(allPlayerStats, 'interceptions', 50);
      break;
    default:
      leaderIds = [];
  }

  // Map to player objects with stats
  return leaderIds
    .map(({ playerId }) => {
      const player = gameState.players[playerId];
      if (!player) return null;
      return {
        player,
        stats: gameState.seasonStats?.[playerId] ?? createEmptyPlayerSeasonStats(playerId),
      };
    })
    .filter(Boolean);
}, [gameState, selectedStatCategory]);
```

**GATE 1.3:**
```bash
# Run StatsScreen-related tests
npm test -- --testPathPattern="StatsScreen"
```
- [ ] Tests pass with refactored leader logic

---

### Step 1.4: Add Efficiency Leader Tabs

**Task:** Add new stat categories for efficiency metrics using the specialized functions.

**Add to stat categories:**
```typescript
{ key: 'passerRating', label: 'Passer Rating', ... },
{ key: 'yardsPerCarry', label: 'Yards/Carry', ... },
{ key: 'yardsPerReception', label: 'Yards/Rec', ... },
```

**Use corresponding functions:**
- `getPasserRatingLeaders()` for QB efficiency
- `getYardsPerCarryLeaders()` for RB efficiency
- `getYardsPerReceptionLeaders()` for WR/TE efficiency

**GATE 1.4:**
```bash
# Manual verification
npm run web
# Navigate to Stats screen
# Verify all stat categories display correctly
# Verify leaders are sorted correctly
```
- [ ] All stat category tabs work and display correct leaders

---

### Step 1.5: Remove TODO Comment

**Task:** Delete the outdated TODO since the feature is now implemented.

**File:** `src/screens/StatsScreen.tsx:304`

**Remove:**
```typescript
// TODO: Pull actual yardage stats from gameState.seasonStats when implemented
```

**GATE 1.5:**
```bash
# Verify no remaining TODOs for this feature
grep -r "seasonStats when implemented" src/
# Should return no results
```
- [ ] TODO comment removed

---

### Phase 1 Complete Checklist

- [ ] Gate 1.1: Season stats populate after games
- [ ] Gate 1.2: TypeCheck passes with imports
- [ ] Gate 1.3: Tests pass with refactored logic
- [ ] Gate 1.4: UI displays all stat categories correctly
- [ ] Gate 1.5: TODO removed

---

## Phase 2: Coach Development System Integration

**Goal:** Wire `CoachEvaluationSystem` to affect player skill progression during offseason.

**Current State:**
- `src/core/coaching/CoachEvaluationSystem.ts` has 11 functions for:
  - Calculating development impact
  - Game-day modifiers
  - Scheme teaching effectiveness
  - Player-coach chemistry
- None of these are called from the game engine

### Step 2.1: Create Player Progression Function

**Task:** Create a new function that applies coach-influenced development to players.

**New file:** `src/core/career/PlayerProgression.ts`

```typescript
import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';
import { Team } from '../models/team/Team';
import {
  calculateDevelopmentImpact,
  calculatePlayerCoachChemistry,
  getMotivationModifier,
  coachAffectsPlayer,
} from '../coaching/CoachEvaluationSystem';
import { FitLevel } from '../models/player/SchemeFit';

export interface ProgressionResult {
  playerId: string;
  skillChanges: Record<string, number>;
  totalChange: number;
  coachInfluence: string;
}

/**
 * Applies offseason progression to a player based on coach quality
 */
export function applyOffseasonProgression(
  player: Player,
  coach: Coach,
  schemeFitLevel: FitLevel,
  yearsTogether: number
): ProgressionResult {
  // Calculate chemistry
  const chemistry = calculatePlayerCoachChemistry(
    coach,
    player,
    schemeFitLevel,
    yearsTogether,
    false // recentSuccess - could be passed in
  );

  // Calculate development impact
  const impact = calculateDevelopmentImpact(
    coach,
    player,
    chemistry.chemistry,
    schemeFitLevel
  );

  // Apply motivation modifier
  const motivationMod = getMotivationModifier(coach);
  const adjustedImpact = Math.round(impact.totalImpact * motivationMod);

  // Generate skill changes based on impact areas
  const skillChanges: Record<string, number> = {};
  for (const skill of impact.impactAreas) {
    // Distribute impact across affected skills
    const changePerSkill = Math.round(adjustedImpact / impact.impactAreas.length);
    skillChanges[skill] = changePerSkill;
  }

  return {
    playerId: player.id,
    skillChanges,
    totalChange: adjustedImpact,
    coachInfluence: adjustedImpact >= 5 ? 'significant' :
                    adjustedImpact >= 2 ? 'moderate' :
                    adjustedImpact >= 0 ? 'minimal' : 'negative',
  };
}
```

**GATE 2.1:**
```bash
# Create unit test for PlayerProgression
npm test -- --testPathPattern="PlayerProgression"
```
- [ ] Unit tests pass for `applyOffseasonProgression()`

---

### Step 2.2: Apply Skills to Player Model

**Task:** Create function to mutate player skills based on progression result.

**Add to `PlayerProgression.ts`:**

```typescript
/**
 * Applies skill changes to a player (immutably)
 */
export function applySkillChanges(
  player: Player,
  result: ProgressionResult
): Player {
  // Clone skills
  const newSkills = { ...player.skills };

  for (const [skill, change] of Object.entries(result.skillChanges)) {
    if (skill in newSkills) {
      const currentValue = (newSkills as any)[skill];
      if (typeof currentValue === 'number') {
        // Clamp between 1 and 99
        (newSkills as any)[skill] = Math.max(1, Math.min(99, currentValue + change));
      }
    }
  }

  return {
    ...player,
    skills: newSkills,
  };
}
```

**GATE 2.2:**
```bash
npm test -- --testPathPattern="PlayerProgression" --testNamePattern="applies skill changes"
```
- [ ] Skill changes correctly applied and clamped

---

### Step 2.3: Integrate with Offseason Phase

**Task:** Call progression during the OTAs or Training Camp phase.

**File:** `src/core/offseason/phases/OTAsPhase.ts` or `TrainingCampPhase.ts`

**Add progression processing:**

```typescript
import { applyOffseasonProgression, applySkillChanges } from '../../career/PlayerProgression';

// In the phase processing function:
function processPlayerDevelopment(
  gameState: GameState,
  teamId: string
): { updatedPlayers: Record<string, Player>; progressionNews: string[] } {
  const team = gameState.teams[teamId];
  const coach = gameState.coaches[team.headCoachId];
  const progressionNews: string[] = [];
  const updatedPlayers: Record<string, Player> = {};

  // Get roster players
  const rosterPlayerIds = [...team.roster.active, ...team.roster.practiceSquad];

  for (const playerId of rosterPlayerIds) {
    const player = gameState.players[playerId];
    if (!player) continue;

    // Get scheme fit (simplified - could be more sophisticated)
    const schemeFit = player.schemeFits[coach.scheme] ?? 'neutral';

    // Calculate years together (simplified)
    const yearsTogether = 1; // Could track this in gameState

    const result = applyOffseasonProgression(player, coach, schemeFit, yearsTogether);

    if (result.totalChange !== 0) {
      updatedPlayers[playerId] = applySkillChanges(player, result);

      if (result.totalChange >= 3) {
        progressionNews.push(
          `${player.firstName} ${player.lastName} showed significant development this offseason.`
        );
      }
    }
  }

  return { updatedPlayers, progressionNews };
}
```

**GATE 2.3:**
```bash
npm test -- --testPathPattern="OTAsPhase|TrainingCamp" --testNamePattern="development"
```
- [ ] Integration tests pass showing player skills change during offseason

---

### Step 2.4: Wire Game-Day Coach Modifier

**Task:** Apply `getGameDayCoachModifier()` during game simulation.

**File:** `src/core/engine/EffectiveRatingCalculator.ts` or `PlayResolver.ts`

**Add coach modifier to play resolution:**

```typescript
import { getGameDayCoachModifier } from '../coaching/CoachEvaluationSystem';

// When calculating effective rating:
function calculateEffectiveRating(
  player: Player,
  coach: Coach,
  // ... other params
): number {
  let rating = baseRating;

  // Apply coach game-day modifier
  const coachMod = getGameDayCoachModifier(coach);
  rating *= (1 + coachMod); // +10% to -5% based on coach quality

  return rating;
}
```

**GATE 2.4:**
```bash
npm test -- --testPathPattern="EffectiveRating|PlayResolver" --testNamePattern="coach"
```
- [ ] Coach modifier affects game simulation outcomes

---

### Step 2.5: Add Development to Player Profile UI

**Task:** Display coach influence on player card/profile.

**File:** `src/components/player/PlayerCard.tsx` or similar

**Add display:**

```typescript
import { calculateDevelopmentImpact, createDevelopmentImpactViewModel } from '@core/coaching/CoachEvaluationSystem';

// In player detail view:
const developmentView = createDevelopmentImpactViewModel(
  impact,
  `${player.firstName} ${player.lastName}`,
  coach.firstName + ' ' + coach.lastName
);

// Display:
<View>
  <Text>Development Outlook: {developmentView.impactDescription}</Text>
  <Text>Coach Relationship: {developmentView.relationship}</Text>
</View>
```

**GATE 2.5:**
```bash
# Manual verification
npm run web
# View a player's profile
# Verify development outlook displays correctly
```
- [ ] UI shows coach influence on player development

---

### Step 2.6: Generate Offseason News for Development

**Task:** Create news items for notable player development.

**Add to news generation:**

```typescript
// In offseason news generation:
if (progressionResult.totalChange >= 5) {
  generateNews({
    type: 'development_boost',
    headline: `${player.lastName} Makes Leap`,
    body: `${player.firstName} ${player.lastName} has shown remarkable improvement under ${coach.lastName}'s coaching.`,
  });
}
```

**GATE 2.6:**
```bash
npm test -- --testPathPattern="NewsGenerator" --testNamePattern="development"
```
- [ ] Development news generated for significant improvements

---

### Phase 2 Complete Checklist

- [ ] Gate 2.1: PlayerProgression function works
- [ ] Gate 2.2: Skill changes apply correctly
- [ ] Gate 2.3: Offseason phase integrates progression
- [ ] Gate 2.4: Game-day modifier affects simulation
- [ ] Gate 2.5: UI displays development outlook
- [ ] Gate 2.6: News generates for development

---

## Summary

| Phase | System | Steps | Impact |
|-------|--------|-------|--------|
| 1 | League Statistics | 5 steps | Medium - Better stats display |
| 2 | Coach Development | 6 steps | High - Coaches affect gameplay |

**Recommended Order:** Complete Phase 1 first (simpler, quick win), then Phase 2 (more complex, higher impact).

**Total Estimated Work:**
- Phase 1: ~2-3 hours
- Phase 2: ~4-6 hours

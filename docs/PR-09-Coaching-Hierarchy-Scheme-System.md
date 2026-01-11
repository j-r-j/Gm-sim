# PR-09: Coaching Hierarchy & Scheme System

## Objective

Implement the coaching hierarchy structure, scheme definitions, and the relationship between coaches and team performance. Coaches drive the simulation - players never call plays.

## Dependencies

- **Phase 1 & 2 Complete** ✅

## Branch Name

`feature/pr-09-coaching-hierarchy`

-----

## AI Developer Prompt

```
You are building an NFL GM Simulation React Native mobile game. This is PR-09 of 25.

### CONTEXT
Coaches are critical - they drive play calling through their tendencies and schemes. The 14-position coaching staff hierarchy needs full implementation with schemes that affect player performance.

### YOUR TASK
Implement the coaching hierarchy system and scheme mechanics.

### REQUIREMENTS

1. **Scheme Definitions** (`src/core/coaching/SchemeDefinitions.ts`)
   - Define all offensive schemes (West Coast, Air Raid, Spread Option, Power Run, Zone Run, Play Action)
   - Define all defensive schemes (4-3 Under, 3-4, Cover 3, Cover 2, Man Press, Blitz Heavy)
   - Include scheme requirements (what player attributes each scheme needs)
   - Include scheme tendencies (base play call distributions)

2. **Coaching Staff Manager** (`src/core/coaching/CoachingStaffManager.ts`)
   - Manage 14 coaching positions
   - Handle vacancies and interim assignments
   - Calculate staff chemistry
   - Track coaching tree relationships

3. **Scheme Fit Calculator** (`src/core/coaching/SchemeFitCalculator.ts`)
   - Calculate how well each player fits a scheme
   - Return fit levels (perfect, good, neutral, poor, terrible)
   - Handle scheme change penalties (Year 1: -5 to -10, Year 2: -2 to -5, Year 3+: full)

4. **Coach Evaluation System** (`src/core/coaching/CoachEvaluationSystem.ts`)
   - Calculate coach impact on player development
   - Calculate coach chemistry with players
   - Determine scheme teaching effectiveness

5. **Staff Budget Manager** (`src/core/coaching/StaffBudgetManager.ts`)
   - Track spending against budget tiers
   - Calculate dead money for coach firings
   - Handle contract negotiations

### BRAND GUIDELINES
- [ ] Coach attributes (development, gameDayIQ) remain hidden
- [ ] Only show qualitative descriptions of coach quality
- [ ] Scheme fit descriptions visible, not numbers

### TESTS TO WRITE
- schemeDefinitions.test.ts
- coachingStaffManager.test.ts
- schemeFitCalculator.test.ts
- coachEvaluationSystem.test.ts

### BOOLEAN CHECKPOINTS
1. All 14 coaching positions can be filled
2. Scheme fit calculates correctly
3. Staff budget tracking works
4. Coach chemistry affects player performance
5. No hidden attributes exposed
```

-----

## Implementation Details

### File Structure

```
src/core/coaching/
├── SchemeDefinitions.ts         # Scheme types and configurations
├── SchemeFitCalculator.ts       # Player-scheme fit calculations
├── CoachingStaffManager.ts      # Staff management and chemistry
├── CoachEvaluationSystem.ts     # Coach impact on players
├── StaffBudgetManager.ts        # Budget and contract management
├── index.ts                     # Module exports
└── __tests__/
    ├── schemeDefinitions.test.ts
    ├── schemeFitCalculator.test.ts
    ├── coachingStaffManager.test.ts
    └── coachEvaluationSystem.test.ts
```

### Offensive Schemes

| Scheme | Key Requirements | Base Tendencies |
|--------|------------------|-----------------|
| West Coast | QB accuracy, WR route running | 55% pass, short-medium routes |
| Air Raid | QB arm strength, WR speed | 65% pass, spread formations |
| Spread Option | QB mobility, RB versatility | 50% pass, read options |
| Power Run | OL strength, RB power | 60% run, gap scheme |
| Zone Run | OL technique, RB vision | 55% run, outside zone |
| Play Action | QB play-fake, deep WRs | 50% pass, deep shots |

### Defensive Schemes

| Scheme | Key Requirements | Base Tendencies |
|--------|------------------|-----------------|
| 4-3 Under | Athletic LBs, pass rush DEs | Base coverage, balanced rush |
| 3-4 | Versatile OLBs, run-stuffing NT | OLB pressure packages |
| Cover 3 | Range safety, zone CBs | 3-deep zone, contain |
| Cover 2 | Physical corners, active safeties | 2-deep shells, flat coverage |
| Man Press | Elite CBs, closing speed | Press at LOS, man coverage |
| Blitz Heavy | Athletic LBs, aggressive DBs | 40%+ blitz, high risk/reward |

### Scheme Fit Levels

| Level | Rating Range | Performance Modifier |
|-------|--------------|---------------------|
| Perfect | 90-100 | +5 to +10% |
| Good | 75-89 | +2 to +5% |
| Neutral | 50-74 | No modifier |
| Poor | 25-49 | -2 to -5% |
| Terrible | 0-24 | -5 to -10% |

### Scheme Change Penalties

| Year in Scheme | Penalty |
|----------------|---------|
| Year 1 | -5 to -10 rating points |
| Year 2 | -2 to -5 rating points |
| Year 3+ | Full scheme fit applied |

### Staff Chemistry Calculation

Chemistry is calculated based on:
1. Coaching tree compatibility
2. Personality type synergy/conflict
3. Time together on staff
4. Previous working relationships

### Budget Tiers

| Tier | Budget Range | Description |
|------|-------------|-------------|
| Elite | $30M+ | Top-tier staff |
| Above Average | $22-30M | Competitive staff |
| Average | $15-22M | League average |
| Below Average | $10-15M | Budget constraints |
| Minimal | <$10M | Rebuilding mode |

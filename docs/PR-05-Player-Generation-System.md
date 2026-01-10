# PR-05: Player Generation System

## Objective

Implement the procedural player generation system that creates players with physical attributes, skills (as ranges), hidden traits, "It" factor, and scheme fits. This system must maintain the hidden mechanics philosophy - generating true values while only exposing perceived ranges.

## Dependencies

- **PR-01**: Project Scaffolding ✅
- **PR-02**: Player Data Models ✅
- **PR-03**: Staff Data Models ✅
- **PR-04**: Team/League/Owner Models ✅

## Branch Name

`feature/pr-05-player-generation`

-----

## AI Developer Prompt

```
You are building an NFL GM Simulation React Native mobile game. This is PR-05 of 25.

### PLATFORM
React Native CLI - iOS and Android
TypeScript strict mode

### CONTEXT
Players must be generated procedurally with realistic distributions. The key challenge: generate TRUE values that the engine uses, but only expose PERCEIVED RANGES to the user. The gap between true and perceived is where evaluation gameplay lives.

### DEPENDENCIES
All Phase 1 PRs (01-04) must be complete. Verify Player model exists with:
- Physical attributes
- Technical skills with trueValue and perceivedMin/Max
- Hidden traits
- "It" factor
- Consistency profile
- Scheme fits

### YOUR TASK
Create the complete player generation system.

### REQUIREMENTS

1. **Name Generation** (`src/core/generators/player/NameGenerator.ts`)
   ```typescript
   // Lists of first/last names for procedural generation
   export interface NameGenerator {
     generateFirstName(): string;
     generateLastName(): string;
     generateFullName(): { firstName: string; lastName: string };
   }

   // Include diverse name pools
   // At least 200 first names, 300 last names
```

1. **Physical Attribute Generation** (`src/core/generators/player/PhysicalGenerator.ts`)

   ```typescript
   import { Position } from '../../models/player/Position';
   import { PhysicalAttributes } from '../../models/player/PhysicalAttributes';

   // Position-specific distributions
   export interface PositionPhysicalProfile {
     height: { mean: number; stdDev: number; min: number; max: number };
     weight: { mean: number; stdDev: number; min: number; max: number };
     armLength: { mean: number; stdDev: number; min: number; max: number };
     handSize: { mean: number; stdDev: number; min: number; max: number };
     speed: { mean: number; stdDev: number; min: number; max: number };  // 40 time
     acceleration: { mean: number; stdDev: number; min: number; max: number };
     agility: { mean: number; stdDev: number; min: number; max: number };
     strength: { mean: number; stdDev: number; min: number; max: number };
     verticalJump: { mean: number; stdDev: number; min: number; max: number };
   }

   export const POSITION_PHYSICAL_PROFILES: Record<Position, PositionPhysicalProfile>;

   export function generatePhysicalAttributes(position: Position): PhysicalAttributes;
   ```
1. **Skill Generation** (`src/core/generators/player/SkillGenerator.ts`)

   ```typescript
   import { Position } from '../../models/player/Position';
   import { TechnicalSkills, SkillValue } from '../../models/player/TechnicalSkills';

   // Position-specific skill sets
   export interface PositionSkillSet {
     requiredSkills: string[];      // Skills this position needs
     skillDistributions: Record<string, {
       mean: number;
       stdDev: number;
       correlatedWith?: string[];   // Skills that tend to be similar
     }>;
   }

   export const POSITION_SKILL_SETS: Record<Position, PositionSkillSet>;

   // CRITICAL: Generate true value, then create perceived range around it
   export function generateSkillValue(
     skillName: string,
     distribution: { mean: number; stdDev: number },
     playerAge: number,
     maturityAge: number,
   ): SkillValue {
     // 1. Generate true value from distribution
     const trueValue = generateFromNormalDistribution(distribution);

     // 2. Calculate perceived range based on age vs maturity
     // Younger players = wider range
     // At maturity, range collapses to true value
     const yearsUntilMaturity = Math.max(0, maturityAge - playerAge);
     const rangeWidth = calculateRangeWidth(yearsUntilMaturity);

     // 3. Perceived range should CONTAIN the true value (with some error)
     const { perceivedMin, perceivedMax } = createPerceivedRange(trueValue, rangeWidth);

     return {
       trueValue,      // NEVER exposed to UI
       perceivedMin,   // Shown to user
       perceivedMax,   // Shown to user
       maturityAge,
     };
   }

   export function generateSkillsForPosition(
     position: Position,
     playerAge: number,
   ): TechnicalSkills;
   ```
1. **Hidden Traits Generation** (`src/core/generators/player/TraitGenerator.ts`)

   ```typescript
   import { HiddenTraits, PositiveTrait, NegativeTrait } from '../../models/player/HiddenTraits';

   // Trait probabilities
   export const TRAIT_PROBABILITIES: {
     positive: Record<PositiveTrait, number>;  // Base probability
     negative: Record<NegativeTrait, number>;
   };

   // Trait correlations (having one affects probability of another)
   export const TRAIT_CORRELATIONS: {
     [trait: string]: { trait: string; modifier: number }[];
   };

   // Position tendencies (some positions more likely to have certain traits)
   export const POSITION_TRAIT_MODIFIERS: Record<Position, {
     positive: Partial<Record<PositiveTrait, number>>;
     negative: Partial<Record<NegativeTrait, number>>;
   }>;

   export function generateHiddenTraits(position: Position): HiddenTraits {
     // Generate 0-3 positive traits
     // Generate 0-2 negative traits
     // Apply position modifiers
     // Apply correlation effects
     // Return with revealedToUser as empty array
   }
   ```
1. **"It" Factor Generation** (`src/core/generators/player/ItFactorGenerator.ts`)

   ```typescript
   import { ItFactor } from '../../models/player/ItFactor';

   // "It" is rare - most players are average
   // Distribution is NOT normal - it's skewed toward middle
   export const IT_FACTOR_DISTRIBUTION = {
     // Range: probability weight
     '90-100': 0.02,   // 2% transcendent
     '75-89': 0.08,    // 8% winners
     '60-74': 0.20,    // 20% solid
     '40-59': 0.40,    // 40% average
     '20-39': 0.20,    // 20% soft
     '1-19': 0.10,     // 10% liability
   };

   // Draft position slightly correlates with "It" (not causation, selection)
   export function generateItFactor(
     projectedDraftPosition?: number
   ): ItFactor;
   ```
1. **Consistency Generation** (`src/core/generators/player/ConsistencyGenerator.ts`)

   ```typescript
   import { ConsistencyProfile, ConsistencyTier } from '../../models/player/Consistency';
   import { Position } from '../../models/player/Position';

   // Position tendencies for consistency
   export const POSITION_CONSISTENCY_WEIGHTS: Record<Position, {
     [tier in ConsistencyTier]: number;
   }>;

   export function generateConsistencyProfile(
     position: Position,
     itFactor: number,  // High "It" players tend to be more consistent
   ): ConsistencyProfile;
   ```
1. **Scheme Fit Generation** (`src/core/generators/player/SchemeFitGenerator.ts`)

   ```typescript
   import { SchemeFits, OffensiveScheme, DefensiveScheme, FitLevel } from '../../models/player/SchemeFit';
   import { PhysicalAttributes } from '../../models/player/PhysicalAttributes';
   import { TechnicalSkills } from '../../models/player/TechnicalSkills';

   // Physical/skill profiles that fit each scheme
   export const SCHEME_IDEAL_PROFILES: {
     offensive: Record<OffensiveScheme, {
       physicalPreferences: Partial<PhysicalAttributes>;
       skillPreferences: Record<string, number>;  // Skill name -> importance weight
     }>;
     defensive: Record<DefensiveScheme, {
       physicalPreferences: Partial<PhysicalAttributes>;
       skillPreferences: Record<string, number>;
     }>;
   };

   // Generate fits based on player's actual attributes
   export function generateSchemeFits(
     position: Position,
     physical: PhysicalAttributes,
     skills: TechnicalSkills,
   ): SchemeFits;
   ```
1. **Role Fit Generation** (`src/core/generators/player/RoleFitGenerator.ts`)

   ```typescript
   import { RoleFit, RoleType } from '../../models/player/RoleFit';
   import { TechnicalSkills } from '../../models/player/TechnicalSkills';

   // Role ceiling based on skill ceiling potential
   export function generateRoleFit(
     skills: TechnicalSkills,
     itFactor: number,
     consistency: ConsistencyTier,
   ): RoleFit;
   ```
1. **Complete Player Generator** (`src/core/generators/player/PlayerGenerator.ts`)

   ```typescript
   import { Player } from '../../models/player/Player';
   import { Position } from '../../models/player/Position';

   export interface PlayerGenerationOptions {
     position?: Position;           // Specify or random
     ageRange?: { min: number; max: number };
     skillTier?: 'elite' | 'starter' | 'backup' | 'fringe' | 'random';
     forDraft?: boolean;            // Is this a prospect?
     collegeId?: string;
   }

   export function generatePlayer(options: PlayerGenerationOptions): Player;

   // Generate a full roster for a team
   export function generateRoster(teamId: string): Player[];

   // Generate league-wide players (32 teams)
   export function generateLeaguePlayers(): Player[];
   ```
1. **Maturity Age Constants** (`src/core/generators/player/MaturityConstants.ts`)

   ```typescript
   import { Position } from '../../models/player/Position';

   export const POSITION_MATURITY: Record<Position, {
     maturityAge: { min: number; max: number };
     peakStart: number;
     peakEnd: number;
     declineStart: number;
   }> = {
     QB: { maturityAge: { min: 27, max: 28 }, peakStart: 28, peakEnd: 34, declineStart: 35 },
     RB: { maturityAge: { min: 24, max: 25 }, peakStart: 25, peakEnd: 27, declineStart: 28 },
     WR: { maturityAge: { min: 26, max: 27 }, peakStart: 27, peakEnd: 30, declineStart: 31 },
     TE: { maturityAge: { min: 26, max: 27 }, peakStart: 27, peakEnd: 31, declineStart: 32 },
     LT: { maturityAge: { min: 25, max: 26 }, peakStart: 26, peakEnd: 32, declineStart: 33 },
     // ... all positions
   };
   ```
1. **Utility Functions** (`src/core/generators/utils/RandomUtils.ts`)

   ```typescript
   // Normal distribution generator (Box-Muller transform)
   export function normalRandom(mean: number, stdDev: number): number;

   // Clamped normal (within min/max)
   export function clampedNormal(
     mean: number,
     stdDev: number,
     min: number,
     max: number
   ): number;

   // Weighted random selection
   export function weightedRandom<T>(
     options: { value: T; weight: number }[]
   ): T;

   // Seeded random for reproducibility
   export function createSeededRandom(seed: number): () => number;
   ```

### CRITICAL IMPLEMENTATION NOTES

1. **Perceived Range Calculation:**

   ```typescript
   function createPerceivedRange(trueValue: number, rangeWidth: number) {
     // Range should usually contain true value, but scouts can be wrong
     const scoutError = normalRandom(0, rangeWidth * 0.1);
     const centerPoint = trueValue + scoutError;

     return {
       perceivedMin: Math.max(1, Math.round(centerPoint - rangeWidth / 2)),
       perceivedMax: Math.min(100, Math.round(centerPoint + rangeWidth / 2)),
     };
   }
   ```
1. **Range Width by Age:**

   ```typescript
   function calculateRangeWidth(yearsUntilMaturity: number): number {
     // At maturity (0 years): range = 0 (shows true value)
     // At rookie (4-5 years): range = 12-16
     // Linear interpolation
     return Math.min(16, yearsUntilMaturity * 3);
   }
   ```
1. **Skill Correlations:**
   Some skills should correlate (a player with great route running likely has good catching). Implement correlation in skill generation.

### BRAND GUIDELINES COMPLIANCE

Before completing, verify:

- [ ] `trueValue` is generated but NEVER exposed in any return type
- [ ] All skill values returned as ranges (min/max pairs)
- [ ] "It" factor value is generated but NEVER included in any serialization
- [ ] Hidden traits array starts with `revealedToUser: []`
- [ ] No overall/aggregate rating is ever calculated
- [ ] Physical attributes ARE visible (measurables are public at combine)

### TESTS TO WRITE

1. **nameGenerator.test.ts**
- Test generates valid names
- Test no duplicate names in batch
- Test diversity of names
1. **physicalGenerator.test.ts**
- Test position-appropriate distributions
- Test QB hand size distribution (important for game)
- Test all values within valid ranges
1. **skillGenerator.test.ts**
- Test skills generated for each position
- Test perceived range contains true value (most of the time)
- Test range width decreases with age
- Test trueValue is not exposed
1. **traitGenerator.test.ts**
- Test trait counts within expected ranges
- Test position modifiers affect distribution
- Test revealedToUser starts empty
1. **itFactorGenerator.test.ts**
- Test distribution matches expected percentages
- Test value is within 1-100
- Test value is not exposed in any export
1. **playerGenerator.test.ts**
- Test complete player generation
- Test roster generation produces valid roster
- Test league generation produces 32 teams worth
1. **privacy.test.ts**
- CRITICAL: Test that JSON.stringify(player) for UI does not contain trueValue
- Test that "It" factor is not serializable for UI
- Snapshot tests for data leakage

### BOOLEAN CHECKPOINTS

```typescript
const checkpoints = {
  // Checkpoint 1: Dependencies exist
  dependenciesExist: () => {
    return fs.existsSync('src/core/models/player/Player.ts') &&
           fs.existsSync('src/core/models/player/TechnicalSkills.ts');
  },

  // Checkpoint 2: All generator files created
  generatorsCreated: () => {
    const requiredFiles = [
      'src/core/generators/player/NameGenerator.ts',
      'src/core/generators/player/PhysicalGenerator.ts',
      'src/core/generators/player/SkillGenerator.ts',
      'src/core/generators/player/TraitGenerator.ts',
      'src/core/generators/player/ItFactorGenerator.ts',
      'src/core/generators/player/ConsistencyGenerator.ts',
      'src/core/generators/player/SchemeFitGenerator.ts',
      'src/core/generators/player/RoleFitGenerator.ts',
      'src/core/generators/player/PlayerGenerator.ts',
      'src/core/generators/player/MaturityConstants.ts',
      'src/core/generators/utils/RandomUtils.ts',
    ];
    return requiredFiles.every(f => fs.existsSync(f));
  },

  // Checkpoint 3: TypeScript compiles
  typeCheckPasses: async () => {
    const result = await runCommand('npx tsc --noEmit');
    return result.exitCode === 0;
  },

  // Checkpoint 4: All tests pass
  testsPass: async () => {
    const result = await runCommand('npm test -- --testPathPattern=generators');
    return result.exitCode === 0;
  },

  // Checkpoint 5: Generated player has valid structure
  playerStructureValid: () => {
    const { generatePlayer } = require('./src/core/generators/player/PlayerGenerator');
    const player = generatePlayer({ position: 'QB' });

    return player.id &&
           player.firstName &&
           player.physical &&
           player.skills &&
           player.hiddenTraits &&
           player.itFactor &&
           player.consistency &&
           player.schemeFits;
  },

  // Checkpoint 6: Perceived ranges valid
  perceivedRangesValid: () => {
    const { generatePlayer } = require('./src/core/generators/player/PlayerGenerator');
    const player = generatePlayer({ position: 'WR' });

    return Object.values(player.skills).every(skill => {
      return skill.perceivedMin <= skill.perceivedMax &&
             skill.perceivedMin >= 1 &&
             skill.perceivedMax <= 100;
    });
  },

  // Checkpoint 7: True values hidden from view model
  trueValuesHidden: () => {
    const { generatePlayer } = require('./src/core/generators/player/PlayerGenerator');
    const { toPlayerViewModel } = require('./src/core/models/player/PlayerViewModel');

    const player = generatePlayer({ position: 'RB' });
    const viewModel = toPlayerViewModel(player);
    const serialized = JSON.stringify(viewModel);

    // Should not contain trueValue or itFactor value
    return !serialized.includes('trueValue') &&
           !serialized.includes('"value":') &&  // itFactor.value
           !serialized.includes('consistency":{"tier"');  // Hidden tier
  },

  // Checkpoint 8: Can generate full roster
  canGenerateRoster: () => {
    const { generateRoster } = require('./src/core/generators/player/PlayerGenerator');
    const roster = generateRoster('team-1');

    // NFL roster: 53 active minimum
    return roster.length >= 53;
  }
};

// ALL must return true before proceeding to PR-06
const canProceed = Object.values(checkpoints).every(check => check() === true);
```

### EXPECTED DELIVERABLES

1. Complete name generation with diverse name pools
1. Position-specific physical attribute generation
1. Skill generation with true values and perceived ranges
1. Hidden trait generation with position modifiers
1. "It" factor generation with skewed distribution
1. Consistency profile generation
1. Scheme fit calculation based on attributes
1. Full player generator that combines all systems
1. Roster generation function
1. Comprehensive test suite including privacy tests

### DO NOT

- Do not create UI components
- Do not expose trueValue in any public function
- Do not expose itFactor.value anywhere
- Do not create overall ratings
- Do not implement player development (that's later)
- Do not implement aging/decline (that's later)

```
---

## Acceptance Criteria

| Criteria | Status |
|----------|--------|
| Name generator with 200+ first, 300+ last names | ⬜ |
| Physical attributes generate per position | ⬜ |
| Skills generate with trueValue and perceived range | ⬜ |
| Perceived range contains true value (usually) | ⬜ |
| Hidden traits generate with 0-3 positive, 0-2 negative | ⬜ |
| "It" factor generates with correct distribution | ⬜ |
| No trueValue exposed in view models | ⬜ |
| Full roster generation works | ⬜ |
| Privacy tests pass | ⬜ |
| All boolean checkpoints return TRUE | ⬜ |

---

## Files to Create
```
src/core/generators/
├── index.ts
├── player/
│   ├── index.ts
│   ├── NameGenerator.ts
│   ├── PhysicalGenerator.ts
│   ├── SkillGenerator.ts
│   ├── TraitGenerator.ts
│   ├── ItFactorGenerator.ts
│   ├── ConsistencyGenerator.ts
│   ├── SchemeFitGenerator.ts
│   ├── RoleFitGenerator.ts
│   ├── PlayerGenerator.ts
│   ├── MaturityConstants.ts
│   └── __tests__/
│       ├── nameGenerator.test.ts
│       ├── physicalGenerator.test.ts
│       ├── skillGenerator.test.ts
│       ├── traitGenerator.test.ts
│       ├── itFactorGenerator.test.ts
│       ├── playerGenerator.test.ts
│       └── privacy.test.ts
└── utils/
    ├── index.ts
    ├── RandomUtils.ts
    └── __tests__/
        └── randomUtils.test.ts
```
---

## Next PR
Upon successful completion of all checkpoints, proceed to **PR-06: Probability-Based Simulation Engine**

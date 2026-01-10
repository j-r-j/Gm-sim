# PR-02: Core Data Models - Player Entity

## Objective

Implement the complete Player entity data model with the three-layer rating system (True, Perceived, Effective), physical attributes, technical skills, hidden traits, and the "It" factor.

## Dependencies

- **PR-01**: Project Scaffolding & Development Environment ✅

## Branch Name

`feature/pr-02-player-data-model`

-----

## AI Developer Prompt

```
You are building an NFL GM Simulation mobile game. This is PR-02 of 25.

### CONTEXT
This game uses a "hidden mechanics" philosophy. The Player entity is the most critical data structure in the game. Every player has THREE layers of ratings:

1. **True Rating** - The player's actual ability (ONLY the game engine sees this)
2. **Perceived Rating** - What scouts/coaches think (shown to user as RANGES)
3. **Effective Rating** - How they perform in YOUR system (revealed through play)

The gap between these layers is where the game lives.

### DEPENDENCIES
PR-01 must be complete. Verify the project structure exists before starting.

### YOUR TASK
Create the complete Player entity data model in TypeScript.

### REQUIREMENTS

1. **Physical Attributes Model** (`src/core/models/player/PhysicalAttributes.ts`)
   These are concrete, measurable, mostly fixed values:
   ```typescript
   interface PhysicalAttributes {
     height: number;        // inches (66-80 range)
     weight: number;        // pounds (155-365 range)
     armLength: number;     // inches (28-36 range)
     handSize: number;      // inches (7.5-11.5 range)
     wingspan: number;      // inches (68-86 range)
     speed: number;         // 40-yard dash time (4.2-5.5 range)
     acceleration: number;  // 1-100 scale
     agility: number;       // 1-100 scale
     strength: number;      // 1-100 scale
     verticalJump: number;  // inches (24-46 range)
   }
```

1. **Technical Skills Model** (`src/core/models/player/TechnicalSkills.ts`)
   These improve with coaching. Store as objects with true value and perceived range:

   ```typescript
   interface SkillValue {
     trueValue: number;        // 1-100, NEVER exposed to UI
     perceivedMin: number;     // Lower bound shown to user
     perceivedMax: number;     // Upper bound shown to user
     maturityAge: number;      // Age when range collapses to true value
   }

   interface TechnicalSkills {
     // Position-specific skills stored by skill name
     [skillName: string]: SkillValue;
   }
   ```

1. **Hidden Traits Model** (`src/core/models/player/HiddenTraits.ts`)
   Traits that are NEVER shown directly, only revealed through events:

   ```typescript
   type PositiveTrait =
     | 'clutch' | 'filmJunkie' | 'ironMan' | 'leader'
     | 'coolUnderPressure' | 'motor' | 'routeTechnician'
     | 'brickWall' | 'schemeVersatile' | 'teamFirst';

   type NegativeTrait =
     | 'chokes' | 'lazy' | 'injuryProne' | 'lockerRoomCancer'
     | 'hotHead' | 'glassHands' | 'disappears'
     | 'systemDependent' | 'diva';

   interface HiddenTraits {
     positive: PositiveTrait[];
     negative: NegativeTrait[];
     revealedToUser: string[];  // Traits user has discovered
   }
   ```

1. **"It" Factor Model** (`src/core/models/player/ItFactor.ts`)
   The unmeasurable core - hidden 1-100 scale, NEVER displayed:

   ```typescript
   interface ItFactor {
     value: number;  // 1-100, NEVER exposed
     // These are for engine calculations only
   }

   // Descriptive mapping (for engine use, never shown to user)
   // 90-100: Transcendent
   // 75-89: Winner
   // 60-74: Solid
   // 40-59: Average
   // 20-39: Soft
   // 1-19: Liability
   ```

1. **Consistency Profile** (`src/core/models/player/Consistency.ts`)
   Determines weekly variance:

   ```typescript
   type ConsistencyTier =
     | 'metronome'  // ±2 variance
     | 'steady'     // ±4 variance
     | 'average'    // ±7 variance
     | 'streaky'    // -10 to +12 variance
     | 'volatile'   // ±15 variance
     | 'chaotic';   // ±20 variance

   interface ConsistencyProfile {
     tier: ConsistencyTier;
     currentStreak: 'hot' | 'cold' | 'neutral';
     streakGamesRemaining: number;
   }
   ```

1. **Scheme Fit Model** (`src/core/models/player/SchemeFit.ts`)
   Hidden scores for every scheme type:

   ```typescript
   type OffensiveScheme =
     | 'westCoast' | 'airRaid' | 'spreadOption'
     | 'powerRun' | 'zoneRun' | 'playAction';

   type DefensiveScheme =
     | 'fourThreeUnder' | 'threeFour' | 'coverThree'
     | 'coverTwo' | 'manPress' | 'blitzHeavy';

   type FitLevel = 'perfect' | 'good' | 'neutral' | 'poor' | 'terrible';

   interface SchemeFits {
     offensive: Record<OffensiveScheme, FitLevel>;
     defensive: Record<DefensiveScheme, FitLevel>;
   }
   ```

1. **Role Fit Model** (`src/core/models/player/RoleFit.ts`)

   ```typescript
   type RoleType =
     | 'franchiseCornerstone' | 'highEndStarter' | 'solidStarter'
     | 'qualityRotational' | 'specialist' | 'depth' | 'practiceSquad';

   interface RoleFit {
     ceiling: RoleType;      // Highest effective role
     currentRole: RoleType;  // Assigned role
     roleEffectiveness: number; // How well they fit current role (hidden)
   }
   ```

1. **Complete Player Entity** (`src/core/models/player/Player.ts`)

   ```typescript
   interface Player {
     id: string;
     firstName: string;
     lastName: string;
     position: Position;
     age: number;
     experience: number;  // NFL seasons

     // Physical (mostly public)
     physical: PhysicalAttributes;

     // Skills (ranges shown, true values hidden)
     skills: TechnicalSkills;

     // All hidden from user
     hiddenTraits: HiddenTraits;
     itFactor: ItFactor;
     consistency: ConsistencyProfile;
     schemeFits: SchemeFits;
     roleFit: RoleFit;

     // Contract (separate PR, placeholder for now)
     contractId: string | null;

     // Dynamic state
     injuryStatus: InjuryStatus;
     fatigue: number;
     morale: number;

     // Metadata
     collegeId: string;
     draftYear: number;
     draftRound: number;
     draftPick: number;
   }
   ```

1. **Position Enum** (`src/core/models/player/Position.ts`)

   ```typescript
   enum Position {
     QB = 'QB',
     RB = 'RB',
     WR = 'WR',
     TE = 'TE',
     LT = 'LT',
     LG = 'LG',
     C = 'C',
     RG = 'RG',
     RT = 'RT',
     DE = 'DE',
     DT = 'DT',
     OLB = 'OLB',
     ILB = 'ILB',
     CB = 'CB',
     FS = 'FS',
     SS = 'SS',
     K = 'K',
     P = 'P'
   }
   ```

1. **Player View Model** (`src/core/models/player/PlayerViewModel.ts`)
    This is what the UI receives - NO true values:

    ```typescript
    interface PlayerViewModel {
      id: string;
      name: string;
      position: Position;
      age: number;
      experience: number;

      // Physical (public)
      physical: PhysicalAttributes;

      // Skills as RANGES only
      skillRanges: Record<string, { min: number; max: number }>;

      // Revealed traits only
      knownTraits: string[];

      // Qualitative fit descriptions (not numbers)
      schemeFitDescription: string;  // "Good fit", "Poor fit", etc.
      roleFitDescription: string;

      // Never includes:
      // - trueValue for any skill
      // - itFactor value
      // - consistency tier
      // - unrevealed traits
    }
    ```

### BRAND GUIDELINES COMPLIANCE

Before completing, verify:

- [ ] No `trueValue` is ever accessible from PlayerViewModel
- [ ] No `itFactor.value` is accessible outside the engine
- [ ] All skills shown to UI are ranges (min/max), never single values
- [ ] Hidden traits array separates `revealedToUser` from actual traits
- [ ] No method exposes overall/aggregate ratings
- [ ] PlayerViewModel strictly excludes all hidden data

### TESTS TO WRITE

1. **player.model.test.ts**
   - Test Player entity validates all required fields
   - Test skill ranges are valid (min <= true <= max)
   - Test position enum covers all NFL positions

1. **player.viewmodel.test.ts**
   - Test PlayerViewModel excludes trueValue
   - Test PlayerViewModel excludes itFactor
   - Test PlayerViewModel only includes revealedToUser traits
   - Test no aggregate/overall rating is calculable from view model

1. **player.privacy.test.ts**
   - Test that serializing Player for storage doesn't leak to UI
   - Test that JSON.stringify(PlayerViewModel) contains no hidden data
   - Snapshot test to catch accidental exposure of hidden fields

### BOOLEAN CHECKPOINTS

```typescript
const checkpoints = {
  // Checkpoint 1: PR-01 is complete
  pr01Complete: () => {
    return fs.existsSync('src/core/index.ts') &&
           fs.existsSync('src/services/storage/GameStorage.ts');
  },

  // Checkpoint 2: All model files created
  modelsCreated: () => {
    const requiredFiles = [
      'src/core/models/player/PhysicalAttributes.ts',
      'src/core/models/player/TechnicalSkills.ts',
      'src/core/models/player/HiddenTraits.ts',
      'src/core/models/player/ItFactor.ts',
      'src/core/models/player/Consistency.ts',
      'src/core/models/player/SchemeFit.ts',
      'src/core/models/player/RoleFit.ts',
      'src/core/models/player/Player.ts',
      'src/core/models/player/Position.ts',
      'src/core/models/player/PlayerViewModel.ts'
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
    const result = await runCommand('npm test -- --testPathPattern=player');
    return result.exitCode === 0;
  },

  // Checkpoint 5: No true values exposed in ViewModel
  noTrueValuesExposed: () => {
    const viewModelContent = fs.readFileSync(
      'src/core/models/player/PlayerViewModel.ts', 'utf-8'
    );
    // Should not contain trueValue, itFactor.value, or consistency.tier
    const forbidden = ['trueValue', 'itFactor', 'consistency.tier'];
    return !forbidden.some(term => viewModelContent.includes(term));
  },

  // Checkpoint 6: Privacy tests exist and pass
  privacyTestsExist: () => {
    return fs.existsSync('src/core/models/player/__tests__/player.privacy.test.ts');
  },

  // Checkpoint 7: No overall rating anywhere
  noOverallRating: () => {
    const files = glob.sync('src/core/models/player/**/*.ts');
    return !files.some(f => {
      const content = fs.readFileSync(f, 'utf-8');
      return /overall|OVR|aggregateRating/i.test(content);
    });
  }
};

// ALL must return true before proceeding to PR-03
const canProceed = Object.values(checkpoints).every(check => check() === true);
```

### EXPECTED DELIVERABLES

1. Complete Player entity with all sub-models
1. PlayerViewModel that strictly hides sensitive data
1. Position enum with all NFL positions
1. Type definitions for all traits, schemes, roles
1. Comprehensive test coverage including privacy tests
1. Index exports from `src/core/models/player/index.ts`

### DO NOT

- Do not create any UI components
- Do not implement player generation logic (that's PR-05)
- Do not create methods to calculate "overall" ratings
- Do not expose true values in any exportable format
- Do not implement contract logic (that's PR-15)
```

---

## Acceptance Criteria

| Criteria | Status |
|----------|--------|
| All player model files created | ⬜ |
| TypeScript interfaces properly typed | ⬜ |
| PlayerViewModel excludes all hidden data | ⬜ |
| Three-layer rating system implemented | ⬜ |
| Position enum complete | ⬜ |
| All tests pass | ⬜ |
| Privacy tests verify no data leakage | ⬜ |
| All boolean checkpoints return TRUE | ⬜ |

---

## Files to Create

```
src/core/models/player/
├── index.ts
├── Player.ts
├── PlayerViewModel.ts
├── PhysicalAttributes.ts
├── TechnicalSkills.ts
├── HiddenTraits.ts
├── ItFactor.ts
├── Consistency.ts
├── SchemeFit.ts
├── RoleFit.ts
├── Position.ts
├── InjuryStatus.ts
└── __tests__/
    ├── player.model.test.ts
    ├── player.viewmodel.test.ts
    └── player.privacy.test.ts
```

---

## Next PR

Upon successful completion of all checkpoints, proceed to **PR-03: Core Data Models - Staff Entities (Coach, Scout)**

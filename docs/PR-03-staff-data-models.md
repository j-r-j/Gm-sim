# PR-03: Core Data Models - Staff Entities (Coach, Scout)

## Objective

Implement the complete Coach and Scout entity data models including coaching trees, personalities, tendencies, scout attributes, and the staff hierarchy system for the React Native mobile app.

## Dependencies

- **PR-01**: Project Scaffolding & Development Environment ✅
- **PR-02**: Core Data Models - Player Entity ✅

## Branch Name

`feature/pr-03-staff-data-models`

-----

## AI Developer Prompt

```
You are building an NFL GM Simulation React Native mobile game. This is PR-03 of 25.

### PLATFORM
React Native CLI (not Expo) - iOS and Android
TypeScript strict mode

### CONTEXT
Coaches drive the simulation - the player never calls plays. Coordinators have tendencies that determine play calling. Coaches belong to "trees" (lineages of shared philosophy). Scout quality is unknown initially and learned over years through hits/misses.

### DEPENDENCIES
PR-01 and PR-02 must be complete. Verify player models exist before starting:
- src/core/models/player/Player.ts should exist
- src/core/models/player/Position.ts should exist

### YOUR TASK
Create the complete Coach and Scout entity data models in TypeScript.

### REQUIREMENTS

1. **Coaching Tree Model** (`src/core/models/staff/CoachingTree.ts`)
   ```typescript
   export type TreeName =
     | 'walsh' | 'parcells' | 'belichick' | 'shanahan' | 'reid'
     | 'coughlin' | 'dungy' | 'holmgren' | 'gruden' | 'payton';

   export type TreeGeneration = 1 | 2 | 3 | 4;  // 1 = coached under founder

   export interface CoachingTree {
     treeName: TreeName;
     generation: TreeGeneration;
     mentorId: string | null;  // Reference to coach they trained under
     philosophy: {
       offensiveTendency: string;
       defensiveTendency: string;
       riskTolerance: 'conservative' | 'balanced' | 'aggressive';
     };
   }

   // Tree chemistry calculation (for engine use)
   export interface TreeChemistry {
     sameTreeSameGen: { min: 5; max: 8 };
     sameTreeAdjacentGen: { min: 3; max: 5 };
     compatibleTrees: { min: 1; max: 3 };
     conflictingTrees: { min: -5; max: -2 };
     opposingPhilosophy: { min: -8; max: -4 };
   }
```

1. **Coach Personality Model** (`src/core/models/staff/CoachPersonality.ts`)

   ```typescript
   export type PersonalityType =
     | 'analytical' | 'aggressive' | 'conservative'
     | 'innovative' | 'oldSchool' | 'playersCoach';

   export interface CoachPersonality {
     primary: PersonalityType;
     secondary: PersonalityType | null;
     ego: number;              // 1-100 scale (hidden)
     adaptability: number;     // 1-100 scale (hidden)

     // How they interact with others
     conflictsWith: PersonalityType[];
     synergizesWith: PersonalityType[];
   }

   // Personality interaction rules (for engine)
   export const PERSONALITY_CONFLICTS: Record<PersonalityType, PersonalityType[]> = {
     analytical: ['aggressive'],
     aggressive: ['conservative', 'analytical'],
     conservative: ['aggressive', 'innovative'],
     innovative: ['oldSchool', 'conservative'],
     oldSchool: ['innovative'],
     playersCoach: [],
   };
   ```
1. **Coordinator Tendencies Model** (`src/core/models/staff/CoordinatorTendencies.ts`)

   ```typescript
   export interface OffensiveTendencies {
     runPassSplit: { run: number; pass: number };  // Must sum to 100
     playActionRate: number;       // 0-50 percentage
     deepShotRate: number;         // 0-40 percentage
     fourthDownAggressiveness: 'conservative' | 'average' | 'aggressive';
     tempoPreference: 'slow' | 'balanced' | 'uptempo';

     // Situational adjustments (modifiers in percentage points)
     situational: {
       aheadBy14Plus: { runModifier: number; passModifier: number };
       behindBy14Plus: { runModifier: number; passModifier: number };
       thirdAndShort: 'run' | 'pass' | 'balanced';
       redZone: 'run' | 'pass' | 'balanced';
       badWeather: { runModifier: number; passModifier: number };
     };
   }

   export interface DefensiveTendencies {
     baseFormation: '4-3' | '3-4' | 'hybrid';
     blitzRate: number;            // 0-50 percentage
     manCoverageRate: number;      // 0-100 percentage
     pressRate: number;            // 0-100 percentage (when in man)

     // Situational adjustments
     situational: {
       redZone: 'aggressive' | 'conservative';
       twoMinuteDrill: 'prevent' | 'normal' | 'blitz';
       thirdAndLong: 'blitz' | 'coverage' | 'balanced';
     };
   }

   export type CoordinatorTendencies = OffensiveTendencies | DefensiveTendencies;
   ```
1. **Coach Attributes Model** (`src/core/models/staff/CoachAttributes.ts`)

   ```typescript
   export interface CoachAttributes {
     // Core coaching abilities (all 1-100, hidden from user)
     development: number;       // Player growth speed
     gameDayIQ: number;         // In-game decisions
     schemeTeaching: number;    // Players adapt to scheme faster
     playerEvaluation: number;  // Accuracy perceiving player ratings
     talentID: number;          // Spots hidden traits
     motivation: number;        // Affects player morale

     // Reputation (affects free agency interest)
     reputation: number;        // 1-100

     // Experience
     yearsExperience: number;
     age: number;
   }

   // What the UI can see (partial view)
   export interface CoachAttributesViewModel {
     yearsExperience: number;
     age: number;
     reputationTier: 'unknown' | 'rising' | 'established' | 'elite' | 'legendary';
     // All other attributes hidden
   }
   ```
1. **Staff Salary Ranges** (`src/core/models/staff/StaffSalary.ts`)

   ```typescript
   export type CoachRole =
     | 'headCoach'
     | 'offensiveCoordinator' | 'defensiveCoordinator' | 'specialTeamsCoordinator'
     | 'qbCoach' | 'rbCoach' | 'wrCoach' | 'teCoach' | 'olCoach'
     | 'dlCoach' | 'lbCoach' | 'dbCoach' | 'stCoach';

   export type ScoutRole =
     | 'scoutingDirector' | 'nationalScout' | 'regionalScout' | 'proScout';

   // Salary ranges in dollars per year
   export const COACH_SALARY_RANGES: Record<CoachRole, { min: number; max: number }> = {
     headCoach: { min: 8_000_000, max: 18_000_000 },
     offensiveCoordinator: { min: 2_000_000, max: 6_000_000 },
     defensiveCoordinator: { min: 2_000_000, max: 6_000_000 },
     specialTeamsCoordinator: { min: 1_000_000, max: 3_000_000 },
     qbCoach: { min: 500_000, max: 1_500_000 },
     rbCoach: { min: 400_000, max: 1_200_000 },
     wrCoach: { min: 400_000, max: 1_200_000 },
     teCoach: { min: 400_000, max: 1_200_000 },
     olCoach: { min: 500_000, max: 1_500_000 },
     dlCoach: { min: 500_000, max: 1_500_000 },
     lbCoach: { min: 400_000, max: 1_200_000 },
     dbCoach: { min: 500_000, max: 1_500_000 },
     stCoach: { min: 300_000, max: 800_000 },
   };

   export const SCOUT_SALARY_RANGES: Record<ScoutRole, { min: number; max: number }> = {
     scoutingDirector: { min: 1_000_000, max: 3_000_000 },
     nationalScout: { min: 500_000, max: 1_200_000 },
     regionalScout: { min: 200_000, max: 600_000 },
     proScout: { min: 300_000, max: 800_000 },
   };

   // Staff budget tiers
   export interface StaffBudget {
     tier: 'elite' | 'high' | 'mid' | 'low' | 'bottom';
     totalBudget: number;
     coachingBudget: number;
     scoutingBudget: number;
   }

   export const STAFF_BUDGET_TIERS: Record<StaffBudget['tier'], { min: number; max: number }> = {
     elite: { min: 35_000_000, max: 40_000_000 },
     high: { min: 25_000_000, max: 30_000_000 },
     mid: { min: 18_000_000, max: 24_000_000 },
     low: { min: 12_000_000, max: 17_000_000 },
     bottom: { min: 8_000_000, max: 11_000_000 },
   };
   ```
1. **Coach Contract Model** (`src/core/models/staff/CoachContract.ts`)

   ```typescript
   export interface CoachContract {
     id: string;
     coachId: string;
     teamId: string;

     // Terms
     yearsTotal: number;        // 1-5 years
     yearsRemaining: number;
     salaryPerYear: number;
     guaranteedMoney: number;
     signingBonus: number;

     // Calculated
     deadMoneyIfFired: number;  // Remaining guarantees

     // Status
     isInterim: boolean;
     canBePoached: boolean;     // For coordinators
     hasNoTradeClause: boolean; // Rare for coaches

     // Dates
     startYear: number;
     endYear: number;
   }
   ```
1. **Coach Entity** (`src/core/models/staff/Coach.ts`)

   ```typescript
   import { CoachingTree } from './CoachingTree';
   import { CoachPersonality } from './CoachPersonality';
   import { CoachAttributes } from './CoachAttributes';
   import { CoordinatorTendencies } from './CoordinatorTendencies';
   import { CoachContract, CoachRole } from './CoachContract';
   import { OffensiveScheme, DefensiveScheme } from '../player/SchemeFit';

   export type SchemeType = OffensiveScheme | DefensiveScheme;

   export interface CareerHistoryEntry {
     teamId: string;
     teamName: string;
     role: CoachRole;
     yearStart: number;
     yearEnd: number;
     wins: number;
     losses: number;
     playoffAppearances: number;
     championships: number;
     achievements: string[];
   }

   export interface Coach {
     id: string;
     firstName: string;
     lastName: string;
     role: CoachRole;
     teamId: string | null;

     // What they run (only coordinators/HC have schemes)
     scheme: SchemeType | null;

     // Core data
     tree: CoachingTree;
     personality: CoachPersonality;
     attributes: CoachAttributes;

     // Coordinators only
     tendencies: CoordinatorTendencies | null;

     // Contract
     contract: CoachContract | null;

     // Career history
     careerHistory: CareerHistoryEntry[];

     // Relationships (hidden, -10 to +10)
     playerChemistry: Record<string, number>;  // playerId -> chemistry
     staffChemistry: Record<string, number>;   // coachId -> chemistry

     // Status
     isAvailable: boolean;      // Free agent coach
     isRetired: boolean;
     interviewRequests: string[]; // teamIds requesting interviews
   }

   // View model for UI (hides sensitive attributes)
   export interface CoachViewModel {
     id: string;
     fullName: string;
     role: CoachRole;
     teamName: string | null;
     scheme: SchemeType | null;

     // Public info
     tree: {
       name: string;
       generation: number;
     };
     personalityType: string;
     yearsExperience: number;
     age: number;

     // Career summary (public)
     careerWins: number;
     careerLosses: number;
     championships: number;

     // Contract (if on your team)
     contractYearsRemaining: number | null;
     salary: number | null;

     // Hidden from ViewModel:
     // - attributes (development, gameDayIQ, etc.)
     // - chemistry values
     // - ego
     // - tendencies (partially - user sees general description, not numbers)
   }
   ```
1. **Scout Attributes Model** (`src/core/models/staff/ScoutAttributes.ts`)

   ```typescript
   import { Position } from '../player/Position';

   export type ScoutRegion =
     | 'northeast' | 'southeast' | 'midwest' | 'west' | 'southwest';

   export interface ScoutAttributes {
     // Hidden from user
     evaluation: number;        // 1-100: Accuracy of prospect grades
     speed: number;             // 1-100: Prospects covered per week

     // Public
     experience: number;        // Years scouting
     age: number;

     // Specializations (hidden accuracy bonuses)
     positionSpecialty: Position | null;
     regionKnowledge: ScoutRegion | null;
   }
   ```
1. **Scout Track Record** (`src/core/models/staff/ScoutTrackRecord.ts`)

   ```typescript
   import { Position } from '../player/Position';

   export interface ScoutEvaluation {
     prospectId: string;
     prospectName: string;
     position: Position;
     evaluationYear: number;

     // What scout projected
     projectedRound: number;
     projectedSkillRange: { min: number; max: number };

     // What actually happened
     actualDraftRound: number | null;  // null if undrafted
     actualSkillRevealed: number | null;  // After player matured

     // Calculated
     wasHit: boolean | null;  // null until player matures
   }

   export interface ScoutTrackRecord {
     scoutId: string;
     evaluations: ScoutEvaluation[];

     // Revealed over time (starts null)
     overallHitRate: number | null;

     // Position-specific accuracy (revealed over time)
     positionAccuracy: Partial<Record<Position, number | null>>;

     // Known tendencies (revealed after ~5 years)
     knownStrengths: string[];     // "Excellent at evaluating WRs"
     knownWeaknesses: string[];    // "Overrates RBs"

     // Data tracking
     yearsOfData: number;
     reliabilityRevealed: boolean;  // True after sufficient data
   }
   ```
1. **Scout Entity** (`src/core/models/staff/Scout.ts`)

   ```typescript
   import { ScoutRole } from './StaffSalary';
   import { ScoutAttributes, ScoutRegion } from './ScoutAttributes';
   import { ScoutTrackRecord } from './ScoutTrackRecord';

   export interface ScoutContract {
     salary: number;
     yearsTotal: number;
     yearsRemaining: number;
   }

   export interface Scout {
     id: string;
     firstName: string;
     lastName: string;
     role: ScoutRole;
     teamId: string | null;

     // Assignment
     region: ScoutRegion | null;  // Regional scouts only

     // Core data (hidden)
     attributes: ScoutAttributes;
     trackRecord: ScoutTrackRecord;

     // Contract
     contract: ScoutContract | null;

     // Current assignments
     focusProspects: string[];    // Prospect IDs for deep evaluation (max 3-5)
     autoScoutingActive: boolean;

     // Status
     isAvailable: boolean;
     isRetired: boolean;
   }

   // View model - what user sees varies by years of data
   export interface ScoutViewModel {
     id: string;
     fullName: string;
     role: ScoutRole;
     region: ScoutRegion | null;

     // Public
     yearsExperience: number;
     age: number;
     positionSpecialty: string | null;

     // Revealed over time
     evaluationRating: number | null;  // null until reliabilityRevealed
     hitRate: number | null;
     knownStrengths: string[];
     knownWeaknesses: string[];
     reliabilityKnown: boolean;

     // Contract (your scouts only)
     salary: number | null;
     yearsRemaining: number | null;
   }
   ```
1. **Staff Hierarchy** (`src/core/models/staff/StaffHierarchy.ts`)

   ```typescript
   import { CoachRole, ScoutRole } from './StaffSalary';

   // 14 coaching positions + 8 scouting positions = 22 total staff
   export interface StaffHierarchy {
     teamId: string;

     // Coaching staff (14 positions)
     headCoach: string | null;        // Coach ID
     offensiveCoordinator: string | null;
     defensiveCoordinator: string | null;
     specialTeamsCoordinator: string | null;
     qbCoach: string | null;
     rbCoach: string | null;
     wrCoach: string | null;
     teCoach: string | null;
     olCoach: string | null;
     dlCoach: string | null;
     lbCoach: string | null;
     dbCoach: string | null;
     stCoach: string | null;

     // Scouting staff (8 positions)
     scoutingDirector: string | null;
     nationalScout: string | null;
     regionalScoutNortheast: string | null;
     regionalScoutSoutheast: string | null;
     regionalScoutMidwest: string | null;
     regionalScoutWest: string | null;
     regionalScoutSouthwest: string | null;
     proScout: string | null;

     // Budget
     staffBudget: number;
     coachingSpend: number;
     scoutingSpend: number;
     remainingBudget: number;
   }

   // Reporting structure
   export const COACHING_REPORTS_TO: Record<CoachRole, CoachRole | 'gm'> = {
     headCoach: 'gm',
     offensiveCoordinator: 'headCoach',
     defensiveCoordinator: 'headCoach',
     specialTeamsCoordinator: 'headCoach',
     qbCoach: 'offensiveCoordinator',
     rbCoach: 'offensiveCoordinator',
     wrCoach: 'offensiveCoordinator',
     teCoach: 'offensiveCoordinator',
     olCoach: 'offensiveCoordinator',
     dlCoach: 'defensiveCoordinator',
     lbCoach: 'defensiveCoordinator',
     dbCoach: 'defensiveCoordinator',
     stCoach: 'specialTeamsCoordinator',
   };
   ```

### BRAND GUIDELINES COMPLIANCE

Before completing, verify:

- [ ] Coach attributes (development, gameDayIQ, etc.) hidden from CoachViewModel
- [ ] Scout evaluation accuracy hidden until reliability revealed (5+ years)
- [ ] Chemistry values (-10 to +10) never exposed to UI
- [ ] Tendencies shown as descriptions, not raw numbers
- [ ] Ego values never exposed
- [ ] Track record builds over time, not instant

### TESTS TO WRITE

1. **coach.model.test.ts**
- Test Coach entity validates all required fields
- Test coaching tree chemistry calculations
- Test personality conflict detection
- Test contract dead money calculation
1. **coach.viewmodel.test.ts**
- Test CoachViewModel excludes hidden attributes
- Test chemistry values not exposed
- Test ego not exposed
1. **scout.model.test.ts**
- Test Scout entity validates all fields
- Test track record starts empty
- Test focus prospects limited to 3-5
1. **scout.viewmodel.test.ts**
- Test ScoutViewModel hides evaluation until reliability revealed
- Test hit rate null until sufficient data
- Test strengths/weaknesses reveal over time
1. **staff.hierarchy.test.ts**
- Test all 22 positions tracked
- Test budget calculations
- Test reporting structure

### BOOLEAN CHECKPOINTS

```typescript
const checkpoints = {
  // Checkpoint 1: Dependencies exist
  dependenciesExist: () => {
    return fs.existsSync('src/core/models/player/Player.ts') &&
           fs.existsSync('src/core/models/player/Position.ts') &&
           fs.existsSync('src/core/models/player/SchemeFit.ts');
  },

  // Checkpoint 2: All staff model files created
  modelsCreated: () => {
    const requiredFiles = [
      'src/core/models/staff/CoachingTree.ts',
      'src/core/models/staff/CoachPersonality.ts',
      'src/core/models/staff/CoordinatorTendencies.ts',
      'src/core/models/staff/CoachAttributes.ts',
      'src/core/models/staff/StaffSalary.ts',
      'src/core/models/staff/CoachContract.ts',
      'src/core/models/staff/Coach.ts',
      'src/core/models/staff/ScoutAttributes.ts',
      'src/core/models/staff/ScoutTrackRecord.ts',
      'src/core/models/staff/Scout.ts',
      'src/core/models/staff/StaffHierarchy.ts',
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
    const result = await runCommand('npm test -- --testPathPattern=staff');
    return result.exitCode === 0;
  },

  // Checkpoint 5: ViewModels hide sensitive data
  viewModelsSecure: () => {
    const coachVM = fs.readFileSync('src/core/models/staff/Coach.ts', 'utf-8');
    const scoutVM = fs.readFileSync('src/core/models/staff/Scout.ts', 'utf-8');

    // CoachViewModel should not expose these
    const coachForbidden = ['development:', 'gameDayIQ:', 'playerChemistry', 'staffChemistry', 'ego:'];
    const coachVMSection = coachVM.split('CoachViewModel')[1]?.split('}')?.[0] || '';
    const coachClean = !coachForbidden.some(term => coachVMSection.includes(term));

    // ScoutViewModel should not directly expose evaluation
    const scoutVMSection = scoutVM.split('ScoutViewModel')[1]?.split('}')?.[0] || '';
    const hasConditionalEval = scoutVMSection.includes('evaluationRating: number | null');

    return coachClean && hasConditionalEval;
  },

  // Checkpoint 6: Salary ranges match design doc
  salaryRangesCorrect: () => {
    const salaryFile = require('./src/core/models/staff/StaffSalary');
    return salaryFile.COACH_SALARY_RANGES.headCoach.min === 8_000_000 &&
           salaryFile.COACH_SALARY_RANGES.headCoach.max === 18_000_000;
  },

  // Checkpoint 7: Staff hierarchy has 22 positions
  hierarchyComplete: () => {
    const hierarchyFile = fs.readFileSync('src/core/models/staff/StaffHierarchy.ts', 'utf-8');
    const coachPositions = 14;
    const scoutPositions = 8;
    // Count string | null properties
    const nullableProps = (hierarchyFile.match(/: string \| null/g) || []).length;
    return nullableProps >= coachPositions + scoutPositions;
  }
};

// ALL must return true before proceeding to PR-04
const canProceed = Object.values(checkpoints).every(check => check() === true);
```

### EXPECTED DELIVERABLES

1. Complete Coach entity with tree, personality, attributes, tendencies
1. Complete Scout entity with attributes and track record
1. ViewModels for both that hide sensitive data appropriately
1. Staff hierarchy structure for 22 positions
1. Salary ranges and budget tiers
1. Comprehensive test coverage
1. Index exports from `src/core/models/staff/index.ts`

### DO NOT

- Do not create UI components
- Do not implement coach/scout generation logic (future PRs)
- Do not implement hiring/firing logic (future PRs)
- Do not expose hidden attributes in ViewModels
- Do not show scout accuracy until reliability is revealed

```
---

## Acceptance Criteria

| Criteria | Status |
|----------|--------|
| All coach model files created | ⬜ |
| All scout model files created | ⬜ |
| ViewModels properly hide sensitive data | ⬜ |
| Staff hierarchy with 22 positions | ⬜ |
| Coaching trees implemented | ⬜ |
| Coordinator tendencies modeled | ⬜ |
| Scout track record builds over time | ⬜ |
| All tests pass | ⬜ |
| All boolean checkpoints return TRUE | ⬜ |

---

## Files to Create
```
src/core/models/staff/
├── index.ts
├── Coach.ts
├── CoachingTree.ts
├── CoachPersonality.ts
├── CoachAttributes.ts
├── CoachContract.ts
├── CoordinatorTendencies.ts
├── Scout.ts
├── ScoutAttributes.ts
├── ScoutTrackRecord.ts
├── StaffSalary.ts
├── StaffHierarchy.ts
└── __tests__/
    ├── coach.model.test.ts
    ├── coach.viewmodel.test.ts
    ├── scout.model.test.ts
    ├── scout.viewmodel.test.ts
    └── staff.hierarchy.test.ts
```
---

## Next PR
Upon successful completion of all checkpoints, proceed to **PR-04: Core Data Models - Team, League, Owner Entities**

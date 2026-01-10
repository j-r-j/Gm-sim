# PR-04: Core Data Models - Team, League, Owner Entities

## Objective

Implement the Team, League, and Owner entity data models including owner personalities, team finances, league structure, and the 32-team fake city naming system.

## Dependencies

- **PR-01**: Project Scaffolding & Development Environment ✅
- **PR-02**: Core Data Models - Player Entity ✅
- **PR-03**: Core Data Models - Staff Entities ✅

## Branch Name

`feature/pr-04-team-league-owner-models`

-----

## AI Developer Prompt

```
You are building an NFL GM Simulation React Native mobile game. This is PR-04 of 25.

### PLATFORM
React Native CLI (not Expo) - iOS and Android
TypeScript strict mode

### CONTEXT
The game features 32 teams with FAKE city names to avoid NFL copyright. Owners have personalities that affect your job security and decision-making freedom. The league has a hard salary cap that increases or stays the same yearly.

### DEPENDENCIES
PR-01, PR-02, and PR-03 must be complete. Verify these exist:
- src/core/models/player/Player.ts
- src/core/models/staff/Coach.ts
- src/core/models/staff/StaffHierarchy.ts

### YOUR TASK
Create Team, League, and Owner entity data models in TypeScript.

### REQUIREMENTS

1. **Owner Personality Model** (`src/core/models/owner/OwnerPersonality.ts`)
   ```typescript
   // Primary traits on a spectrum
   export interface OwnerTraits {
     patience: number;      // 1-100: 1=impatient, 100=patient
     spending: number;      // 1-100: 1=cheap, 100=big spender
     control: number;       // 1-100: 1=hands-off, 100=meddler
     loyalty: number;       // 1-100: 1=ruthless, 100=loyal
     ego: number;           // 1-100: affects decision overrides
   }

   // Secondary trait flags
   export type SecondaryTrait =
     | 'analyticsBeliever' | 'oldSchool' | 'winNow'
     | 'longTermThinker' | 'prObsessed' | 'playersOwner'
     | 'championshipOrBust';

   export interface OwnerPersonality {
     traits: OwnerTraits;
     secondaryTraits: SecondaryTrait[];

     // Intervention thresholds (when owner steps in)
     interventionTriggers: {
       losingStreakLength: number;     // Games before owner calls
       fanApprovalFloor: number;       // Below this, owner meddles
       mediaScrutinyThreshold: number; // PR crisis sensitivity
     };
   }
```

1. **Owner Entity** (`src/core/models/owner/Owner.ts`)

   ```typescript
   import { OwnerPersonality } from './OwnerPersonality';

   export interface OwnerDemand {
     id: string;
     type: 'signPlayer' | 'fireCoach' | 'draftPlayer' | 'tradeFor' | 'other';
     description: string;
     targetId: string | null;  // Player/coach ID if applicable
     deadline: number;         // Game week or off-season phase
     consequence: string;      // What happens if ignored
     issuedWeek: number;
   }

   export interface Owner {
     id: string;
     firstName: string;
     lastName: string;
     teamId: string;

     // Personality
     personality: OwnerPersonality;

     // Relationship with GM (you)
     patienceMeter: number;    // 0-100, your job security
     trustLevel: number;       // Affects how much freedom you have

     // Active demands
     activeDemands: OwnerDemand[];

     // History
     yearsAsOwner: number;
     previousGMsFired: number;
     championshipsWon: number;

     // Wealth (affects staff budget)
     netWorth: 'modest' | 'wealthy' | 'billionaire' | 'oligarch';
   }

   // View model - what player sees
   export interface OwnerViewModel {
     id: string;
     fullName: string;

     // Personality descriptions (not raw numbers)
     patienceDescription: 'very impatient' | 'impatient' | 'moderate' | 'patient' | 'very patient';
     spendingDescription: 'frugal' | 'budget-conscious' | 'moderate' | 'generous' | 'lavish';
     controlDescription: 'hands-off' | 'occasional input' | 'involved' | 'controlling' | 'micromanager';
     loyaltyDescription: 'ruthless' | 'results-driven' | 'fair' | 'loyal' | 'extremely loyal';

     secondaryTraits: SecondaryTrait[];

     // Job security (shown to player)
     jobSecurityStatus: 'secure' | 'stable' | 'warm seat' | 'hot seat' | 'danger';

     // Active demands
     activeDemands: OwnerDemand[];

     // History
     yearsAsOwner: number;
     previousGMsFired: number;
     championshipsWon: number;
   }
   ```
1. **Patience Meter System** (`src/core/models/owner/PatienceMeter.ts`)

   ```typescript
   export interface PatienceModifier {
     event: string;
     minImpact: number;
     maxImpact: number;
   }

   // Positive events
   export const PATIENCE_POSITIVE: PatienceModifier[] = [
     { event: 'superBowlWin', minImpact: 30, maxImpact: 50 },
     { event: 'playoffWin', minImpact: 15, maxImpact: 25 },
     { event: 'playoffAppearance', minImpact: 10, maxImpact: 20 },
     { event: 'winningSeason', minImpact: 5, maxImpact: 15 },
     { event: 'exceededExpectations', minImpact: 10, maxImpact: 20 },
     { event: 'majorFASigningWorks', minImpact: 5, maxImpact: 10 },
     { event: 'draftPickBecomesstar', minImpact: 5, maxImpact: 15 },
   ];

   // Negative events
   export const PATIENCE_NEGATIVE: PatienceModifier[] = [
     { event: 'losingSeason', minImpact: -25, maxImpact: -10 },
     { event: 'missedExpectedPlayoffs', minImpact: -25, maxImpact: -15 },
     { event: 'badPR', minImpact: -20, maxImpact: -5 },
     { event: 'defiedOwner', minImpact: -25, maxImpact: -10 },
     { event: 'majorFASigningBusts', minImpact: -15, maxImpact: -5 },
     { event: 'topDraftPickBusts', minImpact: -20, maxImpact: -10 },
     { event: 'losingStreak5Plus', minImpact: -15, maxImpact: -5 },
     { event: 'blowoutLoss', minImpact: -5, maxImpact: -2 },
   ];

   export interface PatienceThreshold {
     level: 'secure' | 'stable' | 'warmSeat' | 'hotSeat' | 'fired';
     min: number;
     max: number;
   }

   export const PATIENCE_THRESHOLDS: PatienceThreshold[] = [
     { level: 'secure', min: 70, max: 100 },
     { level: 'stable', min: 50, max: 69 },
     { level: 'warmSeat', min: 35, max: 49 },
     { level: 'hotSeat', min: 20, max: 34 },
     { level: 'fired', min: 0, max: 19 },
   ];
   ```
1. **Team Finances Model** (`src/core/models/team/TeamFinances.ts`)

   ```typescript
   export interface TeamFinances {
     teamId: string;

     // Salary cap
     salaryCap: number;           // League-wide cap
     currentCapUsage: number;     // Total committed
     capSpace: number;            // Remaining space
     deadMoney: number;           // From cuts/trades

     // Projected future
     nextYearCommitted: number;
     twoYearsOutCommitted: number;
     threeYearsOutCommitted: number;

     // Staff budget (separate from player cap)
     staffBudget: number;
     staffSpending: number;

     // Penalties
     capPenalties: CapPenalty[];
   }

   export interface CapPenalty {
     id: string;
     playerId: string;
     playerName: string;
     reason: 'cut' | 'trade' | 'restructure' | 'retirement';
     amount: number;
     yearsRemaining: number;
   }
   ```
1. **Stadium Model** (`src/core/models/team/Stadium.ts`)

   ```typescript
   export type StadiumType = 'domeFixed' | 'domeRetractable' | 'outdoorWarm' | 'outdoorCold';
   export type FieldSurface = 'grass' | 'turf';

   export interface Stadium {
     id: string;
     name: string;
     teamId: string;
     city: string;

     // Physical properties
     type: StadiumType;
     surface: FieldSurface;
     capacity: number;

     // Weather/environment
     latitude: number;          // For weather simulation
     elevation: number;         // Affects ball flight
     averageNovemberTemp: number;
     averageDecemberTemp: number;

     // Home field advantage modifiers
     noiseFactor: number;       // 1-10, affects false starts
     intimidationFactor: number; // 1-10, crowd impact
   }

   // Stadium type affects weather exposure
   export const STADIUM_WEATHER_EXPOSURE: Record<StadiumType, string> = {
     domeFixed: 'none',           // Always 72°F
     domeRetractable: 'minimal',  // Usually closed if bad
     outdoorWarm: 'rain',         // Rain possible, mild temps
     outdoorCold: 'full',         // Full exposure to elements
   };
   ```
1. **Team Entity** (`src/core/models/team/Team.ts`)

   ```typescript
   import { Stadium } from './Stadium';
   import { TeamFinances } from './TeamFinances';
   import { StaffHierarchy } from '../staff/StaffHierarchy';

   export type Conference = 'AFC' | 'NFC';
   export type Division = 'North' | 'South' | 'East' | 'West';

   export interface TeamRecord {
     wins: number;
     losses: number;
     ties: number;
     divisionWins: number;
     divisionLosses: number;
     conferenceWins: number;
     conferenceLosses: number;
     pointsFor: number;
     pointsAgainst: number;
     streak: number;  // Positive = wins, negative = losses
   }

   export interface Team {
     id: string;
     city: string;           // Fake city name
     nickname: string;       // Team name
     abbreviation: string;   // 3 letters

     // League position
     conference: Conference;
     division: Division;

     // Facilities
     stadium: Stadium;

     // Finances
     finances: TeamFinances;

     // Staff
     staffHierarchy: StaffHierarchy;
     ownerId: string;
     gmId: string | null;    // You, if this is your team

     // Roster references
     rosterPlayerIds: string[];
     practiceSquadIds: string[];
     injuredReserveIds: string[];

     // Current season
     currentRecord: TeamRecord;
     playoffSeed: number | null;
     isEliminated: boolean;

     // History
     allTimeRecord: { wins: number; losses: number; ties: number };
     championships: number;
     lastChampionshipYear: number | null;

     // Prestige/market
     marketSize: 'small' | 'medium' | 'large';
     prestige: number;       // 1-100, affects FA interest
     fanbasePassion: number; // 1-100, affects home field
   }
   ```
1. **Fake Cities Configuration** (`src/core/models/team/FakeCities.ts`)

   ```typescript
   // 32 fake cities to avoid NFL copyright
   // Grouped by conference and division

   export interface FakeCity {
     city: string;
     nickname: string;
     abbreviation: string;
     conference: 'AFC' | 'NFC';
     division: 'North' | 'South' | 'East' | 'West';
     marketSize: 'small' | 'medium' | 'large';
     stadiumType: 'domeFixed' | 'domeRetractable' | 'outdoorWarm' | 'outdoorCold';
     latitude: number;
   }

   export const FAKE_CITIES: FakeCity[] = [
     // AFC East
     { city: 'Atlantic City', nickname: 'Sharks', abbreviation: 'ATL', conference: 'AFC', division: 'East', marketSize: 'large', stadiumType: 'outdoorCold', latitude: 39.4 },
     { city: 'Providence', nickname: 'Colonials', abbreviation: 'PRV', conference: 'AFC', division: 'East', marketSize: 'medium', stadiumType: 'outdoorCold', latitude: 41.8 },
     { city: 'Hartford', nickname: 'Whalers', abbreviation: 'HFD', conference: 'AFC', division: 'East', marketSize: 'small', stadiumType: 'outdoorCold', latitude: 41.8 },
     { city: 'Norfolk', nickname: 'Admirals', abbreviation: 'NFK', conference: 'AFC', division: 'East', marketSize: 'medium', stadiumType: 'outdoorWarm', latitude: 36.9 },

     // AFC North
     { city: 'Columbus', nickname: 'Pioneers', abbreviation: 'CLB', conference: 'AFC', division: 'North', marketSize: 'medium', stadiumType: 'outdoorCold', latitude: 40.0 },
     { city: 'Milwaukee', nickname: 'Brewmasters', abbreviation: 'MIL', conference: 'AFC', division: 'North', marketSize: 'medium', stadiumType: 'outdoorCold', latitude: 43.0 },
     { city: 'Louisville', nickname: 'Colonels', abbreviation: 'LOU', conference: 'AFC', division: 'North', marketSize: 'small', stadiumType: 'outdoorCold', latitude: 38.3 },
     { city: 'Grand Rapids', nickname: 'Lumberjacks', abbreviation: 'GRP', conference: 'AFC', division: 'North', marketSize: 'small', stadiumType: 'domeFixed', latitude: 42.9 },

     // AFC South
     { city: 'Austin', nickname: 'Outlaws', abbreviation: 'AUS', conference: 'AFC', division: 'South', marketSize: 'large', stadiumType: 'domeRetractable', latitude: 30.3 },
     { city: 'San Antonio', nickname: 'Spurs', abbreviation: 'SAT', conference: 'AFC', division: 'South', marketSize: 'large', stadiumType: 'domeFixed', latitude: 29.4 },
     { city: 'Birmingham', nickname: 'Ironmen', abbreviation: 'BHM', conference: 'AFC', division: 'South', marketSize: 'small', stadiumType: 'outdoorWarm', latitude: 33.5 },
     { city: 'Memphis', nickname: 'Blues', abbreviation: 'MEM', conference: 'AFC', division: 'South', marketSize: 'medium', stadiumType: 'outdoorWarm', latitude: 35.1 },

     // AFC West
     { city: 'Portland', nickname: 'Timbers', abbreviation: 'POR', conference: 'AFC', division: 'West', marketSize: 'medium', stadiumType: 'outdoorCold', latitude: 45.5 },
     { city: 'Salt Lake', nickname: 'Mountaineers', abbreviation: 'SLC', conference: 'AFC', division: 'West', marketSize: 'small', stadiumType: 'outdoorCold', latitude: 40.8 },
     { city: 'Sacramento', nickname: 'Gold Rush', abbreviation: 'SAC', conference: 'AFC', division: 'West', marketSize: 'medium', stadiumType: 'outdoorWarm', latitude: 38.6 },
     { city: 'Albuquerque', nickname: 'Coyotes', abbreviation: 'ABQ', conference: 'AFC', division: 'West', marketSize: 'small', stadiumType: 'outdoorWarm', latitude: 35.1 },

     // NFC East
     { city: 'Brooklyn', nickname: 'Knights', abbreviation: 'BKN', conference: 'NFC', division: 'East', marketSize: 'large', stadiumType: 'outdoorCold', latitude: 40.7 },
     { city: 'Richmond', nickname: 'Rebels', abbreviation: 'RIC', conference: 'NFC', division: 'East', marketSize: 'small', stadiumType: 'outdoorWarm', latitude: 37.5 },
     { city: 'Raleigh', nickname: 'Oaks', abbreviation: 'RAL', conference: 'NFC', division: 'East', marketSize: 'medium', stadiumType: 'outdoorWarm', latitude: 35.8 },
     { city: 'Charleston', nickname: 'Captains', abbreviation: 'CHS', conference: 'NFC', division: 'East', marketSize: 'small', stadiumType: 'outdoorWarm', latitude: 32.8 },

     // NFC North
     { city: 'Toronto', nickname: 'Huskies', abbreviation: 'TOR', conference: 'NFC', division: 'North', marketSize: 'large', stadiumType: 'domeRetractable', latitude: 43.7 },
     { city: 'Omaha', nickname: 'Plainsmen', abbreviation: 'OMA', conference: 'NFC', division: 'North', marketSize: 'small', stadiumType: 'outdoorCold', latitude: 41.3 },
     { city: 'St. Louis', nickname: 'Archers', abbreviation: 'STL', conference: 'NFC', division: 'North', marketSize: 'medium', stadiumType: 'domeFixed', latitude: 38.6 },
     { city: 'Indianapolis', nickname: 'Racers', abbreviation: 'IND', conference: 'NFC', division: 'North', marketSize: 'medium', stadiumType: 'domeFixed', latitude: 39.8 },

     // NFC South
     { city: 'Orlando', nickname: 'Magic', abbreviation: 'ORL', conference: 'NFC', division: 'South', marketSize: 'large', stadiumType: 'domeFixed', latitude: 28.5 },
     { city: 'Savannah', nickname: 'Tides', abbreviation: 'SAV', conference: 'NFC', division: 'South', marketSize: 'small', stadiumType: 'outdoorWarm', latitude: 32.1 },
     { city: 'New Orleans', nickname: 'Voodoo', abbreviation: 'NOL', conference: 'NFC', division: 'South', marketSize: 'medium', stadiumType: 'domeFixed', latitude: 30.0 },
     { city: 'Mobile', nickname: 'Mariners', abbreviation: 'MOB', conference: 'NFC', division: 'South', marketSize: 'small', stadiumType: 'outdoorWarm', latitude: 30.7 },

     // NFC West
     { city: 'San Diego', nickname: 'Surf', abbreviation: 'SDG', conference: 'NFC', division: 'West', marketSize: 'large', stadiumType: 'outdoorWarm', latitude: 32.7 },
     { city: 'Las Vegas', nickname: 'Aces', abbreviation: 'LVG', conference: 'NFC', division: 'West', marketSize: 'large', stadiumType: 'domeFixed', latitude: 36.2 },
     { city: 'Phoenix', nickname: 'Firebirds', abbreviation: 'PHX', conference: 'NFC', division: 'West', marketSize: 'large', stadiumType: 'domeRetractable', latitude: 33.4 },
     { city: 'Honolulu', nickname: 'Volcanoes', abbreviation: 'HNL', conference: 'NFC', division: 'West', marketSize: 'small', stadiumType: 'outdoorWarm', latitude: 21.3 },
   ];
   ```
1. **League Structure** (`src/core/models/league/League.ts`)

   ```typescript
   export interface SeasonCalendar {
     currentYear: number;
     currentWeek: number;          // 1-18 regular, 19-22 playoffs
     currentPhase: 'preseason' | 'regularSeason' | 'playoffs' | 'offseason';
     offseasonPhase: number | null; // 1-12 if in offseason
   }

   export interface LeagueSettings {
     salaryCap: number;
     salaryFloor: number;
     rookiePoolTotal: number;
     franchiseTagMultipliers: Record<string, number>;  // By position
     practiceSquadSize: number;
     activeRosterSize: number;
     irSlots: number;
   }

   export interface PlayoffBracket {
     afcSeeds: Record<number, string>;  // Seed -> teamId
     nfcSeeds: Record<number, string>;
     wildCardResults: PlayoffMatchup[];
     divisionalResults: PlayoffMatchup[];
     conferenceResults: PlayoffMatchup[];
     superBowl: PlayoffMatchup | null;
   }

   export interface PlayoffMatchup {
     homeTeamId: string;
     awayTeamId: string;
     homeScore: number | null;
     awayScore: number | null;
     winnerId: string | null;
   }

   export interface League {
     id: string;
     name: string;

     // Teams
     teamIds: string[];

     // Calendar
     calendar: SeasonCalendar;

     // Settings
     settings: LeagueSettings;

     // Current season state
     standings: DivisionStandings;
     playoffBracket: PlayoffBracket | null;

     // History
     seasonHistory: SeasonSummary[];

     // Events
     upcomingEvents: LeagueEvent[];
   }

   export interface DivisionStandings {
     afc: {
       north: string[];  // TeamIds in order
       south: string[];
       east: string[];
       west: string[];
     };
     nfc: {
       north: string[];
       south: string[];
       east: string[];
       west: string[];
     };
   }

   export interface SeasonSummary {
     year: number;
     championTeamId: string;
     mvpPlayerId: string;
     draftOrder: string[];  // TeamIds
   }

   export interface LeagueEvent {
     id: string;
     type: 'injury' | 'trade' | 'signing' | 'firing' | 'award' | 'other';
     week: number;
     description: string;
     involvedTeamIds: string[];
     involvedPlayerIds: string[];
   }
   ```
1. **Draft Pick Model** (`src/core/models/league/DraftPick.ts`)

   ```typescript
   export interface DraftPick {
     id: string;
     year: number;
     round: number;
     originalTeamId: string;  // Who originally owned it
     currentTeamId: string;   // Who owns it now

     // After draft
     overallPick: number | null;  // Assigned during draft
     selectedPlayerId: string | null;

     // Trade tracking
     tradeHistory: PickTrade[];
   }

   export interface PickTrade {
     fromTeamId: string;
     toTeamId: string;
     tradeId: string;
     week: number;
     year: number;
   }

   // Compensatory pick tracking
   export interface CompensatoryPick extends DraftPick {
     compensatoryReason: string;  // "Lost FA: Player Name"
     round: 3 | 4 | 5 | 6 | 7;    // Comp picks only in rounds 3-7
   }
   ```
1. **Game State Model** (`src/core/models/game/GameState.ts`)

   ```typescript
   // The master state for a save file
   export interface GameState {
     saveSlot: 0 | 1 | 2;
     createdAt: string;
     lastSavedAt: string;

     // Your identity
     userTeamId: string;
     userName: string;

     // Core entities
     league: League;
     teams: Record<string, Team>;
     players: Record<string, Player>;
     coaches: Record<string, Coach>;
     scouts: Record<string, Scout>;
     owners: Record<string, Owner>;

     // Draft picks
     draftPicks: Record<string, DraftPick>;

     // Prospects (pre-draft players)
     prospects: Record<string, Prospect>;  // Defined in PR-13

     // Career stats
     careerStats: {
       seasonsCompleted: number;
       totalWins: number;
       totalLosses: number;
       playoffAppearances: number;
       championships: number;
       teamHistory: CareerTeamEntry[];
     };

     // Settings
     gameSettings: {
       autoSaveEnabled: boolean;
       simulationSpeed: 'fast' | 'normal' | 'detailed';
       notificationsEnabled: boolean;
     };
   }

   export interface CareerTeamEntry {
     teamId: string;
     teamName: string;
     yearsStart: number;
     yearsEnd: number | null;  // null if current
     record: { wins: number; losses: number };
     championships: number;
     firedOrQuit: 'fired' | 'quit' | 'current';
   }
   ```

### BRAND GUIDELINES COMPLIANCE

Before completing, verify:

- [ ] Owner personality traits shown as descriptions, not raw 1-100 numbers
- [ ] Patience meter thresholds visible, but exact value described qualitatively
- [ ] Team prestige/fanbasePassion hidden from direct view
- [ ] All 32 teams use FAKE city names (no real NFL cities)
- [ ] No overall team "power ranking" or aggregate rating

### TESTS TO WRITE

1. **owner.model.test.ts**
- Test Owner entity validates all fields
- Test patience threshold mappings
- Test demand system
1. **owner.viewmodel.test.ts**
- Test personality shows descriptions not numbers
- Test job security maps to correct status
1. **team.model.test.ts**
- Test Team entity validates all fields
- Test conference/division assignments
- Test roster size limits
1. **fakecities.test.ts**
- Test exactly 32 cities defined
- Test 4 teams per division
- Test no duplicate abbreviations
- Test all cities are fictional (not real NFL)
1. **league.model.test.ts**
- Test league structure
- Test playoff bracket logic
- Test standings calculation
1. **gamestate.test.ts**
- Test GameState serialization
- Test 3 save slots supported
- Test all entity references valid

### BOOLEAN CHECKPOINTS

```typescript
const checkpoints = {
  // Checkpoint 1: Dependencies exist
  dependenciesExist: () => {
    return fs.existsSync('src/core/models/player/Player.ts') &&
           fs.existsSync('src/core/models/staff/Coach.ts') &&
           fs.existsSync('src/core/models/staff/StaffHierarchy.ts');
  },

  // Checkpoint 2: All model files created
  modelsCreated: () => {
    const requiredFiles = [
      'src/core/models/owner/OwnerPersonality.ts',
      'src/core/models/owner/Owner.ts',
      'src/core/models/owner/PatienceMeter.ts',
      'src/core/models/team/TeamFinances.ts',
      'src/core/models/team/Stadium.ts',
      'src/core/models/team/Team.ts',
      'src/core/models/team/FakeCities.ts',
      'src/core/models/league/League.ts',
      'src/core/models/league/DraftPick.ts',
      'src/core/models/game/GameState.ts',
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
    const result = await runCommand('npm test -- --testPathPattern="(owner|team|league|gamestate)"');
    return result.exitCode === 0;
  },

  // Checkpoint 5: Exactly 32 fake cities
  has32Teams: () => {
    const cities = require('./src/core/models/team/FakeCities').FAKE_CITIES;
    return cities.length === 32;
  },

  // Checkpoint 6: No real NFL city names
  noRealNFLCities: () => {
    const realNFLCities = [
      'New York', 'Los Angeles', 'Chicago', 'Dallas', 'Houston',
      'Philadelphia', 'Washington', 'Miami', 'Atlanta', 'Boston',
      'Denver', 'Cleveland', 'Pittsburgh', 'Baltimore', 'Cincinnati',
      'Kansas City', 'Tampa Bay', 'Green Bay', 'Minnesota', 'Detroit',
      'Seattle', 'Arizona', 'Carolina', 'Jacksonville', 'Tennessee',
      'Buffalo', 'Las Vegas', 'San Francisco'
    ];
    const cities = require('./src/core/models/team/FakeCities').FAKE_CITIES;
    return !cities.some(c => realNFLCities.includes(c.city));
  },

  // Checkpoint 7: Owner view model hides raw numbers
  ownerViewModelSecure: () => {
    const ownerFile = fs.readFileSync('src/core/models/owner/Owner.ts', 'utf-8');
    const vmSection = ownerFile.split('OwnerViewModel')[1]?.split('}')?.[0] || '';
    // Should have descriptions, not number fields for traits
    return vmSection.includes('Description:') || vmSection.includes('description');
  },

  // Checkpoint 8: 3 save slots supported
  threeSaveSlots: () => {
    const gameStateFile = fs.readFileSync('src/core/models/game/GameState.ts', 'utf-8');
    return gameStateFile.includes('0 | 1 | 2');
  }
};

// ALL must return true before proceeding to PR-05
const canProceed = Object.values(checkpoints).every(check => check() === true);
```

### EXPECTED DELIVERABLES

1. Complete Owner entity with personality system
1. Patience meter with thresholds and modifiers
1. Team entity with finances, stadium, roster
1. 32 fake cities configuration
1. League structure with calendar and standings
1. Draft pick tracking system
1. GameState master model for saves
1. Comprehensive test coverage
1. Index exports from each model directory

### DO NOT

- Do not create UI components
- Do not implement owner AI logic (future PRs)
- Do not implement standings calculation logic (future PRs)
- Do not use real NFL city names
- Do not expose raw patience numbers (use status descriptions)

```
---

## Acceptance Criteria

| Criteria | Status |
|----------|--------|
| Owner model with personality system | ⬜ |
| Patience meter with thresholds | ⬜ |
| Team model complete | ⬜ |
| 32 fake cities defined | ⬜ |
| No real NFL cities used | ⬜ |
| League structure modeled | ⬜ |
| GameState supports 3 saves | ⬜ |
| All tests pass | ⬜ |
| All boolean checkpoints return TRUE | ⬜ |

---

## Files to Create
```
src/core/models/
├── owner/
│   ├── index.ts
│   ├── Owner.ts
│   ├── OwnerPersonality.ts
│   ├── PatienceMeter.ts
│   └── __tests__/
│       ├── owner.model.test.ts
│       └── owner.viewmodel.test.ts
├── team/
│   ├── index.ts
│   ├── Team.ts
│   ├── TeamFinances.ts
│   ├── Stadium.ts
│   ├── FakeCities.ts
│   └── __tests__/
│       ├── team.model.test.ts
│       └── fakecities.test.ts
├── league/
│   ├── index.ts
│   ├── League.ts
│   ├── DraftPick.ts
│   └── __tests__/
│       └── league.model.test.ts
└── game/
    ├── index.ts
    ├── GameState.ts
    └── __tests__/
        └── gamestate.test.ts
```
---

## Next PR
Upon successful completion of all checkpoints, proceed to **PR-05: Player Generation System**

# TODO Screens Implementation Plan

This document outlines the plan for completing all screens currently in a TODO/placeholder state.

## Executive Summary

| Screen | Priority | Complexity | Status | Est. Components |
|--------|----------|------------|--------|-----------------|
| Settings | P3 - Low | Low | Placeholder | 1 |
| Draft Room | P2 - Medium | Medium | Exists, not integrated | 0 (done) |
| Schedule | P1 - High | Medium | Alert only | 2-3 |
| Standings | P1 - High | Low | Alert only | 1-2 |
| Free Agency | P2 - Medium | High | Alert only | 3-4 |
| Staff | P3 - Low | Medium | Alert only | 2-3 |
| Finances | P3 - Low | Medium | Alert only | 2-3 |
| News | P2 - Medium | Medium | Alert only | 2 |

---

## Phase 1: Core Season Experience (High Priority)

### 1. Schedule Screen

**Current State:** Shows "Coming Soon" alert from dashboard

**Purpose:** Display the team's upcoming games, past results, and bye week

**UI Components:**
- `ScheduleScreen.tsx` - Main screen component
- `ScheduleGameCard.tsx` - Individual game card (home/away, opponent, date, result)
- `WeekSelector.tsx` - Navigate between weeks (optional, could reuse)

**Features:**
- Week-by-week view of all 18 regular season games
- Past games show final scores with W/L indicator
- Upcoming games show opponent, home/away, date
- Highlight current week
- Bye week indicator
- Season phase awareness (preseason/regular/playoffs)

**Data Requirements:**
```typescript
interface ScheduleGame {
  week: number;
  opponentId: string;
  opponentName: string;
  opponentAbbr: string;
  isHome: boolean;
  date: string;
  result?: {
    userScore: number;
    opponentScore: number;
    won: boolean;
  };
  isBye?: boolean;
}
```

**Integration:**
- Add `'schedule'` to Screen type in App.tsx
- Import and render ScheduleScreen
- Pass gameState to derive schedule from teams/league data

**Implementation Steps:**
1. Create `src/screens/ScheduleScreen.tsx`
2. Create `src/components/schedule/ScheduleGameCard.tsx`
3. Add navigation in App.tsx handleDashboardAction
4. Add mock schedule data or generate from league teams

---

### 2. Standings Screen

**Current State:** Shows "Coming Soon" alert from dashboard

**Purpose:** Display league standings by conference/division

**UI Components:**
- `StandingsScreen.tsx` - Main screen with standings tables
- `StandingsRow.tsx` - Individual team row component (optional)

**Features:**
- Conference standings (AFC/NFC style)
- Division standings with division headers
- Team records: W-L, PCT, PF, PA, DIFF
- Division leaders marked
- Playoff picture indicators (In/Out/Clinched)
- Toggle: By Division / By Conference
- User's team highlighted

**Data Requirements:**
```typescript
interface StandingsEntry {
  teamId: string;
  teamName: string;
  teamAbbr: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  ties: number;
  pct: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
  divisionRecord: string;
  conferenceRecord: string;
  isUserTeam: boolean;
  playoffStatus: 'clinched' | 'in' | 'out' | 'eliminated' | null;
}
```

**Integration:**
- Add `'standings'` to Screen type in App.tsx
- Calculate standings from all teams in gameState.teams

**Implementation Steps:**
1. Create `src/screens/StandingsScreen.tsx`
2. Add utility function `calculateStandings(teams)` in services
3. Add navigation in App.tsx handleDashboardAction

---

## Phase 2: Player Acquisition (Medium Priority)

### 3. Free Agency Screen

**Current State:** Shows "Coming Soon" alert from dashboard

**Purpose:** Browse and sign available free agents

**UI Components:**
- `FreeAgencyScreen.tsx` - Main screen
- `FreeAgentCard.tsx` - Player card with contract demands
- `ContractOfferModal.tsx` - Make offer interface
- `PositionFilter.tsx` - (reuse from DraftBoard)

**Features:**
- List of available free agents
- Filter by position
- Sort by: Projected value, Age, Position
- Player card shows: Name, Position, Age, Contract demands (years/salary)
- Make offer button → Modal with slider for years/salary
- Cap space indicator (always visible)
- Negotiation feedback (interested/rejected/accepted)

**Data Requirements:**
```typescript
interface FreeAgent {
  playerId: string;
  name: string;
  position: Position;
  age: number;
  skills: SkillSet;
  contractDemands: {
    minYears: number;
    maxYears: number;
    minSalary: number;
    askingSalary: number;
  };
  interest: 'high' | 'medium' | 'low';
  marketValue: number;
}

interface ContractOffer {
  years: number;
  salary: number;
  guaranteed: number;
}
```

**Integration:**
- Add `'freeAgency'` to Screen type
- Connect to player acquisition service
- Update roster and cap space on signing

**Implementation Steps:**
1. Create `src/screens/FreeAgencyScreen.tsx`
2. Create `src/components/freeAgency/FreeAgentCard.tsx`
3. Create `src/components/freeAgency/ContractOfferModal.tsx`
4. Add free agent generation/loading logic
5. Add navigation in App.tsx

---

### 4. Draft Room Integration

**Current State:** Component exists at `src/screens/DraftRoomScreen.tsx` but not connected to App.tsx navigation

**Purpose:** Live draft experience with real-time pick flow

**Existing Features (already coded):**
- Tab navigation (Board/Trades/Picks)
- Current pick display with timer
- Recent/upcoming picks list
- Trade offer viewing
- Auto-pick toggle
- Pause/resume functionality

**Missing Integration:**
- Add `'draftRoom'` to Screen type in App.tsx
- Add route from dashboard's draft action during draft phase
- Connect mock/real draft data
- Implement draft simulation loop

**Data Requirements:**
- Already defined in DraftRoomScreen.tsx (DraftPick, TradeOffer, DraftRoomProspect)
- Need: Draft state management service

**Implementation Steps:**
1. Add `'draftRoom'` to Screen type union in App.tsx
2. Import DraftRoomScreen in App.tsx
3. Add case in handleDashboardAction for transitioning to draft room
4. Create draft state management: current pick tracking, pick queue
5. Add mock draft simulation for AI picks
6. Connect DraftBoardScreen → DraftRoomScreen flow

---

### 5. News/Headlines Screen

**Current State:** Shows "Coming Soon" alert from dashboard

**Purpose:** Narrative-driven news feed for immersion

**UI Components:**
- `NewsScreen.tsx` - Main screen with news feed
- `NewsCard.tsx` - Individual headline/article card

**Features:**
- Chronological news feed
- Categories: Trades, Injuries, Team News, League News, Your Team
- Filter by category
- News cards with: Headline, summary, date, category badge
- Expandable for full article
- Auto-generate news based on game events

**Data Requirements:**
```typescript
interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  fullText?: string;
  category: 'trade' | 'injury' | 'team' | 'league' | 'yourTeam';
  date: string;
  week: number;
  teamIds?: string[]; // Related teams
  playerId?: string;  // Related player
  isRead: boolean;
}
```

**Implementation Steps:**
1. Create `src/screens/NewsScreen.tsx`
2. Create `src/components/news/NewsCard.tsx`
3. Create news generation service
4. Add navigation in App.tsx
5. Integrate news triggers with game events

---

## Phase 3: Team Management (Lower Priority)

### 6. Staff Screen

**Current State:** Shows "Coming Soon" alert from dashboard

**Purpose:** Manage coaching staff and scouts

**UI Components:**
- `StaffScreen.tsx` - Main screen
- `StaffCard.tsx` - Coach/Scout card
- `HireModal.tsx` - Hire new staff interface

**Features:**
- Tabs: Coaches / Scouts
- Current staff list with roles
- Staff ratings/specialties
- Fire/Hire functionality
- Budget indicator
- Staff effects on team (development, scouting accuracy)

**Data Requirements:**
```typescript
interface StaffMember {
  id: string;
  name: string;
  role: 'headCoach' | 'offensiveCoord' | 'defensiveCoord' | 'positionCoach' | 'scout';
  specialty?: Position | 'offense' | 'defense';
  rating: number;
  salary: number;
  yearsRemaining: number;
}
```

**Implementation Steps:**
1. Create `src/screens/StaffScreen.tsx`
2. Create `src/components/staff/StaffCard.tsx`
3. Add staff to GameState model
4. Create staff hiring/firing service
5. Add navigation in App.tsx

---

### 7. Finances Screen

**Current State:** Shows "Coming Soon" alert from dashboard

**Purpose:** Salary cap management and contract overview

**UI Components:**
- `FinancesScreen.tsx` - Main screen
- `CapSpaceBar.tsx` - Visual cap space indicator
- `ContractListItem.tsx` - Player contract row

**Features:**
- Salary cap overview (used/available/dead money)
- Visual cap space bar
- Player contracts list sorted by salary
- Contract details: years remaining, guaranteed, cap hit
- Filter by position
- Future cap projections (next 2-3 years)
- Restructure/Cut options (future)

**Data Requirements:**
```typescript
interface TeamFinances {
  salaryCap: number;
  currentSpending: number;
  deadMoney: number;
  availableCap: number;
  contracts: PlayerContract[];
  futureCapProjections: { year: number; projected: number }[];
}

interface PlayerContract {
  playerId: string;
  playerName: string;
  position: Position;
  totalValue: number;
  yearsRemaining: number;
  currentYearCap: number;
  guaranteed: number;
  canCut: boolean;
  canRestructure: boolean;
}
```

**Implementation Steps:**
1. Create `src/screens/FinancesScreen.tsx`
2. Create `src/components/finances/CapSpaceBar.tsx`
3. Ensure contracts are tracked in player/team models
4. Add financial calculations utility
5. Add navigation in App.tsx

---

### 8. Settings Screen

**Current State:** Placeholder in App.tsx (lines 281-296)

**Purpose:** User preferences and game settings

**UI Components:**
- `SettingsScreen.tsx` - Main settings screen

**Features:**
- Sections: Game / Audio / Display / Data
- Game settings:
  - Simulation speed
  - Auto-save frequency
  - Difficulty (affects AI trade logic, draft accuracy)
- Audio settings:
  - Sound effects on/off
  - Music on/off (if applicable)
  - Volume sliders
- Display settings:
  - Dark/Light mode (future)
  - Text size
- Data settings:
  - Clear save data
  - Export data
  - Reset to defaults
- About section with version info

**Data Requirements:**
```typescript
interface GameSettings {
  simulationSpeed: 'slow' | 'normal' | 'fast';
  autoSaveFrequency: 'never' | 'weekly' | 'daily';
  difficulty: 'easy' | 'normal' | 'hard';
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
}
```

**Implementation Steps:**
1. Create `src/screens/SettingsScreen.tsx`
2. Create settings storage service
3. Replace placeholder in App.tsx with actual component
4. Persist settings to AsyncStorage
5. Apply settings throughout app

---

## Implementation Order Recommendation

Based on user experience impact and dependencies:

### Sprint 1: Core Display Screens
1. **Standings Screen** - Simple, high value, shows league context
2. **Schedule Screen** - Essential for season progression understanding

### Sprint 2: Player Acquisition Flow
3. **Draft Room Integration** - Already built, just needs wiring
4. **Free Agency Screen** - Completes player acquisition loop

### Sprint 3: Immersion & Management
5. **News Screen** - Adds narrative depth
6. **Finances Screen** - Cap management visibility

### Sprint 4: Polish & Settings
7. **Staff Screen** - Team customization
8. **Settings Screen** - User preferences

---

## Technical Notes

### Navigation Updates Required

Add to `Screen` type in App.tsx:
```typescript
type Screen =
  | 'loading'
  | 'start'
  | 'teamSelection'
  | 'dashboard'
  | 'gamecast'
  | 'draftBoard'
  | 'draftRoom'      // NEW
  | 'playerProfile'
  | 'settings'
  | 'schedule'       // NEW
  | 'standings'      // NEW
  | 'freeAgency'     // NEW
  | 'staff'          // NEW
  | 'finances'       // NEW
  | 'news';          // NEW
```

### Shared Components Needed
- `BackButton.tsx` - Consistent back navigation
- `LoadingOverlay.tsx` - For async operations
- `EmptyState.tsx` - Consistent empty state messaging

### Data Generation Services
- Schedule generation from team/league data
- Standings calculation utility
- Free agent pool generation
- News article generation based on events

---

## File Structure

```
src/
├── screens/
│   ├── ScheduleScreen.tsx       (NEW)
│   ├── StandingsScreen.tsx      (NEW)
│   ├── FreeAgencyScreen.tsx     (NEW)
│   ├── NewsScreen.tsx           (NEW)
│   ├── StaffScreen.tsx          (NEW)
│   ├── FinancesScreen.tsx       (NEW)
│   ├── SettingsScreen.tsx       (NEW)
│   └── DraftRoomScreen.tsx      (EXISTS - integrate)
├── components/
│   ├── schedule/
│   │   └── ScheduleGameCard.tsx (NEW)
│   ├── freeAgency/
│   │   ├── FreeAgentCard.tsx    (NEW)
│   │   └── ContractOfferModal.tsx (NEW)
│   ├── news/
│   │   └── NewsCard.tsx         (NEW)
│   ├── staff/
│   │   └── StaffCard.tsx        (NEW)
│   └── finances/
│       └── CapSpaceBar.tsx      (NEW)
└── services/
    ├── ScheduleService.ts       (NEW)
    ├── StandingsService.ts      (NEW)
    ├── FreeAgencyService.ts     (NEW)
    ├── NewsService.ts           (NEW)
    └── SettingsService.ts       (NEW)
```

---

## Brand Guidelines Reminder

Per project brand guidelines:
- **NO overall player ratings** - Use skill ranges and tiers instead
- Focus on projected value and user evaluation
- Maintain GM perspective (not player control)
- Keep UI consistent with existing screens (colors, spacing, typography from `src/styles`)

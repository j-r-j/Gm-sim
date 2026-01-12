# PR-19: Job Market & Career Continuity

## Objective

Allow career continuation after firing - interview with other teams, track record affects offers.

## Dependencies

- **PR-18**: Owner Patience & Job Security ✅

## Branch Name

`feature/pr-19-job-market`

---

## AI Developer Prompt

```
You are building an NFL GM Simulation Expo mobile game. This is PR-19 of 25.

### REQUIREMENTS

1. **Job Market Manager** (`src/core/career/JobMarketManager.ts`)
   - Track available openings
   - Interest level based on your record
   - Team situation descriptions

2. **Interview System** (`src/core/career/InterviewSystem.ts`)
   - Request interviews
   - Better record = better offers
   - Owner info revealed before accepting

3. **Career Record Tracker** (`src/core/career/CareerRecordTracker.ts`)
   - Total seasons
   - Teams worked for
   - Overall record
   - Championships
   - Reputation score

4. **Unemployment Year** (`src/core/career/UnemploymentYear.ts`)
   - Wait one year option
   - Watch league unfold
   - New openings appear

5. **Retirement System** (`src/core/career/RetirementSystem.ts`)
   - End career voluntarily
   - Career summary
   - Legacy calculation

### BOOLEAN CHECKPOINTS
1. Job openings generate
2. Interviews work
3. Career tracks across teams
4. Retirement ends career
```

---

## Implementation Details

### 1. Job Market Manager

The `JobMarketManager` handles available GM positions across the league:

- **Opening Tracking**: Monitors which teams have vacant GM positions
- **Opening Generation**: Creates openings based on firings, retirements, and expansions
- **Team Situation Analysis**: Describes each team's roster, cap space, and owner
- **Interest Level Calculation**: Determines how interested teams are based on career record
- **Market Refresh**: Updates openings after offseason events

### 2. Interview System

The `InterviewSystem` manages the job application and interview process:

- **Interview Requests**: Player can request interviews with interested teams
- **Interest Tiers**: Elite (top candidates), High, Moderate, Low, None
- **Performance-Based**: Better career records unlock better opportunities
- **Owner Preview**: Reveals owner personality before accepting offers
- **Offer Generation**: Creates contract offers based on mutual interest
- **Acceptance Flow**: Player accepts/declines offers with consequences

### 3. Career Record Tracker

The `CareerRecordTracker` maintains comprehensive career statistics:

- **Career Totals**: Overall wins, losses, ties across all teams
- **Team History**: List of all teams worked for with tenure details
- **Achievements**: Championships, playoff appearances, awards
- **Reputation Score**: Dynamic value based on performance and decisions
- **Season Snapshots**: Year-by-year record for career timeline

### 4. Unemployment Year

The `UnemploymentYear` system handles seasons without a job:

- **Year Simulation**: Simulates the league year while player watches
- **Opening Monitoring**: Tracks new openings as they occur
- **Reputation Decay**: Slight reputation decrease while unemployed
- **Media Narrative**: Generates storylines about player's situation
- **Re-entry Points**: Allows applying for jobs at season end

### 5. Retirement System

The `RetirementSystem` handles voluntary career endings:

- **Retirement Trigger**: Player can retire at any time
- **Career Summary**: Comprehensive overview of career achievements
- **Legacy Calculation**: Final legacy score based on championships, wins, reputation
- **Hall of Fame Check**: Determines if career warrants HOF consideration
- **Final Statistics**: Permanent record of career accomplishments

---

## File Structure

```
src/core/career/
├── JobMarketManager.ts          # Job openings and market state
├── InterviewSystem.ts           # Interview and offer management
├── CareerRecordTracker.ts       # Career statistics tracking
├── UnemploymentYear.ts          # Handling unemployed seasons
├── RetirementSystem.ts          # Career ending and legacy
└── __tests__/
    ├── jobMarketManager.test.ts
    ├── interviewSystem.test.ts
    ├── careerRecordTracker.test.ts
    ├── unemploymentYear.test.ts
    └── retirementSystem.test.ts
```

---

## Integration Points

- **FiringMechanics**: Triggers job market entry when player is fired
- **Owner Model**: Uses owner personality for interview/offer decisions
- **GameState**: Updates career stats and current team assignment
- **Season Module**: Coordinates with unemployment year simulation
- **PatienceMeterManager**: Fresh patience meter on new team

---

## Career Flow

```
Playing → Fired → Job Market → Interview → New Job → Playing
                     ↓
               Unemployment Year
                     ↓
                  Retire (or continue searching)
```

---

## Interest Level Tiers

| Tier | Reputation Range | Description |
|------|-----------------|-------------|
| Elite | 85-100 | Top candidate, multiple offers |
| High | 70-84 | Strong interest, good offers |
| Moderate | 50-69 | Some interest, average offers |
| Low | 30-49 | Limited interest, poor offers |
| None | 0-29 | No interest from any team |

---

## Reputation Factors

- **Base**: 50 (starting reputation)
- **Championship**: +15 per title
- **Playoff Appearance**: +3 per appearance
- **Winning Season**: +2 per season
- **Losing Season**: -1 per season
- **Fired**: -10 per firing
- **Unemployment**: -3 per year unemployed
- **Owner Approval**: +/- based on final patience level

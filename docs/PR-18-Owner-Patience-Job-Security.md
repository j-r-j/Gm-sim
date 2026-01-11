# PR-18: Owner Patience & Job Security

## Objective

Implement the patience meter (1-100) with thresholds: Secure (70-100), Stable (50-69), Warm Seat (35-49), Hot Seat (20-34), Fired (0-19).

## Dependencies

- **PR-17**: Owner Personality ✅

## Branch Name

`feature/pr-18-owner-patience`

---

## AI Developer Prompt

```
You are building an NFL GM Simulation Expo mobile game. This is PR-18 of 25.

### REQUIREMENTS

1. **Patience Meter Manager** (`src/core/career/PatienceMeterManager.ts`)
   - Value 1-100 (hidden exact number)
   - Status: secure, stable, warmSeat, hotSeat, fired
   - Trend tracking
   - Event modifiers (Super Bowl: +30-50, losing season: -10-25)

2. **Patience Event Processor** (`src/core/career/PatienceEventProcessor.ts`)
   - Process season/playoff results
   - Process PR events
   - Track demand compliance

3. **Firing Mechanics** (`src/core/career/FiringMechanics.ts`)
   - Reason generation
   - Severance calculation
   - Tenure summary
   - Legacy tracking

4. **Owner Expectations System** (`src/core/career/OwnerExpectationsSystem.ts`)
   - Short/long term expectations
   - Timeline visibility
   - Minimum acceptable outcomes

### BRAND GUIDELINES
- [ ] Meter shown as status, not number
- [ ] Thresholds hidden
- [ ] Events show qualitative impact

### BOOLEAN CHECKPOINTS
1. Patience updates on events
2. Status thresholds work
3. Firing triggers correctly
4. No exact values exposed
```

---

## Implementation Details

### 1. Patience Meter Manager

The `PatienceMeterManager` handles all patience-related state management:

- **State Tracking**: Maintains current patience value, historical values, and trend data
- **Status Calculation**: Converts numeric value to qualitative status (secure, stable, warmSeat, hotSeat, fired)
- **Trend Analysis**: Tracks weekly changes to show improving/declining/stable trends
- **View Model**: Exposes only qualitative information to the player (no raw numbers)

### 2. Patience Event Processor

The `PatienceEventProcessor` processes game events and updates patience:

- **Season Events**: Win/loss records, playoff results, Super Bowl outcomes
- **PR Events**: Scandals, positive media coverage, community involvement
- **Demand Compliance**: Rewards for meeting owner demands, penalties for ignoring them
- **Weighted Impacts**: Events have different impact ranges based on significance

### 3. Firing Mechanics

The `FiringMechanics` system handles GM termination:

- **Firing Triggers**: Low patience, consecutive losing seasons, defiance of owner
- **Reason Generation**: Creates contextual firing reasons based on history
- **Severance Calculation**: Based on tenure, contract, and circumstances
- **Tenure Summary**: Creates a record of the GM's time with the team
- **Legacy Tracking**: Records achievements and failures for career history

### 4. Owner Expectations System

The `OwnerExpectationsSystem` manages owner expectations and timelines:

- **Short-term Expectations**: Season-by-season goals (wins, playoffs, etc.)
- **Long-term Expectations**: Multi-year objectives (championship window, rebuild timeline)
- **Timeline Management**: Tracks deadlines and generates pressure
- **Minimum Outcomes**: Defines the floor for acceptable performance

---

## File Structure

```
src/core/career/
├── PatienceMeterManager.ts      # Core patience tracking
├── PatienceEventProcessor.ts    # Event processing
├── FiringMechanics.ts           # Termination handling
├── OwnerExpectationsSystem.ts   # Expectations management
└── __tests__/
    ├── patienceMeterManager.test.ts
    ├── patienceEventProcessor.test.ts
    ├── firingMechanics.test.ts
    └── ownerExpectationsSystem.test.ts
```

---

## Integration Points

- **Owner Model**: Uses existing `Owner` entity and `PatienceMeter` types
- **Mood System**: Coordinates with `OwnerMoodSystem` for consistent reactions
- **Interference System**: Integrates with demand compliance tracking
- **Season Module**: Receives end-of-season/playoff results

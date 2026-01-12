# Phase 6: Polish & UI (PRs 21-25)

-----

# PR-23: Gamecast Mode UI

## Objective

Live game watching - field view, play-by-play, sim controls.

## Dependencies

- **PR-22** ✅

## Branch Name

`feature/pr-23-gamecast-ui`

## AI Developer Prompt

```
### REQUIREMENTS

1. **GamecastScreen** - Main game viewing
2. **FieldVisualization** - Field with ball position
3. **Scoreboard** - Score, clock, timeouts
4. **PlayByPlayFeed** - Scrollable history
5. **SimControls** - Watch Play, Quick Sim, Sim to End

### BRAND GUIDELINES
- [ ] No probabilities shown
- [ ] Only outcomes visible
```

## Implementation Details

### Components Structure

```
src/
├── screens/
│   └── GamecastScreen.tsx       # Main game viewing screen
├── components/
│   └── gamecast/
│       ├── index.ts             # Public exports
│       ├── FieldVisualization.tsx  # Football field with ball position
│       ├── Scoreboard.tsx       # Score, clock, timeouts display
│       ├── PlayByPlayFeed.tsx   # Scrollable play history
│       └── SimControls.tsx      # Simulation control buttons
└── styles/
    └── theme.ts                 # Shared theme constants
```

### Component Specifications

#### 1. GamecastScreen
- Main container for all gamecast components
- Manages game state and simulation flow
- Integrates with GameRunner for play-by-play simulation
- Handles mode switching (watch play, quick sim, sim to end)

#### 2. FieldVisualization
- Visual representation of football field
- Shows ball position (yard line)
- Displays down and distance marker
- Direction indicator for offense
- Uses only outcome data (no probabilities)

#### 3. Scoreboard
- Team names and logos placeholder
- Current score for both teams
- Quarter and time remaining
- Timeouts remaining for each team
- Possession indicator

#### 4. PlayByPlayFeed
- Scrollable list of play descriptions
- Scoring plays highlighted
- Turnover plays highlighted
- Auto-scrolls to most recent play
- Filtered to show only outcomes (no internal mechanics)

#### 5. SimControls
- "Watch Play" - Executes single play with animation delay
- "Quick Sim" - Simulates one drive instantly
- "Sim Quarter" - Simulates to end of quarter
- "Sim to End" - Completes entire game
- Disabled appropriately when game is over

### Data Flow

```
GameRunner (core/game)
    ↓
LiveGameState
    ↓
GamecastScreen (orchestrator)
    ↓
┌──────────────────────────────────────────┐
│  Scoreboard (score, clock, timeouts)     │
│  FieldVisualization (field, ball pos)    │
│  PlayByPlayFeed (play descriptions)      │
│  SimControls (user interaction)          │
└──────────────────────────────────────────┘
```

### Privacy Enforcement

The Gamecast Mode UI follows the "black box" principle:
- No probability values shown
- No effective ratings displayed
- No dice roll results visible
- Only play descriptions and outcomes shown
- Statistics displayed as final results only

### Integration Points

- `GameRunner` from `src/core/game/GameRunner.ts`
- `LiveGameState` from `src/core/engine/GameStateMachine.ts`
- `PlayResult` from `src/core/engine/PlayResolver.ts`
- `generatePlayDescription` from `src/core/engine/PlayDescriptionGenerator.ts`

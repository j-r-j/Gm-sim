# PR-13: Prospect Generation & Draft Class System

## Objective

Implement procedural draft class generation - 250+ prospects annually from state-named colleges with variable class strength.

## Dependencies

- **Phase 1-3 Complete** ✅

## Branch Name

`feature/pr-13-prospect-generation`

## AI Developer Prompt

```
You are building an NFL GM Simulation Expo mobile game. This is PR-13 of 25.

### CONTEXT
Draft classes are fully procedural each year. Prospects come from state-named colleges (e.g., "State of Ohio"). Class strength varies. Physical measurements visible at combine, but skills remain as ranges.

### REQUIREMENTS

1. **College Program Generator** (`src/core/draft/CollegeProgramGenerator.ts`)
   - ~130 programs named by state
   - Conference affiliations
   - Prestige ratings (hidden)

2. **Draft Class Generator** (`src/core/draft/DraftClassGenerator.ts`)
   - 250-300 prospects per year
   - Variable class strength (weak to historic)
   - Position distribution matching NFL needs

3. **Prospect Entity** (`src/core/draft/Prospect.ts`)
   - Extends Player model
   - College stats
   - Scout reports array
   - Consensus/user rankings

4. **Combine Simulator** (`src/core/draft/CombineSimulator.ts`)
   - ~330 invites
   - Physical measurements revealed
   - Interview impressions
   - Medical evaluation

5. **Pro Day Simulator** (`src/core/draft/ProDaySimulator.ts`)
   - For non-combine invites
   - Individual workouts

6. **Class Strength System** (`src/core/draft/ClassStrengthSystem.ts`)
   - Affects elite prospect count
   - Affects skill ceiling distribution

### BRAND GUIDELINES
- [ ] Physicals visible after combine
- [ ] Skills remain as RANGES
- [ ] Prospect quality unknown until NFL

### BOOLEAN CHECKPOINTS
1. 250+ prospects per class
2. All positions represented
3. State-named colleges
4. Combine reveals physicals only
```

## Implementation Details

### File Structure
```
src/core/draft/
├── CollegeProgramGenerator.ts   # ~130 state-named college programs
├── ClassStrengthSystem.ts       # Draft class quality variation
├── Prospect.ts                  # Prospect entity extending Player
├── DraftClassGenerator.ts       # Main draft class generation
├── CombineSimulator.ts          # NFL Combine simulation
├── ProDaySimulator.ts           # Pro Day workouts
├── index.ts                     # Module exports
└── __tests__/
    ├── collegeProgramGenerator.test.ts
    ├── classStrengthSystem.test.ts
    ├── prospect.test.ts
    ├── draftClassGenerator.test.ts
    ├── combineSimulator.test.ts
    └── proDaySimulator.test.ts
```

### Key Design Decisions

1. **State-Named Colleges**: All colleges use fictional "State of [X]" naming convention to avoid licensing issues while maintaining realism.

2. **Hidden Prestige**: College prestige ratings affect prospect development but are never shown to the player.

3. **Physical Revelation**: Combine/Pro Day reveals exact physical measurements, but skills remain as ranges (consistent with scouting system).

4. **Class Strength Impact**: Affects the distribution of elite prospects and overall skill ceilings in a draft class.

### Integration Points

- Uses existing `Player` model and generation sub-systems
- Integrates with `ScoutingSystem` for prospect evaluation
- Feeds into `DraftPick` model for draft execution
- College programs provide `collegeId` for player metadata

# PR-11: Scouting Department & Scout Attributes

## Objective

Implement the scouting department with 8 positions, scout attribute system, and auto-scouting vs focus player mechanics.

## Dependencies

- **PR-09 & PR-10**: Coaching System ✅

## Branch Name

`feature/pr-11-scouting-department`

-----

## AI Developer Prompt

```
You are building an NFL GM Simulation React Native mobile game. This is PR-11 of 25.

### CONTEXT
Scouts auto-scout their regions but provide wider skill ranges. Focus players (3-5 max) get deeper evaluation with narrower ranges and more trait reveals. Scout quality is UNKNOWN initially and learned through years of hits/misses.

### YOUR TASK
Implement the scouting department and evaluation mechanics.

### REQUIREMENTS

1. **Scouting Department Manager** (`src/core/scouting/ScoutingDepartmentManager.ts`)
   - Manage 8 scouting positions
   - Handle regional assignments
   - Track scout contracts and budget

2. **Auto-Scouting System** (`src/core/scouting/AutoScoutingSystem.ts`)
   - Generate basic reports for all prospects in region
   - Wider skill ranges for auto-scouted players
   - Basic trait coverage only

3. **Focus Player System** (`src/core/scouting/FocusPlayerSystem.ts`)
   - Limit focus players to 3-5
   - Narrower skill ranges through cross-referencing
   - More traits revealed
   - Character/personality insights
   - Medical deep dives
   - Scheme fit analysis

4. **Scout Accuracy System** (`src/core/scouting/ScoutAccuracySystem.ts`)
   - Track scout evaluation accuracy over time
   - Build track record from hits/misses
   - Reveal scout strengths/weaknesses after 5+ years
   - Position-specific accuracy tracking

5. **Pro Scouting System** (`src/core/scouting/ProScoutingSystem.ts`)
   - Evaluate other teams' players
   - Information varies by player age/status
   - Support trade evaluation

### BRAND GUIDELINES
- [ ] Scout evaluation accuracy starts UNKNOWN
- [ ] Scout quality revealed gradually over years
- [ ] Skill ranges are always shown (never true values)
- [ ] Track record builds authentically

### TESTS TO WRITE
- scoutingDepartmentManager.test.ts
- autoScoutingSystem.test.ts
- focusPlayerSystem.test.ts
- scoutAccuracySystem.test.ts
- proScoutingSystem.test.ts

### BOOLEAN CHECKPOINTS
1. 8 scouting positions managed
2. Focus players limited correctly
3. Skill ranges narrow with focus
4. Scout accuracy hidden initially
5. Track record builds over years
```

## Implementation Details

### 1. Scouting Department Manager

The ScoutingDepartmentManager handles the 8-position scouting department hierarchy:

- **Scouting Director**: Oversees entire department (1 position)
- **National Scouts**: Cover entire country for top prospects (2 positions)
- **Regional Scouts**: Cover specific regions (4 positions - Northeast, Southeast, Midwest/Southwest, West)
- **Pro Scout**: Evaluates other teams' players for trades (1 position)

**Key Features:**
- Budget allocation and salary tracking
- Regional assignment management
- Contract handling (hire/fire/renew)
- Department completeness tracking

### 2. Auto-Scouting System

The AutoScoutingSystem generates basic prospect reports automatically:

- **Coverage**: All prospects in assigned region
- **Skill Ranges**: Wider ranges (±15-25 points from true value)
- **Trait Coverage**: Only basic/observable traits revealed
- **Speed**: Scout speed attribute determines coverage rate

**Report Generation:**
- Basic physical measurements
- Broad skill ranges based on scout evaluation ability
- Limited trait visibility
- No character/personality insights

### 3. Focus Player System

The FocusPlayerSystem provides deep evaluation for selected prospects:

- **Limit**: 3-5 focus players per scout (configurable by scout experience)
- **Skill Ranges**: Narrower ranges (±5-10 points from true value)
- **Cross-Referencing**: Multiple scouts on same player narrows range further
- **Full Trait Reveal**: All traits visible with focus scouting

**Deep Evaluation Includes:**
- Medical history deep dive
- Character/personality assessment
- Scheme fit analysis
- Interview insights
- Combine/workout grades

### 4. Scout Accuracy System

The ScoutAccuracySystem tracks and reveals scout reliability over time:

- **Initial State**: All scout accuracy starts as UNKNOWN
- **Track Record Building**: Evaluations compared to actual player performance
- **Reliability Threshold**: 20+ evaluations before revealing overall accuracy
- **Tendencies**: Position-specific strengths/weaknesses revealed after 5+ years

**Hidden Mechanics:**
- True accuracy values never exposed
- Only qualitative descriptions shown to user
- Track record builds authentically through gameplay

### 5. Pro Scouting System

The ProScoutingSystem evaluates players on other teams for trade purposes:

- **Information Availability**: Varies by player status/age
- **Contract Visibility**: Based on public knowledge
- **Performance Trending**: Recent performance indicators
- **Trade Value Estimation**: Approximate value for trade discussions

**Limitations:**
- Less accurate than having player on your team
- Cannot see hidden attributes
- Relies on pro scout's evaluation ability

## Testing Strategy

Each component will have comprehensive unit tests covering:
- Position management and assignments
- Focus player limits enforcement
- Skill range calculations (auto vs focus)
- Accuracy revelation logic
- Track record accumulation
- Pro scouting report generation
- Edge cases and boundary conditions

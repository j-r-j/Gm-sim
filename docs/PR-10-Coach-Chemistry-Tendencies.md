# PR-10: Coach Chemistry & Play-Calling Tendencies

## Objective

Implement the coordinator tendency system that drives play calling and coach-player chemistry that affects performance.

## Dependencies

- **PR-09**: Coaching Hierarchy ✅

## Branch Name

`feature/pr-10-coach-chemistry`

-----

## AI Developer Prompt

```
You are building an NFL GM Simulation React Native mobile game. This is PR-10 of 25.

### CONTEXT
Coordinators have tendencies that determine play calling (run/pass split, blitz rate, etc.). Coaches have chemistry with individual players (-10 to +10) that affects development and performance.

### YOUR TASK
Implement coordinator tendencies and coach-player chemistry.

### REQUIREMENTS

1. **Tendency Profile Manager** (`src/core/coaching/TendencyProfileManager.ts`)
   - Generate coordinator tendency profiles
   - Handle situational adjustments
   - Calculate play call probabilities based on game state

2. **Chemistry Calculator** (`src/core/coaching/ChemistryCalculator.ts`)
   - Calculate coach-player chemistry
   - Track chemistry changes over time
   - Apply chemistry bonuses/penalties to performance

3. **Play Calling Engine Integration** (`src/core/coaching/PlayCallingIntegration.ts`)
   - Connect tendencies to simulation engine
   - Apply adjustments for score differential
   - Handle weather and situation overrides

4. **Coach Personality Effects** (`src/core/coaching/PersonalityEffects.ts`)
   - Implement personality type interactions
   - Calculate staff chemistry based on personalities
   - Handle conflict detection

### BRAND GUIDELINES
- [ ] Chemistry values never shown as numbers
- [ ] Tendencies described qualitatively to user
- [ ] Play calling happens automatically, not user-controlled

### TESTS TO WRITE
- tendencyProfileManager.test.ts
- chemistryCalculator.test.ts
- playCallingIntegration.test.ts
- personalityEffects.test.ts

### BOOLEAN CHECKPOINTS
1. Tendencies affect play calling distribution
2. Chemistry modifies effective ratings
3. Personality conflicts detected correctly
4. Situational adjustments apply
5. No raw chemistry values exposed
```

## Implementation Details

### 1. Tendency Profile Manager

The TendencyProfileManager handles coordinator tendency profiles that drive play-calling decisions:

- **Offensive Tendencies**: Run/pass ratio, play action frequency, deep passing tendency, screen play usage
- **Defensive Tendencies**: Blitz rate, man vs zone coverage preference, aggressive vs conservative play
- **Situational Adjustments**: Modify tendencies based on score differential, time remaining, field position

### 2. Chemistry Calculator

The ChemistryCalculator manages coach-player relationships:

- **Chemistry Range**: -10 to +10 (never exposed as raw numbers to users)
- **Factors Affecting Chemistry**: Personality compatibility, performance, scheme fit
- **Performance Impact**: Chemistry bonuses/penalties applied to effective player ratings

### 3. Play Calling Integration

The PlayCallingIntegration connects tendencies to the simulation engine:

- **Play Selection**: Weighted random selection based on tendency profiles
- **Game State Awareness**: Adjustments for score, time, weather conditions
- **Automatic Execution**: No user control over individual play calls

### 4. Personality Effects

The PersonalityEffects module handles personality-based interactions:

- **Personality Types**: Various coach and player personality archetypes
- **Compatibility Matrix**: Which personality types work well together
- **Conflict Detection**: Identify problematic personality combinations

## Testing Strategy

Each component will have comprehensive unit tests covering:
- Edge cases and boundary conditions
- Integration between components
- Qualitative description generation (no raw numbers)
- Situational adjustment accuracy

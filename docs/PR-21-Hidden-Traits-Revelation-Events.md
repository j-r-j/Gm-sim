# Phase 6: Polish & UI (PRs 21-25)

-----

# PR-21: Hidden Traits & Revelation Events

## Objective

Implement the system that reveals hidden player traits through in-game events and performance patterns - never directly.

## Dependencies

- **All previous phases** ✅

## Branch Name

`feature/pr-21-hidden-traits`

## AI Developer Prompt

```
You are building an NFL GM Simulation Expo mobile game. This is PR-21 of 25.

### REQUIREMENTS

1. **Trait Revelation Engine** (`src/core/traits/TraitRevelationEngine.ts`)
   - Check game events for trait revelations
   - Return revelations with confidence levels

2. **Revelation Triggers** (`src/core/traits/RevelationTriggers.ts`)
   - Clutch: game-winning playoff TD
   - Chokes: drops crucial pass
   - Hot Head: fight at practice
   - Iron Man: plays every game 3+ seasons
   - Injury Prone: misses 4+ games multiple seasons

3. **Pattern Recognition** (`src/core/traits/PatternRecognitionSystem.ts`)
   - Track performance over time
   - Build confidence levels

4. **News Event Generator** (`src/core/traits/NewsEventGenerator.ts`)
   - Trait-revealing news stories
   - Subtle hints vs confirmations

### BRAND GUIDELINES
- [ ] Traits NEVER shown as labels until confirmed
- [ ] "It" factor never directly revealed
```

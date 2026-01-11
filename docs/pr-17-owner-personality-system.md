# Phase 5: Career Mode (PRs 17-20)

-----

# PR-17: Owner Personality System

## Objective

Implement the owner personality system with traits, interference events, and the relationship between owner and GM that creates tension and consequences.

## Dependencies

- **Phase 1-4 Complete** ✅

## Branch Name

`feature/pr-17-owner-personality`

-----

## AI Developer Prompt

```
You are building an NFL GM Simulation Expo mobile game. This is PR-17 of 25.

### CONTEXT
Owners create tension. They have personalities (Patient/Impatient, Cheap/Big Spender, Hands-Off/Meddler) that affect your job security, budget, and freedom. Owners can force your hand on decisions.

### REQUIREMENTS

1. **Owner Personality Engine** (`src/core/career/OwnerPersonalityEngine.ts`)
   - Generate owner personalities based on team/market
   - Primary traits: patience, spending, control, loyalty, ego (1-100, hidden)
   - Secondary traits: analyticsBeliever, oldSchool, winNow, etc.
   - Convert to user-visible descriptions

2. **Interference System** (`src/core/career/InterferenceSystem.ts`)
   - Detect intervention triggers
   - Generate demands (sign/fire/draft)
   - Track compliance/defiance
   - Calculate consequences

3. **Owner Demand Generator** (`src/core/career/OwnerDemandGenerator.ts`)
   - Types: signPlayer, fireCoach, draftPlayer, tradeFor
   - Deadlines and penalties
   - Consequence descriptions

4. **Owner Mood System** (`src/core/career/OwnerMoodSystem.ts`)
   - Track satisfaction
   - Generate mood events
   - Affect trust level

5. **Ownership Change System** (`src/core/career/OwnershipChangeSystem.ts`)
   - Rare (1 team per 3-5 years)
   - New personality generated
   - Expectations reset

### BRAND GUIDELINES
- [ ] Traits shown as descriptions, not numbers
- [ ] Patience shown as status, not exact value

### BOOLEAN CHECKPOINTS
1. Owner personalities generate correctly
2. Demands trigger appropriately
3. Defiance affects patience
4. Descriptions hide raw numbers
```

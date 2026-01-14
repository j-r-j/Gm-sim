# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development
npm start              # Start Expo development server
npm run web            # Run on web browser
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator

# Testing
npm test               # Run all tests
npm test -- path/to/file.test.ts  # Run a single test file
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report

# Code Quality
npm run lint           # ESLint for src/ directory
npm run lint:fix       # Auto-fix lint issues
npm run typecheck      # TypeScript type checking
npm run format         # Prettier formatting
npm run format:check   # Check formatting without changes
```

## Path Aliases

The project uses path aliases (configured in both tsconfig.json and jest.config.js):
- `@core/*` → `src/core/*`
- `@state/*` → `src/state/*`
- `@services/*` → `src/services/*`
- `@constants/*` → `src/constants/*`
- `@types/*` → `src/types/*`
- `@utils/*` → `src/utils/*`
- `@ui/*` → `src/ui/*`

## Architecture Overview

This is an NFL GM simulator built with React Native (Expo) using TypeScript. The app simulates NFL team management including drafts, games, contracts, and seasons.

### Core Directory Structure

- **src/core/** - Game engine and simulation logic (the heart of the app)
- **src/screens/** - Container components managing screen flow
- **src/components/** - Reusable presentational components
- **src/state/** - Zustand store for meta-state (save slots, timestamps)
- **src/services/** - Game initialization and storage (AsyncStorage)
- **src/styles/** - Centralized design tokens (colors, spacing, typography)
- **src/types/** - TypeScript type definitions
- **src/constants/** - Game constants

### Key Architectural Patterns

**Immutable Data Flow**: All entities are immutable TypeScript interfaces. Functions create new objects rather than mutating. GameState is the master container that gets serialized/deserialized.

**True vs. Perceived Values**: Players have hidden "true" values and visible "perceived" values (ranges). This enables scouting mechanics and hidden trait revelation.

**Manual Screen Navigation**: App.tsx manages screen state directly via `currentScreen` state rather than using React Navigation stack.

### Core Domain Models (src/core/models/)

- **GameState** - Master container for all game data (teams, players, coaches, calendar)
- **League** - Season calendar with 4 phases (preseason, regularSeason, playoffs, offseason)
- **Team** - 32 teams with rosters (active/practice squad/IR), finances, staff
- **Player** - Physical attributes, technical skills (true/perceived), hidden traits, fatigue, morale
- **Coach** - Schemes, tendencies, chemistry with players
- **Scout/Owner** - Supporting staff with their own attributes

### Game Engine (src/core/engine/)

**PlayResolver** orchestrates game simulation by coordinating:
- PlayCaller - Generates play calls based on coach schemes
- MatchupResolver - Resolves player vs. player matchups
- EffectiveRatingCalculator - Applies modifiers (scheme fit, fatigue, weather, stakes)
- FatigueSystem - Tracks per-play fatigue
- InjuryProcessor - Determines injuries
- PlayDescriptionGenerator - Converts results to narrative text

### Subsystems (src/core/)

Each has its own models and business logic:
- **career/** - Player/coach career progression
- **coaching/** - Coach evaluation and chemistry
- **contracts/** - Salary cap management
- **draft/** - Prospect generation, combine, draft order
- **freeAgency/** - Player movement
- **news/** - Narrative event generation
- **offseason/** - 12-phase offseason progression
- **scouting/** - Scout evaluation systems
- **season/** - Schedule generation, standings, playoffs

### State Management

Zustand store (`src/state/store.ts`) manages only meta-state (current save slot, timestamps). Actual game state flows through props and function parameters as immutable GameState objects.

### Persistence

GameStorage wraps AsyncStorage with 3 save slots. NewGameService creates complete new games by generating all 32 teams, rosters, coaches, scouts, and owners.

## Important Notes

**Fake Teams**: The game uses 32 fictional cities/teams (defined in `src/core/models/team/FakeCities.ts`) to avoid NFL copyright. Never use real NFL team names or cities.

**Strict TypeScript**: The project uses strict TypeScript with `noImplicitAny`, `strictNullChecks`, and all strict options enabled. Run `npm run typecheck` before committing.

**Test Setup**: Tests use Jest with `src/tests/setup.ts` for AsyncStorage mocks. Test files are co-located with source files using `.test.ts` extension.

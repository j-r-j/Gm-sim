# Master Agent Prompt: NFL GM Simulator

> Paste everything below into Claude. It is self-contained.

---

## Your Mission

You are the lead architect and sole developer for an NFL GM Simulator mobile game built with React Native/Expo/TypeScript. This is a ~60% complete codebase with 496 source files, 335 core engine files, and 59 screens. Your job is to finish this game and make it the best football GM sim on mobile — better than PocketGM, better than anything else in the App Store.

You have **full autonomy** to make structural decisions. I trust your judgment. But the bar is high: every system must work end-to-end, every screen must earn its existence, and the final product must feel like something a football obsessive would play for hundreds of hours.

---

## Phase 1: Deep Research (Do This First)

Before writing a single line of code, you must build a complete mental model of two things: the existing codebase and the competitive landscape.

### 1A. Codebase Audit

Read and analyze the following files in order. For each, write a brief assessment of what's solid vs. what's broken or half-built:

1. `AGENTS.md` — Identity, architecture, brand rules, known issues
2. `GAME_FLOW.md` — Critical path, weekly loop, offseason, multi-season gaps
3. `PRODUCT_SPEC.md` — Product vision, flows, screen specs, design system
4. `IMPLEMENTATION_PLAN.md` — Phased feature exposure plan
5. `IMPLEMENTATION_GUIDE.md` — Code patterns, component standards
6. `src/navigation/ScreenWrappers.tsx` — The 8,660-line monolith orchestrating all screen logic. Understand what each wrapper does, which screens share logic, and where duplication lives.
7. `src/core/` — Walk the 20+ subdirectories. Identify which systems are complete, which are stubs, and which are disconnected from the UI.
8. `src/screens/` — All 59 screen files. Identify: which are redundant, which show mock data, which are orphaned from navigation, which duplicate each other.

After this audit, produce a **State of the Codebase** summary with these sections:
- **Working end-to-end**: Systems/screens that function correctly today
- **Built but disconnected**: Engine logic that exists but isn't wired to UI
- **Half-built**: Screens or systems that exist but use mock/placeholder data
- **Redundant**: Screens that duplicate each other or serve no distinct purpose
- **Missing entirely**: Critical features with no implementation at all
- **Tech debt hotspots**: Files or patterns that will cause compounding problems

### 1B. Competitive Research: PocketGM

Research PocketGM (the iOS/Android football GM sim) to understand what makes it compelling. Focus on:

- **The core loop**: What does the player do week-to-week? How many taps to advance a week? What decisions feel meaningful vs. busywork?
- **Screen efficiency**: How many distinct screens does PocketGM use? How does it consolidate information? What do they put on one screen that we spread across three?
- **Draft experience**: How does PocketGM handle scouting, the draft board, and the draft itself? What creates drama and engagement?
- **Free agency feel**: How does PocketGM make free agency exciting? What's the pacing? How do CPU teams behave?
- **CPU decision-making**: How do AI teams draft, sign free agents, manage rosters, and make trades? What makes them feel alive vs. robotic?
- **Offseason pacing**: How does PocketGM handle the offseason? How many phases? What's skippable? What's the "just one more thing" hook?
- **What they get right** that we should steal (with our own twist)
- **What they get wrong** that we can improve on

---

## Phase 2: The Architectural Plan

After research, produce a comprehensive plan organized around these priorities. **Do not begin implementation until I approve the plan.**

### Priority 1: Screen Consolidation

We have 59 screens. That's too many. PocketGM does more with fewer screens by using tabs, modals, and contextual panels instead of full-screen navigation.

Produce a **Screen Consolidation Map** that:
- Groups related screens into hub screens with tabs/sections (e.g., all roster/depth chart/player profile could be one screen with tabs)
- Identifies screens to eliminate entirely (duplicates, deprecated, unnecessary)
- Identifies screens to merge (where two screens show overlapping data)
- Proposes a target screen count (aim for 25-30 well-designed screens, not 59 thin ones)
- Shows the new navigation graph

Rules for consolidation:
- Every screen must earn its existence. If it can be a tab or modal on another screen, it should be.
- No screen should exist just to show a single piece of data that could be a card on a parent screen.
- The weekly loop should require the fewest possible taps. Target: 3-4 taps from "Play Week" to "Next Week."
- The draft should feel like an event, not a form-filling exercise.
- Offseason phases should flow naturally, not feel like a 12-step checklist.

### Priority 2: ScreenWrappers.tsx Decomposition

`ScreenWrappers.tsx` is 8,660 lines. This is the single biggest tech debt liability. Every bug fix, every new feature, every refactor touches this file. It must be decomposed.

Plan the decomposition into domain-specific wrapper files (~500-800 lines each). Ensure:
- Each wrapper file owns a clear domain (game flow, roster management, draft, offseason, etc.)
- Shared utilities are extracted to a common module
- The refactor preserves all existing behavior — zero regressions
- Each wrapper is independently testable

### Priority 3: Complete the Critical Path

The game cannot be played end-to-end today. These blockers must be resolved:

1. **Multi-season transition**: Season 1 ends and... nothing. All the logic exists in `HistoryOffseasonProcessor.ts` but isn't wired for interactive play. Build a `SeasonTransitionService` that handles: year advance, player aging, contract expiration, retirement, development/regression, new draft class, schedule generation, career stats, state reset.

2. **Weekly loop gaps**: The `advanceWeek` function skips news generation, patience meter updates, waiver wire processing, trade offer refresh, and weekly awards. Build a `processWeekEnd()` function that handles all of it.

3. **Offseason Phase 12 dead end**: "Season Start" has no handler to transition to the new season. Wire it.

4. **Post-game duplication**: GameDayScreen has a complete post-game phase, then navigates to PostGameSummaryScreen which shows the same data. Eliminate the duplicate.

5. **Game results not persisting**: After app close, game results are lost (see App.tsx). Fix persistence.

### Priority 4: CPU Intelligence

The CPU teams must feel alive. Research how PocketGM handles AI decision-making, then ensure our CPU teams:

- **Draft intelligently**: Draft based on team needs, board value, and scheme fit — not just best available. Each team should have a discernible draft philosophy (some trade up for QBs, some stockpile picks, some always go BPA).
- **Manage free agency realistically**: Big-market teams should overpay. Rebuilding teams should stockpile cheap veterans. Contenders should make win-now moves. The market should feel dynamic, not static.
- **Make trades that make sense**: CPU trade proposals should be realistic, not insulting. Trade logic should consider team window (rebuild vs. contend), positional value, and contract implications.
- **Handle rosters properly**: CPU teams should cut players intelligently, manage the salary cap, and not end up with absurd roster constructions (5 QBs, no kicker, etc.).

### Priority 5: The Sim Engine

The play-by-play sim engine (`PlayResolver`, `MatchupResolver`, `EffectiveRatingCalculator`) is the most important invisible system. Audit it for:

- **Outcome realism**: Do scores look like real NFL games? Is the distribution of outcomes realistic (not too many blowouts, not too many close games)?
- **Player impact**: Do elite players actually dominate? Does a team with a great QB play like it?
- **Scheme impact**: Do coaching schemes meaningfully affect play calling and outcomes?
- **Injury rates**: Are injuries happening at realistic NFL rates?
- **Fatigue modeling**: Does fatigue matter across a game and across a season?
- **Home field advantage**: Is it modeled?
- **Weather effects**: Do they matter?

### Priority 6: The User Experience

The game should feel good in your hands. Every interaction should be fast, clear, and satisfying. Plan for:

- **Loading states**: No frozen UIs. Async operations get loading indicators.
- **Quick Sim**: A 2-tap path to advance a week without watching the game.
- **Celebration moments**: Draft picks, game wins, championships, playoff clinches — these deserve fanfare.
- **Information hierarchy**: The most important thing on every screen should be immediately obvious.
- **Mobile-first touch targets**: 44pt minimum, generous hit slop, no tiny tap targets.

---

## Phase 3: Implementation

After plan approval, execute in this order. **After each major change, run `npm run typecheck && npm run lint && npm run format:check` and fix any issues before proceeding.**

### Execution Principles

1. **Work in vertical slices.** Don't build all the UI, then all the logic, then all the wiring. Build one complete feature end-to-end, verify it works, then move to the next.

2. **Prefer editing over creating.** Before creating a new file, check if the functionality belongs in an existing file. Before creating a new screen, check if it should be a tab/modal on an existing screen.

3. **Delete aggressively.** Dead code, unused screens, deprecated files, mock data — if it doesn't serve the final product, remove it. Every line of code that exists is a line that must be maintained.

4. **Test at the boundaries.** Unit tests for core logic (sim engine, cap calculations, draft algorithms). Integration tests for flows (weekly loop, offseason progression, multi-season transition). Don't test implementation details.

5. **Keep the engine opaque.** The three-layer rating system (true -> perceived -> effective) is the heart of the game. True values never leak to UI. Perceived values are always ranges. Use `PlayerViewModel` for all rendering. This is a brand rule — violating it breaks the game's entire philosophy.

6. **Immutable state.** All functions take GameState and return a new GameState. No mutations. This makes debugging, testing, and undo/redo possible.

7. **No premature abstraction.** Don't create a base class for something only used once. Don't make something configurable unless there are two concrete configurations. Wait for the pattern to emerge, then extract.

---

## Quality Bar

The game is shippable when:

- [ ] A player can start a new game, play a full 18-week season, make the playoffs (or not), complete all 12 offseason phases, and start Season 2 — with full state persistence throughout
- [ ] CPU teams behave realistically across all systems (drafting, free agency, trades, roster management)
- [ ] The sim engine produces realistic-looking NFL game results
- [ ] Every screen that exists is reachable, functional, and serves a distinct purpose
- [ ] ScreenWrappers.tsx is decomposed into domain-specific files under 800 lines each
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint` passes with zero errors  
- [ ] `npm run format:check` passes
- [ ] All existing tests pass, and new critical-path features have test coverage
- [ ] No mock/placeholder data remains in any shipped screen
- [ ] No orphaned or unreachable screens exist
- [ ] The weekly loop completes in 3-4 taps (Play Week -> Game -> Summary -> Advance)
- [ ] Save/load works reliably across app restarts for all 3 save slots

---

## What "Best Football GM Sim" Means

The great football GM sims share these qualities. Aim for all of them:

1. **Every decision has consequences.** Draft a project QB? Your owner's patience drops. Overpay a free agent? Your cap is squeezed for years. Cut a fan favorite? Morale takes a hit. The player should feel the weight of their choices rippling forward through time.

2. **The league feels alive.** Other teams trade, sign free agents, fire coaches, tank for draft picks. News stories emerge from CPU team actions. Rivalries develop. Dynasties rise and fall. The player is one GM in a living, breathing 32-team universe.

3. **Scouting is a skill, not a cheat code.** Ranges narrow with investment. Scouts have biases the player must learn to read. The combine reveals some things, but the best GMs trust their eyes over the stopwatch. Busts and steals should both happen regularly.

4. **The draft is an event.** Trades swirl, surprise picks happen, your target gets snatched one pick before you, and sometimes a player falls to you that you never expected. The draft should create stories the player remembers.

5. **Time compresses beautifully.** A season can be played in 30-45 minutes. An offseason in 10-15 minutes. A full career in a few hours. Nothing should feel like grinding. Every tap should either give information or require a decision.

6. **The numbers stay hidden.** This is the Strat-O-Matic philosophy. The player never sees "87 OVR." They see scouting reports, skill ranges, combine times, game performance. They develop intuition, not spreadsheet optimization. This is what separates a great GM sim from a roster editor.

---

## Brand Rules (Never Violate)

These are absolute constraints. No exceptions. No "temporary" violations.

1. `trueValue`, `trueRating`, `baseRating` — NEVER exposed to any UI component
2. No single-number "overall rating" in UI — skills shown as RANGES only
3. Hidden traits emerge through gameplay events, NEVER listed upfront
4. "It" factor (1-100) is NEVER exposed or hinted at in UI
5. Sim internals (probability tables, weights, formulas) NEVER shown
6. Gamecast shows results only — play outcomes, not calculations
7. Scout accuracy is HIDDEN — user infers quality by comparing predictions to outcomes
8. Coach tendencies affect sim but NEVER displayed as percentages
9. Use `PlayerViewModel` for ALL UI rendering to enforce privacy boundaries

---

## Begin

Start with Phase 1: Deep Research. Read every file listed. Research PocketGM thoroughly. Then present your findings and Phase 2 plan. Do not write code until the plan is approved.

Work like this is the most important project you'll ever build. Because to the person playing it on their commute, losing sleep over a draft pick, and texting their friends about their fake team's playoff run — it is.

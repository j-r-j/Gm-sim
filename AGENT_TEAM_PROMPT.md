# Claude Agent Team Prompt: NFL GM Simulator — Simplify, Fun-ify, Polish

> Use this prompt to orchestrate a team of Claude agents to make the NFL GM Simulator simpler to play, more fun, still deeply nuanced, and with dramatically better UX for drafting and team composition.

---

## Project Context

You are working on **NFL GM Simulator**, a React Native/Expo/TypeScript mobile app (~60% complete). It simulates managing an NFL franchise: drafting, free agency, salary cap, coaching, scouting, and playing full seasons. The core philosophy is **Strat-O-Matic style hidden mechanics** — players never see raw ratings, probability tables, or sim internals. Instead, skills are shown as ranges that narrow with scouting investment. There's a three-layer rating system: `trueValue` (engine only) → `perceivedRange` (UI) → `effectiveRating` (game sim).

### Architecture Snapshot

```
src/
├── core/           # Game engine, models, sim logic (~35 subsystems)
├── screens/        # 52 container screens
├── components/     # Reusable UI (PlayerCard, ProspectListItem, Gamecast)
├── navigation/     # ScreenWrappers.tsx (6,767 lines — all screen business logic)
├── services/       # NewGameService, GameStorage, WeekFlowManager
├── state/          # Zustand (meta-state only)
├── styles/         # Design tokens (colors, spacing, typography)
└── types/          # TypeScript definitions
```

**Tech stack:** React Native + Expo SDK, TypeScript strict mode, AsyncStorage, Zustand, Jest  
**Navigation:** Manual `currentScreen` state in `App.tsx` (no React Navigation)  
**State flow:** Immutable GameState passed as props, functions return new objects  
**Path aliases:** `@core/*`, `@state/*`, `@services/*`, `@ui/*`, `@types/*`

### Brand Rules (NEVER VIOLATE)

1. No `trueValue`/`trueRating`/`baseRating` exposed to ANY UI component
2. No single-number "overall rating" — skills shown as RANGES only
3. Hidden traits emerge through events, NEVER listed explicitly upfront
4. "It" factor (1-100) is NEVER exposed or hinted at in UI
5. Sim internals (probability tables, weights, formulas) NEVER shown
6. Gamecast shows results only — play outcomes, not calculations
7. Scout accuracy is HIDDEN — user learns by comparing predictions to outcomes
8. Coach tendencies affect sim but NEVER displayed as percentages
9. Use `PlayerViewModel` for all UI rendering to enforce privacy boundaries

---

## Current State — What Exists Today

### The Core Loop (Weekly)
```
Dashboard → [Play Week] → Pre-Game → Live Sim → Post-Game → Week Summary → Dashboard
```
18 regular season weeks, then playoffs (if qualified), then 12-phase offseason, then next season.

### What's Working
- 52 screens built (47 functional, 5 orphaned/deprecated)
- Full play-by-play simulation engine with speed controls
- 32-team league with 1,700+ generated players
- Draft system (DraftRoom, DraftBoard, BigBoard, Combine)
- Free agency with 3-wave structure
- Salary cap, contracts, franchise tags (engine-level)
- Coaching hierarchy with scheme chemistry
- Scouting with narrowing ranges
- 12-phase offseason flow
- Career mode with owner patience system
- Gamecast with play-by-play feed and field visualization

### What's Broken or Missing
- **Multi-season transition** — Season 1 works, no transition to Season 2 (all logic exists in `HistoryOffseasonProcessor.ts` but isn't wired to interactive mode)
- **Weekly systems skipped** — advancing a week skips news generation, patience meter, waivers, trade offers, awards
- **Duplicate post-game** — GameDayScreen has post-game, then navigates to a duplicate PostGameSummaryScreen
- **No Week Summary** — product spec defines it, never built
- **No Quick Sim** — must go through full game flow every time
- **No onboarding** — players drop into a complex 14-card dashboard cold
- **No Championship celebration** — season ends with no fanfare
- **Filtering/sorting is inconsistent and sparse** across draft and roster screens (details below)

### Current Filtering & Sorting UX (THE PROBLEM)

| Screen | Search | Position Filter | Sort | Flagged | Other |
|--------|--------|-----------------|------|---------|-------|
| DraftRoomScreen | No | No | No | Yes (toggle) | Hard-capped at 20 prospects |
| DraftBoardScreen | Yes | Yes (10 chips) | Yes (4 options) | Yes | Compare modal |
| BigBoardScreen | No | Yes (tab-based) | Implicit by tab | No | Tier + Needs tabs |
| CombineProDayScreen | No | Yes | No | No | 3-tab view, 50-item cap |
| RosterScreen | No | Yes (5 groups) | Fixed (position→name) | No | IR tab |
| DepthChartScreenV2 | No | Tab-based | No | No | Standard vs Packages |

**Key problems:**
- DraftRoom (where you actually pick) has the WORST filtering — no search, no position filter, no sort, only 20 visible
- No shared filter/sort components — every screen reinvents chips, toggles, search bars
- RosterScreen has no search at all — scanning 53+ players by eye
- BigBoardScreen uses a completely different data model and layout than DraftBoardScreen
- PlayerViewModel exists for privacy but RosterScreen/PlayerCard bypass it, using raw `Player` objects
- DepthChart player selection modal has no filter/sort — just a flat list of eligible players
- No "scheme fit" or "team need" filter on any roster/draft screen

---

## Agent Team Structure

Deploy **5 specialized agents** working in sequence. Each agent produces a concrete deliverable. Later agents build on earlier agents' output.

### Agent 1: UX Simplification Architect
**Goal:** Reduce cognitive load. Make the game approachable without sacrificing depth.

**Deliverables:**
1. **Simplified Dashboard redesign** — The current dashboard has 14+ menu cards that overwhelm new players. Design a tiered dashboard:
   - **Primary zone:** 1-2 contextual CTAs (Play Week, Quick Sim, or current offseason phase)
   - **At-a-glance strip:** Team record, cap space, next opponent, owner mood (4 items max)
   - **Hub cards:** Collapse 14 cards into 4-5 smart hubs (Roster Hub, Draft Hub, Front Office, League, Career) that expand into sub-screens
   - **Contextual surfacing:** Only show cards relevant to current phase (regular season vs offseason vs playoffs)
2. **Weekly loop streamlining** — Implement the 4-tap standard path and 2-tap quick-sim path:
   - Standard: Dashboard → GameDay → Post-Game → Week Summary → Dashboard
   - Quick Sim: Dashboard → [processing overlay] → Week Summary → Dashboard
   - Remove duplicate PostGameSummaryScreen
   - Replace WeeklySchedulePopup with proper WeekSummaryScreen
3. **First-time experience** — Design a 3-step contextual onboarding:
   - Step 1: "This is your team. Here's your record and cap space." (highlight dashboard strip)
   - Step 2: "Tap here to play your next game." (highlight primary CTA)
   - Step 3: "Explore your roster and make moves between games." (highlight hub cards)
   - Use coach tips (dismissible tooltip from your HC) rather than modal tutorials
4. **Offseason simplification** — The 12-phase offseason is overwhelming. Group into 3 mega-phases with expandable detail:
   - **Evaluate** (Phases 1-4): Season recap, coaching decisions, contract management, combine
   - **Build** (Phases 5-7): Free agency, draft, UDFA
   - **Prepare** (Phases 8-12): OTAs, training camp, preseason, final cuts, season start
   - Each mega-phase has a summary card showing what was accomplished and a "Dive Deeper" option

**Constraints:**
- All depth must still be REACHABLE — simplification means better progressive disclosure, not removal
- Respect the existing manual navigation pattern (`currentScreen` state)
- Changes should be implementable in React Native with existing component patterns

---

### Agent 2: Draft & Scouting UX Overhaul
**Goal:** Make drafting the most compelling part of the game. Create a unified, powerful, joyful draft experience.

**Deliverables:**
1. **Unified FilterBar component** — A shared, reusable filter/sort bar used across ALL draft and roster screens:
   ```
   [Search 🔍] [Position ▼] [Sort By ▼] [Filters ▼] [⭐ Flagged]
   ```
   - **Search:** Real-time text search on name, college, position
   - **Position dropdown:** All / QB / RB / WR / TE / OL / DL / LB / DB / K-P (with counts)
   - **Sort dropdown:** Best Available, Position Rank, Projected Round, Age, Scheme Fit, Team Need
   - **Advanced filters (collapsible):** Round projection range, tier (Elite/Day1/Day2/etc.), scouted vs unscouted, scheme fit grade, physical archetype
   - **Flagged toggle:** Quick filter to flagged-only
   - Designed as `src/components/shared/FilterBar.tsx` — props-driven, works for both prospects and players
   - Include count badge showing "47 of 256 prospects" style feedback

2. **DraftRoom overhaul** — The screen where you actually make picks needs to be the best screen in the app:
   - Remove the 20-prospect hard cap — virtualized FlatList with full FilterBar
   - **Split-panel layout:** Left 60% = filterable prospect list, Right 40% = pick context panel
   - Pick context panel shows: current pick #, team needs, recent picks ticker, trade offers
   - **One-tap draft:** Tap prospect → confirmation bottom sheet with prospect summary + "Draft [Name]" button
   - **Quick compare:** Long-press two prospects → side-by-side comparison sheet (skill ranges, measurables, projection, scheme fit)
   - **"On the Clock" urgency:** Visual timer bar, pulsing border, pick countdown
   - **Smart suggestions row:** Top 3 "best available for your needs" pinned at top (derived from team needs + big board ranking)
   - **Draft grade ticker:** After each pick, brief flash showing consensus grade (A+, B-, etc.) based on value vs pick position

3. **Big Board integration** — Merge BigBoard concepts into DraftBoard:
   - DraftBoard becomes the single pre-draft research screen
   - Tabs: All Prospects, By Position, By Tier, Team Needs, My Board
   - "My Board" tab lets user drag-reorder their personal rankings
   - Scout reports accessible via swipe-right on any prospect row
   - Scouting assignment button: "Send scout to evaluate" with expected report timeline

4. **Prospect cards redesign** — Replace `ProspectListItem` with richer prospect cards:
   - **Compact mode** (list): Position badge, name, school, projected round, scheme fit icon, flag toggle, scout confidence dots
   - **Expanded mode** (tap to expand in-place): Measurables, skill ranges, combine highlights, scout notes, comparison to NFL archetype
   - **Color-coded need indicators:** Green (critical need), Yellow (upgrade opportunity), Gray (depth only)
   - Never show a single overall number — use tier badge + range bar

5. **Draft day experience enhancements:**
   - Trade offer notifications slide in from bottom during other teams' picks
   - "Steal alert" when a highly-ranked prospect falls to your pick
   - Round-by-round recap between rounds showing your picks with grades
   - Post-draft report card with team need fulfillment visualization

**Constraints:**
- Must respect the hidden mechanics philosophy — no true ratings, only perceived ranges
- Scheme fit should be shown as a qualitative indicator (Great Fit / Good Fit / Neutral / Poor Fit), never as a number
- Scout confidence shown as dots (1-4) or a qualitative bar, not a percentage
- All data must flow through `PlayerViewModel` or equivalent prospect view model

---

### Agent 3: Team Composition & Roster Management UX
**Goal:** Make roster building feel strategic and satisfying. Help players understand team strengths and weaknesses at a glance.

**Deliverables:**
1. **Team Composition Dashboard** — A new "Roster Hub" screen that shows team health at a glance:
   - **Roster strength heat map:** Visual grid showing position group strength (Offense: QB, RB, WR, TE, OL / Defense: DL, LB, CB, S / Special: K, P)
     - Each cell: color gradient (red→yellow→green) based on perceived starter quality + depth
     - Tap cell → filtered roster view for that position group
   - **Needs assessment panel:** Auto-generated list of team needs ranked by priority
     - "Critical: No viable backup QB" / "Upgrade: WR2 below league average" / "Strength: Elite OL depth"
   - **Cap health bar:** Visual salary cap usage with breakdown (committed, projected, dead money, available)
   - **Age profile chart:** Simple visualization showing team age distribution (young core vs aging roster)
   - **Scheme fit summary:** How well current roster fits coaching scheme (percentage or grade, shown as qualitative descriptors)

2. **Enhanced Roster Screen** with FilterBar:
   - Add the shared FilterBar component: search, position filter, sort options
   - **Sort options:** Position (default), Age, Experience, Salary, Scheme Fit, Contract Year
   - **Group-by mode:** View roster grouped by position, by contract status (expiring, locked, rookie deal), or by acquisition (drafted, FA, trade)
   - **Inline actions:** Swipe-left for quick actions (Cut, Trade, Extend, IR) instead of only long-press
   - **Multi-select mode:** Select multiple players for bulk operations (mass cut for roster cutdowns)
   - **Roster count strip:** "53/53 Active | 12/16 Practice Squad | 3 IR" always visible

3. **Smart Depth Chart** improvements:
   - Add search/filter in the player selection modal
   - Show scheme fit grade next to each player in selection list
   - **Auto-fill suggestions:** When a slot is empty, suggest best available from roster or practice squad
   - **Position flexibility indicators:** Show which players can play multiple positions
   - **Impact preview:** When swapping players, show projected impact indicator (arrow up/down)

4. **Trade screen improvements:**
   - **Needs-based trade finder:** "Find me a WR" → shows trade packages from other teams
   - **Trade value visualization:** Horizontal bar showing your side vs their side (keeps hidden mechanics by using perceived value ranges, not numbers)
   - **Counter-offer builder:** Drag players/picks between sides to construct offers

5. **Free Agency improvements:**
   - Add FilterBar to free agent list
   - **Fit indicators:** Each FA shows scheme fit and need priority for your team
   - **Market heat indicator:** Shows how many teams are interested (hot/warm/cold) without revealing exact bids
   - **Bidding UX:** Slider for contract offer (years/money) with instant feedback on cap impact

**Constraints:**
- Team composition insights must use perceived data only (skill ranges, not true values)
- "Needs assessment" is based on perceived roster strength, which may be inaccurate for poorly-scouted players — this is a feature, not a bug
- Never reduce the game to "green = good, red = bad" oversimplification — show nuance through ranges, uncertainty, and qualitative descriptors

---

### Agent 4: Fun & Game Feel Engineer
**Goal:** Add juice, personality, and emotional beats that make the game feel alive and rewarding.

**Deliverables:**
1. **Momentum and narrative moments:**
   - **Steal alerts** during draft when top prospects fall
   - **Bidding war alerts** during free agency when a player you're pursuing gets competing offers
   - **Upset alert** when your underdog team wins, or **rivalry game** intensity indicators
   - **Milestone celebrations:** First win, first playoff berth, first championship — each with unique brief celebration
   - **"Breaking News" overlays** for major league events (big trades, surprise retirements, coaching firings)

2. **Feedback and satisfaction loops:**
   - **Draft grade animations:** After each pick, a brief card flip revealing consensus grade
   - **Season progress ring:** On the dashboard, a radial progress indicator showing season completion
   - **Win streak / losing streak indicators:** Visual flame or ice indicators on dashboard
   - **Owner reaction micro-animations:** Brief emoji/reaction from owner after wins/losses (happy, neutral, angry)
   - **"Coach's Take" one-liners:** Your HC generates a brief contextual quip on the dashboard ("Big game Sunday — our defense is ready" / "Rough loss. We'll regroup.")

3. **Quality-of-life accelerators:**
   - **Quick Sim button** on dashboard (2-tap path to next week)
   - **Sim-to-date:** "Sim to Week 10" or "Sim to Playoffs" for users who want to fast-forward
   - **Auto-manage toggles:** Let AI handle depth chart, waiver wire, or game plan for users who want a higher-level experience
   - **Notification badges:** Show counts on hub cards (3 trade offers, 2 contract decisions, 1 injury update) so users know what needs attention

4. **Personality and flavor text:**
   - **Dynamic coach personality:** HC comments change based on team performance and opponent
   - **Scout reports with personality:** Scouts have writing styles ("This kid's got wheels" vs "4.38 forty, excellent burst")
   - **Owner personality in demands:** Different owner types phrase expectations differently
   - **Draft night atmosphere:** Sound of crowd, ticker of picks, ESPN-style draft graphic feel in the UI

5. **Accessibility of depth:**
   - **"Why did I lose?" post-game insights:** 3-4 bullet points explaining key factors (not sim internals, but observable: "Opposing RB ran for 180 yards — run defense struggled" / "3 turnovers were costly")
   - **Season storylines:** Auto-generated narratives that track across the season ("Your rookie QB has now thrown 3+ TDs in four straight games")
   - **Pre-game "keys to the game":** 2-3 strategic observations ("Stop their pass rush" / "Establish the run early")

**Constraints:**
- All "fun" additions must enhance, not interrupt, the core loop — nothing that adds taps to the critical path
- Animations must be brief (< 1 second) and skippable
- No sound in v1 (Expo audio adds complexity) — visual-only polish
- "Why did I lose" insights must never reveal sim internals — only observable box score facts
- Coach/scout personality is flavor text only — it doesn't reveal hidden mechanics

---

### Agent 5: Implementation Orchestrator
**Goal:** Turn the design output from Agents 1-4 into a phased, dependency-ordered implementation plan with concrete file changes.

**Deliverables:**
1. **Shared components to build first** (unblocks everything else):
   - `src/components/shared/FilterBar.tsx` — Props: `items`, `onFilter`, `onSort`, `onSearch`, `filterOptions`, `sortOptions`
   - `src/components/shared/NeedIndicator.tsx` — Shows team need priority for a position
   - `src/components/shared/SchemeFitBadge.tsx` — Qualitative scheme fit display
   - `src/components/shared/StatRangeBar.tsx` — Unified range bar for skills
   - `src/components/shared/ConfidenceDots.tsx` — Scout confidence indicator
   - `src/components/shared/ActionSheet.tsx` — Bottom sheet for contextual actions
   - `src/components/shared/EmptyState.tsx` — Consistent empty states with guidance

2. **Implementation phases:**

   **Phase 1 — Foundation (1-2 weeks):**
   - Build shared FilterBar component
   - Build shared indicator components (NeedIndicator, SchemeFitBadge, etc.)
   - Create `ProspectViewModel` (mirrors `PlayerViewModel` for prospects)
   - Create `TeamNeedsCalculator` service (perceived-data-based needs assessment)
   - Enforce `PlayerViewModel` usage in RosterScreen and PlayerCard

   **Phase 2 — Draft Overhaul (1-2 weeks):**
   - Redesign DraftRoomScreen with split-panel layout and full FilterBar
   - Merge BigBoard concepts into DraftBoardScreen
   - Replace ProspectListItem with new expandable ProspectCard
   - Add smart suggestions, steal alerts, and draft grade animations
   - Wire compare modal to work from both DraftRoom and DraftBoard

   **Phase 3 — Roster & Composition (1-2 weeks):**
   - Build Team Composition Dashboard (Roster Hub)
   - Add FilterBar to RosterScreen with search, sort, group-by
   - Add inline swipe actions to roster items
   - Improve DepthChart player selection modal with search/filter
   - Add trade finder and FA fit indicators

   **Phase 4 — Dashboard & Flow (1 week):**
   - Redesign GM Dashboard with tiered layout (primary CTA, at-a-glance, smart hubs)
   - Implement Quick Sim path
   - Build WeekSummaryScreen
   - Remove PostGameSummaryScreen
   - Add contextual phase-gating to dashboard cards
   - Build first-time onboarding tooltips

   **Phase 5 — Fun & Polish (1 week):**
   - Add notification badges to hub cards
   - Implement coach one-liners and owner reactions
   - Add milestone celebrations
   - Add "Why did I lose?" post-game insights
   - Add season storyline tracking
   - Streamline offseason into 3 mega-phases with expandable detail

3. **File change map** — For each phase, list:
   - New files to create
   - Existing files to modify (with section references)
   - Files to delete (deprecated screens)
   - Test files needed

4. **Risk register:**
   - ScreenWrappers.tsx (6,767 lines) — any screen changes require touching this monolith. Recommend decomposing into 8 wrapper files first (see GAME_FLOW.md Appendix B).
   - Navigation pattern — all changes must work with the manual `currentScreen` pattern in App.tsx
   - Performance — FilterBar with real-time search on 250+ prospects needs virtualized lists and debounced input
   - Data flow — All new view models must maintain immutable patterns and never expose true ratings

5. **Testing strategy:**
   - Each shared component gets unit tests
   - Each redesigned screen gets snapshot tests
   - Integration tests for draft flow (pick → confirm → state update → next pick)
   - Integration test for quick sim (dashboard → sim → week summary → advance)
   - Regression: full 32-team season sim must still pass after all changes

---

## How to Use This Prompt

### Option A: Sequential Agent Execution
Run each agent one at a time, feeding the output of each into the next:
```
Agent 1 output → feeds into Agent 2 + Agent 3 context
Agent 2 + Agent 3 outputs → feed into Agent 4 context  
All outputs → feed into Agent 5 for implementation plan
```

### Option B: Parallel with Orchestrator
Run Agents 1-4 in parallel (they focus on different areas), then run Agent 5 to synthesize:
```
[Agent 1: UX] + [Agent 2: Draft] + [Agent 3: Roster] + [Agent 4: Fun] → Agent 5: Implementation Plan
```

### Option C: Single Agent, Phased Execution
Give this entire prompt to a single agent and ask it to work through each agent's deliverables sequentially, implementing as it goes. Best for hands-on coding sessions.

### For Each Agent, Include:
1. This entire prompt (for full context)
2. The contents of `AGENTS.md` and `GAME_FLOW.md`  
3. The current source files relevant to that agent's domain
4. Any output from previously completed agents

### Key Files to Provide Per Agent:

**Agent 1 (UX):** `GMDashboardScreen.tsx`, `ScreenWrappers.tsx`, `App.tsx`, `OffseasonScreen.tsx`  
**Agent 2 (Draft):** `DraftRoomScreen.tsx`, `DraftBoardScreen.tsx`, `BigBoardScreen.tsx`, `CombineProDayScreen.tsx`, `ProspectListItem.tsx`, `PlayerViewModel.ts`, `Prospect.ts`  
**Agent 3 (Roster):** `RosterScreen.tsx`, `DepthChartScreenV2.tsx`, `PlayerCard.tsx`, `PlayerDetailCard.tsx`, `TradeScreen.tsx`, `FreeAgencyScreen.tsx`, `SalaryCapManager.ts`  
**Agent 4 (Fun):** `GameDayScreen.tsx`, `PostGameSummaryScreen.tsx`, `NewsScreen.tsx`, `WeeklySchedulePopup.tsx`, `NewsFeedManager.ts`, coach/owner model files  
**Agent 5 (Orchestrator):** All outputs from Agents 1-4, `ScreenWrappers.tsx`, `App.tsx`, `jest.config.js`, `tsconfig.json`

---

## Success Criteria

When all agents have completed their work, the app should:

1. **Feel simple on the surface:** A new player can pick a team, play their first game, and understand the dashboard within 5 minutes
2. **Reward exploration:** Every hub card leads to meaningful depth; experienced players find new strategic levers for dozens of hours
3. **Make drafting thrilling:** The draft room should be the emotional highlight — urgency, discovery, strategy, and satisfaction in every pick
4. **Make roster building strategic:** Players should always know their team's strengths, weaknesses, and needs — and have clear paths to address them
5. **Maintain hidden mechanics integrity:** At no point should true ratings, sim formulas, or internal probability tables be visible or inferable from the UI
6. **Be implementable incrementally:** Each phase should produce a shippable improvement — no big-bang rewrites
7. **Pass all existing tests** plus new integration tests for redesigned flows

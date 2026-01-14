# Feature Exposure Implementation Plan

This plan exposes core engine features to the UI in a phased, gate-checked approach.

---

## Overview

| Phase | Focus | Features | Est. New Screens |
|-------|-------|----------|------------------|
| 0 | Infrastructure | React Navigation migration | 0 |
| 1 | Core GM Experience | Coach, Depth Chart, Owner, Contracts | 5-6 |
| 2 | Enhanced Gameplay | Offseason phases, Scouting, RFA | 6-8 |
| 3 | Polish & Depth | Rumors, Career, Coaching Tree | 4-5 |

---

## Gate Check Protocol

After **each feature**, the following must pass before proceeding:

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
```

If any fail, fix before moving to the next feature.

---

## Phase 0: Infrastructure - Navigation Migration

### 0.1 Migrate to React Navigation

**Goal**: Replace manual `currentScreen` state with React Navigation stack navigator.

**Why First**: All new screens need proper navigation. Doing this now prevents rework.

**Files to Create/Modify**:
- `src/navigation/AppNavigator.tsx` - Main stack navigator
- `src/navigation/types.ts` - Navigation param types
- `src/navigation/index.ts` - Exports
- `App.tsx` - Wrap with NavigationContainer, remove manual routing

**Implementation Steps**:
1. Create navigation types with all existing + new screens
2. Create AppNavigator with createNativeStackNavigator
3. Migrate each screen's `onBack` to `navigation.goBack()`
4. Pass params via route.params instead of App.tsx state
5. Move gameState to React Context or keep in App.tsx with screen params

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Can navigate from Start → Team Selection → Dashboard?
- [ ] Does back navigation work on all screens?
- [ ] Is gameState accessible from all game screens?
- [ ] Do deep links work (e.g., direct to player profile)?

---

## Tier 1: Core GM Experience

### 1.1 Coach Profile Screen

**Goal**: View coach details including personality, attributes, contract, and chemistry.

**Core Systems to Expose**:
- `CoachPersonality` (6 types, ego, adaptability)
- `CoachAttributes` (development, gameDayIQ, schemeTeaching, etc.)
- `CoachContract` (years, salary, guaranteed, dead money)
- `CoachingTree` (tree name, generation, philosophy)
- Player-coach chemistry (calculated value)

**Progressive Revelation**:
- Personality type: Visible immediately
- Attributes: Revealed based on coach's `experience` years (more years = more revealed)
- Chemistry: Shows qualitative description, exact value revealed over time

**Files to Create**:
- `src/screens/CoachProfileScreen.tsx` - Main coach detail view
- `src/components/coach/CoachCard.tsx` - Reusable coach summary card
- `src/components/coach/CoachAttributesDisplay.tsx` - Attribute bars with revelation
- `src/components/coach/CoachPersonalityBadge.tsx` - Personality type display
- `src/components/coach/CoachContractInfo.tsx` - Contract details
- `src/core/coaching/CoachRevelationSystem.ts` - Logic for what's revealed when

**Files to Modify**:
- `src/screens/StaffScreen.tsx` - Make coaches tappable, navigate to profile
- `src/navigation/types.ts` - Add CoachProfile route

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Can tap a coach in StaffScreen to see their profile?
- [ ] Does personality type display correctly?
- [ ] Are unrevealed attributes shown as "???" or ranges?
- [ ] Does contract info show years remaining and salary?
- [ ] Does back navigation return to StaffScreen?

---

### 1.2 Coach Management Actions

**Goal**: Allow hiring, firing, and extending coaches.

**Core Systems to Expose**:
- `CoachingStaffManager.fireCoach()` - With dead money calculation
- `CoachingStaffManager.hireCoach()` - From candidate pool
- `StaffBudgetManager` - Contract negotiations
- `CoachingDecisionsPhase` - Candidate generation

**Timing Rules**:
- Fire anytime: Incurs dead money, affects owner patience
- Fire during "Coaching Decisions" phase: Reduced dead money penalty
- Hire: Only during "Coaching Decisions" phase OR when vacancy exists
- Extend: Anytime in final 2 years of contract

**Files to Create**:
- `src/screens/CoachHiringScreen.tsx` - Browse/hire available coaches
- `src/components/coach/CoachActionSheet.tsx` - Fire/extend actions modal
- `src/components/coach/CoachCandidateCard.tsx` - Hiring candidate display
- `src/components/coach/ContractNegotiationModal.tsx` - Extension/hiring negotiation

**Files to Modify**:
- `src/screens/CoachProfileScreen.tsx` - Add action buttons
- `src/screens/StaffScreen.tsx` - Show vacancies, add "Hire" button
- `src/core/models/game/GameState.ts` - Track coaching candidates

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Can fire a coach and see dead money impact?
- [ ] Does firing affect owner patience meter?
- [ ] Can hire a coach during Coaching Decisions phase?
- [ ] Does contract negotiation show counter-offers?
- [ ] Are vacancies displayed in StaffScreen?

---

### 1.3 Depth Chart Screen

**Goal**: View and manage team depth chart with starter/backup assignments.

**Core Systems to Expose**:
- `RoleFit` (ceiling, currentRole, roleEffectiveness)
- `selectStartingLineup()` logic
- Position groups (offense/defense/special teams)

**Files to Create**:
- `src/screens/DepthChartScreen.tsx` - Main depth chart view
- `src/components/roster/PositionGroup.tsx` - Collapsible position group
- `src/components/roster/DepthChartSlot.tsx` - Draggable player slot
- `src/components/roster/RoleFitBadge.tsx` - Role fit indicator

**Files to Modify**:
- `src/screens/GMDashboardScreen.tsx` - Add depth chart navigation
- `src/screens/RosterScreen.tsx` - Link to depth chart
- `src/navigation/types.ts` - Add DepthChart route

**Interaction**:
- View: See current depth chart by position
- Edit: Drag players to reorder, or tap to swap
- Auto: Button to auto-optimize based on ratings

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Does depth chart show all positions grouped correctly?
- [ ] Can manually reorder players within a position?
- [ ] Does role fit badge show for each player?
- [ ] Does auto-optimize button work?
- [ ] Are injured players marked and excluded from starters?

---

### 1.4 Owner Patience & Demands Display

**Goal**: Show owner patience meter and active demands on dashboard.

**Core Systems to Expose**:
- `PatienceMeterManager` - Current value, trend, history
- `OwnerDemandGenerator` - Active demands with deadlines
- `OwnerPersonalityEngine` - Owner archetype affecting expectations

**Files to Create**:
- `src/components/career/PatienceMeterWidget.tsx` - Visual meter on dashboard
- `src/components/career/OwnerDemandsCard.tsx` - List of active demands
- `src/components/career/OwnerProfileModal.tsx` - Owner personality details
- `src/screens/OwnerRelationsScreen.tsx` - Full owner relationship view

**Files to Modify**:
- `src/screens/GMDashboardScreen.tsx` - Add patience meter widget
- `src/core/models/game/GameState.ts` - Ensure ownerDemands tracked

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Is patience meter visible on dashboard?
- [ ] Does meter color change based on value (green/yellow/red)?
- [ ] Are active demands listed with deadlines?
- [ ] Can tap owner name to see personality details?
- [ ] Does meeting/failing demands update the meter?

---

### 1.5 Contract Management Screen

**Goal**: Full contract management with restructures, cuts, and franchise tags.

**Core Systems to Expose**:
- `SalaryCapManager` - Cap situation, projections
- `RestructureSystem` - Restructure options with savings
- `CutCalculator` - Cut types (standard, June 1, post-June 1)
- `FranchiseTagSystem` - Tag costs and rules
- `ExtensionSystem` - Extension negotiations

**Files to Create**:
- `src/screens/ContractManagementScreen.tsx` - Main contracts hub
- `src/components/contracts/CapSituationCard.tsx` - Cap overview with projections
- `src/components/contracts/RestructureModal.tsx` - Restructure options
- `src/components/contracts/CutAnalysisModal.tsx` - Cut comparison (standard vs June 1)
- `src/components/contracts/FranchiseTagModal.tsx` - Tag player UI
- `src/components/contracts/ExtensionNegotiationModal.tsx` - Extension flow

**Files to Modify**:
- `src/screens/FinancesScreen.tsx` - Link to contract management
- `src/screens/RosterScreen.tsx` - Add restructure/cut actions

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Does cap situation show current cap, used, and space?
- [ ] Can restructure a contract and see cap savings?
- [ ] Does cut analysis compare dead money for different cut types?
- [ ] Can apply franchise tag and see cost?
- [ ] Does extension negotiation show player demands?

---

### 1.6 Tier 1 Integration Testing

**Goal**: Ensure all Tier 1 features work together.

**Test Scenarios**:
1. Fire a coach → See dead money on cap → Owner patience drops
2. View depth chart → Promote backup → See in roster
3. Meet owner demand → Patience increases
4. Restructure contract → See cap space increase → Sign free agent

**Gate Check**: Full test suite + manual integration test

**Verification Questions**:
- [ ] Do all Tier 1 screens navigate correctly?
- [ ] Does game state persist across all new features?
- [ ] Are there any TypeScript errors?
- [ ] Do all new components have tests?

---

## Tier 2: Enhanced Gameplay

### 2.1 OTAs Screen

**Goal**: Display OTA reports, attendance, and rookie integration.

**Core Systems to Expose**:
- `OTAsPhase` - Attendance tracking, conditioning, scheme grasp
- Rookie integration reports
- Position battle previews

**Files to Create**:
- `src/screens/OTAsScreen.tsx` - OTA summary view
- `src/components/offseason/AttendanceList.tsx` - Player attendance status
- `src/components/offseason/RookieIntegrationCard.tsx` - Rookie progress
- `src/components/offseason/PositionBattlePreview.tsx` - Upcoming battles

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Does OTAs screen show during correct offseason phase?
- [ ] Is attendance status shown for each player?
- [ ] Are rookie integration reports displayed?
- [ ] Do position battle previews list competitors?

---

### 2.2 Training Camp Screen

**Goal**: Display position battles, development reveals, and camp performance.

**Core Systems to Expose**:
- `TrainingCampPhase` - Position battles, practice grades
- `DevelopmentReveal` - Skill jumps, declines, trait reveals
- Camp standouts/disappointments

**Files to Create**:
- `src/screens/TrainingCampScreen.tsx` - Training camp hub
- `src/components/offseason/PositionBattleCard.tsx` - Battle progress
- `src/components/offseason/DevelopmentRevealCard.tsx` - Development news
- `src/components/offseason/CampStandoutsCard.tsx` - Top performers

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Do position battles show competitors and trends?
- [ ] Are development reveals shown as news items?
- [ ] Can tap a player to see their profile?
- [ ] Does practice grade show for each player?

---

### 2.3 Preseason Games Screen

**Goal**: Simulate and view preseason game results with player evaluations.

**Core Systems to Expose**:
- `PreseasonPhase` - 3 preseason games
- Player snap counts and grades
- Roster impact assignments

**Files to Create**:
- `src/screens/PreseasonScreen.tsx` - Preseason game list
- `src/components/offseason/PreseasonGameCard.tsx` - Game result summary
- `src/components/offseason/PlayerPreseasonStats.tsx` - Performance stats
- `src/components/offseason/RosterImpactBadge.tsx` - lock/bubble/cut indicator

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Are all 3 preseason games shown?
- [ ] Do games show player performance grades?
- [ ] Is roster impact (lock/bubble/cut) visible?
- [ ] Can simulate remaining preseason games?

---

### 2.4 Final Cuts Screen

**Goal**: Manage roster cuts to reach 53-man roster.

**Core Systems to Expose**:
- Cut to 53 evaluation
- Practice squad formation
- Waiver claims
- IR placement

**Files to Create**:
- `src/screens/FinalCutsScreen.tsx` - Roster management hub
- `src/components/offseason/RosterSizeIndicator.tsx` - Current vs target
- `src/components/offseason/CutRecommendationList.tsx` - Suggested cuts
- `src/components/offseason/WaiverWireCard.tsx` - Available waiver claims
- `src/components/offseason/PracticeSquadManager.tsx` - PS assignments

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Does screen show current roster size vs 53 target?
- [ ] Are cut recommendations sorted by priority?
- [ ] Can place players on IR?
- [ ] Can sign players to practice squad?
- [ ] Does waiver wire show claimed players?

---

### 2.5 Scouting Reports Screen

**Goal**: View auto-scout and focus-scout reports with confidence levels.

**Core Systems to Expose**:
- `AutoScoutingSystem` - Weekly scouting reports
- `FocusPlayerSystem` - Deep individual scouting
- `ScoutReportGenerator` - Report generation with confidence
- `ScoutAccuracySystem` - Scout tendency tracking

**Files to Create**:
- `src/screens/ScoutingReportsScreen.tsx` - Reports hub
- `src/components/scouting/ScoutReportCard.tsx` - Individual report
- `src/components/scouting/ConfidenceMeter.tsx` - Report confidence
- `src/components/scouting/ScoutAssignmentModal.tsx` - Assign focus scouting
- `src/components/scouting/ScoutAccuracyCard.tsx` - Scout performance history

**Files to Modify**:
- `src/screens/DraftBoardScreen.tsx` - Link to scouting reports
- `src/screens/StaffScreen.tsx` - Scout assignments

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Are auto-scout reports listed for prospects?
- [ ] Can assign focus scouting to a prospect?
- [ ] Does confidence meter show report reliability?
- [ ] Is scout accuracy history viewable?
- [ ] Do reports update weekly?

---

### 2.6 Big Board Management Screen

**Goal**: Create and manage prospect rankings with need-based adjustments.

**Core Systems to Expose**:
- `DraftBoardManager` - User rankings and tiers
- `BigBoardGenerator` - Need-weighted rankings
- Prospect notes and comparisons

**Files to Create**:
- `src/screens/BigBoardScreen.tsx` - Custom big board
- `src/components/draft/DraggableProspectList.tsx` - Reorderable list
- `src/components/draft/NeedIndicator.tsx` - Team need highlighting
- `src/components/draft/ProspectNotesModal.tsx` - Add/edit notes
- `src/components/draft/BoardComparisonView.tsx` - User vs consensus

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Can create custom prospect rankings?
- [ ] Does need indicator highlight positions of need?
- [ ] Can add notes to prospects?
- [ ] Does comparison show user vs consensus rankings?
- [ ] Does board persist between sessions?

---

### 2.7 RFA Tender System Screen

**Goal**: Manage restricted free agent tenders and offer sheets.

**Core Systems to Expose**:
- `RFATenderSystem` - Tender levels and costs
- Offer sheet responses
- Match/decline decisions
- Draft compensation

**Files to Create**:
- `src/screens/RFAScreen.tsx` - RFA management hub
- `src/components/freeAgency/TenderSelectionModal.tsx` - Choose tender level
- `src/components/freeAgency/OfferSheetCard.tsx` - Received offer sheets
- `src/components/freeAgency/MatchDecisionModal.tsx` - Match or let go
- `src/components/freeAgency/CompensationDisplay.tsx` - Draft pick compensation

**Files to Modify**:
- `src/screens/FreeAgencyScreen.tsx` - Add RFA section

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Can apply tender to RFA?
- [ ] Do offer sheets show terms and compensation?
- [ ] Can match an offer sheet?
- [ ] Does declining show draft pick received?
- [ ] Are tender costs accurately displayed?

---

### 2.8 Compensatory Pick Tracker

**Goal**: Show projected compensatory picks based on FA activity.

**Core Systems to Expose**:
- `CompensatoryPickCalculator` - FA tracking and projections
- Departure vs acquisition balance

**Files to Create**:
- `src/components/draft/CompPickTracker.tsx` - Comp pick projections
- `src/components/draft/FABalanceCard.tsx` - Departures vs signings

**Files to Modify**:
- `src/screens/FreeAgencyScreen.tsx` - Add comp pick tracker
- `src/screens/DraftBoardScreen.tsx` - Show projected comp picks

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Are projected comp picks displayed?
- [ ] Does tracker update when signing/losing FAs?
- [ ] Is the round projection shown?
- [ ] Does balance card show departures vs acquisitions?

---

### 2.9 Tier 2 Integration Testing

**Goal**: Ensure all Tier 2 features integrate with Tier 1 and core gameplay.

**Test Scenarios**:
1. Complete OTAs → Training Camp → Preseason → Final Cuts flow
2. Scout prospect → Add to big board → Draft
3. Apply RFA tender → Receive offer sheet → Match
4. Track comp picks through full FA period

**Gate Check**: Full test suite + manual integration test

**Verification Questions**:
- [ ] Does offseason flow through all phases correctly?
- [ ] Do scouting reports affect draft decisions?
- [ ] Does RFA system integrate with cap management?
- [ ] Are comp picks calculated correctly?

---

## Tier 3: Polish & Depth

### 3.1 Rumor Mill Screen

**Goal**: Display rumors (some true, some false) with resolution tracking.

**Core Systems to Expose**:
- `RumorMill` - Rumor generation and expiration
- Rumor resolution (confirmed/debunked)
- Trait hints through narrative

**Files to Create**:
- `src/screens/RumorMillScreen.tsx` - Rumors feed
- `src/components/news/RumorCard.tsx` - Individual rumor display
- `src/components/news/RumorResolutionBadge.tsx` - Status indicator

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Do rumors display with expiration dates?
- [ ] Are resolved rumors marked as confirmed/debunked?
- [ ] Do some rumors hint at hidden traits?
- [ ] Does clicking a rumor show related player/team?

---

### 3.2 Weekly Digest Screen

**Goal**: Curated weekly news summary.

**Core Systems to Expose**:
- `WeeklyDigest` - Summarized news by category
- Highlights and lowlights

**Files to Create**:
- `src/screens/WeeklyDigestScreen.tsx` - Digest view
- `src/components/news/DigestSection.tsx` - Category section
- `src/components/news/HighlightCard.tsx` - Key story highlight

**Files to Modify**:
- `src/screens/NewsScreen.tsx` - Link to weekly digest

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Is digest available after each week?
- [ ] Are stories grouped by category?
- [ ] Are key highlights prominently shown?
- [ ] Can navigate to full story from digest?

---

### 3.3 Coaching Tree Visualization

**Goal**: Display coaching tree relationships and philosophy inheritance.

**Core Systems to Expose**:
- `CoachingTree` - Named trees, generations
- Philosophy inheritance
- Chemistry implications

**Files to Create**:
- `src/components/coach/CoachingTreeDiagram.tsx` - Visual tree
- `src/components/coach/TreePhilosophyCard.tsx` - Philosophy details
- `src/components/coach/TreeChemistryIndicator.tsx` - Staff chemistry from tree

**Files to Modify**:
- `src/screens/CoachProfileScreen.tsx` - Add tree visualization

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Does tree show coach's lineage?
- [ ] Is philosophy (offensive/defensive tendency) displayed?
- [ ] Does chemistry indicator show tree-based bonuses?
- [ ] Can tap other coaches in tree to view profiles?

---

### 3.4 Job Market & Interview System

**Goal**: Display available GM jobs and interview process when unemployed.

**Core Systems to Expose**:
- `JobMarketManager` - Available openings
- `InterviewSystem` - Interview flow
- Team situation assessment

**Files to Create**:
- `src/screens/JobMarketScreen.tsx` - Available jobs
- `src/screens/InterviewScreen.tsx` - Interview process
- `src/components/career/JobOpeningCard.tsx` - Job details
- `src/components/career/TeamSituationCard.tsx` - Team assessment
- `src/components/career/OwnerPreviewCard.tsx` - Owner personality preview

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Are available jobs listed after being fired?
- [ ] Does interview show owner personality?
- [ ] Is team situation (rebuild/contend) displayed?
- [ ] Can accept/decline job offers?

---

### 3.5 Career Legacy & Hall of Fame

**Goal**: Track career achievements and legacy rating.

**Core Systems to Expose**:
- `CareerRecordTracker` - Career stats
- `LegacyScoring` - Legacy calculation
- Hall of Fame status

**Files to Create**:
- `src/screens/CareerLegacyScreen.tsx` - Full career view
- `src/components/career/AchievementsList.tsx` - Career achievements
- `src/components/career/LegacyMeter.tsx` - Legacy score
- `src/components/career/HallOfFameCard.tsx` - HOF status

**Files to Modify**:
- `src/screens/CareerSummaryScreen.tsx` - Enhanced with legacy

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Are career stats tracked across multiple tenures?
- [ ] Does legacy meter show current standing?
- [ ] Are achievements listed with dates?
- [ ] Is Hall of Fame eligibility shown?

---

### 3.6 Combine/Pro Day Viewing Screen

**Goal**: View and interact with combine/pro day results.

**Core Systems to Expose**:
- `CombineSimulator` - Workout results
- `ProDaySimulator` - Pro day workouts
- Athletic scoring

**Files to Create**:
- `src/screens/CombineScreen.tsx` - Combine results view
- `src/components/draft/CombineDrillCard.tsx` - Individual drill results
- `src/components/draft/AthleticProfileCard.tsx` - Athletic summary
- `src/components/draft/MedicalFlagCard.tsx` - Medical concerns

**Files to Modify**:
- `src/screens/DraftBoardScreen.tsx` - Link to combine data

**Gate Check**: `npm run typecheck && npm run lint && npm run format:check && npm test`

**Verification Questions**:
- [ ] Are all combine drills shown with results?
- [ ] Does athletic profile summarize performance?
- [ ] Are medical flags displayed?
- [ ] Can compare multiple prospects' combine results?

---

### 3.7 Tier 3 Integration & Final Polish

**Goal**: Ensure all features work together seamlessly.

**Test Scenarios**:
1. Full career: Start → Play seasons → Get fired → Find new job → Build legacy
2. Complete draft cycle: Scout → Combine → Big Board → Draft
3. News flow: Rumors → Confirmation → Weekly Digest

**Gate Check**: Full test suite + end-to-end manual testing

**Verification Questions**:
- [ ] Does the game flow naturally through all systems?
- [ ] Are all new screens accessible from appropriate locations?
- [ ] Is performance acceptable with all features enabled?
- [ ] Are there any orphaned screens or dead ends?

---

## Appendix: New File Summary

### Screens (15-17 new)
1. `CoachProfileScreen.tsx`
2. `CoachHiringScreen.tsx`
3. `DepthChartScreen.tsx`
4. `OwnerRelationsScreen.tsx`
5. `ContractManagementScreen.tsx`
6. `OTAsScreen.tsx`
7. `TrainingCampScreen.tsx`
8. `PreseasonScreen.tsx`
9. `FinalCutsScreen.tsx`
10. `ScoutingReportsScreen.tsx`
11. `BigBoardScreen.tsx`
12. `RFAScreen.tsx`
13. `RumorMillScreen.tsx`
14. `WeeklyDigestScreen.tsx`
15. `JobMarketScreen.tsx`
16. `InterviewScreen.tsx`
17. `CareerLegacyScreen.tsx`
18. `CombineScreen.tsx`

### Components (~40 new)
Organized by domain: coach/, roster/, career/, contracts/, offseason/, scouting/, draft/, freeAgency/, news/

### Core Logic (2-3 new)
- `src/core/coaching/CoachRevelationSystem.ts`
- Potentially others for UI-specific calculations

---

## Implementation Order Summary

```
Phase 0: Navigation Migration
    └── 0.1 React Navigation Setup
        └── GATE CHECK ✓

Tier 1: Core GM Experience
    ├── 1.1 Coach Profile Screen
    │   └── GATE CHECK ✓
    ├── 1.2 Coach Management Actions
    │   └── GATE CHECK ✓
    ├── 1.3 Depth Chart Screen
    │   └── GATE CHECK ✓
    ├── 1.4 Owner Patience & Demands
    │   └── GATE CHECK ✓
    ├── 1.5 Contract Management
    │   └── GATE CHECK ✓
    └── 1.6 Tier 1 Integration
        └── GATE CHECK ✓

Tier 2: Enhanced Gameplay
    ├── 2.1 OTAs Screen
    │   └── GATE CHECK ✓
    ├── 2.2 Training Camp Screen
    │   └── GATE CHECK ✓
    ├── 2.3 Preseason Games Screen
    │   └── GATE CHECK ✓
    ├── 2.4 Final Cuts Screen
    │   └── GATE CHECK ✓
    ├── 2.5 Scouting Reports Screen
    │   └── GATE CHECK ✓
    ├── 2.6 Big Board Management
    │   └── GATE CHECK ✓
    ├── 2.7 RFA Tender System
    │   └── GATE CHECK ✓
    ├── 2.8 Comp Pick Tracker
    │   └── GATE CHECK ✓
    └── 2.9 Tier 2 Integration
        └── GATE CHECK ✓

Tier 3: Polish & Depth
    ├── 3.1 Rumor Mill Screen
    │   └── GATE CHECK ✓
    ├── 3.2 Weekly Digest Screen
    │   └── GATE CHECK ✓
    ├── 3.3 Coaching Tree Visualization
    │   └── GATE CHECK ✓
    ├── 3.4 Job Market & Interviews
    │   └── GATE CHECK ✓
    ├── 3.5 Career Legacy & HOF
    │   └── GATE CHECK ✓
    ├── 3.6 Combine/Pro Day Viewing
    │   └── GATE CHECK ✓
    └── 3.7 Final Integration
        └── GATE CHECK ✓
```

---

## Notes

- **Progressive Revelation**: Many values start hidden and reveal over time based on experience, scouting investment, or time spent with the team. This preserves the mystery and rewards long-term play.

- **Consistent UX**: All new screens follow the existing pattern of dark theme, consistent spacing, and card-based layouts seen in current screens.

- **State Management**: Game state remains in App.tsx passed via navigation params. Consider extracting to Context if it becomes unwieldy.

- **Testing Strategy**: Each feature includes unit tests for new components and logic. Integration tests verify cross-feature interactions.

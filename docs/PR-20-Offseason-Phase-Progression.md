# PR-20: Off-Season Flow & Phase Progression

## Objective

Implement 12-phase linear off-season: Season End → Coaching → Contracts → Combine → FA → Draft → UDFA → OTAs → Camp → Preseason → Cuts → Season Start.

## Dependencies

- **PR-19**: Job Market ✅
- **All previous systems** ✅

## Branch Name

`feature/pr-20-offseason-flow`

---

## AI Developer Prompt

```
You are building an NFL GM Simulation Expo mobile game. This is PR-20 of 25.

### REQUIREMENTS

1. **Off-Season Phase Manager** (`src/core/offseason/OffSeasonPhaseManager.ts`)
   - Track current phase
   - Available actions per phase
   - Advance phase logic
   - Phase deadlines

2. **Phase Implementations** (`src/core/offseason/phases/`)
   - Phase 1: Season End (recap, grades, awards, draft order)
   - Phase 2: Coaching Decisions (fire/hire staff)
   - Phase 3: Contract Management (cuts, restructures, tags)
   - Phase 4: Combine/Pro Days (measurements, scouting)
   - Phase 5: Free Agency (tampering, day 1, trickle)
   - Phase 6: Draft (7 rounds, trades)
   - Phase 7: UDFA Signing
   - Phase 8: OTAs (first impressions)
   - Phase 9: Training Camp (development reveals, battles)
   - Phase 10: Preseason (3 games, evaluations)
   - Phase 11: Final Cuts (53-man roster)
   - Phase 12: Season Start (expectations set)

### BRAND GUIDELINES
- [ ] Phase progression clear
- [ ] Development hidden during camp
- [ ] Traits reveal through events

### BOOLEAN CHECKPOINTS
1. All 12 phases work
2. Transitions function
3. Full off-season completable
4. Integrates with previous systems
```

---

## Implementation Details

### 1. Off-Season Phase Manager

The `OffSeasonPhaseManager` orchestrates all 12 phases of the off-season:

- **Phase Tracking**: Tracks current phase (1-12), day within phase, and completion status
- **Task Management**: Each phase has required and optional tasks
- **Phase Transitions**: Validates all required tasks complete before advancing
- **Event Generation**: Creates narrative events for key moments
- **Integration**: Coordinates with existing managers (Free Agency, Draft, Coaching, etc.)

### 2. Phase Implementations

#### Phase 1: Season End
- Season recap and statistics summary
- Player grades based on season performance
- Award voting and announcements (MVP, DPOY, OROY, etc.)
- Draft order calculation
- Owner end-of-season evaluation

#### Phase 2: Coaching Decisions
- Coach and coordinator evaluations
- Fire/hire coaching staff
- Coordinator promotions
- Scheme changes
- Integrates with CareerJobMarket for fired staff

#### Phase 3: Contract Management
- Release players (cut for cap space)
- Restructure existing contracts
- Apply franchise/transition tags
- Pre-FA roster decisions
- Cap space calculations

#### Phase 4: Combine/Pro Days
- Prospect measurements and drills
- Scout assignments
- Pro day attendance
- Medical evaluations
- Interview scheduling
- Scouting report updates

#### Phase 5: Free Agency
- Legal tampering period
- Day 1 frenzy
- Day 2+ trickle signing
- RFA tender matching
- Integrates with FreeAgencyManager

#### Phase 6: Draft
- 7 rounds of selections
- Trade up/down functionality
- Auto-pick for CPU teams
- Rookie contract generation
- Integrates with DraftRoomSimulator

#### Phase 7: UDFA Signing
- Sign undrafted free agents
- Priority based on draft position
- Roster bonus negotiations
- Practice squad invites

#### Phase 8: OTAs (Organized Team Activities)
- First impressions of new players
- Chemistry building
- Initial depth chart work
- Minor development hints (not full reveals)

#### Phase 9: Training Camp
- Position battles
- Development reveals (hidden traits may surface)
- Injury risk during camp
- Roster evaluation
- Scheme fit testing

#### Phase 10: Preseason Games
- 3 exhibition games
- Player evaluations
- Final roster decisions
- Injury management
- Depth chart finalization

#### Phase 11: Final Cuts
- Cut to 53-man roster
- Practice squad formation
- Waiver wire claims
- Final cap adjustments
- IR designations

#### Phase 12: Season Start
- Final roster set
- Owner expectations established
- Media projections
- Season preview
- Transition to regular season

---

## File Structure

```
src/core/offseason/
├── OffSeasonPhaseManager.ts      # Main phase orchestration
├── phases/
│   ├── SeasonEndPhase.ts         # Phase 1: Season end processing
│   ├── CoachingDecisionsPhase.ts # Phase 2: Staff changes
│   ├── ContractManagementPhase.ts# Phase 3: Roster/cap management
│   ├── CombinePhase.ts           # Phase 4: Scouting events
│   ├── FreeAgencyPhase.ts        # Phase 5: FA coordination
│   ├── DraftPhase.ts             # Phase 6: Draft execution
│   ├── UDFAPhase.ts              # Phase 7: UDFA signings
│   ├── OTAsPhase.ts              # Phase 8: Organized activities
│   ├── TrainingCampPhase.ts      # Phase 9: Camp and development
│   ├── PreseasonPhase.ts         # Phase 10: Exhibition games
│   ├── FinalCutsPhase.ts         # Phase 11: Roster cuts
│   └── SeasonStartPhase.ts       # Phase 12: Season preparation
├── __tests__/
│   └── offseasonPhaseManager.test.ts
└── index.ts
```

---

## Integration Points

- **SeasonManager**: Triggers off-season when `phase === 'offseason'`
- **FreeAgencyManager**: Coordinates with FA phases
- **DraftRoomSimulator**: Handles draft execution
- **CoachingStaffManager**: Staff changes in Phase 2
- **SalaryCapManager**: Contract management in Phase 3
- **CombineSimulator**: Prospect evaluation in Phase 4
- **OwnerExpectations**: Sets expectations in Phase 12
- **PatienceMeterManager**: Resets after job market

---

## Off-Season Flow

```
Season Complete
       ↓
┌─────────────────────────────────────────────────────────────────┐
│                      OFF-SEASON PHASES                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Season End     → Grades, Awards, Draft Order                │
│  2. Coaching       → Fire/Hire Staff                            │
│  3. Contracts      → Cuts, Restructures, Tags                   │
│  4. Combine        → Measurements, Scouting                     │
│  5. Free Agency    → Tampering, Signings                        │
│  6. Draft          → 7 Rounds, Trades                           │
│  7. UDFA           → Undrafted Signings                         │
│  8. OTAs           → First Impressions                          │
│  9. Training Camp  → Development, Battles                       │
│ 10. Preseason      → 3 Games, Evaluations                       │
│ 11. Final Cuts     → 53-Man Roster                              │
│ 12. Season Start   → Expectations Set                           │
└─────────────────────────────────────────────────────────────────┘
       ↓
Regular Season Begins
```

---

## Phase Tasks

| Phase | Required Tasks | Optional Tasks |
|-------|---------------|----------------|
| 1. Season End | View recap | Review all stats |
| 2. Coaching | Confirm staff | Hire new coaches |
| 3. Contracts | Review cap | Restructure, cut, tag |
| 4. Combine | View top prospects | Attend pro days |
| 5. Free Agency | Review market | Make signings |
| 6. Draft | Make picks | Trade picks |
| 7. UDFA | Review pool | Sign UDFAs |
| 8. OTAs | View reports | Adjust depth chart |
| 9. Camp | View battles | Manage injuries |
| 10. Preseason | Sim games | Watch key players |
| 11. Cuts | Cut to 53 | Form practice squad |
| 12. Start | View expectations | Set goals |

---

## State Structure

```typescript
interface OffSeasonState {
  year: number;
  currentPhase: OffSeasonPhaseType;
  phaseDay: number;
  phaseTasks: Map<OffSeasonPhaseType, PhaseTaskStatus>;
  events: OffSeasonEvent[];
  completedPhases: OffSeasonPhaseType[];
  isComplete: boolean;
}

interface PhaseTaskStatus {
  requiredComplete: boolean;
  optionalComplete: boolean;
  tasksCompleted: string[];
}

interface OffSeasonEvent {
  id: string;
  phase: OffSeasonPhaseType;
  type: string;
  description: string;
  timestamp: number;
  details: Record<string, unknown>;
}
```

---

## Boolean Checkpoints

1. ✅ All 12 phases implemented with phase handlers
2. ✅ Phase transitions work with task validation
3. ✅ Full off-season can be completed from start to finish
4. ✅ Integrates with FreeAgency, Draft, Coaching, and Career systems

# PR-12: Scout Reports & Evaluation System

## Objective

Implement the scout report generation system that produces the reports users see, with appropriate information hiding based on scouting depth.

## Dependencies

- **PR-11**: Scouting Department ✅

## Branch Name

`feature/pr-12-scout-reports`

---

## AI Developer Prompt

```
You are building an NFL GM Simulation React Native mobile game. This is PR-12 of 25.

### CONTEXT
Scout reports are what users see. They vary based on scouting depth - auto-scouted players have wider ranges and less info, focus players have narrow ranges and more revealed traits. Reports should feel authentic.

### YOUR TASK
Implement the scout report generation system.

### REQUIREMENTS

1. **Scout Report Generator** (`src/core/scouting/ScoutReportGenerator.ts`)
   - Generate reports based on scouting depth
   - Include appropriate uncertainty
   - Format for display

2. **Report Types:**

   **Basic Auto-Scout Report:**
```
Physical measurements (exact)
Skill ranges (wide: 12-16 point spread)
Traits: Unknown
Scheme fit: Unknown
Confidence: Low
Projection: Wide (Round 2-4)
```

   **Focus Player Report:**
```
Physical measurements (exact)
Skill ranges (tight: 4-6 point spread)
Traits: 2-3 revealed
Character assessment
Medical history
Scheme fit analysis
Confidence: High
Projection: Narrow (Round 1, picks 6-15)
```

3. **Report Confidence System** (`src/core/scouting/ReportConfidenceSystem.ts`)
   - Calculate report confidence based on scout quality + time spent
   - Adjust ranges based on confidence
   - Include scout-specific tendencies

4. **Draft Board Manager** (`src/core/scouting/DraftBoardManager.ts`)
   - Compile scout reports into draft board
   - Allow user ranking
   - Track scouting director input

5. **Big Board Generator** (`src/core/scouting/BigBoardGenerator.ts`)
   - Generate team's consensus big board
   - Weight by scout reliability
   - Include positional need factors

### BRAND GUIDELINES
- [ ] True values NEVER appear in reports
- [ ] All skills shown as ranges
- [ ] Traits only revealed for focus players
- [ ] Confidence clearly communicated

### TESTS TO WRITE
- scoutReportGenerator.test.ts
- reportConfidenceSystem.test.ts
- draftBoardManager.test.ts
- bigBoardGenerator.test.ts

### BOOLEAN CHECKPOINTS
1. Reports generate with correct format
2. Focus reports have narrower ranges
3. No true values in any report
4. Draft board compiles correctly
5. Confidence affects range width
```

---

## Files to Create (Phase 3)

```
src/core/scouting/
├── ScoutReportGenerator.ts
├── ReportConfidenceSystem.ts
├── DraftBoardManager.ts
├── BigBoardGenerator.ts
└── __tests__/
    ├── scoutReportGenerator.test.ts
    ├── reportConfidenceSystem.test.ts
    ├── draftBoardManager.test.ts
    └── bigBoardGenerator.test.ts
```

---

## Implementation Details

### Scout Report Generator

The `ScoutReportGenerator` transforms raw scouting data into user-facing reports with appropriate information hiding:

- **Auto-Scout Reports**: Wide skill ranges (12-16 point spread), limited trait visibility, basic draft projection
- **Focus Player Reports**: Narrow skill ranges (4-6 point spread), full trait visibility, detailed analysis including character assessment, medical history, and scheme fit

### Report Confidence System

Calculates and manages confidence levels for scout reports:

- **Base Confidence**: Derived from scout evaluation attribute
- **Confidence Modifiers**: Time spent scouting, scout specialization, regional knowledge
- **Range Adjustment**: Higher confidence = narrower skill ranges
- **Scout Tendencies**: Tracks optimistic/pessimistic bias

### Draft Board Manager

Manages the team's draft board compilation:

- **Report Aggregation**: Combines multiple scout reports on same prospect
- **User Rankings**: Allows GM (user) to set custom rankings
- **Director Input**: Scouting director can provide recommendations
- **Position Grouping**: Organize by position or overall ranking

### Big Board Generator

Generates the team's consensus big board:

- **Weighted Scoring**: Scout reliability affects weight
- **Need Factor**: Positional needs adjust rankings
- **Comparison Tools**: Compare similar prospects
- **Draft Grade**: Combine skill projection with intangibles

---

## Type Definitions

### ScoutReport
```typescript
interface ScoutReport {
  prospectId: string;
  prospectName: string;
  position: Position;
  reportType: 'auto' | 'focus';
  generatedAt: number;
  scoutId: string;

  // Physical (always exact)
  physicalMeasurements: PhysicalMeasurements;

  // Skills (ranges only)
  skillRanges: Map<string, SkillRange>;

  // Traits (hidden for auto, revealed for focus)
  visibleTraits: TraitInfo[];

  // Projections
  draftProjection: DraftProjection;
  confidence: ReportConfidence;

  // Focus-only fields
  characterAssessment?: CharacterAssessment;
  medicalAssessment?: MedicalAssessment;
  schemeFitAnalysis?: SchemeFitAnalysis;
}
```

### DraftProjection
```typescript
interface DraftProjection {
  roundMin: number;
  roundMax: number;
  pickRangeMin?: number;
  pickRangeMax?: number;
  overallGrade: string; // "First-round talent", "Day 2 pick", etc.
}
```

### ReportConfidence
```typescript
interface ReportConfidence {
  level: 'low' | 'medium' | 'high';
  score: number; // 0-100
  factors: ConfidenceFactor[];
}
```

---

## API Reference

### ScoutReportGenerator

```typescript
generateAutoScoutReport(
  prospect: ProspectData,
  scout: Scout,
  config?: AutoScoutConfig
): ScoutReport

generateFocusReport(
  prospect: ExtendedProspectData,
  scout: Scout,
  scoutingWeeks: number,
  config?: FocusScoutConfig
): ScoutReport

formatReportForDisplay(report: ScoutReport): DisplayReport
```

### ReportConfidenceSystem

```typescript
calculateConfidence(
  scout: Scout,
  reportType: 'auto' | 'focus',
  scoutingTime: number
): ReportConfidence

adjustRangesByConfidence(
  baseRanges: Map<string, SkillRange>,
  confidence: ReportConfidence
): Map<string, SkillRange>

getScoutTendency(scout: Scout): ScoutTendency
```

### DraftBoardManager

```typescript
createDraftBoard(teamId: string): DraftBoardState

addReportToBoard(
  state: DraftBoardState,
  report: ScoutReport
): DraftBoardState

setUserRanking(
  state: DraftBoardState,
  prospectId: string,
  rank: number
): DraftBoardState

getDraftBoardView(state: DraftBoardState): DraftBoardViewModel
```

### BigBoardGenerator

```typescript
generateBigBoard(
  reports: ScoutReport[],
  teamNeeds: PositionalNeeds,
  scoutReliability: Map<string, number>
): BigBoard

calculateConsensusRanking(
  reports: ScoutReport[],
  weights: Map<string, number>
): ProspectRanking[]

applyNeedFactors(
  rankings: ProspectRanking[],
  needs: PositionalNeeds
): ProspectRanking[]
```

---

## Integration Points

- **AutoScoutingSystem**: Provides raw auto-scout data
- **FocusPlayerSystem**: Provides detailed focus player data
- **ScoutAccuracySystem**: Provides scout reliability for weighting
- **ScoutingDepartmentManager**: Provides scout information

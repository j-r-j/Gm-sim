# PR-24: Player Profiles & Draft Interface UI

## Objective

Player profiles with skill RANGES and draft interface for prospect evaluation.

## Dependencies

- **PR-23** ✅

## Branch Name

`feature/pr-24-player-profiles-ui`

## AI Developer Prompt

```
### REQUIREMENTS

1. **PlayerProfileScreen** - Full player view
2. **SkillRangeDisplay** - Visual bars for ranges
3. **TraitBadges** - Revealed traits, "???" for unknown
4. **DraftBoardScreen** - Big board view
5. **DraftRoomScreen** - Pick/trade interface
6. **ComparisonModal** - Side-by-side comparison

### BRAND GUIDELINES
- [ ] Skills ALWAYS shown as ranges
- [ ] No overall rating anywhere
```

---

## Implementation Plan

### Component Architecture

```
src/components/
├── player/
│   ├── SkillRangeDisplay.tsx     # Visual skill range bars
│   ├── TraitBadges.tsx           # Revealed traits with "???" for unknown
│   ├── PlayerCard.tsx            # Compact player card view
│   ├── PhysicalAttributes.tsx    # Physical stats display
│   ├── CollegeStatsDisplay.tsx   # Position-specific college stats
│   └── index.ts                  # Barrel exports
├── draft/
│   ├── ProspectListItem.tsx      # Row in draft board
│   ├── DraftPickCard.tsx         # Current pick indicator
│   ├── TradeOfferCard.tsx        # Trade proposal display
│   ├── ComparisonModal.tsx       # Side-by-side prospect comparison
│   └── index.ts                  # Barrel exports
└── index.ts                      # Main exports

src/screens/
├── PlayerProfileScreen.tsx       # Full player profile view
├── DraftBoardScreen.tsx          # Big board with all prospects
└── DraftRoomScreen.tsx           # Draft room with pick/trade interface
```

### Key Design Decisions

1. **Skill Ranges Only**: Never show `trueValue`, only `perceivedMin` to `perceivedMax`
2. **No Overall Rating**: Each skill displayed individually, no aggregate score
3. **Progressive Trait Reveal**: Show revealed traits with icons, "???" placeholders for others
4. **Color Coding**:
   - Green (positive traits/high skills)
   - Red (negative traits/concerns)
   - Blue (informational/neutral)
   - Gray (unknown/hidden)

### Component Details

#### 1. SkillRangeDisplay
- Props: `skillName`, `perceivedMin`, `perceivedMax`, `age`, `maturityAge`
- Visual: Horizontal bar showing range from min to max
- Shows wider range for younger players (more uncertainty)
- Shows single value if age >= maturityAge (skill revealed)

#### 2. TraitBadges
- Props: `hiddenTraits`, `maxUnrevealed`
- Shows revealed positive traits in green badges
- Shows revealed negative traits in red badges
- Shows "???" badges for unknown traits (count based on maxUnrevealed)

#### 3. PlayerProfileScreen
- Full-screen scrollable profile
- Sections: Header, Physical, Skills, Traits, Scheme Fits, Notes
- No overall rating anywhere
- Shows draft info for rookies

#### 4. DraftBoardScreen
- Filterable/sortable list of prospects
- Position filter, tier filter, flagged filter
- Each row shows: Name, Position, College, Projection, User Tier
- Tap to open PlayerProfileScreen
- Long press to compare

#### 5. DraftRoomScreen
- Current pick indicator (team on the clock)
- Draft board mini-view
- Trade offers section
- Pick controls (select player, trade pick)
- Auto-pick toggle

#### 6. ComparisonModal
- Side-by-side prospect comparison
- Aligned skill bars for easy comparison
- Physical attributes comparison
- College stats comparison

---

## Checklist

### Components
- [ ] SkillRangeDisplay component with visual range bars
- [ ] TraitBadges component with reveal/unknown logic
- [ ] PlayerCard compact view
- [ ] PhysicalAttributes display
- [ ] CollegeStatsDisplay (position-specific)
- [ ] ProspectListItem for draft board
- [ ] DraftPickCard showing current pick
- [ ] TradeOfferCard for trade proposals
- [ ] ComparisonModal for side-by-side view

### Screens
- [ ] PlayerProfileScreen with all sections
- [ ] DraftBoardScreen with filters and sorting
- [ ] DraftRoomScreen with pick/trade interface

### Brand Guidelines Verification
- [ ] Skills ALWAYS shown as ranges (perceivedMin to perceivedMax)
- [ ] No overall rating anywhere in UI
- [ ] Revealed traits distinguished from unknown
- [ ] Consistent color coding throughout

### Testing
- [ ] Unit tests for all components
- [ ] TypeScript strict mode compliance
- [ ] Lint passes

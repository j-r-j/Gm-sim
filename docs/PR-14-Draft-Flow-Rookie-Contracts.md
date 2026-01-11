# PR-14: Draft Flow & Rookie Contracts

## Objective

7-round draft with pick trading, AI strategy, and slotted rookie contracts.

## Dependencies

- **PR-13** (Prospect Generation & Draft Class System)

## Branch Name

`feature/pr-14-draft-flow`

## AI Developer Prompt

```
### REQUIREMENTS

1. **Draft Order Manager** (`src/core/draft/DraftOrderManager.ts`)
   - Track all picks (regular + compensatory)
   - Handle trades up to 3 years out
   - Calculate compensatory picks

2. **Draft Room Simulator** (`src/core/draft/DraftRoomSimulator.ts`)
   - User pick flow
   - AI team picks
   - Trade offers
   - Clock management

3. **AI Draft Strategy** (`src/core/draft/AIDraftStrategy.ts`)
   - Philosophies: BPA, needs-based, trade-happy
   - Team-specific tendencies

4. **Trade Value Calculator** (`src/core/draft/TradeValueCalculator.ts`)
   - Pick value chart
   - Fairness evaluation (hidden)

5. **Rookie Contract Generator** (`src/core/draft/RookieContractGenerator.ts`)
   - 4-year slotted contracts
   - 5th year option for round 1

6. **UDFA System** (`src/core/draft/UDFASystem.ts`)
   - ~250 undrafted available
   - Limited bonus budget
   - Competition with AI teams

### BRAND GUIDELINES
- [ ] Pick values not shown numerically
- [ ] AI logic hidden

### BOOLEAN CHECKPOINTS
1. 7 rounds complete
2. Pick trading works
3. Rookie contracts slot correctly
4. UDFA signing works
```

## Implementation Summary

### Files Created

| File | Purpose |
|------|---------|
| `DraftOrderManager.ts` | Manages draft order, pick ownership, trades, and compensatory picks |
| `TradeValueCalculator.ts` | Internal pick value calculations (hidden from user) |
| `AIDraftStrategy.ts` | AI team draft philosophies and decision making |
| `DraftRoomSimulator.ts` | Orchestrates the draft flow, user/AI picks, trade offers |
| `RookieContractGenerator.ts` | Slotted 4-year contracts with 5th year options |
| `UDFASystem.ts` | Undrafted free agent signing with budget competition |

### Key Design Decisions

1. **Pick Value Hidden**: The `TradeValueCalculator` uses an internal points system that is never exposed to the user. Trade fairness is communicated through qualitative descriptions.

2. **AI Philosophy Types**:
   - `BPA` (Best Player Available) - Pure talent evaluation
   - `NEEDS_BASED` - Prioritizes team needs
   - `TRADE_HAPPY` - Actively seeks trade opportunities
   - `BALANCED` - Mix of BPA and needs

3. **Compensatory Pick Formula**: Based on free agent losses/gains with quality weighting (projected round and contract value).

4. **Rookie Contract Structure**:
   - 4-year base term for all picks
   - Fully guaranteed for rounds 1-2
   - Partial guarantees for rounds 3-7
   - 5th year team option for 1st round picks only

5. **UDFA Competition**: AI teams have varying interest levels and budgets. Signing priority based on prospect talent and team roster needs.

### Testing Checkpoints

- [ ] Draft completes all 7 rounds correctly
- [ ] Pick trades execute and update ownership
- [ ] Future pick trades work (up to 3 years)
- [ ] Compensatory picks calculated and ordered
- [ ] Rookie contracts match slot values
- [ ] 5th year option exists for round 1 only
- [ ] UDFA pool generates ~250 prospects
- [ ] AI teams compete for UDFAs

# PR-16: Free Agency Waves & Market Simulation

## Objective

Free agency with legal tampering, Day 1 frenzy, trickle phases, RFA, and compensatory picks.

## Dependencies

- **PR-15** (Contract System & Salary Cap)

## Branch Name

`feature/pr-16-free-agency`

## Requirements

### 1. Free Agency Manager (`src/core/freeAgency/FreeAgencyManager.ts`)
- Track UFA, RFA, ERFA
- Manage phases
- Handle deadlines

### 2. Market Value Calculator (`src/core/freeAgency/MarketValueCalculator.ts`)
- Age, production, position factors
- Market demand adjustment

### 3. Legal Tampering Phase (`src/core/freeAgency/LegalTamperingPhase.ts`)
- Negotiate, can't sign
- Gauge market

### 4. Day 1 Frenzy Simulator (`src/core/freeAgency/Day1FrenzySimulator.ts`)
- Rapid signings
- Top players go fast
- Bidding wars

### 5. Trickle Phase Manager (`src/core/freeAgency/TricklePhaseManager.ts`)
- Slower pace
- Bargain signings

### 6. RFA Tender System (`src/core/freeAgency/RFATenderSystem.ts`)
- Tender levels
- Offer sheets
- Matching period

### 7. Compensatory Pick Calculator (`src/core/freeAgency/CompensatoryPickCalculator.ts`)
- Net losses vs gains
- Pick value calculation (rounds 3-7)

### 8. AI Free Agency Logic (`src/core/freeAgency/AIFreeAgencyLogic.ts`)
- Team needs assessment
- Budget allocation

## Brand Guidelines
- [ ] Contract offers visible
- [ ] AI team interest general, not specific
- [ ] Comp picks calculated after FA

## Boolean Checkpoints
1. All three phases work
2. Market values reasonable
3. RFA tenders work
4. Compensatory picks calculate

## Implementation Status
- [ ] FreeAgencyManager.ts
- [ ] MarketValueCalculator.ts
- [ ] LegalTamperingPhase.ts
- [ ] Day1FrenzySimulator.ts
- [ ] TricklePhaseManager.ts
- [ ] RFATenderSystem.ts
- [ ] CompensatoryPickCalculator.ts
- [ ] AIFreeAgencyLogic.ts
- [ ] Tests
- [ ] Index exports

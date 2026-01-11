# PR-15: Contract System & Salary Cap

## Objective

Complete contract system with salary cap, restructures, franchise tags, and dead money.

## Dependencies

- **PR-14** ✅

## Branch Name

`feature/pr-15-contracts-salary-cap`

## AI Developer Prompt

```
### REQUIREMENTS

1. **Contract Model** (`src/core/contracts/Contract.ts`)
   - Years, value, guarantees
   - Signing bonus proration
   - Cap hits per year
   - Dead money calculation

2. **Salary Cap Manager** (`src/core/contracts/SalaryCapManager.ts`)
   - Real-time cap tracking
   - Future projections
   - Rollover handling

3. **Restructure System** (`src/core/contracts/RestructureSystem.ts`)
   - Convert salary to bonus
   - Calculate proration
   - Future impact projection

4. **Franchise Tag System** (`src/core/contracts/FranchiseTagSystem.ts`)
   - Position-based values
   - Exclusive vs non-exclusive
   - One per year limit

5. **Cut Calculator** (`src/core/contracts/CutCalculator.ts`)
   - Cap savings
   - Dead money hit
   - Pre/post June 1 options

6. **Extension System** (`src/core/contracts/ExtensionSystem.ts`)
   - Market value calculation
   - Player demands
   - Negotiation

### BRAND GUIDELINES
- [ ] Contract values visible (public info)
- [ ] Cap hit visible
- [ ] Internal valuations hidden

### BOOLEAN CHECKPOINTS
1. Cap calculates correctly
2. Restructures work
3. Franchise tag values accurate
4. Dead money calculates
```

## Implementation Status

- [x] Contract Model
- [x] Salary Cap Manager
- [x] Restructure System
- [x] Franchise Tag System
- [x] Cut Calculator
- [x] Extension System
- [x] Tests (139 tests passing)
- [x] CI Passing
